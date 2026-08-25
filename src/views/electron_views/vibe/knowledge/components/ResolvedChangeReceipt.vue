<template>
  <div
    class="resolved-change-receipt"
    :class="`status-${receipt.status}`"
    role="status"
    aria-live="polite"
    :aria-label="knowledgeChangeReceiptTitle(receipt)"
  >
    <span class="receipt-status-icon" aria-hidden="true">
      <svg v-if="receipt.status === 'applied'" viewBox="0 0 24 24" fill="none">
        <path d="m7 12 3 3 7-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      <svg v-else viewBox="0 0 24 24" fill="none">
        <path d="M7 7l10 10M17 7 7 17" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
      </svg>
    </span>
    <strong>{{ knowledgeChangeReceiptTitle(receipt) }}</strong>
    <span class="receipt-summary">{{ receipt.summary }}</span>
    <span v-if="receipt.commitSeq" class="receipt-version">版本 {{ receipt.commitSeq }}</span>
  </div>
</template>

<script setup lang="ts">
import {
  knowledgeChangeReceiptTitle,
  type KnowledgeChangeReceipt,
} from '../resolvedChangeReceiptPolicy'

defineProps<{ receipt: KnowledgeChangeReceipt }>()
</script>

<style scoped>
.resolved-change-receipt {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 7px;
  max-width: 680px;
  margin: 7px 0 3px;
  color: rgba(15, 15, 15, 0.56);
  font-size: 13px;
  line-height: 1.6;
}

.receipt-status-icon {
  display: grid;
  flex: 0 0 16px;
  width: 16px;
  height: 16px;
  place-items: center;
  color: #16875b;
}

.receipt-status-icon svg {
  width: 15px;
  height: 15px;
}

.resolved-change-receipt strong {
  color: rgba(15, 15, 15, 0.76);
  font-size: inherit;
  font-weight: 600;
}

.receipt-summary {
  min-width: 0;
  overflow-wrap: anywhere;
}

.status-cancelled .receipt-status-icon,
.status-stale .receipt-status-icon,
.status-failed .receipt-status-icon {
  color: rgba(15, 15, 15, 0.42);
}

.receipt-version {
  color: rgba(15, 15, 15, 0.38);
}
</style>
