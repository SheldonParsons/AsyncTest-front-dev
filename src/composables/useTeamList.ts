import { onBeforeUnmount, shallowRef, ref, watch, type WatchSource } from 'vue'
import { errorText, pageRequest } from '@/api/team'

export function useTeamList<T>(url: () => string, params: () => Record<string, unknown>, sources: WatchSource[]) {
  const rows = shallowRef<T[]>([]), count = ref(0), loading = ref(false), error = ref('')
  let epoch = 0
  async function reload() {
    const requestEpoch = ++epoch
    loading.value = true; error.value = ''
    try {
      const result = await pageRequest<T>(url(), params())
      if (requestEpoch !== epoch) return
      rows.value = result.results; count.value = result.count
    } catch (reason) {
      if (requestEpoch === epoch) { error.value = errorText(reason); rows.value = []; count.value = 0 }
    } finally { if (requestEpoch === epoch) loading.value = false }
  }
  watch(sources, reload, { immediate: true })
  window.addEventListener('ast:team-changed', reload)
  onBeforeUnmount(() => { epoch++; window.removeEventListener('ast:team-changed', reload) })
  return { rows, count, loading, error, reload }
}
