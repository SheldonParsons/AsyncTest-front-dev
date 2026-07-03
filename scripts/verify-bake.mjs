// 先证：烘焙的 65,536 子集 ≈ 原始完整网格（同一条运行时管线下）
// 对每个模型，分别用「全部原始顶点」和「烘焙 .bin」跑
// normalizeGeometry(2.2) + 各 slot 旋转 + colorFn，比对：
//   ① 归一化后 bbox（形态/尺度）  ② 分色比例（配色分布）
// 两者吻合即证明子集视觉等价。
import * as THREE from 'three'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const IN_DIR = path.join(ROOT, 'raw-models')
const BIN_DIR = path.join(ROOT, 'public', 'particles')

// ---- GLB 解析（与 bake 脚本一致） ----
function parseGLB(buf) {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
  if (dv.getUint32(0, true) !== 0x46546c67) throw new Error('非 GLB')
  let off = 12, json = null, bin = null
  while (off < buf.byteLength) {
    const len = dv.getUint32(off, true), type = dv.getUint32(off + 4, true), start = off + 8
    if (type === 0x4e4f534a) json = JSON.parse(Buffer.from(buf.buffer, buf.byteOffset + start, len).toString('utf8'))
    else if (type === 0x004e4942) bin = new Uint8Array(buf.buffer, buf.byteOffset + start, len)
    off = start + len + ((4 - (len % 4)) % 4)
  }
  return { json, bin }
}
function worldMatrices(json) {
  const nodes = json.nodes || [], world = new Array(nodes.length).fill(null)
  const roots = (json.scenes?.[json.scene ?? 0]?.nodes) || []
  const local = (n) => {
    const m = new THREE.Matrix4()
    if (n.matrix) m.fromArray(n.matrix)
    else m.compose(new THREE.Vector3(...(n.translation || [0, 0, 0])),
                   new THREE.Quaternion(...(n.rotation || [0, 0, 0, 1])),
                   new THREE.Vector3(...(n.scale || [1, 1, 1])))
    return m
  }
  const dfs = (i, p) => { const m = new THREE.Matrix4().multiplyMatrices(p, local(nodes[i])); world[i] = m; for (const c of (nodes[i].children || [])) dfs(c, m) }
  for (const r of roots) dfs(r, new THREE.Matrix4())
  for (let i = 0; i < nodes.length; i++) if (!world[i]) world[i] = new THREE.Matrix4()
  return world
}
function readVec3(json, bin, ai) {
  const acc = json.accessors[ai], bv = json.bufferViews[acc.bufferView]
  const base = (bv.byteOffset || 0) + (acc.byteOffset || 0), stride = bv.byteStride || 12
  const dv = new DataView(bin.buffer, bin.byteOffset, bin.byteLength), out = new Float32Array(acc.count * 3)
  for (let i = 0; i < acc.count; i++) { const o = base + i * stride; out[i * 3] = dv.getFloat32(o, true); out[i * 3 + 1] = dv.getFloat32(o + 4, true); out[i * 3 + 2] = dv.getFloat32(o + 8, true) }
  return out
}
function fullWorldVerts(file) {
  const { json, bin } = parseGLB(fs.readFileSync(path.join(IN_DIR, file)))
  const world = worldMatrices(json)
  let best = null
  for (let ni = 0; ni < (json.nodes || []).length; ni++) {
    const n = json.nodes[ni]; if (n.mesh == null) continue
    for (const prim of json.meshes[n.mesh].primitives || []) {
      const pa = prim.attributes?.POSITION; if (pa == null) continue
      if (!best || json.accessors[pa].count > best.count) best = { count: json.accessors[pa].count, pa, wm: world[ni] }
    }
  }
  const raw = readVec3(json, bin, best.pa), out = new Float32Array(raw.length), v = new THREE.Vector3()
  for (let i = 0; i < best.count; i++) { v.set(raw[i * 3], raw[i * 3 + 1], raw[i * 3 + 2]).applyMatrix4(best.wm); out[i * 3] = v.x; out[i * 3 + 1] = v.y; out[i * 3 + 2] = v.z }
  return out
}

// ---- 运行时管线（复刻 Page.js normalizeGeometry + 各 slot 旋转） ----
function normalize(g, size = 2.2) {
  g.computeBoundingBox()
  const box = g.boundingBox, center = new THREE.Vector3(), s = new THREE.Vector3()
  box.getCenter(center); box.getSize(s)
  const maxAxis = Math.max(s.x, s.y, s.z)
  g.translate(-center.x, -center.y, -center.z)
  if (maxAxis > 0) g.scale(size / maxAxis, size / maxAxis, size / maxAxis)
  return g
}
function pipeline(verts, slot) {
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(verts.slice(), 3))
  normalize(g, 2.2)
  if (slot === 'A') { g.rotateY(Math.PI); g.rotateX(-Math.PI / 2); g.rotateZ(Math.PI / 4) }
  else if (slot === 'B') { g.rotateY(Math.PI); g.scale(-1, 1, 1) }
  else if (slot === 'C') { g.rotateY(Math.PI) }
  g.computeBoundingBox()
  const arr = g.attributes.position.array, n = g.attributes.position.count
  const sz = new THREE.Vector3(); g.boundingBox.getSize(sz)
  // 分色（slot A/B: |x|<0.35 白 ; slot C: x < 0.5y-0.219 绿）
  let hit = 0
  for (let i = 0; i < n; i++) {
    const x = arr[i * 3], y = arr[i * 3 + 1]
    if (slot === 'C') { if (x < 0.5 * y - 0.219) hit++ } else { if (Math.abs(x) < 0.35) hit++ }
  }
  return { bbox: [sz.x, sz.y, sz.z], ratio: hit / n, n }
}

const JOBS = [
  { name: 'smModel', file: 'slotA.glb', bin: 'slotA.bin', slot: 'A', label: '白(机身)占比' },
  { name: 'scModel', file: 'slotB.glb', bin: 'slotB.bin', slot: 'B', label: '白占比' },
  { name: 'logoModel', file: 'logo2.glb', bin: 'logo2.bin', slot: 'C', label: '绿占比' },
]
const fmt = (b) => b.map((x) => x.toFixed(3)).join(' × ')
console.log('先证：完整网格 vs 烘焙子集（同管线）\n')
let ok = true
for (const j of JOBS) {
  const full = pipeline(fullWorldVerts(j.file), j.slot)
  const binBuf = fs.readFileSync(path.join(BIN_DIR, j.bin))
  const baked = pipeline(new Float32Array(binBuf.buffer, binBuf.byteOffset, binBuf.byteLength / 4), j.slot)
  const bboxErr = Math.max(...full.bbox.map((v, i) => Math.abs(v - baked.bbox[i]) / (v || 1)))
  const ratioErr = Math.abs(full.ratio - baked.ratio)
  const pass = bboxErr < 0.01 && ratioErr < 0.02
  ok = ok && pass
  console.log(`  ${j.name.padEnd(10)} [${j.slot}]  ${pass ? '✓' : '✗ 偏差过大'}`)
  console.log(`     bbox   完整 ${fmt(full.bbox)}   烘焙 ${fmt(baked.bbox)}   相对差 ${(bboxErr * 100).toFixed(2)}%`)
  console.log(`     ${j.label}  完整 ${(full.ratio * 100).toFixed(1)}%   烘焙 ${(baked.ratio * 100).toFixed(1)}%   差 ${(ratioErr * 100).toFixed(2)}pp   (完整 ${full.n.toLocaleString()} 点 / 烘焙 ${baked.n.toLocaleString()} 点)\n`)
}
console.log(ok ? '结论：一致（bbox<1% 且 分色<2pp）✓' : '结论：存在偏差，需排查 ✗')
process.exit(ok ? 0 : 1)
