<script setup lang="ts">
import { computed, ref, watch } from "vue"
import { onLoad } from "@dcloudio/uni-app"

import { getStockCatalog } from "../../api/stock"
import { DEFAULT_STOCK_BRAND } from "../../constants/app"
import { useSessionGuard } from "../../composables/useSessionGuard"
import type { StockCatalogFacet, StockCatalogOverviewResponse, StockCatalogSeries } from "../../types/api"
import { goBackOr } from "../../utils/navigation"
import { decodeQueryValue } from "../../utils/query"
import { showToast, showErrorToast } from "../../utils/toast"

type SeriesGroup = {
  key: string
  label: string
  count: number
  series: StockCatalogSeries[]
}

const brand = ref(DEFAULT_STOCK_BRAND)
const overview = ref<StockCatalogOverviewResponse | null>(null)
const loading = ref(false)
const inStockOnly = ref(false)
const searchKeyword = ref("")
const selectedRoot = ref("")
const selectedSubcategory = ref("")
const selectedSeriesKey = ref("")

onLoad((query) => {
  if (query?.brand) {
    brand.value = decodeQueryValue(query.brand, brand.value)
  }
})

useSessionGuard(async () => {
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

const subcategoryOptions = computed(() =>
  [...(overview.value?.subcategories || [])]
    .filter((item) => {
      if (selectedRoot.value && item.display_root !== selectedRoot.value) {
        return false
      }
      return item.published_series_count > 0
    })
    .sort(compareFacet)
)

const filteredSeries = computed(() => {
  const keyword = normalizeKeyword(searchKeyword.value)
  return publishedSeries.value
    .filter((item) => {
      if (selectedRoot.value && item.display_root !== selectedRoot.value) {
        return false
      }
      if (selectedSubcategory.value && (item.display_subcategory || "") !== selectedSubcategory.value) {
        return false
      }
      if (inStockOnly.value && item.in_stock_sku_count <= 0) {
        return false
      }
      if (!keyword) {
        return true
      }
      return normalizeKeyword(
        item.display_series,
        item.series_key,
        item.sample_model,
        item.sample_product_name,
        item.display_category,
        item.display_subcategory
      ).includes(keyword)
    })
    .sort(compareSeries)
})

const categoryGroups = computed<SeriesGroup[]>(() => {
  const groupMap = new Map<string, SeriesGroup>()
  for (const series of filteredSeries.value) {
    const categoryName = series.display_category || series.display_leaf || "其他品类"
    const key = `${series.display_root}::${series.display_subcategory || ""}::${categoryName}`
    const current = groupMap.get(key)
    if (current) {
      current.series.push(series)
      current.count += 1
      continue
    }
    groupMap.set(key, {
      key,
      label: categoryName,
      count: 1,
      series: [series],
    })
  }
  return [...groupMap.values()].sort((left, right) => {
    if (right.count !== left.count) {
      return right.count - left.count
    }
    return left.label.localeCompare(right.label, "zh-CN")
  })
})

const selectedSeries = computed(
  () => filteredSeries.value.find((item) => item.series_key === selectedSeriesKey.value) || null
)

const summaryCards = computed(() => [
  {
    key: "brand",
    title: "当前品牌",
    value: brand.value,
    helper: "V1 试点",
  },
  {
    key: "published",
    title: "已上架系列",
    value: String(overview.value?.summary.published_series || 0),
    helper: "后台控制可见",
  },
  {
    key: "stock",
    title: "有现货系列",
    value: String(overview.value?.summary.in_stock_series || 0),
    helper: "便于快速开单",
  },
])

const headerSummary = computed(() => {
  if (!selectedRoot.value && !selectedSubcategory.value) {
    return "按大类、小类、品类逐层收口到系列"
  }
  return [selectedRoot.value, selectedSubcategory.value].filter(Boolean).join(" / ")
})

const footerHint = computed(() => {
  const current = selectedSeries.value
  if (!current) {
    return "先在右侧挑一个系列，再进入 SKU。"
  }
  return [
    current.display_major || current.display_root,
    current.display_subcategory,
    current.display_category || current.display_leaf,
  ]
    .filter(Boolean)
    .join(" / ")
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
  subcategoryOptions,
  (value) => {
    if (!value.length) {
      selectedSubcategory.value = ""
      return
    }
    const nextValue = value[0].value || value[0].key
    if (!value.some((item) => (item.value || item.key) === selectedSubcategory.value)) {
      selectedSubcategory.value = nextValue
    }
  },
  { immediate: true }
)

watch(
  filteredSeries,
  (value) => {
    if (!value.length) {
      selectedSeriesKey.value = ""
      return
    }
    if (!value.some((item) => item.series_key === selectedSeriesKey.value)) {
      selectedSeriesKey.value = value[0].series_key
    }
  },
  { immediate: true }
)

async function loadCatalog() {
  loading.value = true
  try {
    const response = await getStockCatalog({
      brand: brand.value,
      in_stock_only: false,
    })
    overview.value = response.data
  } catch (error) {
    showErrorToast(error, "样板数据加载失败")
  } finally {
    loading.value = false
  }
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

function normalizeKeyword(...parts: Array<string | undefined>) {
  return parts
    .filter(Boolean)
    .join(" ")
    .trim()
    .toLowerCase()
}

function pickRoot(rootKey: string) {
  selectedRoot.value = rootKey
}

function pickSubcategory(value: string) {
  selectedSubcategory.value = value
}

function pickSeries(seriesKey: string) {
  selectedSeriesKey.value = seriesKey
}

function handleStockToggle(event: Event | { detail?: { value?: boolean } }) {
  inStockOnly.value = Boolean((event as { detail?: { value?: boolean } })?.detail?.value)
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

function openSeries() {
  if (!selectedSeries.value) {
    showToast("先选一个系列")
    return
  }
  showToast(`样板页下一步会进入 ${selectedSeries.value.display_series || selectedSeries.value.series_key} 的 SKU 页`)
}
</script>

<template>
  <view class="selector-page">
    <view class="selector-page__header">
      <view class="selector-topbar">
        <button class="selector-back" @tap="goBackOr('/pages/stock/index')">返回</button>
        <view class="selector-title-block">
          <text class="selector-title">分类选型样板</text>
          <text class="selector-subtitle">{{ headerSummary }}</text>
        </view>
        <text class="selector-badge">MVP</text>
      </view>

      <view class="selector-search-row">
        <input
          v-model="searchKeyword"
          name="series_search"
          class="selector-search"
          placeholder="搜系列名、样本型号、品类"
          confirm-type="search"
        />
        <view class="selector-stock-toggle">
          <switch :checked="inStockOnly" color="#17b26a" @change="handleStockToggle" />
          <text>只看现货</text>
        </view>
      </view>

      <scroll-view scroll-x class="selector-summary-rail">
        <view class="selector-summary-rail__inner">
          <view v-for="card in summaryCards" :key="card.key" class="selector-summary-card">
            <text class="selector-summary-card__title">{{ card.title }}</text>
            <text class="selector-summary-card__value">{{ card.value }}</text>
            <text class="selector-summary-card__helper">{{ card.helper }}</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <view class="selector-page__body">
      <scroll-view scroll-y class="selector-sidebar">
        <view class="selector-sidebar__inner">
          <button
            v-for="root in rootOptions"
            :key="root.key"
            class="selector-root"
            :class="{ 'selector-root--active': root.key === selectedRoot }"
            @tap="pickRoot(root.key)"
          >
            <text class="selector-root__name">{{ root.label }}</text>
            <text class="selector-root__count">{{ root.published_series_count }}</text>
          </button>
        </view>
      </scroll-view>

      <scroll-view scroll-y class="selector-content">
        <view class="selector-content__inner">
          <scroll-view scroll-x class="selector-subnav">
            <view class="selector-subnav__inner">
              <button
                v-for="subcategory in subcategoryOptions"
                :key="subcategory.key"
                class="selector-subnav__item"
                :class="{ 'selector-subnav__item--active': (subcategory.value || subcategory.key) === selectedSubcategory }"
                @tap="pickSubcategory(subcategory.value || subcategory.key)"
              >
                <text class="selector-subnav__label">{{ subcategory.label }}</text>
                <text class="selector-subnav__count">{{ subcategory.published_series_count }}</text>
              </button>
            </view>
          </scroll-view>

          <view class="selector-content__meta">
            <text>共 {{ filteredSeries.length }} 个系列</text>
            <text>{{ loading ? "正在刷新…" : "系列层级样板" }}</text>
          </view>

          <view v-if="loading" class="selector-empty">
            <text>正在加载分类样板…</text>
          </view>

          <view v-else-if="!categoryGroups.length" class="selector-empty">
            <text>当前筛选下没有系列，试试放宽搜索词或关闭现货开关。</text>
          </view>

          <view v-else class="selector-groups">
            <view v-for="group in categoryGroups" :key="group.key" class="selector-group">
              <view class="selector-group__head">
                <text class="selector-group__title">{{ group.label }}</text>
                <text class="selector-group__count">{{ group.count }} 个系列</text>
              </view>

              <view class="selector-series-grid">
                <button
                  v-for="series in group.series"
                  :key="series.series_key"
                  class="selector-series-card"
                  :class="{ 'selector-series-card--active': series.series_key === selectedSeriesKey }"
                  @tap="pickSeries(series.series_key)"
                >
                  <view class="selector-series-card__top">
                    <text class="selector-series-card__name">{{ series.display_series || series.series_key }}</text>
                    <text class="selector-series-card__badge" :class="`selector-series-card__badge--${seriesBadgeTone(series)}`">
                      {{ series.grade }}
                    </text>
                  </view>
                  <text class="selector-series-card__sample">{{ series.sample_model || series.sample_product_name || "暂无样本" }}</text>
                  <view class="selector-series-card__facts">
                    <text>现货 {{ series.in_stock_sku_count }}</text>
                    <text>SKU {{ series.sku_count }}</text>
                  </view>
                </button>
              </view>
            </view>
          </view>
        </view>
      </scroll-view>
    </view>

    <view class="selector-page__footer">
      <view class="selector-footer__main">
        <text class="selector-footer__label">当前选中系列</text>
        <text class="selector-footer__title">{{ selectedSeries?.display_series || "未选择" }}</text>
        <text class="selector-footer__path">{{ footerHint }}</text>
      </view>
      <button class="selector-footer__button" @tap="openSeries">进入 SKU</button>
    </view>
  </view>
</template>

<style scoped lang="scss">
.selector-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--portal-bg);
  color: var(--portal-text);
}

.selector-page__header {
  padding: 20rpx 20rpx 14rpx;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.selector-topbar {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.selector-back {
  margin: 0;
  min-width: 108rpx;
  height: 64rpx;
  border-radius: 999rpx;
  border: 1px solid var(--portal-border);
  background: var(--portal-surface);
  color: var(--portal-primary);
  font-size: 22rpx;
  font-weight: 600;
}

.selector-title-block {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.selector-title {
  font-size: 32rpx;
  font-weight: 800;
  color: var(--portal-text);
}

.selector-subtitle {
  font-size: 22rpx;
  color: var(--portal-text-muted);
}

.selector-badge {
  flex-shrink: 0;
  padding: 8rpx 14rpx;
  border-radius: 999rpx;
  background: var(--portal-primary-tint);
  color: var(--portal-primary);
  font-size: 20rpx;
  font-weight: 700;
  border: 1px solid var(--portal-border);
}

.selector-search-row {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.selector-search {
  width: 100%;
  height: 76rpx;
  padding: 0 22rpx;
  border-radius: 20rpx;
  background: var(--portal-surface);
  border: 1px solid var(--portal-border);
  box-sizing: border-box;
  font-size: 24rpx;
}

.selector-stock-toggle {
  display: inline-flex;
  align-items: center;
  gap: 12rpx;
  align-self: flex-start;
  padding: 0 18rpx;
  min-height: 60rpx;
  border-radius: 999rpx;
  background: var(--portal-surface);
  border: 1px solid var(--portal-border);
  color: var(--portal-text);
  font-size: 22rpx;
}

.selector-summary-rail {
  white-space: nowrap;
}

.selector-summary-rail__inner {
  display: inline-flex;
  gap: 16rpx;
  padding-right: 8rpx;
}

.selector-summary-card {
  width: 176rpx;
  min-height: 116rpx;
  padding: 16rpx 18rpx;
  border-radius: 20rpx;
  background: var(--portal-surface);
  border: 1px solid var(--portal-border);
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  box-shadow: none;
}

.selector-summary-card__title,
.selector-summary-card__helper,
.selector-content__meta,
.selector-group__count,
.selector-series-card__sample,
.selector-footer__label,
.selector-footer__path,
.selector-root__count {
  font-size: 22rpx;
  color: var(--portal-text-muted);
}

.selector-summary-card__value {
  font-size: 26rpx;
  font-weight: 800;
  color: var(--portal-text);
}

.selector-page__body {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 152rpx minmax(0, 1fr);
  overflow: hidden;
  border-top: 1px solid var(--portal-border);
}

.selector-sidebar,
.selector-content {
  height: 100%;
  min-height: 0;
}

.selector-sidebar {
  background: var(--portal-surface);
  border-right: 1px solid var(--portal-border);
}

.selector-sidebar__inner {
  padding: 8rpx 0 132rpx;
}

.selector-root {
  width: 100%;
  margin: 0;
  padding: 18rpx 14rpx 18rpx 18rpx;
  border: none;
  border-left: 6rpx solid transparent;
  border-radius: 0;
  background: transparent;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6rpx;
  text-align: left;
}

.selector-root__name {
  font-size: 24rpx;
  line-height: 1.3;
  color: var(--portal-text);
  word-break: break-all;
  font-weight: 600;
}

.selector-root--active {
  background: var(--portal-primary-tint);
  border-left-color: var(--portal-primary);
}

.selector-root--active .selector-root__name,
.selector-subnav__item--active .selector-subnav__label,
.selector-series-card--active .selector-series-card__name {
  color: var(--portal-primary);
  font-weight: 700;
}

.selector-content__inner {
  padding: 14rpx 16rpx 132rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.selector-subnav {
  white-space: nowrap;
}

.selector-subnav__inner {
  display: inline-flex;
  gap: 10rpx;
  padding-right: 8rpx;
}

.selector-subnav__item {
  margin: 0;
  min-width: 152rpx;
  min-height: 72rpx;
  padding: 12rpx 16rpx;
  border-radius: 18rpx;
  border: 1px solid var(--portal-border);
  background: var(--portal-surface);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4rpx;
}

.selector-subnav__item--active {
  background: var(--portal-primary-soft);
  border-color: var(--portal-border-strong);
}

.selector-subnav__label {
  font-size: 22rpx;
  color: var(--portal-text);
  white-space: nowrap;
  font-weight: 600;
}

.selector-subnav__count {
  font-size: 20rpx;
  color: var(--portal-text-muted);
}

.selector-content__meta {
  display: flex;
  justify-content: space-between;
  gap: 16rpx;
  padding: 0 2rpx;
}

.selector-empty {
  padding: 40rpx 24rpx;
  border-radius: var(--portal-radius);
  background: var(--portal-surface);
  border: 1px solid var(--portal-border);
  text-align: center;
  font-size: 24rpx;
  color: var(--portal-text-muted);
}

.selector-groups {
  display: flex;
  flex-direction: column;
  gap: 22rpx;
}

.selector-group {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.selector-group__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12rpx;
  padding: 0 4rpx;
}

.selector-group__title {
  font-size: 28rpx;
  font-weight: 800;
  color: var(--portal-text);
}

.selector-series-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12rpx;
}

.selector-series-card {
  margin: 0;
  min-height: 150rpx;
  padding: 16rpx;
  border-radius: 18rpx;
  border: 1px solid var(--portal-border);
  background: var(--portal-surface);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10rpx;
  text-align: left;
  box-sizing: border-box;
}

.selector-series-card--active {
  border-color: var(--portal-primary);
  background: var(--portal-primary-tint);
  box-shadow: none;
}

.selector-series-card__top {
  width: 100%;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10rpx;
}

.selector-series-card__name {
  min-width: 0;
  font-size: 24rpx;
  font-weight: 700;
  color: var(--portal-text);
  line-height: 1.3;
  word-break: break-word;
}

.selector-series-card__badge {
  flex-shrink: 0;
  min-width: 36rpx;
  min-height: 36rpx;
  padding: 0 8rpx;
  border-radius: 12rpx;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 18rpx;
  font-weight: 800;
}

.selector-series-card__badge--success {
  background: rgba(31, 122, 98, 0.12);
  color: var(--portal-success);
}

.selector-series-card__badge--warning {
  background: rgba(183, 121, 31, 0.14);
  color: var(--portal-warning);
}

.selector-series-card__badge--muted {
  background: var(--portal-surface-muted);
  color: var(--portal-text-muted);
}

.selector-series-card__sample {
  min-height: 52rpx;
  line-height: 1.4;
  word-break: break-word;
  font-size: 20rpx;
}

.selector-series-card__facts {
  margin-top: auto;
  width: 100%;
  display: flex;
  justify-content: space-between;
  gap: 10rpx;
  font-size: 20rpx;
  color: var(--portal-text-muted);
}

.selector-page__footer {
  padding: 16rpx 20rpx calc(16rpx + env(safe-area-inset-bottom));
  display: flex;
  align-items: center;
  gap: 14rpx;
  background: var(--portal-surface);
  border-top: 1px solid var(--portal-border);
  box-shadow: none;
}

.selector-footer__main {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.selector-footer__title {
  font-size: 24rpx;
  font-weight: 800;
  color: var(--portal-text);
}

.selector-footer__button {
  margin: 0;
  min-width: 156rpx;
  height: 72rpx;
  border-radius: 18rpx;
  border: none;
  background: var(--portal-primary);
  color: #ffffff;
  font-size: 24rpx;
  font-weight: 700;
  box-shadow: none;
}
</style>
