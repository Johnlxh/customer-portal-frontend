import { defineStore } from "pinia"

import { DEFAULT_PAGE_SIZE } from "../constants/app"
import { getStockSearchTotal, searchStock } from "../api/stock"
import type { StockItem } from "../types/api"
import { buildSearchPlan } from "../utils/search"

interface StockState {
  query: string
  inStockOnly: boolean
  items: StockItem[]
  total: number
  hasSearched: boolean
  page: number
  pageSize: number
  hasNext: boolean
  loading: boolean
  totalPending: boolean
  appliedQuery: string
  activeRequestId: number
}

export const useStockStore = defineStore("stock", {
  state: (): StockState => ({
    query: "",
    inStockOnly: false,
    items: [],
    total: 0,
    hasSearched: false,
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    hasNext: false,
    loading: false,
    totalPending: false,
    appliedQuery: "",
    activeRequestId: 0
  }),
  actions: {
    resetSearch() {
      this.activeRequestId += 1
      this.items = []
      this.total = 0
      this.hasSearched = false
      this.page = 1
      this.appliedQuery = ""
      this.hasNext = false
      this.loading = false
      this.totalPending = false
    },
    async search(resetPage = false) {
      const plan = buildSearchPlan(this.query)
      if (!plan.normalizedQuery) {
        this.resetSearch()
        return
      }
      if (resetPage) {
        this.page = 1
      }

      const requestQuery = !resetPage && this.page > 1 && this.appliedQuery
        ? this.appliedQuery
        : plan.normalizedQuery
      const shouldRefreshTotal = resetPage || requestQuery !== this.appliedQuery

      const requestId = this.activeRequestId + 1
      this.activeRequestId = requestId
      this.loading = true
      try {
        const response = await searchStock({
          q: requestQuery,
          page: this.page,
          page_size: this.pageSize,
          in_stock_only: this.inStockOnly,
          include_total: false,
        })

        if (requestId !== this.activeRequestId) {
          return
        }

        this.items = response.data.items
        this.hasNext = response.data.has_next
        this.hasSearched = true
        this.appliedQuery = requestQuery
        if (shouldRefreshTotal) {
          this.total = 0
          this.totalPending = true
          void this.refreshTotal(requestQuery, requestId, this.inStockOnly)
        }
      } finally {
        if (requestId === this.activeRequestId) {
          this.loading = false
        }
      }
    },
    async refreshTotal(query: string, requestId: number, inStockOnly: boolean) {
      try {
        const response = await getStockSearchTotal({
          q: query,
          in_stock_only: inStockOnly,
        })
        if (requestId !== this.activeRequestId || query !== this.appliedQuery || inStockOnly !== this.inStockOnly) {
          return
        }
        this.total = response.data.total || 0
      } finally {
        if (requestId === this.activeRequestId && query === this.appliedQuery && inStockOnly === this.inStockOnly) {
          this.totalPending = false
        }
      }
    },
    async nextPage() {
      if (!this.hasNext) {
        return
      }
      this.page += 1
      await this.search()
    },
    async prevPage() {
      if (this.page <= 1) {
        return
      }
      this.page -= 1
      await this.search()
    }
  }
})
