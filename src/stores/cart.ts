import { defineStore } from "pinia"

import { getCart } from "../api/cart"
import type { CartResponse } from "../types/api"

interface CartState {
  lineCount: number
  amountTotal: number
  currency: string
  ready: boolean
}

export const useCartStore = defineStore("cart", {
  state: (): CartState => ({
    lineCount: 0,
    amountTotal: 0,
    currency: "CNY",
    ready: false,
  }),
  actions: {
    applyCart(cart?: CartResponse | null) {
      this.lineCount = cart?.line_count || 0
      this.amountTotal = cart?.amount_total || 0
      this.currency = cart?.currency || "CNY"
      this.ready = true
    },
    async refresh() {
      const response = await getCart()
      this.applyCart(response.data)
      return response.data
    },
    clear() {
      this.lineCount = 0
      this.amountTotal = 0
      this.currency = "CNY"
      this.ready = false
    },
  },
})
