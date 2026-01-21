<template>
  <div class="response-line">
    <div class="response-info-container">
      <div class="response-info-item">
        <span class="response-label">HTTP状态码</span>
        <el-dropdown @command="handleStatusCommand" trigger="click" class="status-dropdown">
          <motion.div :while-hover="{ scale: 1.02 }" :while-tap="{ scale: 0.98 }">
            <input :value="modelValue.status" class="response-input status-input" maxlength="3" readonly />
          </motion.div>
          <template #dropdown>
            <el-dropdown-menu class="response-status-dropdown">
              <el-dropdown-item
                v-for="([code, message], index) in Object.entries(GlobalStatus.regular_response_status_map())"
                :key="index" :command="code">
                <div class="status-option">
                  <span class="status-code">{{ code }}</span>
                  <span class="status-message">{{ message }}</span>
                </div>
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
      <div class="response-info-item">
        <span class="response-label">名称</span>
        <input :value="modelValue.name" @input="handleNameInput" class="response-input name-input" placeholder="响应名称" />
      </div>
    </div>
    <motion.button :while-hover="{ scale: 1.05 }" :while-tap="{ scale: 0.95 }" class="delete-btn"
      @click="$emit('delete')">
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
        <path d="M3 6h18" />
        <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      </svg>
    </motion.button>
  </div>
</template>

<script setup lang="ts">
import { motion } from "motion-v";
import GlobalStatus from "@/global";

const props = defineProps<{
  modelValue: {
    status: number | string;
    name: string;
    id: number;
    [key: string]: any;
  };
}>();

const emit = defineEmits<{
  'delete': [];
}>();

function handleStatusCommand(code: string | number) {
  props.modelValue.status = code;
}

function handleNameInput(event: Event) {
  const target = event.target as HTMLInputElement;
  props.modelValue.name = target.value;
}
</script>

<style lang="scss" scoped>
.response-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 4px 12px;
  transition: all 0.15s ease;

  &:hover {
    border-color: #d1d5db;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  }
}

.response-info-container {
  display: flex;
  align-items: center;
  gap: 20px;
  flex: 1;
}

.response-info-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.response-label {
  font-size: 12px;
  font-weight: 600;
  color: #374151;
  white-space: nowrap;
}

.response-input {
  padding: 4px 8px;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 500;
  color: #111827;
  background: #ffffff;
  outline: none;
  transition: all 0.15s ease;

  &::placeholder {
    color: #9ca3af;
  }

  &:hover {
    border-color: #d1d5db;
    background: #f9fafb;
  }

  &:focus {
    border-color: #10b981;
    background: #ffffff;
    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
  }
}

.status-input {
  width: 70px;
  text-align: center;
  cursor: pointer;
  font-weight: 600;
  color: #10b981;

  &:hover {
    background: #f0fdf4;
    border-color: #10b981;
  }
}

.name-input {
  min-width: 180px;
}

.status-dropdown {
  display: flex;
  align-items: center;
}

.status-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;

  .status-code {
    font-weight: 600;
    min-width: 40px;
  }

  .status-message {
    font-size: 13px;
    opacity: 0.7;
  }
}

.delete-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  padding: 0;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #ffffff;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);

  &:hover {
    background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
    border-color: #fca5a5;
    color: #dc2626;
    box-shadow: 0 4px 12px rgba(220, 38, 38, 0.2);
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
    box-shadow: 0 1px 3px rgba(220, 38, 38, 0.15);
  }

  svg {
    width: 16px;
    height: 16px;
    stroke-width: 2;
  }
}
</style>

<style lang="scss">
.response-status-dropdown {
  height: 300px;
  overflow-y: auto; 

  .el-dropdown-menu__item {
    &:hover,
    &:focus {
      .status-option {
        .status-code {
          color: #ffffff !important;
        }
        .status-message {
          color: rgba(255, 255, 255, 0.9) !important;
        }
      }
    }
  }
}
</style>
