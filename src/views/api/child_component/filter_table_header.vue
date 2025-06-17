<template>
  <div class="filter-content">
    <div class="filter-name">{{ column.label }}</div>
    <div class="filter-icon">
      <el-popover placement="bottom" trigger="click" width="auto">
        <template #reference>
          <div><Filter></Filter></div>
        </template>
        <div class="filter-header">{{ column.label }} 筛选器</div>
        <div>
          <el-divider></el-divider>
        </div>
        <div>
          <div>
            <el-checkbox-group v-model="target" class="checkbox-group">
              <el-checkbox
                v-for="(item, index) in data"
                :key="index"
                :label="item.text"
                :value="item.value"
              />
            </el-checkbox-group>
          </div>
        </div>
        <div>
          <el-divider></el-divider>
        </div>
        <div class="filter-action-group">
          <div class="action reset-filter" @click="reset_action">重置</div>
          <div class="action filter-action" @click="filter_action">筛选</div>
        </div>
      </el-popover>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { onMounted, ref } from "vue";
import Filter from "@/assets/svg/common/new_icon/filter.vue";
const emit = defineEmits(["action", "reset"]);
const target = ref([]);
const props = defineProps({
  column: {
    type: Object,
    default: () => {},
  },
  data: {
    type: Object,
    default: () => {},
  },
});

onMounted(() => {});

function reset_action() {
  target.value = [];
  emit("reset", target.value);
}

function filter_action() {
  emit("action", target.value);
}
</script>

<style lang="scss" scoped>
.filter-header {
  padding: 8px 4px;
  font-weight: 500;
}
.filter-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 5px;
  .filter-icon {
    div {
      color: var(--font-default-color);
      cursor: pointer;
      display: flex;
      justify-content: center;
      align-items: center;
      svg {
        width: 15px;
      }
    }
  }
}
.filter-action-group {
  display: flex;
  justify-content: end;
  align-items: center;
  padding: 8px 0px;
  gap: 5px;
  .action {
    padding: 2px 8px;
    cursor: pointer;
    border-radius: 4px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  .filter-action {
    background-color: black;
    color: white;
  }
  .filter-action:hover {
    background-color: var(--dark-hover);
  }
}
.checkbox-group {
  padding: 0px 10px;
  display: flex;
  flex-direction: column;
  gap: 5px;
  justify-content: start;
  align-items: center;
  padding-bottom: 5px;
  label {
    width: 100%;
    margin: 0px;
    padding: 2px 8px;
    border-radius: 8px;
  }
  label:hover {
    background-color: var(--default-bg);
  }
}
</style>
