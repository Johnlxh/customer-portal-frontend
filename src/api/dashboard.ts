import type { DashboardCountsResponse, DashboardResponse } from "../types/api"

import { request } from "./http"

export function getDashboard(includeCounts = true) {
  return request<DashboardResponse>({
    url: "/api/v1/dashboard",
    params: {
      include_counts: includeCounts ? 1 : 0,
    },
  })
}

export function getDashboardCounts() {
  return request<DashboardCountsResponse>({
    url: "/api/v1/dashboard/counts",
  })
}
