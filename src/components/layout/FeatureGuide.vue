<template>
  <span v-if="kind === 'account'" ref="anchor" class="feature-guide-anchor">
    <el-popover :visible="visible" placement="bottom-end" :width="340" :offset="14" popper-class="ast-feature-guide-popover" :show-arrow="true" :persistent="false">
      <template #reference><span class="feature-guide-anchor" @click="dismiss" @keydown.esc="dismiss"><slot /></span></template>
      <section class="feature-guide" role="region" aria-label="头像菜单新功能引导" @keydown.esc="dismiss">
        <button class="feature-guide-close" aria-label="关闭引导" @click="dismiss"><X :size="17" /></button>
        <span class="feature-guide-badge">入口有了新位置</span>
        <h3>常用入口，都在头像里</h3>
        <p>点击头像，即可找到使用文档<span v-if="isElectron">和检查更新</span>。</p>
        <div class="feature-guide-note"><UsersRound :size="20" /><div><strong>团队管理，也在这里</strong><span>加入项目、管理成员、处理申请，一个地方完成。</span></div></div>
        <footer><button class="feature-guide-secondary" @click="dismiss">知道了</button><button class="feature-guide-primary" @click="openTeam">去看看团队管理 <ArrowRight :size="15" /></button></footer>
      </section>
    </el-popover>
  </span>
  <div v-else ref="anchor">
    <section v-if="visible" class="feature-guide feature-guide-team" role="region" aria-label="团队管理功能引导" @keydown.esc="dismiss">
      <button class="feature-guide-close" aria-label="关闭团队管理引导" @click="dismiss"><X :size="17" /></button>
      <span class="feature-guide-badge">第一次来？一分钟了解</span>
      <h3>项目与成员，在这里一起管理</h3>
      <p>不用来回切换项目。找到对应分组，就能开始处理。</p>
      <div class="feature-guide-grid">
        <div><Settings2 :size="19" /><strong>我管理的项目</strong><span>作为创建者或管理员，管理成员与项目信息。</span></div>
        <div><UsersRound :size="19" /><strong>我加入的项目</strong><span>查看已加入的项目和成员。</span></div>
        <div><Compass :size="19" /><strong>未加入的项目</strong><span>找到需要的项目，提交加入申请。</span></div>
        <div><ClipboardCheck :size="19" /><strong>审批内容</strong><span>有审批权限时，在这里处理待办申请。</span></div>
      </div>
      <footer><span class="feature-guide-footnote">可操作内容以你的实际权限为准。</span><button class="feature-guide-primary" @click="dismiss">知道了，开始使用 <ArrowRight :size="15" /></button></footer>
    </section>
  </div>
</template>
<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowRight, ClipboardCheck, Compass, Settings2, UsersRound, X } from '@/components/icons/lucide'
import { useBehaviorGuide } from '@/composables/useBehaviorGuide'
const props = withDefaults(defineProps<{ kind: 'account' | 'team'; enabled?: boolean }>(), { enabled: true })
const anchor = ref<HTMLElement>()
const route = useRoute(), router = useRouter()
const isElectron = import.meta.env.VITE_IS_ELECTRON === 'true'
const { visible, dismiss } = useBehaviorGuide(
  props.kind === 'account' ? 'onboarding.account_menu' : 'onboarding.team_management',
  props.kind === 'account' ? 'account_menu' : 'team_management', computed(() => props.enabled), anchor,
)
function openTeam() {
  dismiss()
  void router.push({ path: '/home/team', query: route.query.windowKey ? { windowKey: route.query.windowKey } : {} })
}
</script>
<style>
.feature-guide-anchor { display: inline-flex; align-items: center; }
.ast-feature-guide-popover.el-popover.el-popper { padding: 0; border-radius: 18px; border: 1px solid #e8e8e8; box-shadow: 0 16px 48px #0000001a; max-width: calc(100vw - 32px); }
.feature-guide { position: relative; padding: 24px; color: #303238; font-size: 13px; line-height: 1.65; background: linear-gradient(140deg,#fff,#f7f8fa); border-radius: 18px; text-align: left; -webkit-app-region: no-drag; }
.feature-guide-close { position: absolute; right: 12px; top: 12px; display: grid; place-items: center; width: 28px; height: 28px; border: 0; border-radius: 8px; background: transparent; color: #858991; cursor: pointer; }
.feature-guide-close:hover { background: #e9ebef; color: #222; }
.feature-guide-badge { display: inline-block; margin-bottom: 12px; color: #667188; font-size: 11px; font-weight: 600; letter-spacing: .5px; }
.feature-guide h3 { margin: 0 0 8px; font-size: 19px; line-height: 1.4; font-weight: 650; letter-spacing: -.3px; }
.feature-guide p { margin: 0; color: #626c7a; font-size: 13px; line-height: 1.7; }
.feature-guide-note { display: flex; gap: 12px; padding: 15px; margin-top: 18px; border: 1px solid #e5e8ee; border-radius: 12px; background: #fff; }
.feature-guide-note svg { flex: none; margin-top: 2px; color: #667188; }
.feature-guide-note strong,.feature-guide-note span { display: block; }
.feature-guide-note span { color: #667080; font-size: 12px; margin-top: 4px; }
.feature-guide footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 22px; }
.feature-guide-primary,.feature-guide-secondary { display: inline-flex; align-items: center; justify-content: center; gap: 7px; padding: 9px 12px; border-radius: 9px; font-size: 12px; cursor: pointer; border: 0; }
.feature-guide-primary { background: #303744; color: white; }
.feature-guide-primary:hover { background: #444e60; }
.feature-guide-secondary { background: transparent; color: #777d86; }
.feature-guide button:focus-visible { outline: 2px solid #657fa7; outline-offset: 3px; }
.feature-guide-team { padding: 26px; margin-bottom: 24px; border: 1px solid #e1e5ec; }
.feature-guide-grid { display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); gap: 20px; margin-top: 22px; }
.feature-guide-grid > div { display: flex; flex-direction: column; gap: 6px; }
.feature-guide-grid svg { margin-bottom: 3px; color: #778399; }
.feature-guide-grid strong { font-size: 13px; font-weight: 600; }
.feature-guide-grid span,.feature-guide-footnote { font-size: 12px; color: #667080; }
@media(max-width: 1100px) { .feature-guide-grid { grid-template-columns: repeat(2,minmax(0,1fr)); } }
</style>
