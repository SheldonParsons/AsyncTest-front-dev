<template>
  <el-dialog v-model="visible" :show-close="false" class="temp-log-dialog" @update:model-value="handleClose" top="20px">
    <div class="temp-log-header">
      <div>临时日志(Testing)</div>
    </div>
    <div class="temp-log-content" ref="logContentRef">
      <div v-for="(item, index) in logData" :key="index" class="log-entry">
        <!-- Start Event -->
        <div v-if="item.event === 'start'" class="log-item log-event">
          <span class="log-time">{{ tools.getFormattedTimeMs(item.data.time) }}</span>
          <span class="log-label">任务ID：</span>
          <span class="log-value">{{ item.data.data }}</span>
        </div>

        <!-- End Event -->
        <div v-if="item.event === 'end'" class="log-item log-event">
          <span class="log-time">{{ tools.getFormattedTimeMs(item.data.time) }}</span>
          <span class="log-label">任务结束：</span>
          <span class="log-value">{{ item.data.data }}</span>
        </div>

        <!-- Heartbeat Event -->
        <div v-if="item.event === 'heartbeat'" class="log-item log-event">
          <span class="log-time">{{ tools.getFormattedTimeMs(item.data.time) }}</span>
          <span class="log-label">Heartbeat，</span>
          <span class="log-value">{{ item.data.data }}</span>
        </div>

        <!-- Message Event -->
        <div v-if="item.event === 'message'" class="log-message">
          <!-- Global Type -->
          <div v-if="item.data.type === 'global'" class="log-item">
            <div class="log-time">{{ tools.getFormattedTimeMs(item.data.time) }}</div>
            <div v-if="item.data.result === 'error-stop' || item.data.result === 'error-exception'"
              class="log-box log-error" v-html="item.data.data.replace(/\n/g, '<br>')"></div>
            <span v-else class="log-text">：{{ item.data.data }}</span>
          </div>

          <!-- Inner/Normal Type -->
          <div v-if="item.data.type === 'inner' || item.data.type === 'normal'" class="log-item">
            <div class="log-header">
              <span class="log-time">{{ tools.getFormattedTimeMs(item.data.time) }}</span>
              <span class="log-position">{{ item.data.position }}</span>
            </div>
            <div :class="[
              'log-box',
              {
                'log-success': item.data.result.indexOf('success') !== -1,
                'log-warning': item.data.result.indexOf('warning') !== -1,
                'log-error': item.data.result === 'error'
              }
            ]" v-html="item.data.desc.replace(/\n/g, '<br>')"></div>
          </div>

          <!-- Request Type -->
          <div v-if="item.data.type === 'request'" class="log-item">
            <div class="log-header">
              <span class="log-time">{{ tools.getFormattedTimeMs(parseData(item.data.data).time) }}</span>
              <span class="log-label">实际请求内容</span>
            </div>
            <div class="log-box log-success">
              <div class="log-field"><span class="field-label">请求方法:</span>{{ parseData(item.data.data).method }}</div>
              <div class="log-field"><span class="field-label">URL:</span>{{ parseData(item.data.data).url }}</div>
              <div class="log-field"><span class="field-label">请求头:</span></div>
              <div class="field-value">{{ parseData(item.data.data).headers }}</div>
              <div class="log-field"><span class="field-label">Params:</span></div>
              <div class="field-value">{{ parseData(item.data.data).query_params }}</div>
              <div class="log-field"><span class="field-label">请求体:</span></div>
              <div class="field-value">{{ parseData(item.data.data).body }}</div>
            </div>
          </div>

          <!-- Process Type -->
          <div v-if="item.data.type === 'process'" class="log-item">
            <div class="log-header">
              <span class="log-label">请求过程</span>
            </div>
            <div v-for="(process, pIndex) in item.data.data" :key="pIndex" class="log-box log-success">
              {{ process }}
            </div>
          </div>

          <!-- Response Type -->
          <div v-if="item.data.type === 'response'" class="log-item">
            <div class="log-header">
              <span class="log-time">{{ tools.getFormattedTimeMs(parseData(item.data.data).time) }}</span>
              <span class="log-label">响应内容</span>
            </div>
            <div class="log-box log-success">
              <div class="log-field"><span class="field-label">响应码:</span>{{ parseData(item.data.data).status }}</div>
              <div class="log-field"><span class="field-label">响应头:</span></div>
              <div class="field-value">{{ parseData(item.data.data).headers }}</div>
              <div class="log-field"><span class="field-label">响应体:</span></div>
              <div class="field-value">{{ parseData(item.data.data).body }}</div>
            </div>
          </div>

          <!-- Error Type -->
          <div v-if="item.data.type === 'error'" class="log-item">
            <div class="log-header">
              <span class="log-time">{{ tools.getFormattedTimeMs(item.data.data.time) }}</span>
              <span class="log-label">接口异常</span>
            </div>
            <div class="log-box log-error">{{ item.data.data.info }}</div>
          </div>

          <!-- Change Temporary Variable Type -->
          <div v-if="item.data.type === 'change_temporary_variable'" class="log-item">
            <div class="log-header">
              <span class="log-time">{{ tools.getFormattedTimeMs(item.data.data.time) }}</span>
              <span class="log-label">临时变量替换</span>
            </div>
            <div class="log-box log-success">
              <div class="log-field"><span class="field-label">临时变量:</span>{{ item.data.data.key }}</div>
              <div class="log-field"><span class="field-label">动态值变为:</span>{{ item.data.data.value }}</div>
              <div class="log-field"><span class="field-label">来自接口:</span>{{ item.data.data.interface }}</div>
            </div>
          </div>

          <!-- Pre/After Hooks Type -->
          <div v-if="(item.data.type === 'pre_hooks' || item.data.type === 'after_hooks') && item.data.data.length > 0"
            class="log-item">
            <div v-for="(hookStep, hIndex) in item.data.data" :key="hIndex" class="hook-step">
              <div class="log-header">
                <span class="log-time">{{ tools.getFormattedTimeMs(hookStep.time) }}</span>
                <span class="log-label">{{ item.data.type === 'after_hooks' ? '后置操作' : '前置操作' }}</span>
              </div>

              <!-- Print -->
              <div v-if="hookStep.type === 'print'" class="log-box log-success">
                <div class="field-label">打印内容:</div>
                <div class="field-value">{{ hookStep.data }}</div>
              </div>

              <!-- Wait -->
              <div v-if="hookStep.type === 'wait'" class="log-box log-success">
                <div class="field-label">等待:</div>
                <div class="field-value" v-html="hookStep.data.replace(/\n/g, '<br>')"></div>
              </div>

              <!-- Script -->
              <div v-if="hookStep.type === 'script'" class="log-box log-success"
                v-html="hookStep.data.replace(/\n/g, '<br>')"></div>

              <!-- Script Error / Hooks Error -->
              <div v-if="hookStep.type === 'script_error' || hookStep.type === 'hooks_error'" class="log-box log-error"
                v-html="hookStep.data.replace(/\n/g, '<br>')"></div>

              <!-- Hooks Warning -->
              <div v-if="hookStep.type === 'hooks_warning'" class="log-box log-warning"
                v-html="hookStep.data.replace(/\n/g, '<br>')"></div>

              <!-- Database -->
              <div v-if="hookStep.type === 'database'" class="log-box log-success">
                <div class="field-label">数据库操作:</div>
                <div class="log-field"><span class="field-label">操作名称:</span><span class="field-highlight">{{
                    hookStep.data.name }}</span></div>
                <div class="log-field"><span class="field-label">最终SQL:</span><span class="field-highlight">{{
                    hookStep.data.sql }}</span></div>
                <div class="log-field"><span class="field-label">SQL结果：</span><span class="field-highlight">{{
                    hookStep.data.origin_str }}</span></div>
                <div v-if="hookStep.data.data.length > 0">
                  <div class="field-label">参数设置：</div>
                  <div v-for="(match, mIndex) in hookStep.data.data" :key="mIndex" class="param-item">
                    <div class="log-field"><span class="field-label">Jsonpath：</span>{{ match.json_path }}</div>
                    <div class="log-field"><span class="field-label">匹配结果：</span>{{ match.result ? '成功' : '失败' }}</div>
                    <div class="log-field"><span class="field-label">结果值：</span>{{ match.value }}</div>
                  </div>
                </div>
              </div>

              <!-- Extract -->
              <div v-if="hookStep.type === 'extract'" class="log-box log-success">
                <div class="field-label">提取变量:</div>
                <div class="log-field"><span class="field-label">提取结果：</span>{{ hookStep.data.result ? '成功' : '失败' }}
                </div>
                <div class="log-field"><span class="field-label">变量名：</span>{{ hookStep.data.key }}</div>
                <div class="log-field"><span class="field-label">变量值：</span>{{ hookStep.data.value }}</div>
                <div class="log-field"><span class="field-label">提取来源：</span>{{ hookStep.data.source }}</div>
                <div class="log-field"><span class="field-label">提取方式：</span>{{ hookStep.data.extract_range }}</div>
                <div class="log-field"><span class="field-label">提取到：</span>{{ hookStep.data.t }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue';
import tools from "@/utils/tools";

const props = defineProps<{
  modelValue: boolean;
  logData: any[];
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
}>();

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
});

const logContentRef = ref<HTMLElement | null>(null);

const handleClose = (value: boolean) => {
  emit('update:modelValue', value);
};

const parseData = (data: string) => {
  try {
    return JSON.parse(data);
  } catch {
    return {};
  }
};

const scrollToBottom = () => {
  nextTick(() => {
    if (logContentRef.value) {
      logContentRef.value.scrollTop = logContentRef.value.scrollHeight;
    }
  });
};

watch(() => props.logData, () => {
  scrollToBottom();
}, { deep: true });

watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    scrollToBottom();
  }
});
</script>

<style lang="scss" scoped>
:deep(.el-dialog) {
  margin-top: 20px !important;
  border-radius: 12px;
}

.temp-log-header {
  height: 40px;
  padding: 0 20px;
  display: flex;
  align-items: center;
  font-weight: 500;
  font-size: 14px;
  border-bottom: 1px solid var(--border-color);
}

.temp-log-content {
  padding: 16px 20px;
  min-height: 500px;
  max-height: calc(100vh - 120px);
  overflow-y: auto;

  /* 隐藏滚动条 */
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE and Edge */

  &::-webkit-scrollbar {
    display: none; /* Chrome, Safari, Opera */
  }
}

.log-entry {
  margin-bottom: 12px;

  &:last-child {
    margin-bottom: 0;
  }
}

.log-item {
  padding: 12px;
  border-radius: 8px;
  background-color: rgba(0, 0, 0, 0.02);
  transition: background-color 0.2s;

  &:hover {
    background-color: rgba(0, 0, 0, 0.04);
  }
}

.log-event {
  font-weight: 500;
  font-size: 13px;
  line-height: 1.6;
}

.log-message {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.log-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
  font-size: 13px;
  margin-bottom: 8px;
}

.log-time {
  color: #666;
  font-size: 12px;
  font-family: 'Monaco', 'Menlo', monospace;
}

.log-label {
  color: #333;
  font-weight: 500;
}

.log-position {
  color: #1890ff;
  font-weight: 500;
}

.log-value {
  color: #666;
}

.log-text {
  color: #333;
  line-height: 1.6;
}

.log-box {
  padding: 12px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  font-size: 13px;
  line-height: 1.6;
  margin-top: 8px;
  word-break: break-word;

  &.log-success {
    background-color: rgba(40, 192, 161, 0.08);
    border-color: rgba(40, 192, 161, 0.3);
  }

  &.log-error {
    background-color: rgba(248, 152, 152, 0.08);
    border-color: rgba(248, 152, 152, 0.3);
    color: #d32f2f;
  }

  &.log-warning {
    background-color: rgba(255, 191, 0, 0.08);
    border-color: rgba(255, 191, 0, 0.3);
    color: #f57c00;
  }
}

.log-field {
  margin-bottom: 6px;
  line-height: 1.6;

  &:last-child {
    margin-bottom: 0;
  }
}

.field-label {
  color: #666;
  font-weight: 500;
  margin-right: 6px;
  display: inline-block;
  min-width: 80px;
}

.field-value {
  color: #333;
  padding-left: 86px;
  word-break: break-all;
  white-space: pre-wrap;
}

.field-highlight {
  color: #1890ff;
  font-weight: 500;
}

.hook-step {
  margin-bottom: 12px;

  &:last-child {
    margin-bottom: 0;
  }
}

.param-item {
  padding: 8px 0;
  border-top: 1px dashed rgba(0, 0, 0, 0.1);
  margin-top: 8px;

  &:first-child {
    border-top: none;
    margin-top: 0;
  }
}
</style>

