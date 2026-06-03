import { ref } from "vue"

import type { ApiEnvelope } from "../types/api"
import { getErrorMessage } from "../utils/toast"

export function useDetailLoader<T>(fetcher: (id: string) => Promise<ApiEnvelope<T>>) {
  const detail = ref<T | null>(null)
  const loading = ref(false)
  const errorMessage = ref("")

  async function loadDetail(id?: string | number | null) {
    const normalizedId = `${id || ""}`.trim()
    if (!normalizedId) {
      detail.value = null
      errorMessage.value = "缺少单据 ID"
      return false
    }

    loading.value = true
    errorMessage.value = ""
    try {
      const response = await fetcher(normalizedId)
      detail.value = response.data
      return true
    } catch (error) {
      detail.value = null
      errorMessage.value = getErrorMessage(error, "加载失败")
      return false
    } finally {
      loading.value = false
    }
  }

  return {
    detail,
    loading,
    errorMessage,
    loadDetail,
  }
}
