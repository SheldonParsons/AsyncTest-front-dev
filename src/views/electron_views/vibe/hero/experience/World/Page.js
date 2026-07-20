import * as THREE from 'three'
import Experience from '../Experience.js'

import { MathUtils } from "three";

import simVertex from '../Shaders/Particles/simulation.vert';
import simFragment from '../Shaders/Particles/simulation.frag';
import particlesVertex from '../Shaders/Particles/particles.vert';
import particlesFragment from '../Shaders/Particles/particles.frag';

import FBO from "../Utils/FBO.js";

export default class Page {
    constructor() {
        this.experience = new Experience()
        this.debug = this.experience.debug
        this.scene = this.experience.scene
        this.time = this.experience.time
        this.camera = this.experience.camera.instance
        this.renderer = this.experience.renderer.instance
        this.resources = this.experience.resources
        this.sizes = this.experience.sizes
        this.timeline = this.experience.timeline;
        this.isMobile = this.experience.isMobile
        this.cursor = this.experience.cursor

        this.sectionCount = document.querySelectorAll('.section').length - 1
        this.range = 1.0 / parseFloat(this.sectionCount)

        this.currentSectionIndex = 0
        this.currentSection = 0
        this.scrollY = 0
        this.normalizedScrollY = 0

        this.smoothScroll = document.querySelector('.smooth');
        this.scrollTarget = 0
        this.normalizedTargetScrollY = 0

        // 组件卸载时一把移除全部全局监听（防泄漏 + 防止死首屏继续劫持滚轮）
        this._ac = new AbortController()

        this.setScrollControls()
        this.setPointerInteraction()
        this.setFBOParticles()
        this.setBackgroundFrames()

        // 广播初始页码（0），让外层 Vue 一开始就把「进入知识库」按钮藏好。
        this.emitSection()
    }

    // 把当前页码广播给外层（index.vue 据此让「进入知识库」按钮只在末页出现）。
    emitSection() {
        if (typeof window === 'undefined') return
        window.dispatchEvent(new CustomEvent('vibe:section', {
            detail: { index: this.currentSectionIndex, last: this.sectionCount },
        }))
    }

    // 背景帧序列：把视频离线抽成的独立图片（public/frames/*.jpg）当 scene.background。
    // 背景是一张 Texture，逐帧只换 image —— 因为每帧是独立图片，跳到任意帧都是瞬时贴图、
    // 无解码/seek，所以正放/倒放/软停成本完全一样、都不卡（这是取代 VideoTexture 的原因：
    // 视频是时间压缩的，往回 seek 极贵，会拖累整条渲染线程）。帧号由滚动位置驱动（见 update）。
    setBackgroundFrames() {
        this.bgFrames = []
        this.bgFrameCount = 0
        this.bgFrameAspect = 0
        this.frameCur = 0
        this.frameTarget = 0
        this._frameShown = -1

        const tex = new THREE.Texture()
        tex.colorSpace = THREE.SRGBColorSpace
        tex.minFilter = THREE.LinearFilter
        tex.magFilter = THREE.LinearFilter
        tex.generateMipmaps = false
        this.bgTexture = tex
        this.scene.background = tex
        // 压暗背景：当「蒙层」保证白字可读 + 减少 bloom 洗白；值越小越淡（0.18 = 很淡的底纹）
        this.scene.backgroundIntensity = 0.18

        const base = (import.meta && import.meta.env && import.meta.env.BASE_URL) || '/'
        fetch(base + 'frames/manifest.json')
            .then((r) => r.json())
            .then((m) => {
                this.bgFrameCount = m.count
                this.bgFrameAspect = m.width / m.height
                for (let i = 1; i <= m.count; i++) {
                    const img = new Image()
                    img.src = `${base}frames/${m.basename}${String(i).padStart(m.pad, '0')}.${m.ext}`
                    this.bgFrames.push(img)
                }
                // 首帧就绪即显示第 0 帧（进入停在第一帧）
                const first = this.bgFrames[0]
                if (first.complete && first.naturalWidth) this._showFrame(0)
                else first.onload = () => this._showFrame(0)
            })
            .catch((err) => console.error('[Page] 背景帧序列加载失败', err))
    }

    _showFrame(i) {
        const img = this.bgFrames[i]
        if (!img) return
        this.bgTexture.image = img
        this.bgTexture.needsUpdate = true
        this._frameShown = i
    }

    // scene.background 默认拉伸铺满（不保宽高比）。用 repeat/offset 做 cover 裁切，
    // 并叠一层连续「呼吸缩放」——纯时间驱动（和帧无关）→ 丝滑，替代原来一帧帧减速的假软停。
    _fitBgCover() {
        const tex = this.bgTexture
        if (!tex || !this.bgFrameAspect) return
        const va = this.bgFrameAspect
        const sa = this.sizes.width / this.sizes.height
        // 基础 cover
        let rx, ry
        if (va > sa) { rx = sa / va; ry = 1 } else { rx = 1; ry = va / sa }
        const ox = (1 - rx) / 2, oy = (1 - ry) / 2
        // 呼吸缩放：z 在 1 ↔ 1.05 间缓慢来回（周期 ~12.6s），停在某帧时也有轻微放大/缩小
        const z = 1 + 0.05 * (0.5 - 0.5 * Math.cos(this.time.elapsed * 0.5))
        const rxz = rx / z, ryz = ry / z
        tex.repeat.set(rxz, ryz)
        tex.offset.set(ox + (rx - rxz) / 2, oy + (ry - ryz) / 2)
    }

    // Paginated scroll: one wheel/swipe/keyboard gesture advances exactly
    // one section. After a step, input is locked for `scrollLockDuration`
    // ms — long enough for the damped transform in scrollSet() to fully
    // settle — so a fast flick/fling can't skip past multiple sections in
    // one go. The user has to scroll again once the next section is fully
    // in view to keep going.
    setScrollControls() {
        this.scrollLocked = false
        // ms — a plain, UNCONDITIONAL lock duration. Two earlier, cleverer
        // attempts both backfired:
        //  1) A fixed lock that only cared about "has scrollLockDuration
        //     elapsed" let a long trackpad-momentum tail (which fires wheel
        //     events well past typical durations) get reinterpreted as a
        //     brand-new "scroll again" once the timer expired mid-stream,
        //     skipping an extra section.
        //  2) Fix attempts for that (gating the unlock on the wheel event
        //     stream having gone quiet, via a "gesture consumed" flag or a
        //     re-checking quiet-gap timer) both overcorrected: if the user
        //     just keeps scrolling continuously — deliberately, wanting to
        //     advance again — the stream never goes quiet, so the lock
        //     NEVER releases and scrolling looks permanently broken until
        //     the user happens to stop touching the wheel/trackpad for a
        //     moment (which users noticed correlated with moving the mouse
        //     to reposition, but that was incidental, not the actual fix).
        // Conclusion: don't try to detect gesture boundaries via wheel-event
        // timing at all — it's fundamentally unreliable in both directions.
        // Just use a plain, bounded, always-eventually-unlocks timeout.
        // Bumped from 900 to 1100 to give a bit more margin against
        // momentum tails still being mid-flight when it expires — this is
        // a tuning knob, not a fix for either bug above (nothing can fully
        // eliminate the "extra advance" risk without the quiet-gap
        // approach, and that approach is what caused the worse "stuck
        // forever" bug, so this deliberately favors "always eventually
        // responsive" over "never double-advances").
        this.scrollLockDuration = 1100

        const signal = this._ac.signal

        // —— 滚轮：动量「加速度」检测（借鉴 fullPage.js）——
        // 关键区分：一次「甩动」的 wheel 事件流会先冲高、随后单调衰减（惯性尾巴）；而
        // 用户「持续滚动」时 deltaY 维持高位。用「最近 10 样本均值 ≥ 最近 70 样本均值」
        // 判断是否仍在加速：
        //   · 单次甩动 → 冲高时翻一页；尾巴衰减后末端均值 < 中端均值 → 不再翻页 →
        //     力气再大也只前进一张，不越界；
        //   · 持续滚动 → deltaY 维持 → 一直判为加速 → 每次动画结束（锁释放）就再翻一页。
        // 这正好根治两个老毛病：既不是「固定锁 + 尾巴顶过头」的越界，也不是「静默间隔法」
        // 那种——持续滚动时事件永不停、凑不出静默间隔，于是锁释放后全被当尾巴拒掉，非得
        // 停下来挪一下鼠标（制造了间隔）才恢复的「卡住」。动画锁期间只采样、不翻页。
        this._scrollSamples = []
        this._wheelPrevTs = Date.now()
        this._wheelCurTs = this._wheelPrevTs
        // 注意：除以固定的 n（不是实际样本数）——样本不足时会压低「中端均值」，从而让
        // 「持续高位」更容易判为加速、「衰减尾巴」更容易判为减速。与 fullPage 同。
        const avgOfLast = (arr, n) => {
            const tail = arr.slice(Math.max(arr.length - n, 1))
            let sum = 0
            for (let i = 0; i < tail.length; i++) sum += tail[i]
            return sum / n
        }
        window.addEventListener('wheel', (e) => {
            e.preventDefault()
            this._wheelPrevTs = this._wheelCurTs
            this._wheelCurTs = Date.now()
            // 静默 > 200ms 视为一次全新手势，清空动量样本
            if (this._wheelCurTs - this._wheelPrevTs > 200) this._scrollSamples = []
            this._scrollSamples.push(Math.abs(e.deltaY))
            if (this._scrollSamples.length > 150) this._scrollSamples = this._scrollSamples.slice(-100)

            if (this.scrollLocked) return // 动画中：已采样，等解锁后下一个 wheel 事件即刻据加速度判定

            const accelerating = avgOfLast(this._scrollSamples, 10) >= avgOfLast(this._scrollSamples, 70)
            if (accelerating) this.goToSection(e.deltaY > 0 ? 1 : -1)
        }, { passive: false, signal })

        let touchStartY = null
        window.addEventListener('touchstart', (e) => {
            touchStartY = e.touches[0].clientY
        }, { passive: true, signal })
        window.addEventListener('touchmove', (e) => {
            e.preventDefault()
        }, { passive: false, signal })
        window.addEventListener('touchend', (e) => {
            if (touchStartY === null) return
            const deltaY = touchStartY - e.changedTouches[0].clientY
            touchStartY = null
            if (Math.abs(deltaY) < 40) return // ignore tiny/accidental swipes
            this.goToSection(deltaY > 0 ? 1 : -1)
        }, { passive: true, signal })

        window.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowDown' || e.key === 'PageDown') { e.preventDefault(); this.goToSection(1) }
            else if (e.key === 'ArrowUp' || e.key === 'PageUp') { e.preventDefault(); this.goToSection(-1) }
        }, { signal })
    }

    // 所有翻页入口（滚轮 / 触摸 / 键盘 / Vue 按钮）共用同一条状态更新链。
    // force 仅用于明确点击“下一页”的操作，避免按钮被上一段滚轮动画的锁误吞。
    goToSection(delta, force = false) {
        if (this.scrollLocked && !force) return false
        const next = MathUtils.clamp(this.currentSectionIndex + delta, 0, this.sectionCount)
        if (next === this.currentSectionIndex) return false

        this.currentSectionIndex = next
        this.applyScrollTarget()
        this.emitSection()

        this.scrollLocked = true
        clearTimeout(this._scrollLockTimeout)
        this._scrollLockTimeout = setTimeout(() => {
            this.scrollLocked = false
        }, this.scrollLockDuration)
        return true
    }

    // Recomputes scrollY/normalizedScrollY from currentSectionIndex against
    // the current viewport height. Called on every section change and on
    // resize (so a viewport resize doesn't leave scrollY stale).
    applyScrollTarget() {
        this.scrollY = this.currentSectionIndex * window.innerHeight
        this.normalizedScrollY = Math.min(this.scrollY / (this.sectionCount * window.innerHeight), 1.0)
        this.currentSection = this.currentSectionIndex
    }

    // Kept as a safe no-op: World.js still wires a native window 'scroll'
    // listener to this method, but scrolling is no longer native (wheel/
    // touchmove are preventDefault()'d in setScrollControls()), so in
    // practice this should never fire.
    scroll() {}

    // Tracks the mouse and raycasts it onto a plane through the particle
    // system so the simulation shader can push particles away from the
    // cursor (and glow-highlight them in the render shader). Strength eases
    // 0->1 on move / 1->0 when the pointer leaves, so both effects fade in
    // and out instead of snapping. Also tracks clicks: each click records a
    // world position + timestamp that drives an expanding ring impulse in
    // the simulation shader.
    setPointerInteraction() {
        this.mouseNDC = new THREE.Vector2(9999, 9999)
        this.mouseWorld = new THREE.Vector3(9999, 9999, 9999)
        this.mouseStrength = 0
        this.mouseStrengthTarget = 0
        this.raycaster = new THREE.Raycaster()
        this.mousePlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)

        this.clickWorld = new THREE.Vector3(9999, 9999, 9999)
        this.clickTime = -1000

        const updatePointer = (event) => {
            this.mouseNDC.x = (event.clientX / this.sizes.width) * 2 - 1
            this.mouseNDC.y = -(event.clientY / this.sizes.height) * 2 + 1
            this.mouseStrengthTarget = 1
        }

        const triggerClickWave = () => {
            // Reuses the raycaster/plane already kept in sync by updatePointer.
            this.raycaster.setFromCamera(this.mouseNDC, this.camera)
            const hit = new THREE.Vector3()
            if (this.raycaster.ray.intersectPlane(this.mousePlane, hit)) {
                this.clickWorld.copy(hit)
                this.clickTime = this.time.elapsed
            }
        }

        const signal = this._ac.signal
        window.addEventListener('pointermove', updatePointer, { signal })
        window.addEventListener('pointerdown', updatePointer, { signal })
        window.addEventListener('pointerdown', triggerClickWave, { signal })
        document.addEventListener('mouseleave', () => { this.mouseStrengthTarget = 0 }, { signal })
        window.addEventListener('blur', () => { this.mouseStrengthTarget = 0 }, { signal })
    }

    // 卸载清理：移除本 Page 挂在 window/document 上的全部监听 + 清定时器。
    destroy() {
        if (this._ac) this._ac.abort()
        clearTimeout(this._scrollLockTimeout)
    }

    updatePointerInteraction() {
        const lerpSpeed = Math.min(this.time.delta * 5, 1)
        this.mouseStrength += (this.mouseStrengthTarget - this.mouseStrength) * lerpSpeed

        this.raycaster.setFromCamera(this.mouseNDC, this.camera)
        this.raycaster.ray.intersectPlane(this.mousePlane, this.mouseWorld)

        this.simMaterial.uniforms.uMouse.value.copy(this.mouseWorld)
        this.simMaterial.uniforms.uMouseStrength.value = this.mouseStrength
        this.simMaterial.uniforms.uClickPos.value.copy(this.clickWorld)
        this.simMaterial.uniforms.uClickTime.value = this.clickTime

        // Render material gets the same mouse position/strength so the
        // fragment shader can glow-highlight nearby particles.
        this.renderMaterial.uniforms.uMouse.value.copy(this.mouseWorld)
        this.renderMaterial.uniforms.uMouseStrength.value = this.mouseStrength
    }

    // Estimates local vertex density per-vertex using a uniform spatial hash
    // grid (cell size == radius, 27-cell neighborhood search) — O(n) instead
    // of the O(n^2) brute-force distance check. Returns a Float32Array
    // (aligned to the geometry's original vertex index order) normalized to
    // [0,1] via 5th/95th percentile clipping, so a few outlier clumps/gaps
    // don't wash out the rest of the range.
    computeVertexDensities(positionArray, vertAmount, radius) {
        const cellSize = radius
        const grid = new Map()
        const cellIndex = (v) => Math.floor(v / cellSize)
        const keyOf = (cx, cy, cz) => `${cx},${cy},${cz}`

        const cx = new Int32Array(vertAmount)
        const cy = new Int32Array(vertAmount)
        const cz = new Int32Array(vertAmount)

        for (let i = 0; i < vertAmount; i++) {
            const x = positionArray[i * 3 + 0]
            const y = positionArray[i * 3 + 1]
            const z = positionArray[i * 3 + 2]
            const kx = cellIndex(x), ky = cellIndex(y), kz = cellIndex(z)
            cx[i] = kx; cy[i] = ky; cz[i] = kz
            const key = keyOf(kx, ky, kz)
            let bucket = grid.get(key)
            if (!bucket) { bucket = []; grid.set(key, bucket) }
            bucket.push(i)
        }

        const counts = new Float32Array(vertAmount)
        const r2 = radius * radius

        for (let i = 0; i < vertAmount; i++) {
            const x = positionArray[i * 3 + 0]
            const y = positionArray[i * 3 + 1]
            const z = positionArray[i * 3 + 2]
            let count = 0
            for (let dx = -1; dx <= 1; dx++) {
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dz = -1; dz <= 1; dz++) {
                        const bucket = grid.get(keyOf(cx[i] + dx, cy[i] + dy, cz[i] + dz))
                        if (!bucket) continue
                        for (const j of bucket) {
                            const ddx = positionArray[j * 3 + 0] - x
                            const ddy = positionArray[j * 3 + 1] - y
                            const ddz = positionArray[j * 3 + 2] - z
                            if (ddx * ddx + ddy * ddy + ddz * ddz <= r2) count++
                        }
                    }
                }
            }
            counts[i] = count
        }

        const sorted = Float32Array.from(counts).sort()
        const lo = sorted[Math.floor(sorted.length * 0.05)]
        const hi = sorted[Math.floor(sorted.length * 0.95)] || sorted[sorted.length - 1]
        const range = Math.max(hi - lo, 1e-6)

        const densities = new Float32Array(vertAmount)
        for (let i = 0; i < vertAmount; i++) {
            densities[i] = THREE.MathUtils.clamp((counts[i] - lo) / range, 0, 1)
        }

        return densities
    }

    // Bakes a position texture AND a matching color texture for a geometry.
    // Vertices are shuffled (in groups) so the particle morph looks dispersed,
    // and the color for each particle is produced by colorFn so it stays aligned
    // with the position written to the same texel.
    //   colorFn(color, x, y, z, nx, ny, nz, density)
    //     - color : THREE.Color to write into
    //     - x,y,z : final (post-transform) vertex position == vPos in the shader
    //     - nx,ny,nz : position normalized to [0,1] within the geometry bbox
    //     - density : local vertex density in [0,1] (only computed when
    //       options.density is truthy — otherwise always 0)
    //   options.density : true to compute per-vertex density (see
    //     computeVertexDensities above)
    //   options.densityRadius : neighbor-search radius for the density
    //     estimate, in the same units as the (already normalized) geometry
    makeColoredTexture(g, colorFn, options = {}) {
        g.computeBoundingBox()
        const min = g.boundingBox.min
        const max = g.boundingBox.max
        const sx = (max.x - min.x) || 1
        const sy = (max.y - min.y) || 1
        const sz = (max.z - min.z) || 1

        const arr = g.attributes.position.array
        const vertAmount = g.attributes.position.count
        const texWidth = Math.ceil(Math.sqrt(vertAmount))
        const texHeight = Math.ceil(vertAmount / texWidth)

        const densities = options.density
            ? this.computeVertexDensities(arr, vertAmount, options.densityRadius || 0.08)
            : null

        const positionData = new Float32Array(texWidth * texHeight * 4)
        const colorData = new Uint8Array(texWidth * texHeight * 4)

        // Fisher–Yates over vertex indices (keeps xyz grouped together)
        const order = new Uint32Array(vertAmount)
        for (let i = 0; i < vertAmount; i++) order[i] = i
        for (let i = vertAmount - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1))
            const t = order[i]; order[i] = order[j]; order[j] = t
        }

        const c = new THREE.Color()
        for (let i = 0; i < vertAmount; i++) {
            const vi = order[i]
            const x = arr[vi * 3 + 0]
            const y = arr[vi * 3 + 1]
            const z = arr[vi * 3 + 2]

            positionData[i * 4 + 0] = x
            positionData[i * 4 + 1] = y
            positionData[i * 4 + 2] = z
            positionData[i * 4 + 3] = 0

            colorFn(c, x, y, z, (x - min.x) / sx, (y - min.y) / sy, (z - min.z) / sz, densities ? densities[vi] : 0)
            colorData[i * 4 + 0] = Math.round(THREE.MathUtils.clamp(c.r, 0, 1) * 255)
            colorData[i * 4 + 1] = Math.round(THREE.MathUtils.clamp(c.g, 0, 1) * 255)
            colorData[i * 4 + 2] = Math.round(THREE.MathUtils.clamp(c.b, 0, 1) * 255)
            colorData[i * 4 + 3] = 255
        }

        const positionTexture = new THREE.DataTexture(positionData, texWidth, texHeight, THREE.RGBAFormat, THREE.FloatType)
        positionTexture.minFilter = THREE.NearestFilter
        positionTexture.magFilter = THREE.NearestFilter
        positionTexture.generateMipmaps = false
        positionTexture.needsUpdate = true

        const colorTexture = new THREE.DataTexture(colorData, texWidth, texHeight, THREE.RGBAFormat, THREE.UnsignedByteType)
        colorTexture.minFilter = THREE.NearestFilter
        colorTexture.magFilter = THREE.NearestFilter
        colorTexture.generateMipmaps = false
        colorTexture.needsUpdate = true

        return { positionTexture, colorTexture }
    }

    getModelMeshData(modelName, options = {}) {
        const resource = this.resources.items[modelName]

        // stlModel sources resolve directly to a BufferGeometry (STLLoader
        // has no scene graph / node transforms / material), unlike
        // gltfModel/objModel which resolve to a scene we need to traverse.
        if(resource.isBufferGeometry) {
            return {
                geometry: resource.clone(),
                material: null,
            }
        }

        const meshes = []

        resource.scene.updateMatrixWorld(true)
        resource.scene.traverse((child) => {
            if(child.isMesh && child.geometry?.attributes?.position) {
                meshes.push(child)
            }
        })

        if(meshes.length === 0) {
            throw new Error(`No mesh with position geometry found in ${modelName}`)
        }

        const mesh = Number.isInteger(options.meshIndex)
            ? meshes[options.meshIndex]
            : meshes.reduce((largest, current) => {
                return current.geometry.attributes.position.count > largest.geometry.attributes.position.count
                    ? current
                    : largest
            }, meshes[0])

        const geometry = mesh.geometry.clone()
        geometry.applyMatrix4(mesh.matrixWorld)

        return {
            geometry,
            material: Array.isArray(mesh.material) ? mesh.material[0] : mesh.material,
        }
    }

    getModelGeometry(modelName, options = {}) {
        return this.getModelMeshData(modelName, options).geometry
    }

    normalizeGeometry(geometry, size = 5) {
        geometry.computeBoundingBox()

        const box = geometry.boundingBox
        const center = new THREE.Vector3()
        const currentSize = new THREE.Vector3()

        box.getCenter(center)
        box.getSize(currentSize)

        const maxAxis = Math.max(currentSize.x, currentSize.y, currentSize.z)

        geometry.translate(-center.x, -center.y, -center.z)

        if(maxAxis > 0) {
            const scale = size / maxAxis
            geometry.scale(scale, scale, scale)
        }

        return geometry
    }

    setFBOParticles() {
        // width and height of FBO
        const width = 256;
        const height = 256;

        // ----- Morph sequence (3 slots: A -> B -> C) -----
        // A: user-supplied glb (propeller plane, slotA.glb) — hard
        //    white/blue split (fuselage white, wings blue)
        // B: user-supplied glb (rocket, slotB.glb) — density-based
        //    light-blue (sparse) -> yellow (dense)
        // C: green/white A logo (logo2.glb) — clean diagonal split,
        //    computed live in particles.frag from vPos
        this.customGeometry = this.getModelGeometry('smModel')
        this.normalizeGeometry(this.customGeometry, 2.2)
        this.customGeometry.rotateY(Math.PI)
        // Bird's-eye (top-down) view with the nose heading toward the
        // lower-left, per user request. rotateX(-PI/2) swings the model's
        // small-span "up" axis onto the camera's depth axis, turning the
        // side-on silhouette into a top-down one. The remaining Z-rotation
        // to aim the nose was derived from an offline trimesh/matplotlib
        // scatter render of the raw mesh — but that offline render's Y axis
        // turned out to be mirrored relative to how it actually lands on
        // screen (confirmed empirically: PI*3/4 put the nose at upper-left
        // live, not lower-left as predicted offline). PI/4 is the
        // Y-mirror-corrected angle that actually produces lower-left on
        // screen — verified against the live screenshot. See HANDOFF.md.
        this.customGeometry.rotateX(-Math.PI / 2)
        this.customGeometry.rotateZ(Math.PI / 4)
        // NOTE: not verified in-browser (no reliable browser access this
        // session — see "Verification is offline" gotcha in HANDOFF.md's
        // history). If it looks flipped/mirrored, try removing the
        // rotateY(Math.PI) above, or toggle it — see gotcha 5.

        this.burstGeometry = this.getModelGeometry('scModel')
        this.normalizeGeometry(this.burstGeometry, 2.2)
        this.burstGeometry.rotateY(Math.PI)
        // Mirror left/right (nose was pointing upper-right, wanted upper-left).
        // Pure reflection — fine for a Points cloud since there are no faces/
        // normals in play, only vertex positions.
        this.burstGeometry.scale(-1, 1, 1)

        this.refinedAGeometry = this.getModelGeometry('logoModel')
        this.normalizeGeometry(this.refinedAGeometry, 2.2)
        this.refinedAGeometry.rotateY(Math.PI)

        // ----- Colors per slot -----
        const colBlue       = new THREE.Color('#2f7bff')
        const colWhite       = new THREE.Color('#ffffff')
        const colGreen       = new THREE.Color('#22ff77')

        // A: hard white/blue split (no blending) — fuselage (|x| < 0.35,
        // center strip: nose/cockpit/tail/landing gear) is white, wings
        // (|x| >= 0.35) are blue. Threshold picked offline against this
        // model's actual wingspan/fuselage-width ratio (see HANDOFF).
        const slotA = this.makeColoredTexture(this.customGeometry,
            (c, x, y, z, nx, ny, nz) => { Math.abs(x) < 0.35 ? c.copy(colWhite) : c.copy(colBlue) })
        // B: switched from a density-based light-blue/yellow gradient to
        // the SAME hard white/blue split style as slot A, per explicit
        // request ("马和火箭的粒子效果怎么这么奇怪，改成和飞机一样的配置").
        // The density gradient read as patchy/noisy rather than a clean
        // designed look, especially after normalizeGeometry's target size
        // dropped from 2.8 to 2.2 earlier this session without
        // correspondingly retuning densityRadius (0.08 was picked for the
        // old scale, so it covered a proportionally larger neighborhood
        // once the model shrank — likely made the gradient blotchier).
        // burstGeometry is normalized to the same target size (2.2) as
        // customGeometry, so reusing the identical 0.35 threshold keeps
        // this literally "the same configuration as the plane."
        const slotB = this.makeColoredTexture(this.burstGeometry,
            (c, x, y, z, nx, ny, nz) => { Math.abs(x) < 0.35 ? c.copy(colWhite) : c.copy(colBlue) })
        // C: white A body (left) / green slash (right). The actual logo color is
        // computed live from vPos in particles.frag; this texture is unused but
        // kept consistent. positionTexture (the shape) IS used.
        const slotC = this.makeColoredTexture(this.refinedAGeometry,
            (c, x, y, z) => { (x < 0.5 * y - 0.219) ? c.copy(colGreen) : c.copy(colWhite) })

        var uTextureA = slotA.positionTexture
        var uTextureB = slotB.positionTexture
        var uTextureC = slotC.positionTexture

        //simulation shader used to update the particles' positions
        this.simMaterial = new THREE.ShaderMaterial({
            uniforms:{
                uTextureA: { type: "t", value: uTextureA },
                uTextureB: { type: "t", value: uTextureB },
                uTextureC: { type: "t", value: uTextureC },
                uTime: { value: 0 },
                uScroll : { value: this.normalizedScrollY },
                uMouse: { value: new THREE.Vector3(9999, 9999, 9999) },
                uMouseStrength: { value: 0 },
                // This (not the glow in particles.frag) is the actual
                // "hover enlarges the particle image" effect the user
                // meant — pushing particles apart around the cursor reads
                // as a local bulge/magnifying-lens expansion. Cut both
                // reach (radius) and strength (force) well over half.
                uMouseRadius: { value: 0.55 },
                uMouseForce: { value: 0.25 },
                uClickPos: { value: new THREE.Vector3(9999, 9999, 9999) },
                uClickTime: { value: -1000 },
                uClickSpeed: { value: 3.0 },
                uClickThickness: { value: 0.35 },
                uClickLife: { value: 1.4 },
                uClickForce: { value: 1.0 },
            },
            defines:
            {
                uTotalModels : parseFloat(this.sectionCount).toFixed(2),
            },
            vertexShader: simVertex,
            fragmentShader:  simFragment
        });

        //render shader to display the particles on screen
        //the 'positions' uniform will be set after the FBO.update() call
        this.renderMaterial = new THREE.ShaderMaterial( {
            uniforms: {
                uPositions: { value: null },
                uSize: { value: 8 },
                uTime: { value: 0 },
                uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
                uScroll : { value: this.normalizedScrollY },
                uColorA: { value: slotA.colorTexture },
                uColorB: { value: slotB.colorTexture },
                uMouse: { value: new THREE.Vector3(9999, 9999, 9999) },
                uMouseStrength: { value: 0 },
                // Halved+ per feedback — the brightness boost near the
                // cursor gets picked up by UnrealBloomPass and blurred out,
                // which read as the particle image "zooming in"/enlarging
                // on hover, more than intended. Both radius (how far the
                // effect reaches) and intensity (how much brighter/how much
                // bloom it triggers) cut down together.
                uGlowRadius: { value: 0.75 },
                uGlowIntensity: { value: 0.7 },
                uResolution: new THREE.Uniform(
                    new THREE.Vector2(
                        this.sizes.width * this.sizes.pixelRatio,
                        this.sizes.height * this.sizes.pixelRatio
                    )
                ),
            },
            defines:
            {
                uTotalModels : parseFloat(this.sectionCount).toFixed(2),
                uRange : this.range,
            },
            vertexShader: particlesVertex,
            fragmentShader: particlesFragment,
            transparent: true,
            depthWrite: false,
            blending: THREE.NormalBlending
        } );

        // Initialize the FBO
        this.fbo = new FBO(width, height, this.renderer, this.simMaterial, this.renderMaterial);

        // Add the particles to the scene
        this.scene.add(this.fbo.particles);
    }

    // Background "running horse" layer was added, then removed again per
    // request ("把马去掉吧"). Full implementation history (real bugs found
    // and fixed along the way — invisible due to a transform-order bug,
    // stipple-mesh vs. real Points, color matching, etc.) is preserved in
    // HANDOFF.md in case it needs to come back a third time.

    resize() {
        this.fbo.resize(this.sizes.width, this.sizes.height);
        this.renderMaterial.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio, 2)
        this.renderMaterial.uniforms.uResolution.value.set(this.sizes.width * this.sizes.pixelRatio, this.sizes.height * this.sizes.pixelRatio)
        this.applyScrollTarget()
    }

    scrollSet()
    {
        const lambda = this.isMobile ? 9 : 3
        this.normalizedTargetScrollY = MathUtils.damp(this.normalizedTargetScrollY, this.normalizedScrollY, lambda, this.time.delta);

        this.simMaterial.uniforms.uScroll.value = this.normalizedTargetScrollY
        this.renderMaterial.uniforms.uScroll.value = this.normalizedTargetScrollY

        this.scrollTarget = MathUtils.damp(this.scrollTarget, this.scrollY, lambda, this.time.delta);

        this.smoothScroll.style.webkitTransform = 'translate3d(0px, -' + this.scrollTarget + 'px, 0px)';
        this.smoothScroll.style.mozTransform = 'translate3d(0px, -' + this.scrollTarget + 'px, 0px)';
        this.smoothScroll.style.transform = 'translate3d(0px, -' + this.scrollTarget + 'px, 0px)';
    }

    setDebug() {
        // Debug
        if(this.debug.active)
        {
            //this.debugFolder = this.debug.gui.addFolder('Cube')
            //this.debugFolder.open()
        }
    }

    update() {
        this.simMaterial.uniforms.uTime.value = this.time.elapsed
        this.renderMaterial.uniforms.uTime.value = this.time.elapsed

        // 背景帧序列：帧号朝目标【匀速】推进（约 0.8s 走完一段）。不做减速尾巴——
        // 源帧有限，减速到末尾会一帧一帧地顿，看着卡；匀速节奏均匀反而顺。
        // 到位后画面靠 _fitBgCover 里的连续「呼吸缩放」保持轻微放大/缩小，不死定在一帧。
        if (this.bgFrameCount > 0) {
            const maxIdx = Math.max(1, this.sectionCount)
            this.frameTarget = (this.currentSectionIndex / maxIdx) * (this.bgFrameCount - 1)
            const framesPerSection = (this.bgFrameCount - 1) / maxIdx
            const diff = this.frameTarget - this.frameCur
            const dist = Math.abs(diff)
            if (dist < 0.5) {
                this.frameCur = this.frameTarget
            } else {
                // 慢速匀速播放（一段约 PLAY_SEC 秒，越大越慢）；但落后越多追得越快
                // （≈ CATCH_SEC 秒内追上）→ 快速连滚时把落差控制在约 1 段内，不严重脱节。
                const PLAY_SEC = 1.8
                const CATCH_SEC = 1.2
                const slowRate = framesPerSection / PLAY_SEC // 基础慢速
                const catchRate = dist / CATCH_SEC           // 有界 lag：落后越多越快
                const rate = Math.max(slowRate, catchRate)
                this.frameCur += Math.sign(diff) * Math.min(dist, rate * this.time.delta)
            }
            const fi = Math.round(this.frameCur)
            if (fi !== this._frameShown) {
                const img = this.bgFrames[fi]
                if (img && img.complete && img.naturalWidth) this._showFrame(fi)
            }
            this._fitBgCover()
        }

        this.scrollSet()
        this.updatePointerInteraction()

        this.fbo.update();

        // Layout is left-text / right-visual, but the particle system sits
        // at world origin (screen center) by default, crowding the left
        // text column. Rather than moving the particle object itself
        // (which would desync uMouse's world-space math from the FBO's
        // local-space positions), we dolly the camera sideways instead:
        // Camera.js sets the initial look-at once and never re-aims, so a
        // pure position.x change afterwards is a parallax translation, not
        // an orbit. IMPORTANT sign note (got this backwards once already):
        // Camera.js's lookAt has eye=(0,0,-4) looking toward world +Z, which
        // is a "camera behind the origin, facing forward" setup — for THIS
        // orientation, THREE's lookAt basis construction puts the camera's
        // local +X ("right") axis on WORLD -X, not world +X (verified via
        // the actual gluLookAt-style basis formula: xaxis = cross(up,
        // zaxis) with zaxis = normalize(eye-target) = (0,0,-1), giving
        // xaxis = (-1,0,0)). So a POSITIVE camera.position.x is what shifts
        // world-origin content to the right on screen; negative shifts it
        // further left, which is exactly the wrong-direction change made
        // previously. +1.7 is a tuned starting point; adjust here if it
        // needs to sit further right/left.
        const cameraOffsetX = 1.7
        this.camera.position.x += (cameraOffsetX + this.cursor.x * 0.5 - this.camera.position.x) * 5 * this.time.delta
        this.camera.position.y += (- this.cursor.y * 0.5 - this.camera.position.y) * 5 * this.time.delta
    }
}
