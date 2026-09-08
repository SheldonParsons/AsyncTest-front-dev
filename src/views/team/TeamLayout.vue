<template>
  <el-config-provider :locale="zhCn">
  <main class="team-page">
    <header class="team-heading">
      <div class="team-heading__identity"><div class="team-heading__icon"><Building2 :size="23" :stroke-width="1.8" aria-hidden="true" /></div><div><h1>{{ title }}</h1><p class="team-description">{{ description }}</p></div></div>
      <nav aria-label="团队与全局管理">
        <el-button @click="router.back()">返回</el-button>
        <el-button v-if="admin" @click="navigate('/home/team')">团队管理</el-button>
        <el-button v-if="profile?.capabilities.manage_all_users && route.path !== '/home/admin/users'" @click="navigate('/home/admin/users')">全局用户管理</el-button>
        <el-button v-if="profile?.capabilities.review_all_join_requests && route.path !== '/home/admin/approvals'" @click="navigate('/home/admin/approvals')">全局审批</el-button>
      </nav>
    </header>
    <section class="team-surface"><slot /></section>
  </main>
  </el-config-provider>
</template>
<script setup lang="ts">
import { Building2 } from '@/components/icons/lucide'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import { useRoute, useRouter } from 'vue-router'
import { useCurrentUserProfile } from '@/composables/useCurrentUserProfile'
defineProps<{ title: string; description: string; admin?: boolean }>()
const route = useRoute(), router = useRouter()
const { profile } = useCurrentUserProfile()
function navigate(path: string) {
  void router.push({ path, query: route.query.windowKey ? { windowKey: route.query.windowKey } : {} })
}
</script>
<style lang="scss">
.team-page { flex: 1; min-height: 0; overflow: auto; position: relative; background: radial-gradient(ellipse at 8% 10%,rgba(255,255,255,.95),transparent 55%),radial-gradient(ellipse at 90% 85%,rgba(194,194,194,.3),transparent 55%),linear-gradient(135deg,#ebebeb,#f4f4f4 45%,#e7e7e7); padding: 20px clamp(24px,4vw,72px) 28px; color: #252525; }
.team-heading { display: flex; align-items: center; justify-content: space-between; gap: 24px; max-width: 1440px; margin: 0 auto 18px; }
.team-heading__identity { display: flex; align-items: center; gap: 13px; }
.team-heading__icon { display: flex; align-items: center; justify-content: center; width: 44px; height: 44px; flex: 0 0 auto; border-radius: 14px; border: 1px solid rgba(255,255,255,.95); background: linear-gradient(135deg,rgba(255,255,255,.8),rgba(255,255,255,.38)); box-shadow: 0 6px 20px rgba(0,0,0,.04),inset 0 1px 0 #fff; backdrop-filter: blur(18px); color: #494949; }
.team-heading h1 { font-size: 22px; letter-spacing: -.5px; line-height: 1.35; margin: 0 0 3px; font-weight: 650; }
.team-eyebrow { color: #8b8b8b; font-size: 10px; font-weight: 600; letter-spacing: 2px; margin: 0; }
.team-description { color: #777; margin: 0; font-size: 12px; line-height: 1.6; }
.team-heading nav { display: flex; flex-wrap: wrap; gap: 8px; }
.team-heading nav .el-button { margin: 0; background: rgba(255,255,255,.4); }
.team-surface { max-width: 1440px; margin: auto; padding: 26px; background: rgba(255,255,255,.58); border: 1px solid rgba(255,255,255,.94); border-radius: 22px; box-shadow: 0 10px 35px rgba(0,0,0,.035),inset 0 1px 0 white; backdrop-filter: blur(22px) saturate(0); -webkit-backdrop-filter: blur(22px) saturate(0); }
.team-toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; margin: 22px 0 24px; }
.team-toolbar .team-search { width: 300px; max-width: 100%; }
.team-toolbar .el-input__wrapper, .team-toolbar .el-select__wrapper { min-height: 38px; }
.team-toolbar .el-select { width: 145px; }
.team-toolbar .team-count { margin-left: auto; color: #858585; font-size: 12px; }
.team-pagination { margin-top: 24px; padding-top: 18px; display: flex; justify-content: flex-end; border-top: 1px solid rgba(0,0,0,.045); }
.team-person { display: flex; align-items: center; gap: 12px; padding: 2px 0; }
.team-person strong { display: block; font-weight: 550; color: #363636; font-size: 13px; }
.team-person small, .team-muted { display: block; color: #888; font-size: 11px; line-height: 1.7; }
.team-project-title { font-weight: 600; color: #363636; line-height: 1.7; }
.team-project-cell { display: flex; align-items: center; gap: 12px; }
.team-project-cell__icon { display: grid; place-items: center; width: 38px; height: 38px; flex-shrink: 0; border-radius: 12px; border: 1px solid rgba(255,255,255,.8); background: rgba(255,255,255,.55); color: #777; }
.team-project-cell .team-muted { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.team-alert { margin-bottom: 18px; }
.team-detail { display: grid; gap: 22px; }
.team-detail p { margin: 7px 0 0; line-height: 1.75; white-space: pre-wrap; overflow-wrap: anywhere; font-size: 13px; }
.team-detail label { color: #888; font-size: 11px; }
.team-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.team-actions .el-button { margin-left: 0; }
.team-section-tabs.el-tabs .el-tabs__header { margin: 0; }
.team-section-tabs .el-tabs__nav-wrap::after, .team-section-tabs .el-tabs__active-bar { display: none; }
.team-section-tabs .el-tabs__nav { display: flex; gap: 4px; padding: 4px; background: rgba(221,221,221,.38); border: 1px solid rgba(255,255,255,.7); border-radius: 14px; }
.team-section-tabs .el-tabs__item { height: 40px; padding: 0 20px !important; border-radius: 10px; color: #818181; font-size: 13px; font-weight: 500; }
.team-section-tabs .el-tabs__item.is-active { background: rgba(255,255,255,.91); color: #222; box-shadow: 0 2px 6px rgba(0,0,0,.04),0 0 0 1px rgba(255,255,255,.8) inset; }
.team-section-tabs .el-tabs__item:focus-visible { outline: 2px solid #777; outline-offset: -3px; }
.team-tab-label { display: inline-flex; align-items: center; gap: 8px; }
@media(max-width: 900px) { .team-heading { flex-wrap: wrap; gap: 12px; } .team-page { padding: 18px; } }
@media(max-width: 600px) { .team-surface { padding: 16px; } .team-heading__icon { width: 46px; height: 46px; border-radius: 15px; } .team-heading h1 { font-size: 21px; } .team-description { font-size: 12px; } .team-section-tabs .el-tabs__item { padding: 0 12px !important; } }
</style>
