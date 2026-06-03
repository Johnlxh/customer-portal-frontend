import type { CartGenerateQuoteResponse, CartResponse } from "../types/api"

import { request } from "./http"

export function getCart() {
  return request<CartResponse>({
    url: "/api/v1/cart"
  })
}

export function addCartItems(items: Array<{ product_id: number; quantity: number }>) {
  return request<CartResponse>({
    url: "/api/v1/cart/items/batch",
    method: "POST",
    data: { items }
  })
}

export function updateCartLineQuantity(lineId: number, quantity: number) {
  return request<CartResponse>({
    url: `/api/v1/cart/lines/${lineId}/quantity`,
    method: "POST",
    data: { quantity }
  })
}

export function removeCartLine(lineId: number) {
  return request<CartResponse>({
    url: `/api/v1/cart/lines/${lineId}/remove`,
    method: "POST"
  })
}

export function generateQuoteFromCart(lineIds: number[], payload?: { client_order_ref?: string; note?: string }) {
  return request<CartGenerateQuoteResponse>({
    url: "/api/v1/cart/generate-quote",
    method: "POST",
    data: {
      line_ids: lineIds,
      client_order_ref: payload?.client_order_ref || "",
      note: payload?.note || ""
    }
  })
}
