<template>
  <section
    class="resolved-change-receipt"
    :class="`status-${receipt.status}`"
    :aria-label="knowledgeChangeReceiptTitle(receipt)"
  >
    <div class="receipt-status-icon" aria-hidden="true">
      <svg v-if="receipt.status === 'applied'" viewBox="0 0 24 24" fill="none">
        <path d="m7 12 3 3 7-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      <svg v-else viewBox="0 0 24 24" fill="none">
        <path d="M7 7l10 10M17 7 7 17" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
      </svg>
    </div>
    <div class="receipt-body">
      <strong>{{ knowledgeChangeReceiptTitle(receipt) }}</strong>
      <p>{{ receipt.summary }}</p>
      <dl>
        <div>
          <dt>状态</dt>
          <dd>{{ knowledgeChangeReceiptStatusLabel(receipt) }}</dd>
        </div>
        <div v-if="receipt.commitSeq">
          <dt>版本</dt>
          <dd>Commit {{ receipt.commitSeq }}</dd>
        </div>
      </dl>
    </div>
  </section>
</template>

<script setup lang="ts">
import {
  knowledgeChangeReceiptStatusLabel,
  knowledgeChangeReceiptTitle,
  type KnowledgeChangeReceipt,
} from '../resolvedChangeReceiptPolicy'

defineProps<{ receipt: KnowledgeChangeReceipt }>()
</script>

<style scoped>
.resolved-change-receipt {
  display: flex;
  gap: 12px;
  max-width: 720px;
  margin: 14px 0 18px;
  padding: 16px 18px;
  border: 1px solid rgba(17, 141, 89, 0.2);
  border-radius: 14px;
  background: rgba(235, 249, 242, 0.72);
  color: #18251f;
}

.receipt-status-icon {
  display: grid;
  flex: 0 0 24px;
  width: 24px;
  height: 24px;
  place-items: center;
  border-radius: 50%;
  background: #128b59;
  color: #fff;
}

.receipt-status-icon svg {
  width: 16px;
  height: 16px;
}

.receipt-body {
  min-width: 0;
}

.receipt-body strong {
  display: block;
  font-size: 15px;
  line-height: 24px;
}

.receipt-body p {
  margin: 4px 0 10px;
  color: #37443e;
  font-size: 14px;
  line-height: 22px;
  overflow-wrap: anywhere;
}

.receipt-body dl {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 22px;
  margin: 0;
  color: #68736d;
  font-size: 12px;
}

.receipt-body dl div {
  display: flex;
  gap: 7px;
}

.receipt-body dt,
.receipt-body dd {
  margin: 0;
}

.receipt-body dd {
  color: #37443e;
}

.status-cancelled,
.status-stale,
.status-failed {
  border-color: rgba(117, 117, 117, 0.18);
  background: rgba(247, 247, 247, 0.9);
}

.status-cancelled .receipt-status-icon,
.status-stale .receipt-status-icon,
.status-failed .receipt-status-icon {
  background: #7a827e;
}
</style>
