import type { PaginatedListResponse, PickingSummary, ReturnDetail } from "../types/api"
import { DEFAULT_PAGE_SIZE } from "../constants/app"

import { request } from "./http"

export function getReturns(page = 1, pageSize = DEFAULT_PAGE_SIZE, includeTotal = true) {
  return request<PaginatedListResponse<PickingSummary>>({
    url: "/api/v1/returns",
    params: {
      page,
      page_size: pageSize,
      include_total: includeTotal ? 1 : 0,
    }
  })
}

export function getReturnsTotal() {
  return request<{ total: number }>({
    url: "/api/v1/returns/total",
  })
}

export function getReturnDetail(id: string | number) {
  return request<ReturnDetail>({
    url: `/api/v1/returns/${id}`
  })
}
