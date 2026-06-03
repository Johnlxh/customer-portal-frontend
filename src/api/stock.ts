import type {
  StockCatalogOverviewResponse,
  StockCatalogSeriesItemsResponse,
  StockSearchResponse,
  StockSearchTotalResponse,
} from "../types/api"
import { DEFAULT_PAGE_SIZE, DEFAULT_STOCK_BRAND } from "../constants/app"

import { request } from "./http"

export function searchStock(params: {
  q: string
  page?: number
  page_size?: number
  in_stock_only?: boolean
  include_total?: boolean
}) {
  return request<StockSearchResponse>({
    url: "/api/v1/stock/search",
    params: {
      q: params.q,
      page: params.page || 1,
      page_size: params.page_size || DEFAULT_PAGE_SIZE,
      in_stock_only: params.in_stock_only ? 1 : 0,
      include_total: params.include_total === false ? 0 : 1,
    }
  })
}

export function getStockSearchTotal(params: { q: string; in_stock_only?: boolean }) {
  return request<StockSearchTotalResponse>({
    url: "/api/v1/stock/search/total",
    params: {
      q: params.q,
      in_stock_only: params.in_stock_only ? 1 : 0,
    }
  })
}

export function getStockCatalog(params: { brand?: string; in_stock_only?: boolean }) {
  const brand = params.brand || DEFAULT_STOCK_BRAND
  return request<StockCatalogOverviewResponse>({
    url: "/api/v1/stock/catalog",
    params: {
      brand,
      in_stock_only: params.in_stock_only ? 1 : 0
    }
  })
}

export function getStockCatalogSeriesItems(params: {
  brand?: string
  series_key: string
  page?: number
  page_size?: number
  in_stock_only?: boolean
}) {
  const brand = params.brand || DEFAULT_STOCK_BRAND
  return request<StockCatalogSeriesItemsResponse>({
    url: "/api/v1/stock/catalog/items",
    params: {
      brand,
      series_key: params.series_key,
      page: params.page || 1,
      page_size: params.page_size || DEFAULT_PAGE_SIZE,
      in_stock_only: params.in_stock_only ? 1 : 0
    }
  })
}
