<template>
  <TabsList
    ref="listRef"
    class="step-nav"
    :class="{ 'is-measured': measured }"
    aria-label="报告配置步骤"
    :style="indicatorStyle"
  >
    <span class="step-nav-indicator" aria-hidden="true" />
    <TabsTrigger
      v-for="(item, index) in steps"
      :key="item.key"
      :value="item.key"
      class="step-nav-item"
      :class="{ 'is-complete': isComplete(item.key, index) }"
    >
      <span class="step-nav-rail" aria-hidden="true">
        <span class="step-nav-node">
          <CircleCheck v-if="isComplete(item.key, index)" :size="12" />
          <span v-else class="step-nav-index">{{ pad(index + 1) }}</span>
        </span>
      </span>
      <span class="step-nav-body">
        <span class="step-nav-title">{{ item.title }}</span>
        <span class="step-nav-subtitle">{{ navSubtitle(item.key) }}</span>
      </span>
      <span v-if="countFor(item.key)" class="step-nav-count">{{
        countFor(item.key)
      }}</span>
    </TabsTrigger>
  </TabsList>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { TabsList, TabsTrigger } from "reka-ui";
import { CircleCheck } from "@/components/icons/lucide";
import type { ReportPage } from "../validation";

const props = defineProps<{
  steps: readonly { key: ReportPage; title: string }[];
  active: ReportPage;
  /** 返回该步骤未完成的项数；0 表示已就绪。 */
  issueCount: (key: ReportPage) => number;
  subtitle: (key: ReportPage) => string;
}>();

const listRef = ref<HTMLElement>();
const measured = ref(false);
// 指示器几何：用一个几何对象驱动，而不是给每项各写一套背景，
// 这样位移是连续的，切换步骤时能看到它“滑”过去而不是闪一下。
const geometry = ref({ x: 0, y: 0, w: 0, h: 0 });

const indicatorStyle = computed(() => ({
  "--ind-x": `${geometry.value.x}px`,
  "--ind-y": `${geometry.value.y}px`,
  "--ind-w": `${geometry.value.w}px`,
  "--ind-h": `${geometry.value.h}px`,
}));

const pad = (value: number) => String(value).padStart(2, "0");
const isComplete = (key: ReportPage, index: number) =>
  index < 4 && props.issueCount(key) === 0;
const countFor = (key: ReportPage) => props.issueCount(key);
const navSubtitle = (key: ReportPage) => props.subtitle(key);

/** TabsList 的模板 ref 拿到的是组件实例，这里统一取到真正的 DOM 节点。 */
function listEl(): HTMLElement | undefined {
  const value = listRef.value as unknown;
  if (!value) return undefined;
  if (value instanceof HTMLElement) return value;
  return (value as { $el?: HTMLElement }).$el;
}
function measure() {
  const list = listEl();
  if (!list?.querySelector) return;
  const active = list.querySelector<HTMLElement>('[data-state="active"]');
  if (!active) return;
  const listBox = list.getBoundingClientRect();
  const box = active.getBoundingClientRect();
  geometry.value = {
    x: box.left - listBox.left + list.scrollLeft,
    y: box.top - listBox.top + list.scrollTop,
    w: box.width,
    h: box.height,
  };
  // 首帧先让指示器就位再打开过渡，避免它从左上角飞进来。
  if (!measured.value) {
    requestAnimationFrame(() => (measured.value = true));
  }
}

let observer: ResizeObserver | undefined;
onMounted(async () => {
  await nextTick();
  measure();
  observer = new ResizeObserver(() => measure());
  const el = listEl();
  if (el) observer.observe(el);
  window.addEventListener("resize", measure);
});
onBeforeUnmount(() => {
  observer?.disconnect();
  window.removeEventListener("resize", measure);
});
watch(() => [props.active, props.steps.length], () => nextTick(measure));
</script>

<style lang="scss">
.step-nav {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 2px;
  isolation: isolate;
}
.step-nav-indicator {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 0;
  width: var(--ind-w);
  height: var(--ind-h);
  border-radius: 10px;
  background: #ffffff;
  box-shadow:
    0 1px 2px rgb(16 16 16 / 5%),
    0 6px 18px rgb(16 16 16 / 7%);
  transform: translate3d(var(--ind-x), var(--ind-y), 0);
  opacity: 0;
  pointer-events: none;
}
.step-nav.is-measured .step-nav-indicator {
  opacity: 1;
  transition:
    transform 0.42s cubic-bezier(0.22, 1, 0.36, 1),
    width 0.42s cubic-bezier(0.22, 1, 0.36, 1),
    height 0.42s cubic-bezier(0.22, 1, 0.36, 1),
    opacity 0.2s ease;
}
.step-nav-item {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: flex-start;
  gap: 11px;
  width: 100%;
  padding: 9px 11px;
  text-align: left;
  color: #8a8a8a;
  background: transparent;
  border: 0;
  border-radius: 10px;
  cursor: pointer;
  transition: color 0.2s ease;
}
.step-nav-item:hover {
  color: #4a4a4a;
}
.step-nav-item[data-state="active"] {
  color: #171717;
}
.step-nav-rail {
  position: relative;
  flex-shrink: 0;
  width: 20px;
  align-self: stretch;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.step-nav-node {
  display: grid;
  place-items: center;
  width: 20px;
  height: 20px;
  margin-top: 1px;
  font-size: 10px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: #a3a3a3;
  background: #f0f0f0;
  border-radius: 6px;
  transition:
    background 0.24s ease,
    color 0.24s ease,
    box-shadow 0.24s ease;
}
.step-nav-item[data-state="active"] .step-nav-node {
  color: #ffffff;
  background: #171717;
}
.step-nav-item.is-complete .step-nav-node {
  color: #0b6b57;
  background: #e8f6f1;
}
.step-nav-item.is-complete[data-state="active"] .step-nav-node {
  color: #ffffff;
  background: #009879;
}
/* 步骤之间用细线串起来，让“这是一条顺序”成立。 */
.step-nav-item:not(:last-child) .step-nav-rail::after {
  content: "";
  flex: 1;
  width: 1px;
  margin: 4px 0 2px;
  background: #e6e6e6;
  transition: background 0.24s ease;
}
.step-nav-item.is-complete:not(:last-child) .step-nav-rail::after {
  background: #b9e3d8;
}
.step-nav-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.step-nav-title {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.01em;
  transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}
.step-nav-item[data-state="active"] .step-nav-title {
  transform: translateX(1px);
}
.step-nav-subtitle {
  font-size: 11px;
  line-height: 1.4;
  color: #a0a0a0;
  transition: color 0.2s ease;
}
.step-nav-item[data-state="active"] .step-nav-subtitle {
  color: #8a8a8a;
}
.step-nav-count {
  flex-shrink: 0;
  align-self: center;
  min-width: 18px;
  padding: 1px 5px;
  font-size: 10px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  text-align: center;
  color: #8f1d12;
  background: #fdeceb;
  border-radius: 5px;
  transition: background 0.24s ease;
}
.step-nav-item[data-state="active"] .step-nav-count {
  color: #ffffff;
  background: #b42318;
}

/* 窄屏：导航折成横向条，指示器改由测量出的 x/width 驱动。 */
@media (max-width: 900px) {
  .step-nav {
    flex-direction: row;
    gap: 4px;
    overflow-x: auto;
    padding: 6px 0;
    scrollbar-width: none;
  }
  .step-nav-item {
    width: auto;
    flex-shrink: 0;
    align-items: center;
    gap: 8px;
    padding: 6px 10px;
  }
  .step-nav-rail {
    width: auto;
  }
  .step-nav-node {
    margin-top: 0;
  }
  .step-nav-rail::after {
    display: none;
  }
  .step-nav-subtitle {
    display: none;
  }
  .step-nav-body {
    flex: none;
  }
}
@media (prefers-reduced-motion: reduce) {
  .step-nav.is-measured .step-nav-indicator,
  .step-nav-title,
  .step-nav-node,
  .step-nav-count {
    transition: none;
  }
}
</style>
