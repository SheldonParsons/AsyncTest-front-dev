<template>
  <div class="plant-stage" :style="stageStyle" aria-hidden="true">
    <svg ref="svgRef" viewBox="0 0 860 720">
      <defs>
        <linearGradient id="pgTrunk" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stop-color="#4c321d" />
          <stop offset=".5" stop-color="#75502c" />
          <stop offset="1" stop-color="#a87d43" />
        </linearGradient>
        <linearGradient id="pgBranch" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stop-color="#5a3b22" />
          <stop offset="1" stop-color="#8c6938" />
        </linearGradient>
        <linearGradient id="pgLeafA" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stop-color="#2f7441" />
          <stop offset="1" stop-color="#8cc760" />
        </linearGradient>
        <linearGradient id="pgLeafB" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stop-color="#3f843a" />
          <stop offset="1" stop-color="#badc6a" />
        </linearGradient>
        <linearGradient id="pgLeafC" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stop-color="#27684a" />
          <stop offset="1" stop-color="#75bd76" />
        </linearGradient>
        <linearGradient id="pgLeafD" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stop-color="#458a42" />
          <stop offset="1" stop-color="#d0e179" />
        </linearGradient>
        <path id="pgLeafShape" class="leaf-edge" d="M0 0 C-9 -8 -10 -23 0 -35 C10 -23 9 -8 0 0Z" />
      </defs>

      <g ref="treeGroupRef">
        <g>
          <path ref="trunkRef" class="branch trunk" d="M430 680 C410 585 419 506 432 426 C446 340 433 252 412 162" />
          <path ref="trunkHighlightRef" class="branch trunk-highlight" d="M438 668 C424 580 432 510 441 432 C455 342 441 253 421 170" />
          <path data-b class="branch branch-thick" d="M428 452 C353 407 286 354 207 278" />
          <path data-b class="branch branch-thick" d="M436 420 C523 377 594 311 676 222" />
          <path data-b class="branch branch-mid" d="M425 348 C350 310 281 254 213 178" />
          <path data-b class="branch branch-mid" d="M425 304 C502 273 576 218 648 149" />
          <path data-b class="branch branch-mid" d="M418 238 C371 205 336 160 306 101" />
          <path data-b class="branch branch-mid" d="M419 214 C466 182 504 137 542 76" />
          <path data-b class="branch branch-thin" d="M272 348 C221 345 180 322 137 284" />
          <path data-b class="branch branch-thin" d="M286 358 C252 402 219 431 169 452" />
          <path data-b class="branch branch-thin" d="M588 323 C637 330 681 306 728 264" />
          <path data-b class="branch branch-thin" d="M579 325 C618 361 662 385 721 402" />
          <path data-b class="branch branch-thin" d="M286 252 C239 229 204 195 169 146" />
          <path data-b class="branch branch-thin" d="M291 255 C244 275 203 301 160 337" />
          <path data-b class="branch branch-thin" d="M573 222 C623 216 666 185 710 134" />
          <path data-b class="branch branch-thin" d="M573 224 C611 258 657 275 720 284" />
          <path data-b class="branch branch-thin" d="M337 160 C298 139 270 108 244 67" />
          <path data-b class="branch branch-thin" d="M504 137 C548 125 583 95 617 53" />
        </g>

        <g>
          <ellipse ref="haze0Ref" class="cluster-haze" cx="430" cy="285" rx="330" ry="245" />
          <ellipse ref="haze1Ref" class="cluster-haze" cx="430" cy="395" rx="275" ry="145" />
        </g>
        <g ref="leafLayerRef" />
      </g>
    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

const props = withDefaults(defineProps<{
  size?: number | string
}>(), {
  size: 168,
})

const stageStyle = computed(() => {
  const v = typeof props.size === 'number' ? `${props.size}px` : String(props.size)
  return { maxWidth: v }
})

const svgRef = ref<SVGSVGElement | null>(null)
const treeGroupRef = ref<SVGGElement | null>(null)
const trunkRef = ref<SVGPathElement | null>(null)
const trunkHighlightRef = ref<SVGPathElement | null>(null)
const leafLayerRef = ref<SVGGElement | null>(null)
const haze0Ref = ref<SVGEllipseElement | null>(null)
const haze1Ref = ref<SVGEllipseElement | null>(null)

const GROW_DURATION = 3100
const svgNS = 'http://www.w3.org/2000/svg'
let rafId = 0

const clusters = [
  { id: 'center', cx: 430, cy: 270, rx: 300, ry: 215, start: .54, count: 260, bias: 0, amp: 1.0 },
  { id: 'lower', cx: 430, cy: 405, rx: 280, ry: 130, start: .58, count: 210, bias: 0, amp: .8 },
  { id: 'left', cx: 255, cy: 315, rx: 195, ry: 140, start: .58, count: 175, bias: -18, amp: 1.15 },
  { id: 'right', cx: 605, cy: 300, rx: 202, ry: 145, start: .58, count: 180, bias: 18, amp: 1.12 },
  { id: 'topLeft', cx: 350, cy: 145, rx: 185, ry: 128, start: .64, count: 140, bias: -8, amp: 1.25 },
  { id: 'topRight', cx: 520, cy: 140, rx: 190, ry: 130, start: .64, count: 145, bias: 8, amp: 1.22 },
  { id: 'farLeft', cx: 165, cy: 360, rx: 125, ry: 92, start: .62, count: 105, bias: -30, amp: 1.35 },
  { id: 'farRight', cx: 710, cy: 360, rx: 128, ry: 94, start: .62, count: 108, bias: 30, amp: 1.35 },
  { id: 'crown', cx: 430, cy: 105, rx: 130, ry: 92, start: .70, count: 95, bias: 0, amp: 1.45 },
  { id: 'midLeftFill', cx: 315, cy: 240, rx: 150, ry: 130, start: .60, count: 130, bias: -12, amp: 1.05 },
  { id: 'midRightFill', cx: 535, cy: 238, rx: 152, ry: 128, start: .60, count: 132, bias: 12, amp: 1.05 },
  { id: 'bottomLeftFill', cx: 305, cy: 430, rx: 135, ry: 78, start: .66, count: 100, bias: -10, amp: .92 },
  { id: 'bottomRightFill', cx: 555, cy: 422, rx: 138, ry: 80, start: .66, count: 104, bias: 10, amp: .92 },
  { id: 'frontCenter', cx: 430, cy: 330, rx: 205, ry: 150, start: .66, count: 260, bias: 0, amp: .78 },
  { id: 'frontCanopyA', cx: 350, cy: 305, rx: 170, ry: 138, start: .67, count: 175, bias: -8, amp: .72 },
  { id: 'frontCanopyB', cx: 515, cy: 300, rx: 175, ry: 140, start: .67, count: 180, bias: 8, amp: .72 },
  { id: 'frontLower', cx: 430, cy: 455, rx: 250, ry: 92, start: .70, count: 210, bias: 0, amp: .64 },
]

function clamp(v: number, a = 0, b = 1) { return Math.max(a, Math.min(b, v)) }
function smooth(t: number) { t = clamp(t); return t * t * (3 - 2 * t) }
function spring(t: number) { t = clamp(t); return 1 - Math.cos(t * Math.PI * 4.1) * Math.exp(-t * 6.0) }

onMounted(() => {
  const svg = svgRef.value
  if (!svg) return
  const branchEls = Array.from(svg.querySelectorAll<SVGPathElement>('[data-b]'))
  const branches: { el: SVGPathElement; len: number }[] = []
  if (trunkRef.value) branches.push({ el: trunkRef.value, len: trunkRef.value.getTotalLength() })
  if (trunkHighlightRef.value) branches.push({ el: trunkHighlightRef.value, len: trunkHighlightRef.value.getTotalLength() })
  branchEls.forEach((el) => {
    const len = el.getTotalLength()
    branches.push({ el, len })
  })
  branches.forEach((b) => {
    b.el.style.strokeDasharray = String(b.len)
    b.el.style.strokeDashoffset = String(b.len)
  })

  let seed = 44
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0
    return seed / 4294967296
  }

  const leafLayer = leafLayerRef.value
  const clusterNodes: any[] = []
  if (leafLayer) {
    clusters.forEach((cluster, index) => {
      const group = document.createElementNS(svgNS, 'g')
      group.setAttribute('class', 'cluster')
      leafLayer.appendChild(group)
      for (let i = 0; i < cluster.count; i++) {
        const angle = rand() * Math.PI * 2
        const radius = Math.sqrt(rand())
        const x = Math.cos(angle) * cluster.rx * radius
        const y = Math.sin(angle) * cluster.ry * radius
        const size = 14 + rand() * 22
        const rotate = cluster.bias + (rand() - .5) * 90
        const cls = ['leaf-a', 'leaf-b', 'leaf-c', 'leaf-d'][Math.floor(rand() * 4)]
        const use = document.createElementNS(svgNS, 'use')
        use.setAttribute('href', '#pgLeafShape')
        use.setAttribute('class', `leaf-use ${cls}`)
        use.setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${rotate.toFixed(2)}) scale(${(size / 35).toFixed(3)})`)
        group.appendChild(use)
      }
      clusterNodes.push({ group, ...cluster, phase: index * 1.37 })
    })
  }

  const treeGroup = treeGroupRef.value
  const haze0 = haze0Ref.value
  const haze1 = haze1Ref.value
  const startTime = performance.now()

  const tick = (now: number) => {
    const t = clamp((now - startTime) / GROW_DURATION)
    const mature = t >= 1
    const windPower = mature ? 1 : smooth((t - .74) / .18)
    const trunkSway = (Math.sin(now * .00072) * 1.0 + Math.sin(now * .0014 + 2) * .55) * windPower
    if (treeGroup) {
      treeGroup.style.transformOrigin = '430px 680px'
      treeGroup.style.transform = `rotate(${trunkSway}deg)`
    }

    const drawPath = (b: { el: SVGPathElement; len: number }, visible: number) => {
      const v = clamp(visible)
      b.el.style.strokeDashoffset = String(b.len * (1 - v))
      b.el.style.opacity = String(smooth(v))
    }

    drawPath(branches[0], smooth(t / .24))
    drawPath(branches[1], smooth(t / .26))
    drawPath(branches[2], smooth((t - .22) / .17))
    drawPath(branches[3], smooth((t - .25) / .17))
    drawPath(branches[4], smooth((t - .33) / .16))
    drawPath(branches[5], smooth((t - .36) / .16))
    drawPath(branches[6], smooth((t - .43) / .14))
    drawPath(branches[7], smooth((t - .45) / .14))
    for (let i = 8; i < branches.length; i++) drawPath(branches[i], smooth((t - .48 - (i - 8) * .015) / .12))

    const haze = smooth((t - .54) / .26)
    if (haze0) {
      haze0.style.opacity = String(haze * .92)
      haze0.setAttribute('transform', `scale(${0.25 + haze * .75})`)
    }
    if (haze1) {
      haze1.style.opacity = String(haze * .78)
      haze1.setAttribute('transform', `scale(${0.28 + haze * .72})`)
    }

    for (const c of clusterNodes) {
      const grow = spring((t - c.start) / .18)
      const visible = smooth((t - c.start) / .13)
      const sway = (Math.sin(now * (.00105 + c.amp * .0001) + c.phase) * 2.1 + Math.sin(now * .0022 + c.phase) * .8) * windPower * c.amp
      const bob = Math.sin(now * .0015 + c.phase) * 2.2 * windPower * c.amp
      const scale = 0.12 + clamp(grow) * .88
      c.group.style.opacity = String(visible)
      c.group.setAttribute('transform', `translate(${c.cx} ${c.cy + bob}) rotate(${sway}) scale(${scale})`)
    }

    rafId = requestAnimationFrame(tick)
  }
  rafId = requestAnimationFrame(tick)
})

onBeforeUnmount(() => {
  if (rafId) cancelAnimationFrame(rafId)
})
</script>

<style scoped lang="scss">
.plant-stage {
  width: 100%;
  max-width: 168px;
  aspect-ratio: 1.18;
  pointer-events: none;
  display: block;
  margin: 0 auto;
}

svg {
  width: 100%;
  height: 100%;
  display: block;
  overflow: hidden;
  background: transparent;
}

:deep(.branch) {
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
  filter: drop-shadow(0 5px 5px rgba(65, 41, 24, .12));
}

:deep(.trunk) { stroke: url(#pgTrunk); stroke-width: 38; }
:deep(.trunk-highlight) { stroke: rgba(239, 200, 127, .28); stroke-width: 7; stroke-dasharray: 11 18; }
:deep(.branch-thick) { stroke: url(#pgBranch); stroke-width: 24; }
:deep(.branch-mid) { stroke: url(#pgBranch); stroke-width: 16; }
:deep(.branch-thin) { stroke: #6e5632; stroke-width: 8.5; opacity: .92; }

:deep(.cluster) {
  opacity: 0;
  transform-box: fill-box;
  transform-origin: center;
  will-change: transform, opacity;
  filter: drop-shadow(0 7px 8px rgba(29, 73, 36, .11));
}

:deep(.cluster-haze) {
  opacity: 0;
  fill: rgba(49, 116, 54, .16);
  filter: blur(18px);
  will-change: opacity, transform;
}

:deep(.leaf-use) {
  transform-box: fill-box;
  transform-origin: center;
}

:deep(.leaf-a) { fill: url(#pgLeafA); }
:deep(.leaf-b) { fill: url(#pgLeafB); }
:deep(.leaf-c) { fill: url(#pgLeafC); }
:deep(.leaf-d) { fill: url(#pgLeafD); }

:deep(.leaf-edge) {
  stroke: rgba(24, 81, 38, .16);
  stroke-width: .55;
}
</style>
