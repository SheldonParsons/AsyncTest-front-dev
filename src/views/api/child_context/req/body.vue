<template>
  <el-row style="margin-top: 20px">
    <el-col :span="24" class="table-col">
      <el-row style="margin-bottom: 20px">
        <el-col :span="24">
          <!-- 自定义高级 Body Type 选择器 -->
          <div class="body-type-selector">
            <div class="selector-track" ref="trackRef">
              <div
                class="selector-indicator"
                :style="indicatorStyle"
              ></div>
              <button
                v-for="(item, index) in bodyTypeOptions"
                :key="item.value"
                :ref="el => setButtonRef(item.value, el)"
                :class="['selector-item', { active: bodyType === item.value }]"
                @click="handleBodyTypeChange(item.value, index)"
                @mouseenter="handleItemHover(index)"
                @mouseleave="handleItemLeave"
              >
                <span class="item-label">{{ item.label }}</span>
                <span class="item-glow"></span>
              </button>
            </div>
          </div>
        </el-col>
      </el-row>
      <el-row v-if="bodyType == 'none'">
        <el-col :span="24">
          <div class="empty-body g-unselect">
            <div class="empty-body-content">
              <div class="empty-icon-wrapper">
                <svg class="empty-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5" opacity="0.2"/>
                  <path d="M12 8v4m0 4h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
                <div class="pulse-ring"></div>
                <div class="pulse-ring delay-1"></div>
                <div class="pulse-ring delay-2"></div>
              </div>
              <div class="empty-text">
                <div class="empty-title">No Body Content</div>
                <div class="empty-subtitle">该请求不传入 body 内容</div>
              </div>
            </div>
          </div>
        </el-col>
      </el-row>
      <div v-show="bodyType === 'json'">
        <JsonBody
          @exchange_json_value="handleExchangeJsonBodyValue"
          :tableData="props.tableData"
          :interface="interface"
          :inOuter="inOuter"
        ></JsonBody>
      </div>
      <div v-show="bodyType === 'x-www-form-urlencoded'">
        <WwwBody
          :tableData="props.wwwData"
          :interface="interface"
        ></WwwBody>
      </div>
      <div v-if="bodyType === 'form-data'">
        <FormDataBody
          :tableData="props.formData"
          :interface="interface"
        ></FormDataBody>
      </div>
      <div v-show="bodyType === 'raw'">
        <RawBody
          :code="props.code"
          @update="change_raw_body"
          :interface="interface"
        ></RawBody>
      </div>
    </el-col>
  </el-row>
</template>
<script lang="ts" setup>
import { toRef, ref, computed, watch, nextTick, onMounted } from "vue";
import JsonBody from "./body_child/json_body.vue";
import WwwBody from "./body_child/www_body.vue";
import FormDataBody from './body_child/form_data_body.vue'
import RawBody from './body_child/raw_body.vue'

const emit = defineEmits(["exchange_json_body_value", "change_raw_body", "change_body_type"]);

function handleExchangeJsonBodyValue(json_string: string, convert: Function) {
  emit("exchange_json_body_value", json_string, convert);
}

function change_raw_body(code: string) {
  emit("change_raw_body", code);
}

// 定义组件属性
const props = defineProps<{
  tableData: any[]; // 定义tableData属性为一个数组
  wwwData: any[];
  formData: null;
  code: string,
  bodyType: any,
  interface: number,
  inOuter:any
}>();

const bodyType = toRef(props, 'bodyType');

const changeBodyType = (label: string) => {
  emit("change_body_type", label);
};

// Body Type 选项配置
const bodyTypeOptions = [
  { label: 'none', value: 'none', icon: '⊘' },
  { label: 'form-data', value: 'form-data', icon: '📋' },
  { label: 'urlencoded', value: 'x-www-form-urlencoded', icon: '🔗' },
  { label: 'json', value: 'json', icon: '{ }' },
  { label: 'raw', value: 'raw', icon: '📄' }
];

// DOM引用
const trackRef = ref<HTMLElement | null>(null);
const buttonRefs = ref<Map<string, HTMLElement>>(new Map());
const indicatorLeft = ref(0);
const indicatorWidth = ref(0);

function setButtonRef(value: string, el: any) {
  if (el) {
    buttonRefs.value.set(value, el);
  }
}

function updateIndicator() {
  nextTick(() => {
    const activeButtonEl = buttonRefs.value.get(bodyType.value);
    const trackEl = trackRef.value;

    if (activeButtonEl && trackEl) {
      const trackRect = trackEl.getBoundingClientRect();
      const buttonRect = activeButtonEl.getBoundingClientRect();

      indicatorLeft.value = buttonRect.left - trackRect.left;
      indicatorWidth.value = buttonRect.width;
    }
  });
}

// 指示器样式
const indicatorStyle = computed(() => {
  return {
    transform: `translateX(${indicatorLeft.value}px)`,
    width: `${indicatorWidth.value}px`
  };
});

// 处理选项切换
const handleBodyTypeChange = (value: string, index: number) => {
  changeBodyType(value);
};

// hover 状态
const hoveredIndex = ref<number | null>(null);

const handleItemHover = (index: number) => {
  hoveredIndex.value = index;
};

const handleItemLeave = () => {
  hoveredIndex.value = null;
};

// 监听bodyType变化
watch(bodyType, () => {
  updateIndicator();
});

onMounted(() => {
  updateIndicator();
  // 确保布局完成后再次更新
  setTimeout(() => {
    updateIndicator();
  }, 100);
});
</script>
<style lang="scss" scoped>
/* ========== 高级 Body Type 选择器样式 ========== */
.body-type-selector {
  max-width: 500px;
  padding: 4px;
  background: #1a1a1a;
  border-radius: 8px;
  position: relative;
  // overflow: hidden;
  display: inline-block;
}

.selector-track {
  position: relative;
  display: inline-flex;
  width: auto !important;
  gap: 3px;
  background: transparent;
  border-radius: 6px;
}

/* 滑动指示器 */
.selector-indicator {
  position: absolute;
  top: 4px;
  bottom: 4px;
  left: 0;
  background: #10b981;
  border-radius: 6px;
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  z-index: 1;
}

/* 选项按钮 */
.selector-item {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 14px;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: #888;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: color 0.25s ease;
  z-index: 2;

  .item-label {
    font-size: 11px;
    letter-spacing: 0.3px;
    text-transform: uppercase;
    transition: color 0.25s ease;
    white-space: nowrap;
    font-weight: 600;
  }

  .item-glow {
    display: none;
  }

  &:hover {
    color: #aaa;
  }

  &:active {
    .item-label {
      transform: scale(0.96);
    }
  }

  &.active {
    color: #fff;
  }
}

/* ========== Empty Body 高级样式 ========== */
.empty-body {
  background: linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%);
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  min-height: 180px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  cursor: default;
  transition: all 0.3s ease;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at 50% 0%, rgba(16, 185, 129, 0.05), transparent 50%);
    pointer-events: none;
  }

  &::after {
    content: '';
    position: absolute;
    top: -2px;
    left: -2px;
    right: -2px;
    bottom: -2px;
    background: linear-gradient(45deg,
      transparent 30%,
      rgba(16, 185, 129, 0.08) 50%,
      transparent 70%
    );
    background-size: 200% 200%;
    animation: borderShine 8s ease-in-out infinite;
    border-radius: 12px;
    z-index: 0;
    pointer-events: none;
  }

  &:hover {
    border-color: #d1d5db;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  }
}

@keyframes borderShine {
  0%, 100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
}

.empty-body-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.empty-icon-wrapper {
  position: relative;
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-icon {
  width: 48px;
  height: 48px;
  color: #059669;
  filter: drop-shadow(0 0 12px rgba(16, 185, 129, 0.25));
  animation: iconFloat 3s ease-in-out infinite;
  position: relative;
  z-index: 2;

  circle {
    animation: circleRotate 4s linear infinite;
    transform-origin: center;
  }
}

@keyframes iconFloat {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-8px);
  }
}

@keyframes circleRotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.pulse-ring {
  position: absolute;
  inset: 0;
  border: 2px solid rgba(16, 185, 129, 0.4);
  border-radius: 50%;
  animation: pulseRing 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;

  &.delay-1 {
    animation-delay: 0.5s;
  }

  &.delay-2 {
    animation-delay: 1s;
  }
}

@keyframes pulseRing {
  0% {
    transform: scale(0.8);
    opacity: 1;
  }
  100% {
    transform: scale(1.3);
    opacity: 0;
  }
}

.empty-text {
  text-align: center;
}

.empty-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 6px;
  letter-spacing: 0.5px;
  background: linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: titleShimmer 3s ease-in-out infinite;
}

@keyframes titleShimmer {
  0%, 100% {
    opacity: 0.85;
  }
  50% {
    opacity: 1;
  }
}

.empty-subtitle {
  font-size: 13px;
  color: #6b7280;
  letter-spacing: 0.3px;
}
</style>
