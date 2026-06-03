import { computed, ref } from "vue"

import type { ApiEnvelope, Pagination } from "../types/api"
import { DEFAULT_PAGE_SIZE } from "../constants/app"
import { showErrorToast } from "../utils/toast"

interface UsePaginatedListOptions<TData, TItem> {
  pageSize?: number
  emptyErrorMessage?: string
  selectItems: (data: TData) => TItem[]
  selectHasNext?: (data: TData) => boolean
  selectTotalPending?: (data: TData) => boolean
  fetchTotal?: (data: TData) => Promise<number>
}

export function usePaginatedList<TData, TItem>(
  fetcher: (page: number, pageSize: number) => Promise<ApiEnvelope<TData>>,
  options: UsePaginatedListOptions<TData, TItem>,
) {
  const items = ref<TItem[]>([])
  const page = ref(1)
  const pagination = ref<Pagination | null>(null)
  const loading = ref(false)
  const totalPending = ref(false)
  const explicitHasNext = ref(false)
  const resolvedTotal = ref(false)
  let activeRequestId = 0
  const pageSize = options.pageSize || DEFAULT_PAGE_SIZE

  const pageText = computed(() => {
    if (!pagination.value) {
      return ""
    }
    if (totalPending.value) {
      return `第 ${page.value} 页，正在统计总数...`
    }
    return `第 ${page.value} 页，共 ${pagination.value.total} 条`
  })

  const hasPrevPage = computed(() => page.value > 1)
  const hasNextPage = computed(() => {
    if (explicitHasNext.value) {
      return true
    }
    if (!pagination.value || totalPending.value) {
      return false
    }
    return page.value * pagination.value.page_size < pagination.value.total
  })

  async function loadData(resetPage = false) {
    if (resetPage) {
      page.value = 1
      resolvedTotal.value = false
    }

    const requestId = activeRequestId + 1
    activeRequestId = requestId
    loading.value = true
    try {
      const response = await fetcher(page.value, pageSize)
      if (requestId !== activeRequestId) {
        return
      }

      items.value = options.selectItems(response.data)
      const hasPendingTotal = options.selectTotalPending?.(response.data) || false
      const nextPagination = response.pagination ? { ...response.pagination } : null

      if (nextPagination && hasPendingTotal && resolvedTotal.value && pagination.value) {
        nextPagination.total = pagination.value.total
      }

      pagination.value = nextPagination
      explicitHasNext.value = options.selectHasNext?.(response.data)
        ?? (nextPagination ? page.value * nextPagination.page_size < nextPagination.total : false)

      totalPending.value = hasPendingTotal && Boolean(options.fetchTotal) && !resolvedTotal.value
      if (!hasPendingTotal) {
        resolvedTotal.value = true
      }

      if (totalPending.value && options.fetchTotal) {
        void refreshTotal(response.data, requestId)
      }
    } catch (error) {
      showErrorToast(error, options.emptyErrorMessage || "加载失败")
    } finally {
      if (requestId === activeRequestId) {
        loading.value = false
      }
    }
  }

  async function refreshTotal(data: TData, requestId: number) {
    try {
      const total = await options.fetchTotal?.(data)
      if (requestId !== activeRequestId || total == null) {
        return
      }

      pagination.value = {
        page: page.value,
        page_size: pageSize,
        total,
      }
      resolvedTotal.value = true
    } catch {
      // Keep the current page usable even if the delayed total request fails.
    } finally {
      if (requestId === activeRequestId) {
        totalPending.value = false
      }
    }
  }

  async function nextPage() {
    if (!hasNextPage.value) {
      return
    }
    page.value += 1
    await loadData()
  }

  async function prevPage() {
    if (!hasPrevPage.value) {
      return
    }
    page.value -= 1
    await loadData()
  }

  return {
    items,
    page,
    pagination,
    loading,
    totalPending,
    pageText,
    hasPrevPage,
    hasNextPage,
    loadData,
    nextPage,
    prevPage,
  }
}
