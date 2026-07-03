// 粒子首屏「位置烘焙」脚本
// ------------------------------------------------------------------
// 目的：把 raw-models/*.glb（每个几十 MB、含没用的贴图 + 88 万高模面）
// 预采样成运行时真正需要的 65,536 个世界坐标点，存成很小的 Float32 .bin。
// 运行时把 .bin 当 BufferGeometry 喂进 Page.js 现成的 isBufferGeometry 分支，
// 之后的 normalizeGeometry / 旋转 / makeColoredTexture / 256×256 全不变，
// 所以粒子形态与配色按构造与原来一致（只是顶点是等价的随机 6.5 万子集）。
//
// FBO 是 256×256 = 65,536 个粒子，所以恰好烘 65,536 个点 → sim 1:1 采样。
// 强制包含包围盒 6 个极值顶点，保证 normalizeGeometry 的尺度不漂。
//
// 用法：node scripts/bake-particles.mjs
// 依赖：three（仅用其 Matrix4/Vector3/Box3 数学，纯 CPU，不需 WebGL）
// ------------------------------------------------------------------
import * as THREE from 'three'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const IN_DIR = path.join(ROOT, 'raw-models')
const OUT_DIR = path.join(ROOT, 'public', 'particles')

const TARGET = 65536 // 256 × 256，与 FBO 粒子数一致

// smModel/scModel/logoModel → 与 sources.js 的 name 对齐
const JOBS = [
  { name: 'smModel',   file: 'slotA.glb', out: 'slotA.bin' },
  { name: 'scModel',   file: 'slotB.glb', out: 'slotB.bin' },
  { name: 'logoModel', file: 'logo2.glb', out: 'logo2.bin' },
]

// ---- 最小 GLB 解析（只取几何，忽略贴图/材质） ----
function parseGLB(buf) {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
  const magic = dv.getUint32(0, true)
  if (magic !== 0x46546c67) throw new Error('不是 glTF 二进制(GLB) 文件')
  let off = 12
  let json = null
  let bin = null
  while (off < buf.byteLength) {
    const len = dv.getUint32(off, true)
    const type = dv.getUint32(off + 4, true)
    const start = off + 8
    if (type === 0x4e4f534a) { // 'JSON'
      json = JSON.parse(Buffer.from(buf.buffer, buf.byteOffset + start, len).toString('utf8'))
    } else if (type === 0x004e4942) { // 'BIN\0'
      bin = new Uint8Array(buf.buffer, buf.byteOffset + start, len)
    }
    off = start + len + ((4 - (len % 4)) % 4)
  }
  if (!json || !bin) throw new Error('GLB 缺 JSON 或 BIN 块')
  return { json, bin }
}

// 组合每个 node 的世界矩阵（DFS 从 scene 根往下乘），返回 nodeIndex → Matrix4
function computeWorldMatrices(json) {
  const nodes = json.nodes || []
  const world = new Array(nodes.length).fill(null)
  const sceneIdx = json.scene ?? 0
  const roots = (json.scenes && json.scenes[sceneIdx] && json.scenes[sceneIdx].nodes) || []

  const local = (n) => {
    const m = new THREE.Matrix4()
    if (n.matrix) {
      m.fromArray(n.matrix)
    } else {
      const t = n.translation || [0, 0, 0]
      const q = n.rotation || [0, 0, 0, 1]
      const s = n.scale || [1, 1, 1]
      m.compose(new THREE.Vector3(t[0], t[1], t[2]),
                new THREE.Quaternion(q[0], q[1], q[2], q[3]),
                new THREE.Vector3(s[0], s[1], s[2]))
    }
    return m
  }

  const dfs = (idx, parent) => {
    const n = nodes[idx]
    const m = new THREE.Matrix4().multiplyMatrices(parent, local(n))
    world[idx] = m
    for (const c of (n.children || [])) dfs(c, m)
  }
  const I = new THREE.Matrix4()
  for (const r of roots) dfs(r, I)
  // 兜底：没挂在场景里的孤立 node 也算（用单位阵）
  for (let i = 0; i < nodes.length; i++) if (!world[i]) world[i] = new THREE.Matrix4()
  return world
}

// 读某个 accessor 的 VEC3 FLOAT 数据（处理 byteStride / byteOffset）
function readVec3Accessor(json, bin, accessorIdx) {
  const acc = json.accessors[accessorIdx]
  if (acc.type !== 'VEC3' || acc.componentType !== 5126)
    throw new Error(`POSITION accessor 非 VEC3/FLOAT: type=${acc.type} ct=${acc.componentType}`)
  const bv = json.bufferViews[acc.bufferView]
  if ((bv.buffer ?? 0) !== 0) throw new Error('多 buffer GLB 暂不支持')
  const base = (bv.byteOffset || 0) + (acc.byteOffset || 0)
  const stride = bv.byteStride || 12
  const count = acc.count
  const dv = new DataView(bin.buffer, bin.byteOffset, bin.byteLength)
  const out = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    const o = base + i * stride
    out[i * 3 + 0] = dv.getFloat32(o + 0, true)
    out[i * 3 + 1] = dv.getFloat32(o + 4, true)
    out[i * 3 + 2] = dv.getFloat32(o + 8, true)
  }
  return out
}

// 找 POSITION 顶点数最大的 primitive（对齐 Page.js getModelMeshData 的 reduce）
function pickLargestPrimitive(json, world) {
  const nodes = json.nodes || []
  let best = null
  for (let ni = 0; ni < nodes.length; ni++) {
    const n = nodes[ni]
    if (n.mesh == null) continue
    const mesh = json.meshes[n.mesh]
    for (const prim of mesh.primitives || []) {
      const posAcc = prim.attributes && prim.attributes.POSITION
      if (posAcc == null) continue
      const count = json.accessors[posAcc].count
      if (!best || count > best.count) best = { count, posAcc, worldMatrix: world[ni] }
    }
  }
  if (!best) throw new Error('未找到带 POSITION 的 mesh primitive')
  return best
}

function bakeOne(job) {
  const buf = fs.readFileSync(path.join(IN_DIR, job.file))
  const { json, bin } = parseGLB(buf)
  const world = computeWorldMatrices(json)
  const { count, posAcc, worldMatrix } = pickLargestPrimitive(json, world)

  // 世界坐标顶点（对齐 getModelMeshData: geometry.applyMatrix4(mesh.matrixWorld)）
  const raw = readVec3Accessor(json, bin, posAcc)
  const verts = new Float32Array(raw.length)
  const v = new THREE.Vector3()
  const box = new THREE.Box3().makeEmpty()
  // 记录 6 个极值顶点索引，保证采样后 bbox 不漂 → normalizeGeometry 尺度一致
  const ext = { minX: 0, maxX: 0, minY: 0, maxY: 0, minZ: 0, maxZ: 0 }
  let mnx = Infinity, mxx = -Infinity, mny = Infinity, mxy = -Infinity, mnz = Infinity, mxz = -Infinity
  for (let i = 0; i < count; i++) {
    v.set(raw[i * 3], raw[i * 3 + 1], raw[i * 3 + 2]).applyMatrix4(worldMatrix)
    verts[i * 3] = v.x; verts[i * 3 + 1] = v.y; verts[i * 3 + 2] = v.z
    box.expandByPoint(v)
    if (v.x < mnx) { mnx = v.x; ext.minX = i } if (v.x > mxx) { mxx = v.x; ext.maxX = i }
    if (v.y < mny) { mny = v.y; ext.minY = i } if (v.y > mxy) { mxy = v.y; ext.maxY = i }
    if (v.z < mnz) { mnz = v.z; ext.minZ = i } if (v.z > mxz) { mxz = v.z; ext.maxZ = i }
  }

  // 采样索引：先放 6 个极值点，再放洗牌后的其余点，不足 TARGET 则回绕补齐
  const extremes = [ext.minX, ext.maxX, ext.minY, ext.maxY, ext.minZ, ext.maxZ]
  const order = new Uint32Array(count)
  for (let i = 0; i < count; i++) order[i] = i
  for (let i = count - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const t = order[i]; order[i] = order[j]; order[j] = t
  }
  const pick = new Uint32Array(TARGET)
  const seen = new Set()
  let w = 0
  for (const e of extremes) { if (!seen.has(e) && w < TARGET) { pick[w++] = e; seen.add(e) } }
  let r = 0
  while (w < TARGET) {
    const idx = order[r % count]
    pick[w++] = idx
    r++
  }

  // 写 Float32 xyz（无头，长度固定 TARGET*3；运行时按 3 分量建 BufferAttribute）
  const outArr = new Float32Array(TARGET * 3)
  for (let i = 0; i < TARGET; i++) {
    const s = pick[i]
    outArr[i * 3] = verts[s * 3]
    outArr[i * 3 + 1] = verts[s * 3 + 1]
    outArr[i * 3 + 2] = verts[s * 3 + 2]
  }
  fs.writeFileSync(path.join(OUT_DIR, job.out), Buffer.from(outArr.buffer))

  const size = new THREE.Vector3(); box.getSize(size)
  return {
    name: job.name, out: job.out, srcVerts: count,
    bbox: [size.x.toFixed(3), size.y.toFixed(3), size.z.toFixed(3)].join(' × '),
    bytes: outArr.byteLength,
  }
}

fs.mkdirSync(OUT_DIR, { recursive: true })
console.log('烘焙粒子位置（每个模型 → 65,536 世界坐标点）\n')
let total = 0
for (const job of JOBS) {
  const r = bakeOne(job)
  total += r.bytes
  console.log(`  ✓ ${r.name.padEnd(10)} ${job.file.padEnd(11)} 源顶点 ${r.srcVerts.toLocaleString().padStart(9)}  bbox ${r.bbox.padEnd(22)} → ${r.out}  ${(r.bytes / 1024).toFixed(0)}KB`)
}
console.log(`\n合计 ${(total / 1048576).toFixed(2)}MB（原始 GLB 178MB）`)
