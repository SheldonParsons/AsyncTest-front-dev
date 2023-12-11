<template>
  <el-affix position="bottom">
    <div class="footer">
      <el-row class="footer-row" align="middle" justify="end">
        <el-col :span="4" :md="2" :sm="4">
          <NormalButton
            tt="simple"
            @click="cancel"
            :width="70"
            :height="35"
            :text="cancelText"
          />
        </el-col>
        <el-col :span="4" :md="2" :sm="4">
          <NormalButton
            tt="submit"
            @click="create"
            :width="70"
            :height="35"
            :text="createText"
          />
        </el-col>
      </el-row>
    </div>
  </el-affix>
</template>

<script setup lang="ts">
import NormalButton from '@/components/common/button/normal_button.vue'

const emit = defineEmits(['create', 'cancel'])

defineProps({
  createText: {
    type: String,
    default: ''
  },
  cancelText: {
    type: String,
    default: ''
  }
})

function create() {
  emit('create')
}

function cancel() {
  emit('cancel')
}
</script>

<style lang="scss" scoped>
@import '@/assets/scss/layout/footer.scss';
</style>
