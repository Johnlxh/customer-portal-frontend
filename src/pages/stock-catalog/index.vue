<script setup lang="ts">
import { computed, ref, watch } from "vue"
import { onLoad } from "@dcloudio/uni-app"

import { addCartItems, getCart, removeCartLine, updateCartLineQuantity } from "../../api/cart"
import { getStockCatalog, getStockCatalogSeriesItems } from "../../api/stock"
import ProductThumb from "../../components/ProductThumb.vue"
import { DEFAULT_PAGE_SIZE, DEFAULT_STOCK_BRAND } from "../../constants/app"
import { useSessionGuard } from "../../composables/useSessionGuard"
import { useCartStore } from "../../stores/cart"
import type {
  CartLine,
  CartResponse,
  StockCatalogFacet,
  StockCatalogOverviewResponse,
  StockCatalogSeries,
  StockItem,
} from "../../types/api"
import { formatMoney } from "../../utils/money"
import { openCartPage } from "../../utils/navigation"
import { buildQuantityMap, parseQuantityInput, patchQuantityMap, readQuantity } from "../../utils/quantity"
import { decodeQueryValue } from "../../utils/query"
import { matchesSearchText } from "../../utils/search"
import { showErrorToast, showToast } from "../../utils/toast"

type GradeFilter = "" | "A" | "B" | "C"
type SeriesSkuItem = StockItem & { series_key: string; brand_name: string }
type FilterPreviewItem = {
  key: string
  label: string
  active: boolean
}
type SeriesItemsCacheEntry = {
  items: SeriesSkuItem[]
  total: number
  hasNext: boolean
  page: number
  expiresAt: number
}

const SERIES_ITEMS_CACHE_TTL_MS = 5 * 60 * 1000
const SERIES_ITEMS_PREFETCH_COUNT = 8
const SERIES_ITEMS_PREFETCH_DELAY_MS = 120
const SERIES_ITEMS_PREFETCH_CONCURRENCY = 4

const cartStore = useCartStore()
const seriesItemsCache = new Map<string, SeriesItemsCacheEntry>()
const seriesItemsPendingKeys = new Set<string>()
let seriesItemsPrefetchTimer: ReturnType<typeof setTimeout> | null = null

const brand = ref(DEFAULT_STOCK_BRAND)
const overview = ref<StockCatalogOverviewResponse | null>(null)
const loading = ref(false)
const itemsLoading = ref(false)
const inStockOnly = ref(false)
const selectedGrade = ref<GradeFilter>("")
const searchKeyword = ref("")
const selectedRoot = ref("")
const selectedSubcategory = ref("")
const selectedCategory = ref("")
const selectedSeriesKey = ref("")
const categoryPanelVisible = ref(false)
const filterPanelVisible = ref(false)
const skuPanelVisible = ref(false)
const cartDrawerVisible = ref(false)
const seriesItems = ref<SeriesSkuItem[]>([])
const seriesPage = ref(1)
const seriesHasNext = ref(false)
const seriesTotal = ref(0)
const itemQuantities = ref<Record<number, number>>({})
const cart = ref<CartResponse | null>(null)
const cartLoading = ref(false)
const cartLineQuantities = ref<Record<number, number>>({})
const addingItemId = ref<number | null>(null)
const cartUpdatingLineId = ref<number | null>(null)
const cartRemovingLineId = ref<number | null>(null)
const hotOnly = ref(false)

onLoad((query) => {
  if (query?.brand) {
    brand.value = decodeQueryValue(query.brand, brand.value)
  }
})

useSessionGuard(async () => {
  void cartStore.refresh().catch(() => {})
  if (!overview.value) {
    await loadCatalog()
  }
})

const publishedSeries = computed(() =>
  (overview.value?.series || []).filter((item) => item.published_visible)
)

const rootOptions = computed(() =>
  [...(overview.value?.roots || [])]
    .filter((item) => item.published_series_count > 0)
    .sort(compareFacet)
)

const currentSubcategories = computed(() =>
  [...(overview.value?.subcategories || [])]
    .filter((item) => {
      if (!item.published_series_count) {
        return false
      }
      if (selectedRoot.value && item.display_root !== selectedRoot.value) {
        return false
      }
      return true
    })
    .sort(compareFacet)
)

const currentCategories = computed(() => {
  const categories = overview.value?.categories || []
  const source = categories.length
    ? categories.filter((item) => {
        if (!item.published_series_count) {
          return false
        }
        if (selectedRoot.value && item.display_root !== selectedRoot.value) {
          return false
        }
        if (selectedSubcategory.value && (item.display_subcategory || "") !== selectedSubcategory.value) {
          return false
        }
        return true
      })
    : deriveCategoryFacets(publishedSeries.value, selectedRoot.value, selectedSubcategory.value)

  return [...source].sort(compareFacet)
})

const pathSeries = computed(() => {
  const keyword = searchKeyword.value.trim()
  return publishedSeries.value
    .filter((item) => {
      if (selectedRoot.value && item.display_root !== selectedRoot.value) {
        return false
      }
      if (selectedSubcategory.value && (item.display_subcategory || "") !== selectedSubcategory.value) {
        return false
      }
      if (selectedCategory.value && (item.display_category || item.display_leaf || "其他分类") !== selectedCategory.value) {
        return false
      }
      if (!keyword) {
        return true
      }
      return matchesSearchText([
        item.display_major,
        item.display_series,
        item.series_key,
        item.sample_model,
        item.sample_product_name,
        item.sample_manufacturer_code,
        item.sample_order_code,
        item.display_root,
        item.display_category,
        item.display_subcategory,
        item.source_category_path,
      ], keyword)
    })
    .sort(compareSeries)
})

const filteredSeries = computed(() =>
  pathSeries.value.filter((item) => {
    if (inStockOnly.value && item.in_stock_sku_count <= 0) {
      return false
    }
    if (hotOnly.value && !isHotSeries(item)) {
      return false
    }
    if (selectedGrade.value && item.grade !== selectedGrade.value) {
      return false
    }
    return true
  })
)

const categoryPreviewOptions = computed(() =>
  buildCategoryPreview(currentCategories.value, selectedCategory.value, 4)
)

const selectedSubcategoryLabel = computed(
  () =>
    currentSubcategories.value.find((item) => categoryValue(item) === selectedSubcategory.value)?.label ||
    selectedSubcategory.value
)

const selectedCategoryLabel = computed(
  () =>
    currentCategories.value.find((item) => categoryValue(item) === selectedCategory.value)?.label ||
    selectedCategory.value
)

const pathHint = computed(() =>
  [selectedRoot.value, selectedSubcategoryLabel.value, selectedCategoryLabel.value].filter(Boolean).join(" / ")
)

const selectedSeries = computed(
  () => filteredSeries.value.find((item) => item.series_key === selectedSeriesKey.value) || null
)

const cartItems = computed(() => cart.value?.items || [])
const cartBadge = computed(() => {
  if (!cartStore.lineCount) {
    return ""
  }
  return cartStore.lineCount > 99 ? "99+" : String(cartStore.lineCount)
})
const cartAmountText = computed(() =>
  formatMoney(cart.value?.amount_total || cartStore.amountTotal || 0, cart.value?.currency || cartStore.currency || "CNY")
)
const categoryToggleLabel = computed(() => (categoryPanelVisible.value ? "收起 ^" : "更多 v"))
const filterToggleLabel = computed(() => (filterPanelVisible.value ? "收起 ^" : "更多 v"))
const showCategoryToggle = computed(() => currentCategories.value.length > categoryPreviewOptions.value.length || categoryPanelVisible.value)
const filterPreviewItems = computed<FilterPreviewItem[]>(() => {
  const items: FilterPreviewItem[] = [
    { key: "brand", label: brand.value, active: true },
    { key: "hot", label: "热卖", active: hotOnly.value },
    { key: "stock", label: "只看现货", active: inStockOnly.value },
    { key: "grade-a", label: "A级", active: selectedGrade.value === "A" },
    { key: "grade-b", label: "B级", active: selectedGrade.value === "B" },
    { key: "grade-c", label: "C级", active: selectedGrade.value === "C" },
  ]
  const active = items.filter((item) => item.active)
  const inactive = items.filter((item) => !item.active)
  return [...active, ...inactive].slice(0, 4)
})

watch(
  rootOptions,
  (value) => {
    if (!value.length) {
      selectedRoot.value = ""
      return
    }
    if (!value.some((item) => item.key === selectedRoot.value)) {
      selectedRoot.value = value[0].key
    }
  },
  { immediate: true }
)

watch(
  currentSubcategories,
  (value) => {
    if (!value.length) {
      selectedSubcategory.value = ""
      return
    }
    const nextValue = categoryValue(value[0])
    if (!value.some((item) => categoryValue(item) === selectedSubcategory.value)) {
      selectedSubcategory.value = nextValue
    }
  },
  { immediate: true }
)

watch(
  currentCategories,
  (value) => {
    if (!value.length) {
      selectedCategory.value = ""
      return
    }
    const nextValue = categoryValue(value[0])
    if (!value.some((item) => categoryValue(item) === selectedCategory.value)) {
      selectedCategory.value = nextValue
    }
  },
  { immediate: true }
)

watch(filteredSeries, (value) => {
  if (!selectedSeriesKey.value) {
    scheduleSeriesItemsPrefetch(value)
    return
  }
  if (value.some((item) => item.series_key === selectedSeriesKey.value)) {
    scheduleSeriesItemsPrefetch(value)
    return
  }
  selectedSeriesKey.value = ""
  skuPanelVisible.value = false
  seriesItems.value = []
  seriesTotal.value = 0
  seriesHasNext.value = false
  scheduleSeriesItemsPrefetch(value)
})

async function loadCatalog() {
  loading.value = true
  try {
    const response = await getStockCatalog({
      brand: brand.value,
      in_stock_only: false,
    })
    overview.value = response.data
  } catch (error) {
    showErrorToast(error, "分类加载失败")
  } finally {
    loading.value = false
  }
}

async function loadSeriesItems(reset = false) {
  if (!selectedSeriesKey.value) {
    seriesItems.value = []
    seriesTotal.value = 0
    seriesHasNext.value = false
    return
  }
  if (reset) {
    seriesPage.value = 1
  }
  const cacheKey = buildSeriesItemsCacheKey(selectedSeriesKey.value, inStockOnly.value)
  if (reset) {
    const cached = getSeriesItemsCache(cacheKey)
    if (cached) {
      applySeriesItemsCache(cached)
      return
    }
  }
  const currentSeriesKey = selectedSeriesKey.value
  const currentBrand = brand.value
  const currentInStockOnly = inStockOnly.value
  const requestPage = seriesPage.value
  seriesItemsPendingKeys.add(cacheKey)
  itemsLoading.value = true
  try {
    const response = await getStockCatalogSeriesItems({
      brand: currentBrand,
      series_key: currentSeriesKey,
      page: requestPage,
      page_size: DEFAULT_PAGE_SIZE,
      in_stock_only: currentInStockOnly,
    })
    const nextItems = response.data.items
    const previousItems = !reset ? getSeriesItemsCache(cacheKey)?.items || seriesItems.value : []
    const nextState: SeriesItemsCacheEntry = {
      items: reset ? nextItems : [...previousItems, ...nextItems],
      hasNext: response.data.has_next,
      total: response.pagination?.total || nextItems.length,
      page: requestPage,
      expiresAt: Date.now() + SERIES_ITEMS_CACHE_TTL_MS,
    }
    seriesItemsCache.set(cacheKey, nextState)
    if (
      selectedSeriesKey.value === currentSeriesKey &&
      brand.value === currentBrand &&
      inStockOnly.value === currentInStockOnly
    ) {
      applySeriesItemsCache(nextState)
    }
  } catch (error) {
    showErrorToast(error, "系列商品加载失败")
  } finally {
    seriesItemsPendingKeys.delete(cacheKey)
    itemsLoading.value = false
  }
}

function pickRoot(rootKey: string) {
  if (rootKey === selectedRoot.value) {
    return
  }
  selectedRoot.value = rootKey
  categoryPanelVisible.value = false
  filterPanelVisible.value = false
}

function pickSubcategory(value: string) {
  if (value === selectedSubcategory.value) {
    return
  }
  selectedSubcategory.value = value
  categoryPanelVisible.value = false
  filterPanelVisible.value = false
}

function pickCategory(value: string) {
  selectedCategory.value = value
  categoryPanelVisible.value = false
}

function toggleCategoryPanel() {
  if (!currentCategories.value.length) {
    return
  }
  categoryPanelVisible.value = !categoryPanelVisible.value
}

function closeCategoryPanel() {
  categoryPanelVisible.value = false
}

async function toggleInStockOnly() {
  inStockOnly.value = !inStockOnly.value
  await maybeRefreshDrawerItems()
}

async function toggleHotOnly() {
  hotOnly.value = !hotOnly.value
  await maybeRefreshDrawerItems()
}

function setGrade(grade: string) {
  const nextGrade = grade as GradeFilter
  selectedGrade.value = selectedGrade.value === nextGrade ? "" : nextGrade
}

async function resetFilters() {
  inStockOnly.value = false
  selectedGrade.value = ""
  hotOnly.value = false
  await maybeRefreshDrawerItems()
}

function openFilterPanel() {
  filterPanelVisible.value = true
}

function closeFilterPanel() {
  filterPanelVisible.value = false
}

async function maybeRefreshDrawerItems() {
  if (!skuPanelVisible.value || !selectedSeriesKey.value) {
    return
  }
  await loadSeriesItems(true)
}

async function openSeries(seriesKey: string) {
  categoryPanelVisible.value = false
  const changed = selectedSeriesKey.value !== seriesKey
  const cacheKey = buildSeriesItemsCacheKey(seriesKey, inStockOnly.value)
  const cached = getSeriesItemsCache(cacheKey)
  selectedSeriesKey.value = seriesKey
  skuPanelVisible.value = true
  if (cached) {
    applySeriesItemsCache(cached)
    itemsLoading.value = false
    return
  }
  if (changed) {
    seriesItems.value = []
    seriesTotal.value = 0
    seriesHasNext.value = false
  }
  itemsLoading.value = true
  if (changed || !seriesItems.value.length) {
    void loadSeriesItems(true)
  }
}

function closeSkuPanel() {
  skuPanelVisible.value = false
}

function syncCartLineQuantities(lines: CartLine[]) {
  cartLineQuantities.value = buildQuantityMap(lines, (line) => line.id, (line) => line.quantity || 1)
}

function applyCartData(nextCart: CartResponse | null) {
  cart.value = nextCart
  cartStore.applyCart(nextCart)
  syncCartLineQuantities(nextCart?.items || [])
}

async function loadCartDrawer() {
  cartLoading.value = true
  try {
    const response = await getCart()
    applyCartData(response.data)
  } catch (error) {
    showErrorToast(error, "购物车加载失败")
  } finally {
    cartLoading.value = false
  }
}

async function openCartDrawer() {
  cartDrawerVisible.value = true
  await loadCartDrawer()
}

function closeCartDrawer() {
  cartDrawerVisible.value = false
}

function normalizeQuantity(productId: number, value: number) {
  itemQuantities.value = patchQuantityMap(itemQuantities.value, productId, value)
}

function getQuantity(productId: number) {
  return readQuantity(itemQuantities.value, productId)
}

function handleQuantityInput(productId: number, event: Event | { detail?: { value?: string } }) {
  normalizeQuantity(productId, parseQuantityInput(event))
}

function stepQuantity(productId: number, delta: number) {
  normalizeQuantity(productId, getQuantity(productId) + delta)
}

async function addItemToCart(item: StockItem) {
  addingItemId.value = item.id
  try {
    const response = await addCartItems([
      {
        product_id: item.id,
        quantity: getQuantity(item.id),
      },
    ])
    applyCartData(response.data)
    showToast("已加入购物车")
  } catch (error) {
    showErrorToast(error, "加入购物车失败")
  } finally {
    addingItemId.value = null
  }
}

function getCartLineQuantity(lineId: number) {
  return readQuantity(cartLineQuantities.value, lineId)
}

function normalizeCartLineQuantity(lineId: number, value: number) {
  cartLineQuantities.value = patchQuantityMap(cartLineQuantities.value, lineId, value)
}

function handleCartLineQuantityInput(lineId: number, event: Event | { detail?: { value?: string } }) {
  normalizeCartLineQuantity(lineId, parseQuantityInput(event))
}

async function syncCartLineQuantity(lineId: number) {
  cartUpdatingLineId.value = lineId
  try {
    const response = await updateCartLineQuantity(lineId, getCartLineQuantity(lineId))
    applyCartData(response.data)
  } catch (error) {
    showErrorToast(error, "数量更新失败")
    await loadCartDrawer()
  } finally {
    cartUpdatingLineId.value = null
  }
}

async function stepCartLineQuantity(lineId: number, delta: number) {
  normalizeCartLineQuantity(lineId, getCartLineQuantity(lineId) + delta)
  await syncCartLineQuantity(lineId)
}

async function removeCartDrawerLine(lineId: number) {
  cartRemovingLineId.value = lineId
  try {
    const response = await removeCartLine(lineId)
    applyCartData(response.data)
  } catch (error) {
    showErrorToast(error, "移除失败")
  } finally {
    cartRemovingLineId.value = null
  }
}

async function loadMoreItems() {
  if (!seriesHasNext.value || itemsLoading.value) {
    return
  }
  seriesPage.value += 1
  await loadSeriesItems()
}

function compareFacet(left: StockCatalogFacet, right: StockCatalogFacet) {
  if (right.published_series_count !== left.published_series_count) {
    return right.published_series_count - left.published_series_count
  }
  return left.label.localeCompare(right.label, "zh-CN")
}

function compareSeries(left: StockCatalogSeries, right: StockCatalogSeries) {
  if ((right.score || 0) !== (left.score || 0)) {
    return (right.score || 0) - (left.score || 0)
  }
  if ((right.in_stock_sku_count || 0) !== (left.in_stock_sku_count || 0)) {
    return (right.in_stock_sku_count || 0) - (left.in_stock_sku_count || 0)
  }
  return (left.display_series || left.series_key).localeCompare(
    right.display_series || right.series_key,
    "zh-CN"
  )
}

function isHotSeries(series: StockCatalogSeries) {
  return (series.score || 0) >= 80 || series.sold_orders_180 > 0 || series.sold_qty_180 > 0
}

function categoryValue(item: StockCatalogFacet) {
  return item.value || item.key
}

function buildCategoryPreview(options: StockCatalogFacet[], selectedValue: string, limit: number) {
  if (options.length <= limit) {
    return options
  }

  const targetValue = selectedValue || categoryValue(options[0])
  const selectedOption = options.find((item) => categoryValue(item) === targetValue)
  if (!selectedOption) {
    return options.slice(0, limit)
  }

  const preview = options.filter((item) => categoryValue(item) !== targetValue).slice(0, Math.max(limit - 1, 0))
  return [selectedOption, ...preview]
}

function deriveCategoryFacets(source: StockCatalogSeries[], rootKey: string, subcategoryValue: string) {
  const facetMap = new Map<string, StockCatalogFacet>()

  for (const series of source) {
    if (rootKey && series.display_root !== rootKey) {
      continue
    }
    const seriesSubcategory = series.display_subcategory || ""
    if (subcategoryValue && seriesSubcategory !== subcategoryValue) {
      continue
    }
    const value = series.display_category || series.display_leaf || "其他分类"
    const current = facetMap.get(value)
    if (current) {
      current.series_count += 1
      current.default_series_count += Number(series.default_visible)
      current.published_series_count += Number(series.published_visible)
      current.grade_counts[series.grade] += 1
      continue
    }
    facetMap.set(value, {
      key: value,
      value,
      label: value,
      display_root: series.display_root,
      display_subcategory: seriesSubcategory,
      series_count: 1,
      default_series_count: Number(series.default_visible),
      published_series_count: Number(series.published_visible),
      grade_counts: {
        A: series.grade === "A" ? 1 : 0,
        B: series.grade === "B" ? 1 : 0,
        C: series.grade === "C" ? 1 : 0,
      },
    })
  }

  return [...facetMap.values()]
}

function seriesBadgeTone(series: StockCatalogSeries) {
  if (series.grade === "A") {
    return "success"
  }
  if (series.grade === "B") {
    return "warning"
  }
  return "muted"
}

function formatSeriesPath(series: StockCatalogSeries | null) {
  if (!series) {
    return "-"
  }
  return [
    series.display_major || series.display_root,
    series.display_subcategory,
    series.display_category || series.display_leaf,
  ]
    .filter(Boolean)
    .join(" / ")
}

function buildSeriesItemsCacheKey(seriesKey: string, inStockFlag: boolean) {
  return [brand.value, seriesKey, inStockFlag ? "stock" : "all"].join("::")
}

function getSeriesItemsCache(cacheKey: string) {
  const cached = seriesItemsCache.get(cacheKey)
  if (!cached) {
    return null
  }
  if (cached.expiresAt <= Date.now()) {
    seriesItemsCache.delete(cacheKey)
    return null
  }
  return cached
}

function applySeriesItemsCache(entry: SeriesItemsCacheEntry) {
  seriesItems.value = entry.items
  seriesHasNext.value = entry.hasNext
  seriesTotal.value = entry.total
  seriesPage.value = entry.page
}

function scheduleSeriesItemsPrefetch(source: StockCatalogSeries[]) {
  if (seriesItemsPrefetchTimer) {
    clearTimeout(seriesItemsPrefetchTimer)
  }
  if (loading.value || skuPanelVisible.value || !source.length) {
    return
  }
  const seriesKeys = source
    .slice(0, SERIES_ITEMS_PREFETCH_COUNT)
    .map((item) => item.series_key)
    .filter(Boolean)

  if (!seriesKeys.length) {
    return
  }

  seriesItemsPrefetchTimer = setTimeout(() => {
    void prefetchSeriesItems(seriesKeys)
  }, SERIES_ITEMS_PREFETCH_DELAY_MS)
}

async function prefetchSeriesItems(seriesKeys: string[]) {
  const currentBrand = brand.value
  const currentInStockOnly = inStockOnly.value
  const pendingKeys = seriesKeys.filter((seriesKey) => {
    const cacheKey = [currentBrand, seriesKey, currentInStockOnly ? "stock" : "all"].join("::")
    return !getSeriesItemsCache(cacheKey) && !seriesItemsPendingKeys.has(cacheKey)
  })

  if (!pendingKeys.length) {
    return
  }

  let cursor = 0
  const worker = async () => {
    while (cursor < pendingKeys.length) {
      const index = cursor
      cursor += 1
      const seriesKey = pendingKeys[index]
      const cacheKey = [currentBrand, seriesKey, currentInStockOnly ? "stock" : "all"].join("::")
      seriesItemsPendingKeys.add(cacheKey)
      try {
        const response = await getStockCatalogSeriesItems({
          brand: currentBrand,
          series_key: seriesKey,
          page: 1,
          page_size: DEFAULT_PAGE_SIZE,
          in_stock_only: currentInStockOnly,
        })
        seriesItemsCache.set(cacheKey, {
          items: response.data.items,
          hasNext: response.data.has_next,
          total: response.pagination?.total || response.data.items.length,
          page: 1,
          expiresAt: Date.now() + SERIES_ITEMS_CACHE_TTL_MS,
        })
      } catch (error) {
        // best effort prefetch
      } finally {
        seriesItemsPendingKeys.delete(cacheKey)
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(SERIES_ITEMS_PREFETCH_CONCURRENCY, pendingKeys.length) }, () => worker())
  )
}

</script>

<template>
  <view class="selector-page">
    <view class="selector-toolbar">
      <view class="selector-search-wrap">
        <input
          v-model="searchKeyword"
          name="series_search"
          class="selector-search"
          placeholder="搜索系列名、样本型号、品类"
          confirm-type="search"
        />
      </view>
    </view>

    <view class="selector-body">
      <view class="selector-nav">
        <view class="selector-panel__titlebar selector-panel__titlebar--nav">
          <text class="selector-panel__title">产品分类</text>
        </view>

        <scroll-view scroll-y class="selector-nav__scroll">
          <view class="selector-nav__inner">
            <view v-for="root in rootOptions" :key="root.key" class="selector-nav-group">
              <view
                class="selector-root"
                :class="{ 'selector-root--active': root.key === selectedRoot }"
                hover-class="selector-root--hover"
                @tap="pickRoot(root.key)"
              >
                <view class="selector-root__head">
                  <text class="selector-root__name">{{ root.label }}</text>
                  <view class="selector-root__meta">
                    <text class="selector-root__chevron">{{ root.key === selectedRoot ? "v" : ">" }}</text>
                  </view>
                </view>
              </view>

              <view v-if="root.key === selectedRoot" class="selector-subtree">
                <view
                  v-for="subcategory in currentSubcategories"
                  :key="subcategory.key"
                  class="selector-subtree__item"
                  :class="{ 'selector-subtree__item--active': categoryValue(subcategory) === selectedSubcategory }"
                  @tap="pickSubcategory(categoryValue(subcategory))"
                >
                  <text class="selector-subtree__name">{{ subcategory.label }}</text>
                </view>
              </view>
            </view>
          </view>
        </scroll-view>
      </view>

      <view class="selector-main">
        <view class="selector-main__top">
          <view class="selector-block">
            <view class="selector-block__head">
              <text class="selector-block__title">品类</text>
              <button
                v-if="showCategoryToggle"
                class="selector-secondary-button selector-block__toggle"
                @tap="toggleCategoryPanel"
              >
                {{ categoryToggleLabel }}
              </button>
            </view>

            <view v-if="!currentCategories.length" class="selector-inline-empty">
              当前二级下暂无可展示的三级分类。
            </view>

            <view v-else class="selector-chip-list">
              <view
                v-for="category in categoryPreviewOptions"
                :key="category.key"
                class="selector-chip"
                :class="{ 'selector-chip--active': categoryValue(category) === selectedCategory }"
                @tap="pickCategory(categoryValue(category))"
              >
                <text class="selector-chip__label">{{ category.label }}</text>
              </view>
            </view>
          </view>

          <view class="selector-block selector-block--filters">
            <view class="selector-block__head">
              <text class="selector-block__title">筛选条件</text>
              <button
                class="selector-secondary-button selector-block__toggle"
                @tap="openFilterPanel"
              >
                {{ filterToggleLabel }}
              </button>
            </view>

            <view class="selector-chip-list selector-chip-list--filters">
              <view
                v-for="item in filterPreviewItems"
                :key="item.key"
                class="selector-filter-chip"
                :class="{ 'selector-filter-chip--active': item.active }"
              >
                {{ item.label }}
              </view>
            </view>
          </view>

          <view class="selector-block selector-block--path">
            <text class="selector-path-hint">{{ pathHint || "请先完成分类选择" }}</text>
            <text class="selector-path-count">共 {{ filteredSeries.length }} 个系列</text>
          </view>
        </view>

        <scroll-view scroll-y class="selector-main__scroll">
          <view class="selector-main__inner">
            <view v-if="loading" class="selector-empty">
              <text>正在加载分类数据…</text>
            </view>

            <view v-else-if="!filteredSeries.length" class="selector-empty">
              <text>当前条件下没有系列，试试切换三级或放宽筛选。</text>
            </view>

            <view v-else class="selector-series-list">
              <view
                v-for="series in filteredSeries"
                :key="series.series_key"
                class="selector-series-row"
                :class="{ 'selector-series-row--active': series.series_key === selectedSeriesKey }"
                hover-class="selector-series-row--hover"
                @tap="openSeries(series.series_key)"
              >
                <view v-if="series.main_image_url" class="selector-series-row__media">
                  <image class="selector-series-row__thumb" :src="series.main_image_url" mode="aspectFill" />
                </view>
                <view class="selector-series-row__content">
                  <view class="selector-series-row__line">
                    <text class="selector-series-row__name">{{ series.display_series || series.series_key }}</text>
                    <text class="selector-series-badge" :class="`selector-series-badge--${seriesBadgeTone(series)}`">
                      {{ series.grade }}
                    </text>
                  </view>
                  <text class="selector-series-row__meta">
                    {{ series.sample_model || series.sample_manufacturer_code || series.sample_product_name || "点击查看 SKU" }}
                  </text>
                </view>
              </view>
            </view>
          </view>
        </scroll-view>
      </view>
    </view>

    <view v-if="categoryPanelVisible" class="selector-overlay-mask" @tap="closeCategoryPanel">
      <view class="selector-sheet" @tap.stop>
        <view class="selector-sheet__handle"></view>
        <view class="selector-sheet__head">
          <view class="selector-sheet__title-wrap">
            <text class="selector-sheet__title">选择三级分类</text>
            <text class="selector-sheet__subtitle">当前二级：{{ selectedSubcategoryLabel || "未选择" }}</text>
          </view>
          <button class="selector-primary-button selector-sheet__close" @tap="closeCategoryPanel">收起 ^</button>
        </view>

        <scroll-view scroll-y class="selector-sheet__body">
          <view class="selector-sheet__options">
            <view
              v-for="category in currentCategories"
              :key="category.key"
              class="selector-sheet__option"
              :class="{ 'selector-sheet__option--active': categoryValue(category) === selectedCategory }"
              @tap="pickCategory(categoryValue(category))"
            >
              <text class="selector-sheet__option-name">{{ category.label }}</text>
              <text class="selector-sheet__option-count">{{ category.published_series_count }} 个系列</text>
            </view>
          </view>
        </scroll-view>
      </view>
    </view>

    <view v-if="filterPanelVisible" class="selector-overlay-mask" @tap="closeFilterPanel">
      <view class="selector-sheet selector-sheet--filters" @tap.stop>
        <view class="selector-sheet__handle"></view>
        <view class="selector-sheet__head">
          <view class="selector-sheet__title-wrap">
            <text class="selector-sheet__title">筛选条件</text>
            <text class="selector-sheet__subtitle">固定长度预览，完整条件在这里选择</text>
          </view>
          <button class="selector-primary-button selector-sheet__close" @tap="closeFilterPanel">收起 ^</button>
        </view>

        <scroll-view scroll-y class="selector-sheet__body">
          <view class="selector-filter-group">
            <text class="selector-filter-group__title">品牌</text>
            <view class="selector-chip-list selector-chip-list--sheet">
              <view class="selector-filter-chip selector-filter-chip--active">{{ brand }}</view>
            </view>
          </view>

          <view class="selector-filter-group">
            <text class="selector-filter-group__title">属性</text>
            <view class="selector-chip-list selector-chip-list--sheet">
              <view
                class="selector-filter-chip"
                :class="{ 'selector-filter-chip--active': hotOnly }"
                @tap="toggleHotOnly"
              >
                热卖
              </view>
              <view
                class="selector-filter-chip"
                :class="{ 'selector-filter-chip--active': inStockOnly }"
                @tap="toggleInStockOnly"
              >
                只看现货
              </view>
            </view>
          </view>

          <view class="selector-filter-group">
            <text class="selector-filter-group__title">等级</text>
            <view class="selector-chip-list selector-chip-list--sheet">
              <view
                class="selector-filter-chip"
                :class="{ 'selector-filter-chip--active': !selectedGrade }"
                @tap="setGrade('')"
              >
                全部
              </view>
              <view
                v-for="grade in ['A', 'B', 'C']"
                :key="grade"
                class="selector-filter-chip"
                :class="{ 'selector-filter-chip--active': selectedGrade === grade }"
                @tap="setGrade(grade)"
              >
                {{ grade }}级
              </view>
            </view>
          </view>

          <view class="selector-filter-actions">
            <button class="selector-secondary-button selector-filter-actions__button" @tap="resetFilters">清空</button>
            <button class="selector-primary-button selector-filter-actions__button" @tap="closeFilterPanel">完成</button>
          </view>
        </scroll-view>
      </view>
    </view>

    <view v-if="skuPanelVisible" class="selector-drawer-mask" @tap="closeSkuPanel">
      <view class="selector-drawer" @tap.stop>
        <view class="selector-drawer__handle"></view>
        <view class="selector-drawer__head">
          <view v-if="selectedSeries?.main_image_url" class="selector-drawer__hero">
            <image class="selector-drawer__hero-image" :src="selectedSeries.main_image_url" mode="aspectFill" />
          </view>
          <view class="selector-drawer__title-wrap">
            <text class="selector-drawer__title">{{ selectedSeries?.display_series || "SKU 明细" }}</text>
            <text class="selector-drawer__subtitle">{{ formatSeriesPath(selectedSeries) }} · 共 {{ seriesTotal }} 个 SKU</text>
          </view>
          <button class="selector-secondary-button selector-drawer__close" @tap="closeSkuPanel">关闭</button>
        </view>

        <scroll-view
          scroll-y
          class="selector-drawer__body"
          lower-threshold="120"
          @scrolltolower="loadMoreItems"
        >
          <view v-if="itemsLoading && !seriesItems.length" class="selector-empty selector-empty--drawer">
            <text>正在加载 SKU…</text>
          </view>

          <view v-else-if="!seriesItems.length" class="selector-empty selector-empty--drawer">
            <text>当前系列暂时没有可展示的 SKU。</text>
          </view>

          <view v-else class="selector-sku-list">
            <view v-for="item in seriesItems" :key="item.id" class="selector-sku-card">
              <view class="selector-sku-card__head">
                <view v-if="item.main_image_url" class="selector-sku-card__media">
                  <image class="selector-sku-card__thumb" :src="item.main_image_url" mode="aspectFill" />
                </view>
                <view class="selector-sku-card__title-wrap">
                  <text class="selector-sku-card__title">{{ item.name }}</text>
                  <text class="selector-sku-card__meta">{{ item.model || item.order_code || item.manufacturer_code || "-" }}</text>
                </view>
                <view class="selector-sku-card__stock">
                  <text class="selector-sku-card__stock-value">{{ item.free_qty }}</text>
                  <text class="selector-sku-card__stock-label">可用库存</text>
                </view>
              </view>

              <view class="selector-sku-card__grid">
                <view class="selector-sku-card__cell">
                  <text class="selector-field-label">厂家编码</text>
                  <text class="selector-field-value">{{ item.manufacturer_code || "-" }}</text>
                </view>
                <view class="selector-sku-card__cell">
                  <text class="selector-field-label">订货编码</text>
                  <text class="selector-field-value">{{ item.order_code || "-" }}</text>
                </view>
                <view class="selector-sku-card__cell">
                  <text class="selector-field-label">面价</text>
                  <text class="selector-field-value">{{ item.list_price == null ? "-" : formatMoney(item.list_price, item.currency || "CNY") }}</text>
                </view>
                <view class="selector-sku-card__cell">
                  <text class="selector-field-label">客户价</text>
                  <text class="selector-field-value selector-sku-card__price">{{ item.customer_price == null ? "-" : formatMoney(item.customer_price, item.currency || "CNY") }}</text>
                </view>
              </view>

              <view class="selector-sku-card__footer">
                <view class="selector-sku-stepper">
                  <button class="selector-sku-stepper__button" @tap="stepQuantity(item.id, -1)">-</button>
                  <input
                    class="selector-sku-stepper__input"
                    type="number"
                    :value="String(getQuantity(item.id))"
                    @input="handleQuantityInput(item.id, $event)"
                  />
                  <button class="selector-sku-stepper__button" @tap="stepQuantity(item.id, 1)">+</button>
                </view>
                <button class="selector-primary-button selector-sku-card__action" :loading="addingItemId === item.id" @tap="addItemToCart(item)">加入购物车</button>
              </view>
            </view>

            <view v-if="seriesHasNext" class="selector-load-more">
              <button class="selector-secondary-button selector-load-more__button" :loading="itemsLoading" @tap="loadMoreItems">加载更多 SKU</button>
            </view>
          </view>
        </scroll-view>
      </view>
    </view>

    <view v-if="cartDrawerVisible" class="selector-cart-mask" @tap="closeCartDrawer">
      <view class="selector-cart-drawer" @tap.stop>
        <view class="selector-drawer__handle"></view>
        <view class="selector-cart-drawer__head">
          <view class="selector-drawer__title-wrap">
            <text class="selector-drawer__title">购物车</text>
            <text class="selector-drawer__subtitle">可直接改数量、删除商品，背景保持当前分类上下文</text>
          </view>
          <button class="selector-secondary-button selector-drawer__close" @tap="closeCartDrawer">关闭</button>
        </view>

        <scroll-view scroll-y class="selector-cart-drawer__body">
          <view v-if="cartLoading" class="selector-empty selector-empty--drawer">
            <text>正在加载购物车…</text>
          </view>

          <view v-else-if="!cartItems.length" class="selector-empty selector-empty--drawer">
            <text>购物车还是空的，先在系列里挑几个 SKU 试试。</text>
          </view>

          <view v-else class="selector-cart-list">
            <view v-for="line in cartItems" :key="line.id" class="selector-cart-card">
              <view class="selector-cart-card__head">
                <view class="selector-cart-card__media">
                  <ProductThumb
                    class="selector-cart-card__thumb"
                    :src="line.main_image_url"
                    :preview-urls="line.media?.detail_images?.length ? line.media.detail_images : line.media?.gallery_images || []"
                  />
                </view>
                <view class="selector-cart-card__title-wrap">
                  <text class="selector-cart-card__title">{{ line.name }}</text>
                  <text class="selector-cart-card__meta">
                    {{ line.model || line.order_code || line.manufacturer_code || "未设置型号" }}
                  </text>
                </view>
                <button
                  class="selector-cart-card__remove"
                  :loading="cartRemovingLineId === line.id"
                  @tap="removeCartDrawerLine(line.id)"
                >
                  删除
                </button>
              </view>

              <view class="selector-cart-card__grid">
                <view class="selector-cart-card__cell">
                  <text class="selector-field-label">厂家编码</text>
                  <text class="selector-field-value">{{ line.manufacturer_code || "-" }}</text>
                </view>
                <view class="selector-cart-card__cell">
                  <text class="selector-field-label">库存</text>
                  <text class="selector-field-value">{{ line.free_qty }}</text>
                </view>
                <view class="selector-cart-card__cell">
                  <text class="selector-field-label">客户价</text>
                  <text class="selector-field-value selector-sku-card__price">
                    {{ formatMoney(line.customer_price, line.currency || "CNY") }}
                  </text>
                </view>
                <view class="selector-cart-card__cell">
                  <text class="selector-field-label">小计</text>
                  <text class="selector-field-value">{{ formatMoney(line.subtotal, line.currency || "CNY") }}</text>
                </view>
              </view>

              <view class="selector-cart-card__footer">
                <view class="selector-sku-stepper selector-sku-stepper--cart">
                  <button class="selector-sku-stepper__button" @tap="stepCartLineQuantity(line.id, -1)">-</button>
                  <input
                    class="selector-sku-stepper__input"
                    type="number"
                    :value="String(getCartLineQuantity(line.id))"
                    @input="handleCartLineQuantityInput(line.id, $event)"
                    @blur="syncCartLineQuantity(line.id)"
                  />
                  <button class="selector-sku-stepper__button" @tap="stepCartLineQuantity(line.id, 1)">+</button>
                </view>
                <text v-if="cartUpdatingLineId === line.id" class="selector-cart-card__syncing">更新中…</text>
              </view>
            </view>
          </view>
        </scroll-view>

        <view class="selector-cart-drawer__footer">
          <view class="selector-cart-drawer__summary">
            <text class="selector-cart-drawer__summary-title">共 {{ cartStore.lineCount }} 项</text>
            <text class="selector-cart-drawer__summary-amount">{{ cartAmountText }}</text>
          </view>
          <view class="selector-cart-drawer__actions">
            <button class="selector-secondary-button selector-cart-drawer__action" @tap="openCartPage">完整购物车</button>
            <button class="selector-primary-button selector-cart-drawer__action" @tap="closeCartDrawer">继续选品</button>
          </view>
        </view>
      </view>
    </view>

    <view class="selector-cart-fab" hover-class="selector-cart-fab--hover" @tap="openCartDrawer">
      <view class="selector-cart-fab__icon" aria-hidden="true">
        <view class="selector-cart-fab__rail"></view>
        <view class="selector-cart-fab__body"></view>
        <view class="selector-cart-fab__front"></view>
        <view class="selector-cart-fab__wheel selector-cart-fab__wheel--left"></view>
        <view class="selector-cart-fab__wheel selector-cart-fab__wheel--right"></view>
      </view>
      <view v-if="cartBadge" class="selector-cart-fab__badge">{{ cartBadge }}</view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.selector-page {
  height: calc(100vh - var(--window-top) - var(--window-bottom));
  min-height: calc(100vh - var(--window-top) - var(--window-bottom));
  display: flex;
  flex-direction: column;
  padding: 18rpx 18rpx calc(18rpx + env(safe-area-inset-bottom));
  box-sizing: border-box;
  background:
    radial-gradient(circle at top right, rgba(47, 111, 222, 0.1), transparent 32%),
    linear-gradient(180deg, #edf3fb 0%, #e7eef9 100%);
  overflow: hidden;
}

.selector-secondary-button,
.selector-primary-button,
.selector-sku-stepper__button,
.selector-cart-card__remove {
  margin: 0;
  padding-left: 0;
  padding-right: 0;
  border: none;
  background: transparent;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  line-height: 1;
}

.selector-secondary-button::after,
.selector-primary-button::after,
.selector-sku-stepper__button::after,
.selector-cart-card__remove::after {
  border: none;
}

.selector-primary-button {
  background: #2f6fde;
  color: #ffffff;
}

.selector-secondary-button {
  background: #ffffff;
  color: #16253b;
  border: 1px solid #d3dbe8;
}

.selector-toolbar {
  display: flex;
  align-items: center;
  gap: 12rpx;
  flex-shrink: 0;
}

.selector-search-wrap {
  flex: 1;
  min-width: 0;
  padding: 0 20rpx;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(211, 219, 232, 0.92);
  border-radius: 22rpx;
  box-shadow: 0 18rpx 40rpx -28rpx rgba(18, 37, 63, 0.18);
}

.selector-search {
  width: 100%;
  height: 72rpx;
  font-size: 24rpx;
  color: #16253b;
}

.selector-body {
  flex: 1;
  min-height: 0;
  display: flex;
  gap: 0;
  margin-top: 14rpx;
  overflow: hidden;
}

.selector-nav,
.selector-main {
  min-height: 0;
  border: none;
  border-radius: 28rpx;
  overflow: hidden;
  box-shadow: 0 22rpx 50rpx -34rpx rgba(18, 37, 63, 0.24);
}

.selector-nav {
  width: 198rpx;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: linear-gradient(180deg, #b7caea 0%, #d2e0f6 100%);
}

.selector-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  background: linear-gradient(180deg, #f7fbff 0%, #edf4ff 100%);
  box-shadow:
    inset 1px 0 0 rgba(255, 255, 255, 0.55),
    0 22rpx 50rpx -34rpx rgba(18, 37, 63, 0.24);
}

.selector-panel__titlebar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14rpx 16rpx;
  border-bottom: 1px solid rgba(226, 232, 242, 0.7);
  flex-shrink: 0;
}

.selector-panel__titlebar--nav {
  background: rgba(44, 72, 116, 0.16);
}

.selector-panel__title {
  font-size: 20rpx;
  font-weight: 800;
  color: #324661;
  letter-spacing: 0.8rpx;
}

.selector-nav__scroll {
  flex: 1;
  min-height: 0;
}

.selector-nav__inner {
  display: flex;
  flex-direction: column;
  padding: 10rpx 8rpx 16rpx;
}

.selector-nav-group + .selector-nav-group {
  margin-top: 8rpx;
}

.selector-root {
  position: relative;
  padding: 16rpx 14rpx;
  border-radius: 18rpx;
  background: rgba(60, 88, 130, 0.18);
  border: 1px solid rgba(83, 108, 147, 0.06);
}

.selector-root--active {
  background: linear-gradient(180deg, #ffffff 0%, #deebff 100%);
  border-color: rgba(47, 111, 222, 0.24);
  box-shadow: 0 0 0 2rpx rgba(47, 111, 222, 0.12);
}

.selector-root--active::before {
  content: "";
  position: absolute;
  left: 0;
  top: 14rpx;
  bottom: 14rpx;
  width: 6rpx;
  border-radius: 999rpx;
  background: #2f6fde;
}

.selector-root--hover {
  background: rgba(255, 255, 255, 0.78);
}

.selector-root__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10rpx;
}

.selector-root__meta {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  flex-shrink: 0;
}

.selector-root__name,
.selector-sheet__title,
.selector-drawer__title,
.selector-sku-card__title,
.selector-series-row__name {
  color: #16253b;
  font-weight: 700;
}

.selector-root__name {
  flex: 1;
  min-width: 0;
  font-size: 23rpx;
  line-height: 1.35;
  color: #20344f;
  font-weight: 800;
}

.selector-inline-empty,
.selector-sheet__subtitle,
.selector-sheet__option-count,
.selector-drawer__subtitle,
.selector-sku-card__meta,
.selector-sku-card__stock-label {
  font-size: 20rpx;
  color: #62718a;
}

.selector-root__chevron {
  font-size: 20rpx;
  font-weight: 800;
  color: #567097;
}

.selector-subtree {
  margin-top: 8rpx;
  margin-left: 4rpx;
  padding: 8rpx;
  border-radius: 16rpx;
  background: rgba(240, 246, 255, 0.98);
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.82),
    0 8rpx 20rpx -18rpx rgba(48, 82, 129, 0.45);
}

.selector-subtree__item + .selector-subtree__item {
  margin-top: 8rpx;
}

.selector-subtree__item {
  padding: 14rpx 14rpx;
  border-radius: 12rpx;
  color: #425169;
  background: rgba(255, 255, 255, 0.5);
}

.selector-subtree__item--active {
  background: #ffffff;
  box-shadow: inset 8rpx 0 0 #2f6fde, 0 8rpx 18rpx -16rpx rgba(47, 111, 222, 0.48);
  color: #1657ba;
}

.selector-subtree__name {
  font-size: 21rpx;
  line-height: 1.45;
  font-weight: 800;
}

.selector-main__top {
  flex-shrink: 0;
  background: linear-gradient(180deg, rgba(243, 248, 255, 0.96) 0%, rgba(255, 255, 255, 0.85) 100%);
  border-bottom: 1px solid rgba(232, 238, 245, 0.85);
}

.selector-block {
  padding: 14rpx 16rpx;
  background: transparent;
}

.selector-block + .selector-block {
  border-top: 1px solid rgba(229, 237, 247, 0.88);
}

.selector-block:nth-child(1) {
  background: rgba(235, 243, 255, 0.88);
}

.selector-block:nth-child(2) {
  background: rgba(255, 255, 255, 0.92);
}

.selector-block:nth-child(3) {
  background: rgba(230, 240, 253, 0.88);
}

.selector-block--path {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4rpx;
  padding-top: 12rpx;
  padding-bottom: 12rpx;
}

.selector-block__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
  margin-bottom: 10rpx;
}

.selector-block__title {
  font-size: 21rpx;
  font-weight: 800;
  color: #344861;
}

.selector-block__toggle {
  min-height: 54rpx;
  padding: 0 18rpx;
  border-radius: 999rpx;
  font-size: 20rpx;
  font-weight: 700;
}

.selector-inline-empty {
  line-height: 1.4;
}

.selector-chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
}

.selector-chip-list--filters {
  max-height: 122rpx;
  overflow: hidden;
}

.selector-chip,
.selector-filter-chip {
  max-width: 100%;
  min-height: 52rpx;
  padding: 0 16rpx;
  border-radius: 999rpx;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  border: 1px solid #dbe3f0;
  background: #ffffff;
  color: #425169;
  box-shadow: 0 4rpx 10rpx -10rpx rgba(18, 37, 63, 0.16);
}

.selector-chip--active,
.selector-filter-chip--active {
  background: #e9f1ff;
  border-color: rgba(47, 111, 222, 0.28);
  color: #1e5fc7;
  font-weight: 700;
}

.selector-chip__label,
.selector-filter-chip {
  font-size: 20rpx;
  line-height: 1;
}

.selector-filter-group + .selector-filter-group {
  margin-top: 20rpx;
}

.selector-filter-group__title {
  display: block;
  margin-bottom: 12rpx;
  font-size: 22rpx;
  font-weight: 700;
  color: #425169;
}

.selector-chip-list--sheet {
  gap: 12rpx;
}

.selector-filter-actions {
  display: flex;
  gap: 12rpx;
  margin-top: 24rpx;
  padding-bottom: 8rpx;
}

.selector-filter-actions__button {
  flex: 1;
  min-height: 68rpx;
  border-radius: 16rpx;
  font-size: 22rpx;
  font-weight: 700;
}

.selector-path-hint,
.selector-path-count {
  font-size: 19rpx;
  color: #62718a;
  line-height: 1.4;
}

.selector-path-hint {
  width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.selector-path-count {
  flex-shrink: 0;
}

.selector-main__scroll {
  flex: 1;
  min-height: 0;
  background: rgba(255, 255, 255, 0.58);
}

.selector-main__inner {
  display: flex;
  flex-direction: column;
  padding-bottom: 12rpx;
}

.selector-empty {
  margin: 18rpx;
  padding: 34rpx 24rpx;
  text-align: center;
  font-size: 24rpx;
  color: #62718a;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(211, 219, 232, 0.9);
  border-radius: 18rpx;
}

.selector-empty--drawer {
  margin: 0;
}

.selector-series-list {
  display: flex;
  flex-direction: column;
}

.selector-series-row {
  display: flex;
  align-items: flex-start;
  gap: 14rpx;
  padding: 15rpx 14rpx 15rpx 16rpx;
  background: rgba(255, 255, 255, 0.74);
  border-bottom: 1px solid rgba(238, 242, 248, 0.95);
}

.selector-series-row--active {
  background: linear-gradient(180deg, #f8fbff 0%, #e8f1ff 100%);
  box-shadow: inset 6rpx 0 0 #2f6fde;
}

.selector-series-row--hover {
  background: rgba(247, 250, 255, 0.96);
}

.selector-series-row__line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
}

.selector-series-row__media {
  flex: 0 0 72rpx;
}

.selector-series-row__thumb {
  width: 72rpx;
  height: 72rpx;
  border-radius: 16rpx;
  background: #f2f6fb;
}

.selector-series-row__content {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 6rpx;
}

.selector-series-row__name {
  flex: 1;
  min-width: 0;
  font-size: 23rpx;
  line-height: 1.35;
  font-weight: 800;
}

.selector-series-row__meta {
  display: block;
  min-width: 0;
  font-size: 20rpx;
  line-height: 1.45;
  color: #5b6d85;
}

.selector-series-badge {
  flex-shrink: 0;
  min-width: 38rpx;
  min-height: 38rpx;
  padding: 0 8rpx;
  border-radius: 12rpx;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 18rpx;
  font-weight: 800;
}

.selector-series-badge--success {
  background: rgba(31, 122, 98, 0.12);
  color: #1f7a62;
}

.selector-series-badge--warning {
  background: rgba(183, 121, 31, 0.14);
  color: #b7791f;
}

.selector-series-badge--muted {
  background: #f4f7fb;
  color: #62718a;
}

.selector-overlay-mask,
.selector-drawer-mask,
.selector-cart-mask {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  display: flex;
  align-items: flex-end;
}

.selector-overlay-mask {
  z-index: 50;
  background: rgba(15, 23, 42, 0.28);
}

.selector-drawer-mask {
  z-index: 60;
  background: rgba(15, 23, 42, 0.36);
}

.selector-cart-mask {
  z-index: 70;
  background: rgba(15, 23, 42, 0.42);
}

.selector-sheet,
.selector-drawer {
  width: 100%;
  display: flex;
  flex-direction: column;
  border-top-left-radius: 28rpx;
  border-top-right-radius: 28rpx;
  overflow: hidden;
}

.selector-sheet {
  height: 68vh;
  max-height: 68vh;
  background: #ffffff;
  padding: 14rpx 18rpx 18rpx;
}

.selector-drawer {
  height: 78vh;
  max-height: 78vh;
  background: #eef2f8;
  padding: 14rpx 18rpx 18rpx;
}

.selector-cart-drawer {
  width: 100%;
  height: 78vh;
  max-height: 78vh;
  display: flex;
  flex-direction: column;
  padding: 14rpx 18rpx calc(18rpx + env(safe-area-inset-bottom));
  background: linear-gradient(180deg, #eff5ff 0%, #f8fbff 100%);
  border-top-left-radius: 28rpx;
  border-top-right-radius: 28rpx;
  overflow: hidden;
}

.selector-sheet__handle,
.selector-drawer__handle {
  width: 72rpx;
  height: 8rpx;
  border-radius: 999rpx;
  background: #c9d4e5;
  margin: 0 auto 14rpx;
  flex-shrink: 0;
}

.selector-sheet__head,
.selector-drawer__head,
.selector-cart-drawer__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12rpx;
  flex-shrink: 0;
}

.selector-sheet__title-wrap,
.selector-drawer__title-wrap {
  flex: 1;
  min-width: 0;
}

.selector-drawer__hero {
  flex: 0 0 104rpx;
}

.selector-drawer__hero-image {
  width: 104rpx;
  height: 104rpx;
  border-radius: 20rpx;
  background: #f2f6fb;
}

.selector-sheet__title,
.selector-drawer__title {
  font-size: 28rpx;
}

.selector-sheet__subtitle {
  display: block;
  margin-top: 6rpx;
}

.selector-sheet__close,
.selector-drawer__close {
  min-height: 60rpx;
  padding: 0 22rpx;
  border-radius: 14rpx;
  flex-shrink: 0;
  font-size: 22rpx;
  font-weight: 700;
}

.selector-sheet__body,
.selector-drawer__body,
.selector-cart-drawer__body {
  flex: 1;
  min-height: 0;
  margin-top: 16rpx;
}

.selector-sheet__options {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
  padding-bottom: 10rpx;
}

.selector-sheet__option {
  padding: 18rpx;
  border-radius: 18rpx;
  background: #f8fafe;
  border: 1px solid #dbe3f0;
}

.selector-sheet__option--active {
  background: #e9f1ff;
  border-color: rgba(47, 111, 222, 0.28);
}

.selector-sheet__option-name {
  display: block;
  font-size: 24rpx;
  font-weight: 700;
  color: #16253b;
  line-height: 1.35;
}

.selector-sheet__option-count {
  display: block;
  margin-top: 6rpx;
}

.selector-sku-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  padding-bottom: 8rpx;
}

.selector-sku-card {
  background: #ffffff;
  border: 1px solid #d3dbe8;
  border-radius: 18rpx;
  padding: 18rpx;
  box-shadow: 0 14rpx 36rpx -24rpx rgba(18, 37, 63, 0.14);
}

.selector-sku-card__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14rpx;
}

.selector-sku-card__media {
  flex: 0 0 88rpx;
}

.selector-sku-card__thumb {
  width: 88rpx;
  height: 88rpx;
  border-radius: 18rpx;
  background: #f2f6fb;
}

.selector-sku-card__title-wrap {
  flex: 1;
  min-width: 0;
}

.selector-sku-card__title {
  font-size: 24rpx;
  line-height: 1.4;
}

.selector-sku-card__meta {
  display: block;
  margin-top: 6rpx;
  line-height: 1.4;
}

.selector-sku-card__stock {
  flex-shrink: 0;
  min-width: 118rpx;
  padding: 12rpx 14rpx;
  border-radius: 16rpx;
  background: #f4f7fb;
  text-align: center;
}

.selector-sku-card__stock-value {
  display: block;
  font-size: 28rpx;
  font-weight: 800;
  color: #16253b;
}

.selector-sku-card__stock-label {
  display: block;
  margin-top: 4rpx;
}

.selector-sku-card__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12rpx;
  margin-top: 14rpx;
}

.selector-sku-card__cell {
  padding: 12rpx 14rpx;
  border-radius: 14rpx;
  background: #f8fafc;
}

.selector-field-label {
  display: block;
  font-size: 20rpx;
  color: #62718a;
}

.selector-field-value {
  display: block;
  margin-top: 6rpx;
  font-size: 22rpx;
  color: #16253b;
  line-height: 1.35;
  word-break: break-word;
}

.selector-sku-card__price {
  color: #1e5fc7;
  font-weight: 700;
}

.selector-sku-card__footer {
  margin-top: 14rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
}

.selector-sku-stepper {
  display: inline-flex;
  align-items: center;
  background: #f4f7fb;
  border: 1px solid #d3dbe8;
  border-radius: 14rpx;
  overflow: hidden;
}

.selector-sku-stepper__button {
  width: 64rpx;
  min-height: 64rpx;
  font-size: 28rpx;
  color: #16253b;
}

.selector-sku-stepper__input {
  width: 86rpx;
  height: 64rpx;
  text-align: center;
  background: #ffffff;
  font-size: 24rpx;
}

.selector-sku-card__action,
.selector-load-more__button {
  min-height: 64rpx;
  padding: 0 24rpx;
  border-radius: 14rpx;
  font-size: 22rpx;
  font-weight: 700;
}

.selector-sku-card__action {
  margin-left: auto;
}

.selector-load-more {
  display: flex;
  justify-content: center;
}

.selector-cart-list {
  display: flex;
  flex-direction: column;
  gap: 14rpx;
  padding-bottom: 12rpx;
}

.selector-cart-card {
  padding: 18rpx;
  border-radius: 20rpx;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 16rpx 36rpx -30rpx rgba(18, 37, 63, 0.2);
}

.selector-cart-card__head,
.selector-cart-card__footer,
.selector-cart-drawer__footer,
.selector-cart-drawer__actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
}

.selector-cart-card__title-wrap,
.selector-cart-drawer__summary {
  flex: 1;
  min-width: 0;
}

.selector-cart-card__media {
  flex: 0 0 88rpx;
}

.selector-cart-card__thumb {
  width: 88rpx;
  height: 88rpx;
  border-radius: 18rpx;
  background: #f2f6fb;
}

.selector-cart-card__title {
  font-size: 24rpx;
  line-height: 1.4;
  font-weight: 700;
  color: #16253b;
}

.selector-cart-card__meta {
  display: block;
  margin-top: 6rpx;
  font-size: 20rpx;
  line-height: 1.4;
  color: #62718a;
}

.selector-cart-card__remove {
  min-width: 96rpx;
  min-height: 56rpx;
  padding: 0 18rpx;
  border-radius: 999rpx;
  background: rgba(255, 92, 92, 0.1);
  color: #d63d3d;
  font-size: 20rpx;
  font-weight: 700;
  flex-shrink: 0;
}

.selector-cart-card__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12rpx;
  margin-top: 14rpx;
}

.selector-cart-card__cell {
  padding: 12rpx 14rpx;
  border-radius: 14rpx;
  background: #f5f8fe;
}

.selector-sku-stepper--cart {
  background: #edf3fb;
}

.selector-cart-card__syncing {
  font-size: 20rpx;
  color: #62718a;
  flex-shrink: 0;
}

.selector-cart-drawer__footer {
  flex-shrink: 0;
  margin-top: 14rpx;
  padding-top: 16rpx;
  border-top: 1px solid rgba(214, 225, 240, 0.95);
}

.selector-cart-drawer__summary-title {
  display: block;
  font-size: 22rpx;
  color: #62718a;
}

.selector-cart-drawer__summary-amount {
  display: block;
  margin-top: 6rpx;
  font-size: 30rpx;
  font-weight: 800;
  color: #16253b;
}

.selector-cart-drawer__actions {
  flex-shrink: 0;
}

.selector-cart-drawer__action {
  min-width: 164rpx;
  min-height: 68rpx;
  padding: 0 24rpx;
  border-radius: 16rpx;
  font-size: 22rpx;
  font-weight: 700;
}

.selector-cart-fab {
  position: fixed;
  left: 26rpx;
  bottom: calc(34rpx + env(safe-area-inset-bottom));
  z-index: 40;
  width: 104rpx;
  height: 104rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(180deg, #2f6fde 0%, #2358b4 100%);
  box-shadow: 0 28rpx 44rpx -24rpx rgba(35, 88, 180, 0.5);
}

.selector-cart-fab--hover {
  transform: scale(0.98);
}

.selector-cart-fab__icon {
  position: relative;
  width: 48rpx;
  height: 38rpx;
}

.selector-cart-fab__rail {
  position: absolute;
  left: 4rpx;
  top: 4rpx;
  width: 16rpx;
  height: 4rpx;
  background: #ffffff;
  border-radius: 999rpx;
  transform: rotate(-18deg);
  transform-origin: left center;
}

.selector-cart-fab__body {
  position: absolute;
  left: 12rpx;
  top: 10rpx;
  width: 24rpx;
  height: 14rpx;
  border: 4rpx solid #ffffff;
  border-top: none;
  border-radius: 4rpx 4rpx 10rpx 10rpx;
  transform: skewX(-10deg);
}

.selector-cart-fab__front {
  position: absolute;
  right: 6rpx;
  top: 11rpx;
  width: 10rpx;
  height: 11rpx;
  border-right: 4rpx solid #ffffff;
  border-bottom: 4rpx solid #ffffff;
  border-radius: 0 0 6rpx 0;
}

.selector-cart-fab__wheel {
  position: absolute;
  bottom: 2rpx;
  width: 10rpx;
  height: 10rpx;
  border-radius: 999rpx;
  background: #ffffff;
}

.selector-cart-fab__wheel--left {
  left: 14rpx;
}

.selector-cart-fab__wheel--right {
  right: 10rpx;
}

.selector-cart-fab__badge {
  position: absolute;
  top: 4rpx;
  right: 2rpx;
  min-width: 36rpx;
  height: 36rpx;
  padding: 0 8rpx;
  border-radius: 999rpx;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #ff5a5a;
  color: #ffffff;
  font-size: 18rpx;
  font-weight: 800;
  box-shadow: 0 8rpx 20rpx -12rpx rgba(255, 90, 90, 0.82);
}
</style>
