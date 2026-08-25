<template>
  <article
    class="turn-outcome"
    :class="`is-${kind}`"
    :role="urgent ? 'alert' : 'status'"
    :aria-live="urgent ? 'assertive' : 'polite'"
  >
    <span class="turn-outcome-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M12 8v4.5" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" />
        <circle cx="12" cy="16" r="1" fill="currentColor" />
        <path d="M10.3 3.9 2.7 17.1A2 2 0 0 0 4.4 20h15.2a2 2 0 0 0 1.7-2.9L13.7 3.9a2 2 0 0 0-3.4 0Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" />
      </svg>
    </span>
    <span class="turn-outcome-copy">
      <span class="turn-outcome-head">
        <strong>{{ title }}</strong>
        <span v-if="partial" class="turn-outcome-badge">部分结果</span>
      </span>
      <span v-if="detail" class="turn-outcome-detail">{{ detail }}</span>
      <code v-if="reason" class="turn-outcome-reason">{{ reason }}</code>
    </span>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  kind: 'failed' | 'cancelled' | 'interrupted' | 'partial' | 'connection' | 'protocol'
  title: string
  detail?: string
  reason?: string
  partial?: boolean
}>()

const urgent = computed(() => ['failed', 'connection', 'protocol'].includes(props.kind))
</script>

<style scoped>
.turn-outcome {
  --outcome-rgb: 180, 83, 9;
  --outcome-ink: #8a3f15;
  width: fit-content;
  max-width: 100%;
  box-sizing: border-box;
  margin: 6px 0 10px;
  padding: 10px 12px;
  border: 1px solid rgba(var(--outcome-rgb), 0.12);
  border-radius: 11px;
  display: flex;
  align-items: flex-start;
  gap: 9px;
  background: rgba(var(--outcome-rgb), 0.035);
  color: var(--outcome-ink);
}

.turn-outcome.is-failed,
.turn-outcome.is-connection,
.turn-outcome.is-protocol {
  --outcome-rgb: 185, 28, 28;
  --outcome-ink: #8f1d1d;
}

.turn-outcome.is-cancelled {
  --outcome-rgb: 71, 85, 105;
  --outcome-ink: #46566d;
}

.turn-outcome-icon {
  flex: 0 0 auto;
  width: 18px;
  height: 18px;
  margin-top: 1px;
}

.turn-outcome-icon svg {
  width: 100%;
  height: 100%;
}

.turn-outcome-copy {
  min-width: 0;
  display: grid;
  gap: 4px;
}

.turn-outcome-head {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 7px;
}

.turn-outcome-head strong {
  color: var(--outcome-ink);
  font-size: 13px;
  font-weight: 650;
  line-height: 1.45;
}

.turn-outcome-badge {
  padding: 1px 7px;
  border-radius: 999px;
  background: rgba(var(--outcome-rgb), 0.08);
  color: var(--outcome-ink);
  font-size: 10px;
  font-weight: 650;
  line-height: 1.6;
}

.turn-outcome-detail {
  color: #4b5563;
  font-size: 12px;
  line-height: 1.55;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.turn-outcome-reason {
  width: fit-content;
  max-width: 100%;
  margin-top: 1px;
  padding: 2px 6px;
  border: 1px solid rgba(15, 23, 42, 0.07);
  border-radius: 6px;
  background: rgba(15, 23, 42, 0.035);
  color: #64748b;
  font-size: 10.5px;
  line-height: 1.45;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
</style>
