import { nextTick, onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue'
import { teamRequest, type Behavior } from '@/api/team'
import { AUTH_STATE_EVENT, readLocalAuthToken } from '@/utils/authNavigation'

// 服务端动作状态是唯一已读来源；原子状态变更防止多窗口同时展示。
export function useBehaviorGuide(key: string, scene: string, enabled: Ref<boolean>, anchor: Ref<HTMLElement | undefined>) {
  const visible = ref(false)
  const token = ref(readLocalAuthToken())
  let epoch = 0, timer: ReturnType<typeof setTimeout> | undefined
  const refreshAuth = () => { token.value = readLocalAuthToken() }
  const dismiss = () => { visible.value = false }
  const clearTimer = () => { if (timer) clearTimeout(timer); timer = undefined }
  async function check(run: number, owner: string, attempt = 0) {
    await nextTick()
    if (run !== epoch || !enabled.value || readLocalAuthToken() !== owner) return
    const node = anchor.value
    const blocked = document.visibilityState !== 'visible' || !node?.getClientRects().length
      || [...document.querySelectorAll('.el-overlay')].some(el => (el as HTMLElement).offsetHeight > 0)
    if (blocked) {
      if (attempt < 30) timer = setTimeout(() => { void check(run, owner, attempt + 1) }, 1000)
      return
    }
    try {
      const states = await teamRequest<Behavior[]>(`/user/me/behaviors/?scene=${encodeURIComponent(scene)}`)
      if (run !== epoch || readLocalAuthToken() !== owner) return
      const state = states.find(s => s.key === key && s.should_trigger)
      if (!state) return
      const claimed = await teamRequest<Behavior & { changed: boolean }>('/user/me/behaviors/events/', 'POST', {
        key: state.key, version: state.version, scope: state.scope, event: 'displayed',
      })
      if (run !== epoch || readLocalAuthToken() !== owner || !enabled.value) return
      visible.value = claimed.changed === true && claimed.state === 'displayed'
    } catch {
      // 老后端或状态保存失败时不弹出，不用本机标记替代服务端、也不反复打扰。
      if (run === epoch && readLocalAuthToken() === owner) visible.value = false
    }
  }
  const restart = () => {
    const run = ++epoch
    clearTimer(); dismiss()
    const owner = token.value
    if (enabled.value && owner) void check(run, owner)
  }
  onMounted(() => {
    window.addEventListener(AUTH_STATE_EVENT, refreshAuth)
    window.addEventListener('ast:login-succeeded', refreshAuth)
    restart()
  })
  watch([enabled, token], restart)
  onBeforeUnmount(() => {
    epoch++; clearTimer()
    window.removeEventListener(AUTH_STATE_EVENT, refreshAuth)
    window.removeEventListener('ast:login-succeeded', refreshAuth)
  })
  return { visible, dismiss }
}
