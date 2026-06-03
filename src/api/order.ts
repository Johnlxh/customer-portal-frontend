import type { PaginatedListResponse, SaleOrderDetail, SaleOrderSummary } from "../types/api"
import { DEFAULT_PAGE_SIZE } from "../constants/app"

import { request } from "./http"

export function getOrders(page = 1, pageSize = DEFAULT_PAGE_SIZE, includeTotal = true) {
  return request<PaginatedListResponse<SaleOrderSummary>>({
    url: "/api/v1/orders",
    params: {
      page,
      page_size: pageSize,
      include_total: includeTotal ? 1 : 0,
    }
  })
}

export function getOrdersTotal() {
  return request<{ total: number }>({
    url: "/api/v1/orders/total",
  })
}

export function getOrderDetail(id: string | number) {
  return request<SaleOrderDetail>({
    url: `/api/v1/orders/${id}`
  })
}
