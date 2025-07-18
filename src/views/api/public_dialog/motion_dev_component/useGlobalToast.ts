import { getCurrentInstance } from 'vue'

export function useGlobalToast() {
  const internalInstance = getCurrentInstance()
  const exposed = internalInstance?.proxy as any
  return {
    showToast: exposed?.showToast
  }
}