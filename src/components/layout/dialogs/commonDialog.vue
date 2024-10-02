<template>
  <el-dialog
    :top="dTop + 'vh'"
    :model-value="dialog"
    :close-on-click-modal="modalCloseable"
    @closed="closeDialog"
    class="dialog"
    :width="dWidth + '%'"
    :show-close="false"
    ><template #header>
      <el-row class="tools-header" justify="start" align="middle">
        <el-col :span="20"
          ><p>{{ headerText }}</p>
        </el-col>
        <el-col :offset="3" :span="1"><slot name="icon"></slot></el-col>
      </el-row>
    </template>
    <slot></slot>
    <template v-if="hasFooter" #footer>
      <span class="dialog-footer">
        <el-popconfirm
          v-if="cancelDoubleCheck"
          width="220"
          confirm-button-type="danger"
          :icon="InfoFilled"
          :title="
            $t('global.questionSure') +
            footerCancelDesc +
            $t('global.questionSure2')
          "
          @confirm="cancel"
        >
          <template #reference>
            <el-button>{{ footerCancelDesc }}</el-button>
          </template>
        </el-popconfirm>
        <el-button v-if="!cancelDoubleCheck" @click="cancel">{{
          footerCancelDesc
        }}</el-button>
        <el-popconfirm
          v-if="confirmDoubleCheck"
          width="220"
          confirm-button-type="danger"
          :icon="InfoFilled"
          :title="
            $t('global.questionSure') +
            footerConfirmDesc +
            $t('global.questionSure2')
          "
          @confirm="confirm"
        >
          <template #reference>
            <el-button type="primary">
              {{ footerConfirmDesc }}
            </el-button>
          </template>
        </el-popconfirm>
        <el-button v-if="!confirmDoubleCheck" @click="confirm" type="primary">
          {{ footerConfirmDesc }}
        </el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
// import { ref } from 'vue'
import { InfoFilled } from '@element-plus/icons-vue'
const emit = defineEmits(['closed', 'confirm', 'cancel'])

defineProps({
  headerText: {
    type: String,
    default: ''
  },
  dialog: {
    type: Boolean,
    default: false
  },
  dWidth: {
    type: Number,
    default: 80
  },
  dTop: {
    type: Number,
    default: 2
  },
  hasFooter: {
    type: Boolean,
    default: false
  },
  footerConfirmDesc: {
    type: String,
    default: '确认'
  },
  footerCancelDesc: {
    type: String,
    default: '取消'
  },
  cancelDoubleCheck: {
    type: Boolean,
    default: true
  },
  confirmDoubleCheck: {
    type: Boolean,
    default: true
  },
  modalCloseable: {
    type: Boolean,
    default: true
  }
})

function confirm() {
  console.log('confirm')
  emit('confirm', false)
}

function cancel() {
  emit('cancel', false)
}

function closeDialog() {
  emit('closed', false)
}
</script>

<style lang="scss" scoped></style>

<style lang="scss">
.dialog {
  border-radius: 10px !important;
  .el-dialog__body {
    padding: 20px!important;
  }
  .el-dialog__header {
    margin: 0px;
    padding: 10px 0px 10px 5px;
    border-top-left-radius: 10px;
    border-top-right-radius: 10px;
    background-image: linear-gradient(
      90deg,
      var(--dialog-color) 70%,
      var(--dialog-color)
    );
    p {
      color: white;
      font-size: 16px;
      font-weight: normal;
      font-style: normal;
      display: table-cell;
      vertical-align: middle;
      height: 35px;
      padding-left: 20px;
    }
  }
  .el-dialog__footer {
    padding: var(--el-dialog-padding-primary);
  }
}
</style>
