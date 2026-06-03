import { DEFAULT_STOCK_BRAND } from "../constants/app"
import { withQuery } from "./query"

export type RootPageKey = "home" | "stock" | "orders" | "quotes" | "me"

const ROOT_PAGE_MAP: Record<RootPageKey, string> = {
  home: "/pages/home/index",
  stock: "/pages/stock/index",
  orders: "/pages/orders/index",
  quotes: "/pages/quotes/index",
  me: "/pages/me/index",
}

export function openRootPage(page: RootPageKey) {
  uni.switchTab({ url: ROOT_PAGE_MAP[page] })
}

export function openReturnsPage() {
  uni.navigateTo({ url: "/packages/docs/returns/index" })
}

export function openOrderDetail(id: number | string) {
  uni.navigateTo({ url: withQuery("/packages/docs/order-detail/index", { id }) })
}

export function openQuoteDetail(id: number | string) {
  uni.navigateTo({ url: withQuery("/packages/docs/quote-detail/index", { id }) })
}

export function openReturnDetail(id: number | string) {
  uni.navigateTo({ url: withQuery("/packages/docs/return-detail/index", { id }) })
}

export function openDeliveryDetail(id: number | string) {
  uni.navigateTo({ url: withQuery("/packages/docs/delivery-detail/index", { id }) })
}

export function openPcScanPage(sessionToken?: string) {
  uni.navigateTo({
    url: withQuery("/pages/pc-scan/index", {
      session_token: sessionToken
    })
  })
}

export function openCartPage() {
  uni.navigateTo({ url: "/pages/cart/index" })
}

export function openStockCatalogPage(brand = DEFAULT_STOCK_BRAND) {
  uni.navigateTo({ url: withQuery("/pages/stock-catalog/index", { brand }) })
}

export function goBackOr(fallbackUrl: string) {
  if (getCurrentPages().length > 1) {
    uni.navigateBack({ delta: 1 })
    return
  }
  if (Object.values(ROOT_PAGE_MAP).includes(fallbackUrl as (typeof ROOT_PAGE_MAP)[RootPageKey])) {
    uni.switchTab({ url: fallbackUrl })
    return
  }
  uni.reLaunch({ url: fallbackUrl })
}
