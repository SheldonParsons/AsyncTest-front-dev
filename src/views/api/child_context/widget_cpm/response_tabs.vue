<template>
  <div class="response-tabs-container">
    <div class="tabs-scroll-area">
      <motion.div
        v-for="(item, index) in responseOptions"
        :key="item.id"
        :class="['tab-item', { 'active': currentId === item.id }]"
        @click="$emit('change', item)"
        :while-hover="{ y: -2 }"
        :while-tap="{ scale: 0.98 }"
      >
        <span class="tab-name">{{ item.name }}</span>
        <span class="tab-status">({{ item.status }})</span>
      </motion.div>
    </div>
    <motion.div
      class="add-btn"
      @click="$emit('add')"
      :while-hover="{ scale: 1.08, rotate: 90 }"
      :while-tap="{ scale: 0.92 }"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
      </svg>
    </motion.div>
  </div>
</template>

<script setup lang="ts">
import { motion } from "motion-v";

defineProps<{
  responseOptions: Array<{
    id: number;
    name: string;
    status: number | string;
    [key: string]: any;
  }>;
  currentId: number;
}>();

defineEmits<{
  'change': [item: any];
  'add': [];
}>();
</script>

<style lang="scss" scoped>
.response-tabs-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: transparent;
  padding: 4px 0;
  gap: 12px;
  overflow: visible;
}

.tabs-scroll-area {
  display: flex;
  align-items: center;
  gap: 6px;
  overflow-x: auto;
  overflow-y: visible;
  flex: 1;
  padding: 8px 2px;

  &::-webkit-scrollbar {
    height: 4px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: #d1d5db;
    border-radius: 2px;

    &:hover {
      background: #9ca3af;
    }
  }
}

.tab-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 8px;
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  background: #ffffff;
  border: 1px solid #e5e7eb;
  min-width: fit-content;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);

  &:hover {
    background: #f9fafb;
    border-color: #d1d5db;
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
  }

  &.active {
    background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
    color: #ffffff;
    font-weight: 600;
    border-color: #1f2937;
    box-shadow: 0 4px 12px rgba(31, 41, 55, 0.25);
    transform: translateY(-2px);

    .tab-status {
      color: #ffffff;
      opacity: 0.85;
    }
  }
}

.tab-name {
  font-size: 13px;
  font-weight: 500;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tab-status {
  font-size: 12px;
  color: #6b7280;
  font-weight: 500;
}

.add-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: linear-gradient(135deg, #374151 0%, #1f2937 100%);
  color: #ffffff;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  flex-shrink: 0;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);

  &:hover {
    background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
    transform: translateY(-2px);
  }

  &:active {
    transform: translateY(0);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  }

  svg {
    transition: transform 0.2s ease;
  }
}
</style>
