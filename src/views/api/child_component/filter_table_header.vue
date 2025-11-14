<template>
  <div class="filter-content">
    <div class="filter-name">{{ label }}</div>
    <div class="filter-icon">
      <Popover v-model:isOpen="showTooltip">
        <template #trigger>
          <motion.div style="cursor: pointer;" :while-hover="{ scale: 1.05 }" :while-press="{ scale: 0.95 }">
            <div class="filter-btn">
              <Filter></Filter>
            </div>
          </motion.div>
        </template>
        <template #default>
          <div class="container">
            <div class="header">
              <div>{{ label }}</div>
              <div>
                <PopoverClose asChild>
                  <motion.div class="close-icon" :while-hover="{ scale: 1.05 }" :while-press="{ scale: 0.95 }"><el-icon>
                      <CloseBold />
                    </el-icon></motion.div>
                </PopoverClose>
              </div>
            </div>
            <div class="content no-scroll">
              <div class="item" v-for="(item, index) in data" :key="index" @click="check(item)">
                <div>
                  <CheckBox :check="get_row_item_check(item)"
                    @change="(_type: any) => change_singel_check(_type, item)">
                  </CheckBox>
                </div>
                <div class="text">
                  <ScrollText :text="item.text"></ScrollText>
                </div>
              </div>
            </div>
            <div class="filter-action-group">
              <motion.div :while-hover="{ scale: 1.05 }" :while-press="{ scale: 0.95 }" class="action reset-filter"
                @click="reset_action">重置</motion.div>
              <motion.div :while-hover="{ scale: 1.05 }" :while-press="{ scale: 0.95 }" class="action filter-action"
                @click="filter_action">筛选</motion.div>
            </div>
          </div>
        </template>
      </Popover>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { onMounted, ref } from "vue";
import { motion } from 'motion-v'
import Filter from "@/assets/svg/common/new_icon/filter.vue";
import ScrollText from '@/components/layout/special/scroll_text.vue'
import CheckBox from '@/assets/motion/checkbox.vue'
import Popover from '@/components/common/general/ClickPopover.vue'
import { PopoverClose } from 'reka-ui'
import { CloseBold } from "@element-plus/icons-vue";
const emit = defineEmits(["action", "reset"]);
const target = ref([]);
const multipleSelection: any = ref(new Set());
const showTooltip = ref(false)
const props = defineProps({
  label: {
    type: String,
    default: ""
  },
  data: {
    type: Object,
    default: () => { },
  },
});

onMounted(() => { });

function check(item: any) {
  const result = get_row_item_check(item)
  let _type
  if (result === 'check') {
    _type = 'none'
  } else {
    _type = 'check'
  }
  change_singel_check(_type, item)
}

function get_row_item_check(item: any) {
  if (multipleSelection.value.has(item.value)) {
    return 'check'
  } else {
    return 'none'
  }
}

const change_singel_check = (type: string, item: any) => {
  if (type === 'check') {
    multipleSelection.value.add(item.value)
  } else if (type === 'none') {
    multipleSelection.value.delete(item.value)
  }
}


function reset_action() {
  multipleSelection.value = new Set();
  emit("reset", multipleSelection.value);
}

function filter_action() {
  emit("action", multipleSelection.value);
}
</script>

<style lang="scss" scoped>
.close-icon {
  padding: 3px;
  cursor: pointer;
  border-radius: 4px;
}

.close-icon:hover {
  background-color: rgba($color: white, $alpha: 0.3);
}

.container {
  .header {
    border-top-left-radius: 8px;
    border-top-right-radius: 8px;
    height: 35px;
    padding: 0px 8px;
    min-width: 200px;
    background-color: black;
    color: white;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .content {
    max-height: 300px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: start;
    padding: 5px;

    .item {
      width: 100%;
      display: flex;
      justify-content: start;
      align-items: center;
      gap: 5px;
      font-size: 1rem;
      padding: 8px 4px;
      border-radius: 4px;
      cursor: pointer;
      box-sizing: border-box;

      .text {
        display: flex;
        align-items: center;
        justify-content: start;
        box-sizing: border-box;
        border-right: 1px solid #f0f0f0;
        min-width: 0;
      }
    }

    .item:hover {
      background-color: #f0f0f0;
    }
  }
}

.filter-btn {
  color: black;
  padding: 4px;
  border-radius: 4px;
}

.filter-btn:hover {
  background-color: rgba($color: #000000, $alpha: 0.3);
}

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
      color: black;
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
  padding: 8px;
  gap: 10px;
  border-top: 1px solid #f0f0f0;

  .action {
    padding: 5px 8px;
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
