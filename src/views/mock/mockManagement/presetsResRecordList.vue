<template>
  <CommonDialog
    :dialog="modelValue"
    @closed="updateValue(false)"
    @cancel="updateValue(false)"
    :hasFooter="false"
    :headerText="$t('project.mock.desc.coverRecord')"
    :cancelDoubleCheck="false"
    :dWidth="70"
  >
    <el-row
      v-if="data.length > 0"
      v-for="(item, index) in data"
      style="margin-top: 15px"
      ><el-col :span="24">
        <el-card shadow="always">
          <div class="res-default-list">
            {{ item.cover_user }}
            【{{ tools.getLocaleDateTime(item.add_time, false) }}】
            {{ $t('project.mock.desc.makeCoverTo') }}
            {{
              item.is_public
                ? '【' + $t('project.mock.desc.public')
                : '【' + $t('project.mock.desc.private')
            }}
            {{
              item.is_default
                ? $t('project.mock.desc.default') + '】'
                : $t('project.mock.desc.expect') + '】'
            }}
            {{ $t('project.mock.desc.response') }}
            {{
              item.is_expect
                ? '：' + $t('project.mock.desc.expectName') + '->' + item.expect
                : ''
            }}
          </div>
        </el-card>
      </el-col>
    </el-row>
    <el-empty v-else :image-size="200" />
  </CommonDialog>
</template>

<script setup lang="ts">
import { getCurrentInstance } from 'vue'
import { useI18n } from 'vue-i18n'

import CommonDialog from '@/components/layout/dialogs/commonDialog.vue'
import tools from '@/utils/tools'
import PublicIcon from '@/assets/svg/common/publicIcon.vue'
import PersonalIcon from '@/assets/svg/common/personalIcon.vue'
import { da } from 'element-plus/es/locale'
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

function bindRes(resId: any) {
  emit('bindPresetRes', resId)
}
</script>

<style lang="scss" scoped>
.res-default-list {
  display: flex;
  align-items: center;
  font-size: 16px;
  font-weight: 500;
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
