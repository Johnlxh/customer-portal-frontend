import { onShow } from "@dcloudio/uni-app"

import { useAuthStore } from "../stores/auth"

export function useSessionGuard(callback?: () => void | Promise<void>) {
  const authStore = useAuthStore()

  onShow(async () => {
    const ok = await authStore.ensureSession()
    if (!ok) {
      return
    }
    await callback?.()
  })

  return authStore
}
