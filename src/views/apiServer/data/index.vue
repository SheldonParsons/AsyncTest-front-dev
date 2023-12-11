<template>
  <ApiServer :api="api"></ApiServer>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ApiGetApiServer } from '@/api/apiServer/index'
import ApiServer from '../index.vue'

const api: any = ref('')

onMounted(() => {
  const data = {
    type: 2
  }

  ApiGetApiServer(data).then((data: any) => {
    if (data.data && data.data instanceof Array) {
      api.value = data.data
    }
  })
})
</script>

<style lang="scss" scoped></style>
