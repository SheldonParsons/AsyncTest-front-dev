<template>
  <CommonDialog
    :dialog="modelValue"
    @closed="updateValue(false)"
    @cancel="updateValue(false)"
    :hasFooter="false"
    :headerText="$t('project.mock.desc.coverResList')"
    :cancelDoubleCheck="false"
    :dWidth="50"
  >
    <el-row>
      <el-col :span="24">
        <el-card
          style="cursor: pointer"
          shadow="always"
          @click="bindRes(data.default_res_data.id, true)"
        >
          <div class="res-default-list">
            <div class="chip-icon-btn">
              <el-icon v-if="data.is_public"><PublicIcon /></el-icon>
              <el-icon v-if="!data.is_public"><PersonalIcon /></el-icon>
            </div>
            <p class="chip-default-font">
              {{
                data.is_public
                  ? $t('project.mock.desc.public')
                  : $t('project.mock.desc.private')
              }}
              {{ $t('project.mock.desc.defaultRes') }}
            </p>
            <p class="chip-default-font last">
              {{ $t('project.mock.desc.nowBindPresets') }}
              {{
                data.default_res_data.current_presets === -1
                  ? $t('project.mock.desc.emptyPreset')
                  : data.default_res_data.current_presets
              }}
            </p>
          </div>
        </el-card>
      </el-col>
    </el-row>
    <el-divider content-position="left"
      >{{
        data.is_public
          ? $t('project.mock.desc.public')
          : $t('project.mock.desc.private')
      }}
      {{ $t('project.mock.desc.expectRes') }}</el-divider
    >
    <el-row
      v-for="(item, index) in data.expect_data_list"
      style="margin-top: 15px"
      ><el-col :span="24">
        <el-card
          style="cursor: pointer"
          shadow="always"
          @click="bindRes(item.res_id, false)"
        >
          <div class="res-default-list">
            <div class="chip-icon-btn">
              <el-icon><Unlock /></el-icon>
            </div>
            <p class="chip-default-font">
              {{ item.name }}
            </p>
            <p class="chip-default-font last">
              {{ $t('project.mock.desc.nowBindPresets') }}
              {{
                item.current_presets === -1
                  ? $t('project.mock.desc.emptyPreset')
                  : item.current_presets
              }}
            </p>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </CommonDialog>
</template>

<script setup lang="ts">
import { getCurrentInstance } from 'vue'
import { useI18n } from 'vue-i18n'

import CommonDialog from '@/components/layout/dialogs/commonDialog.vue'
import PublicIcon from '@/assets/svg/common/publicIcon.vue'
import PersonalIcon from '@/assets/svg/common/personalIcon.vue'
const { proxy }: any = getCurrentInstance()
const { t } = useI18n()

const prop = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  data: {
    type: null as any
  }
})

const emit = defineEmits(['update:modelValue', 'bindPresetRes'])

function updateValue(value: Boolean) {
  emit('update:modelValue', false)
}

function bindRes(resId: any, shouldFlushDefault: boolean) {
  emit('bindPresetRes', resId, shouldFlushDefault)
}
</script>

<style lang="scss" scoped>
.res-default-list {
  display: flex;
  align-items: center;
  .last {
    margin-left: auto;
  }
}

.chip-icon-btn {
  font-size: 1.5rem;
  color: var(--primary);
  display: inline-block;
}
.chip-default-font {
  display: inline-block;
  margin: 0px;
  margin-left: 10px;
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 3px;
}
</style>
