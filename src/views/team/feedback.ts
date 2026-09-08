import { ElMessage } from 'element-plus'
import { CircleCheck, CircleAlert, TriangleAlert } from '@/components/icons/lucide'
export const teamMessage = {
  success: (message: string) => ElMessage({ type: 'success', message, icon: CircleCheck }),
  error: (message: string) => ElMessage({ type: 'error', message, icon: CircleAlert }),
  warning: (message: string) => ElMessage({ type: 'warning', message, icon: TriangleAlert }),
}
