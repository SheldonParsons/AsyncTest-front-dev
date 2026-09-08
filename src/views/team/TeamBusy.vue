<template><div class="team-busy" :aria-busy="busy"><slot /><div v-if="busy" class="team-busy__overlay" role="status" aria-label="正在加载"><LoaderCircle :size="24" class="team-spinner" aria-hidden="true" /></div></div></template>
<script setup lang="ts">
import { LoaderCircle } from '@/components/icons/lucide'
defineProps<{ busy: boolean }>()
</script>
<style scoped>
.team-busy { position: relative; }
.team-busy__overlay { position: absolute; inset: 0; display: grid; place-items: center; background: rgba(248,248,248,.7); z-index: 4; color: #555; }
.team-spinner { animation: team-spin .9s linear infinite; }
@keyframes team-spin { to { transform: rotate(360deg); } }
@media(prefers-reduced-motion: reduce) { .team-spinner { animation: none; } }
</style>
