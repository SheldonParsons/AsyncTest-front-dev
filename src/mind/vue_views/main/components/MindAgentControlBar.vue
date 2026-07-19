<template>
  <transition name="mind-agent-control">
    <section
      v-if="visible"
      class="mind-agent-control"
      :class="{ 'is-collapsed': collapsed }"
      :data-status="state.status"
      aria-live="polite"
    >
      <button
        v-if="collapsed"
        class="mind-agent-control-chip"
        type="button"
        :aria-label="`展开${compactTitle}`"
        @click="$emit('expand')"
      >
        <span class="mind-agent-control-indicator" aria-hidden="true"></span>
        <span>{{ compactTitle }}</span>
        <span class="mind-agent-control-chip-caret" aria-hidden="true">⌄</span>
      </button>

      <div v-else class="mind-agent-control-panel">
        <span class="mind-agent-control-indicator" aria-hidden="true"></span>
        <div class="mind-agent-control-copy">
          <strong>{{ title }}</strong>
          <span>{{ detail }}</span>
        </div>

        <button
          v-if="!['connected', 'executing'].includes(state.status)"
          class="mind-agent-control-collapse"
          type="button"
          aria-label="收起 Agent 控制状态"
          title="收起"
          @click="$emit('collapse')"
        >
          收起
        </button>

        <div class="mind-agent-control-actions">
          <button
            v-if="['connected', 'executing'].includes(state.status)"
            class="mind-agent-control-action mind-agent-control-action--exit"
            type="button"
            :disabled="pending"
            @click="$emit('exit')"
          >
            退出控制
          </button>
          <template v-else-if="state.status === 'restore_requested'">
            <button
              class="mind-agent-control-action mind-agent-control-action--secondary"
              type="button"
              :disabled="pending"
              @click="$emit('reject-restore')"
            >
              暂不恢复
            </button>
            <button
              class="mind-agent-control-action mind-agent-control-action--approve"
              type="button"
              :disabled="pending"
              @click="$emit('approve-restore')"
            >
              允许恢复
            </button>
          </template>
        </div>
      </div>
    </section>
  </transition>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { MindAgentControlState } from '@/mind/mcp/useMindAgentControl';

const props = defineProps<{
  visible: boolean;
  pending: boolean;
  collapsed: boolean;
  state: MindAgentControlState;
}>();

defineEmits<{
  (event: 'exit'): void;
  (event: 'approve-restore'): void;
  (event: 'reject-restore'): void;
  (event: 'collapse'): void;
  (event: 'expand'): void;
}>();

const title = computed(() => {
  if (props.state.status === 'restore_requested') return 'Agent 请求恢复控制';
  if (props.state.status === 'revoked') return 'Agent 控制已退出';
  if (props.state.hasVersionMismatch) return '当前 Agent 使用的是旧版 MCP';
  if (props.state.status === 'executing') return 'Agent 操作中...';
  return 'Agent 已连接';
});

const compactTitle = computed(() =>
  props.state.status === 'restore_requested'
    ? '等待恢复确认'
    : props.state.status === 'revoked'
      ? 'Agent 已暂停'
      : props.state.hasVersionMismatch
        ? 'MCP 版本不一致'
        : props.state.status === 'connected'
      ? 'Agent 已连接'
      : 'Agent 操作中'
);

const detail = computed(() => {
  if (props.state.status === 'restore_requested') return '确认后 Agent 才能继续调用 AsyncTest Mind';
  if (props.state.status === 'revoked') return '后续 AsyncTest Mind MCP 调用已阻止';
  if (props.state.hasVersionMismatch) return '请重启 AI Agent，使其加载 AsyncTest 内置的最新 MCP';
  if (props.state.status === 'executing') return '写操作执行时目标窗口会暂时锁定';
  return '等待下一次操作，导图仍可正常编辑';
});
</script>

<style scoped lang="scss">
.mind-agent-control {
  position: absolute;
  top: 12px;
  right: 14px;
  z-index: 42;
  width: min(370px, calc(100% - 28px));
  color: #17211d;
  pointer-events: none;
}

.mind-agent-control.is-collapsed {
  width: auto;
  max-width: calc(100% - 28px);
}

.mind-agent-control-panel {
  min-height: 52px;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  padding: 9px 10px 9px 13px;
  border: 1px solid rgba(15, 23, 42, 0.12);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.97);
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.13);
  pointer-events: auto;
}

.mind-agent-control[data-status='restore_requested'] .mind-agent-control-panel {
  grid-template-columns: auto minmax(0, 1fr) auto;
}

.mind-agent-control-indicator {
  width: 8px;
  height: 8px;
  flex: 0 0 auto;
  border-radius: 50%;
  background: #16805f;
  box-shadow: 0 0 0 4px rgba(22, 128, 95, 0.12);
  animation: mind-agent-control-pulse 1.2s ease-in-out infinite;
}

.mind-agent-control[data-status='revoked'] .mind-agent-control-indicator {
  background: #66716c;
  box-shadow: 0 0 0 4px rgba(102, 113, 108, 0.11);
  animation: none;
}

.mind-agent-control[data-status='restore_requested'] .mind-agent-control-indicator {
  background: #b56a16;
  box-shadow: 0 0 0 4px rgba(181, 106, 22, 0.12);
  animation: none;
}

.mind-agent-control-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.mind-agent-control-copy strong {
  font-size: 13px;
  line-height: 1.35;
  font-weight: 650;
}

.mind-agent-control-copy span {
  overflow: hidden;
  color: #66716c;
  font-size: 11px;
  line-height: 1.4;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mind-agent-control-actions {
  display: flex;
  align-items: center;
  gap: 7px;
}

.mind-agent-control-action,
.mind-agent-control-collapse,
.mind-agent-control-chip {
  font-family: inherit;
  letter-spacing: 0;
}

.mind-agent-control-action {
  height: 31px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 10px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}

.mind-agent-control-action--exit {
  border: 1px solid rgba(181, 71, 60, 0.28);
  background: #fff;
  color: #a63e35;
}

.mind-agent-control-action--secondary {
  border: 1px solid rgba(15, 23, 42, 0.14);
  background: #fff;
  color: #4f5a55;
}

.mind-agent-control-action--approve {
  border: 1px solid #243b32;
  background: #243b32;
  color: #fff;
}

.mind-agent-control-action:disabled {
  cursor: default;
  opacity: 0.55;
}

.mind-agent-control-collapse {
  position: absolute;
  top: 7px;
  right: 9px;
  padding: 2px 3px;
  border: 0;
  background: transparent;
  color: #7a847f;
  cursor: pointer;
  font-size: 11px;
  line-height: 1.2;
}

.mind-agent-control[data-status='restore_requested'] .mind-agent-control-copy {
  padding-right: 30px;
}

.mind-agent-control[data-status='restore_requested'] .mind-agent-control-actions {
  grid-column: 2 / -1;
  justify-content: flex-end;
  margin-top: 2px;
}

.mind-agent-control-chip {
  height: 32px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0 10px;
  border: 1px solid rgba(15, 23, 42, 0.12);
  border-radius: 7px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 7px 20px rgba(15, 23, 42, 0.11);
  color: #4f5a55;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  pointer-events: auto;
  white-space: nowrap;
}

.mind-agent-control-chip-caret {
  color: #8a938f;
  font-size: 13px;
  line-height: 1;
  transform: translateY(-1px);
}

.mind-agent-control-enter-active,
.mind-agent-control-leave-active {
  transition: opacity 0.16s ease, transform 0.16s ease;
}

.mind-agent-control-enter-from,
.mind-agent-control-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

@keyframes mind-agent-control-pulse {
  50% { opacity: 0.48; }
}

@media (max-width: 680px) {
  .mind-agent-control {
    top: 10px;
    right: 10px;
    width: min(340px, calc(100% - 20px));
  }

  .mind-agent-control-panel {
    grid-template-columns: auto minmax(0, 1fr);
  }

  .mind-agent-control-actions {
    grid-column: 2;
    justify-content: flex-end;
  }
}
</style>
