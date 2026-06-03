import { computed, type ComputedRef, ref } from "vue"

import { addCartItems } from "../../api/cart"
import type { CartResponse, StockItem } from "../../types/api"
import { patchQuantityMap, parseQuantityInput, readQuantity } from "../../utils/quantity"
import { showErrorToast, showToast } from "../../utils/toast"

export function useStockSelection(items: ComputedRef<StockItem[]>, onCartApplied: (cart: CartResponse) => void) {
  const selectedItemIds = ref<number[]>([])
  const selectedQuantities = ref<Record<number, number>>({})
  const addingToCart = ref(false)

  const allCurrentPageSelected = computed(() => {
    if (!items.value.length) {
      return false
    }
    return items.value.every((item) => selectedItemIds.value.includes(item.id))
  })

  const selectedItems = computed(() => items.value.filter((item) => selectedItemIds.value.includes(item.id)))

  function resetSelection() {
    selectedItemIds.value = []
    selectedQuantities.value = {}
  }

  function isSelected(productId: number) {
    return selectedItemIds.value.includes(productId)
  }

  function ensureQuantity(productId: number) {
    if (!selectedQuantities.value[productId]) {
      selectedQuantities.value = patchQuantityMap(selectedQuantities.value, productId, 1)
    }
  }

  function toggleItemSelection(productId: number) {
    if (isSelected(productId)) {
      selectedItemIds.value = selectedItemIds.value.filter((id) => id !== productId)
      return
    }
    ensureQuantity(productId)
    selectedItemIds.value = [...selectedItemIds.value, productId]
  }

  function toggleCurrentPageSelection() {
    if (allCurrentPageSelected.value) {
      const currentPageIds = new Set(items.value.map((item) => item.id))
      selectedItemIds.value = selectedItemIds.value.filter((id) => !currentPageIds.has(id))
      return
    }

    const merged = new Set(selectedItemIds.value)
    items.value.forEach((item) => {
      merged.add(item.id)
      ensureQuantity(item.id)
    })
    selectedItemIds.value = Array.from(merged)
  }

  function getSelectedQuantity(productId: number) {
    return readQuantity(selectedQuantities.value, productId)
  }

  function normalizeQuantity(productId: number, value: number) {
    selectedQuantities.value = patchQuantityMap(selectedQuantities.value, productId, value)
  }

  function handleQuantityInput(productId: number, event: Event | { detail?: { value?: string | number } }) {
    normalizeQuantity(productId, parseQuantityInput(event))
  }

  function stepQuantity(productId: number, delta: number) {
    normalizeQuantity(productId, getSelectedQuantity(productId) + delta)
  }

  async function addSelectedToCart() {
    if (!selectedItems.value.length) {
      showToast("请先选择商品。")
      return
    }

    addingToCart.value = true
    try {
      const response = await addCartItems(
        selectedItems.value.map((item) => ({
          product_id: item.id,
          quantity: getSelectedQuantity(item.id),
        })),
      )
      onCartApplied(response.data)
      resetSelection()
      showToast("已加入购物车")
    } catch (error) {
      showErrorToast(error, "加入购物车失败")
    } finally {
      addingToCart.value = false
    }
  }

  return {
    selectedItemIds,
    addingToCart,
    allCurrentPageSelected,
    selectedItems,
    isSelected,
    resetSelection,
    toggleItemSelection,
    toggleCurrentPageSelection,
    getSelectedQuantity,
    handleQuantityInput,
    stepQuantity,
    addSelectedToCart,
  }
}
