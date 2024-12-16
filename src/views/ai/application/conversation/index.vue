<template>conversation</template>
<script lang="ts" setup>
import { onMounted, ref } from 'vue'
import { state } from "@/state";
onMounted(() => {
    state.setMessage("changeMenu" + Math.random().toString());
})
</script>