import { defineStore } from "pinia"

import { getDashboard, getDashboardCounts } from "../api/dashboard"
import type { DashboardCounts, DashboardResponse } from "../types/api"

interface DashboardState {
  payload: DashboardResponse | null
  loading: boolean
  countsLoading: boolean
  activeRequestId: number
}

export const useDashboardStore = defineStore("dashboard", {
  state: (): DashboardState => ({
    payload: null,
    loading: false,
    countsLoading: false,
    activeRequestId: 0,
  }),
  actions: {
    async refresh() {
      const requestId = this.activeRequestId + 1
      this.activeRequestId = requestId
      this.loading = true
      this.countsLoading = false
      try {
        const response = await getDashboard(false)
        if (requestId !== this.activeRequestId) {
          return
        }

        this.payload = response.data
        if (response.data.counts_pending) {
          this.countsLoading = true
          void this.refreshCounts(requestId)
        }
      } finally {
        if (requestId === this.activeRequestId) {
          this.loading = false
        }
      }
    },
    async refreshCounts(requestId?: number) {
      const activeRequestId = requestId ?? this.activeRequestId
      try {
        const response = await getDashboardCounts()
        if (activeRequestId !== this.activeRequestId) {
          return
        }

        this.applyCounts(response.data)
      } finally {
        if (activeRequestId === this.activeRequestId) {
          this.countsLoading = false
        }
      }
    },
    applyCounts(counts: DashboardCounts) {
      this.payload = {
        counts,
        counts_pending: false,
        recent_quotes: this.payload?.recent_quotes || [],
        recent_orders: this.payload?.recent_orders || [],
        recent_returns: this.payload?.recent_returns || [],
      }
    },
  }
})
