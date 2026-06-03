<script setup lang="ts">
import { computed, ref } from "vue"

import BottomNav from "../../components/BottomNav.vue"
import EmptyState from "../../components/EmptyState.vue"
import PageContextBar from "../../components/PageContextBar.vue"
import { DEFAULT_STOCK_BRAND } from "../../constants/app"
import { useSessionGuard } from "../../composables/useSessionGuard"
import { usePcScanDialog } from "../../features/stock/usePcScanDialog"
import { useStockSelection } from "../../features/stock/useStockSelection"
import { useCartStore } from "../../stores/cart"
import { useStockStore } from "../../stores/stock"
import { formatMoney } from "../../utils/money"
import { openCartPage, openRootPage, openStockCatalogPage } from "../../utils/navigation"
import { buildSearchPlan, loadRecentSearches, saveRecentSearch } from "../../utils/search"
import { showErrorToast, showToast } from "../../utils/toast"

const cartStore = useCartStore()
const stockStore = useStockStore()
const stockExamples = {
  manufacturerCode: "710024000000007",
  orderCode: "813006",
  model: "NXB-63 1P C16",
}
const searchScopeHints = ["厂家编码", "订货编码", "中文品名", "型号", "政策分类"]
const lastSubmittedQuery = ref("")
const tableScrollLeft = ref(0)
const recentQueries = ref<string[]>([])
const stockItems = computed(() => stockStore.items)
const cartButtonLabel = computed(() => (cartStore.lineCount ? `购物车 (${cartStore.lineCount})` : "购物车"))
const stockResultSummary = computed(() =>
  stockStore.totalPending
    ? `每页 ${stockStore.pageSize} 条，正在统计总数...`
    : `每页 ${stockStore.pageSize} 条，总 ${stockStore.total} 条`
)
const searchPlanPreview = computed(() => buildSearchPlan(stockStore.query))
const searchRewriteHints = computed(() =>
  searchPlanPreview.value.variants
    .map((item) => item.query)
    .filter((item) => item !== searchPlanPreview.value.normalizedQuery)
    .slice(0, 3)
)

useSessionGuard(async () => {
  void cartStore.refresh().catch(() => {})
  loadRecentQueries()
})
const {
  selectedItemIds,
  addingToCart,
  allCurrentPageSelected,
  isSelected,
  resetSelection,
  toggleItemSelection,
  toggleCurrentPageSelection,
  getSelectedQuantity,
  handleQuantityInput,
  stepQuantity,
  addSelectedToCart,
} = useStockSelection(stockItems, (cart) => {
  cartStore.applyCart(cart)
})
const {
  pcScanVisible,
  pcScanLoading,
  pcScanImage,
  pcScanStatus,
  pcScanReceivedCount,
  pcScanRecentResults,
  closePcScanDialog,
  startPcScan,
} = usePcScanDialog({
  async onResult(resultText) {
    stockStore.query = resultText
    await submitSearch()
  },
})

async function submitSearch() {
  const normalizedQuery = stockStore.query.trim()
  if (normalizedQuery !== lastSubmittedQuery.value) {
    resetSelection()
  }
  try {
    await stockStore.search(true)
    lastSubmittedQuery.value = normalizedQuery
    pushRecentQuery(normalizedQuery)
  } catch (error) {
    showErrorToast(error, "查询失败")
  }
}

async function toggleInStock(event: any) {
  stockStore.inStockOnly = Boolean(event.detail.value)
  await submitSearch()
}

function clearSearch() {
  stockStore.query = ""
  stockStore.resetSearch()
  resetSelection()
  lastSubmittedQuery.value = ""
}

function loadRecentQueries() {
  recentQueries.value = loadRecentSearches()
}

function pushRecentQuery(query: string) {
  recentQueries.value = saveRecentSearch(query)
}

async function applyQuickQuery(query: string) {
  stockStore.query = query
  await submitSearch()
}

function scanCode() {
  uni.scanCode({
    success: async (result) => {
      stockStore.query = result.result
      await submitSearch()
    },
    fail: () => {
      showToast("当前环境暂不可扫码")
    }
  })
}

function copyText(value: string | number | null | undefined, label = "内容") {
  const text = `${value ?? ""}`.trim()
  if (!text || text === "-") {
    showToast(`暂无可复制${label}`)
    return
  }
  uni.setClipboardData({
    data: text,
    showToast: false,
    success: () => {
      showToast(`${label}已复制`)
    }
  })
}

function copyStockItem(item: {
  name: string
  free_qty: number | string
  manufacturer_code?: string | null
  order_code?: string | null
  model?: string | null
  uom_name?: string | null
  list_price?: number | null
  customer_price?: number | null
  discount_rate?: number | null
  currency?: string | null
}) {
  const currency = item.currency || "CNY"
  const lines = [
    `产品名称：${item.name || "-"}`,
    `厂家编码：${item.manufacturer_code || "-"}`,
    `订货编码：${item.order_code || "-"}`,
    `型号：${item.model || "-"}`,
    `可用库存：${item.free_qty}`,
    `单位：${item.uom_name || "-"}`,
    `面价：${item.list_price == null ? "-" : formatMoney(item.list_price, currency)}`,
    `客户价：${item.customer_price == null ? "-" : formatMoney(item.customer_price, currency)}`,
    `优惠率：${item.discount_rate == null ? "-" : `${item.discount_rate}%`}`,
  ]
  copyText(lines.join("\n"), "查询结果")
}

function formatDiscount(discountRate?: number | null) {
  if (discountRate == null) {
    return "-"
  }
  return `${discountRate.toFixed(2)}%`
}

function handleTableHorizontalScroll(event: any) {
  tableScrollLeft.value = Number(event?.detail?.scrollLeft || 0)
}
</script>

<template>
  <view class="page-shell page-shell--with-nav">
    <scroll-view scroll-y class="page-shell__content">
      <PageContextBar current-label="库存查询" parent-label="工作台" back-label="返回工作台" @back="openRootPage('home')" />

      <view class="page-heading">
        <text class="page-title">库存查询</text>
        <text class="page-subtitle">输入厂家编码、型号或订货编码，快速查看可用库存。</text>
        <view class="stock-entry-row">
          <button class="secondary-button stock-entry-row__button" @tap="openStockCatalogPage(DEFAULT_STOCK_BRAND)">正泰分类选品试点</button>
          <text class="stock-entry-row__hint">先用搜索满足快速补货，再用分类页验证正泰系列浏览体验。</text>
        </view>
        <view class="stock-guide card">
          <text class="stock-guide__title">查询说明</text>
          <view class="stock-guide__list">
            <view class="stock-guide__item">
              <text class="stock-guide__label">厂家编码</text>
              <text class="stock-guide__value" @tap="copyText(stockExamples.manufacturerCode, '厂家编码')">{{ stockExamples.manufacturerCode }}</text>
            </view>
            <view class="stock-guide__item">
              <text class="stock-guide__label">订货编码</text>
              <text class="stock-guide__value" @tap="copyText(stockExamples.orderCode, '订货编码')">{{ stockExamples.orderCode }}</text>
            </view>
            <view class="stock-guide__item">
              <text class="stock-guide__label">型号</text>
              <text class="stock-guide__value" @tap="copyText(stockExamples.model, '型号')">{{ stockExamples.model }}</text>
            </view>
            <view class="stock-guide__item">
              <text class="stock-guide__label">支持乱序</text>
              <view class="stock-guide__note-row">
                <text class="stock-guide__note">查询示例</text>
                <text class="stock-guide__value stock-guide__value--small">nxb 1p c16</text>
                <text class="stock-guide__note">与</text>
                <text class="stock-guide__value stock-guide__value--small">1p c16 nxb</text>
                <text class="stock-guide__note">结果一致</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <view class="card stock-search">
        <view class="stock-search__row">
          <input
            v-model="stockStore.query"
            class="stock-search__input"
            confirm-type="search"
            placeholder="支持厂家编码、订货码、中文品名、型号、政策分类"
            @confirm="submitSearch"
          />
          <view class="stock-search__helper">
            <text class="stock-search__helper-label">可搜范围</text>
            <view class="stock-search__chips">
              <view v-for="item in searchScopeHints" :key="item" class="stock-search__chip">
                {{ item }}
              </view>
            </view>
          </view>
          <view v-if="recentQueries.length" class="stock-search__helper">
            <text class="stock-search__helper-label">最近搜索</text>
            <view class="stock-search__chips">
              <view
                v-for="query in recentQueries"
                :key="query"
                class="stock-search__chip stock-search__chip--recent"
                @tap="applyQuickQuery(query)"
              >
                {{ query }}
              </view>
            </view>
          </view>
          <view v-if="searchRewriteHints.length" class="stock-search__helper">
            <text class="stock-search__helper-label">推荐改写</text>
            <view class="stock-search__chips">
              <view
                v-for="query in searchRewriteHints"
                :key="query"
                class="stock-search__chip stock-search__chip--assist"
                @tap="applyQuickQuery(query)"
              >
                {{ query }}
              </view>
            </view>
          </view>
          <view class="stock-search__actions">
            <button class="primary-button stock-search__button" :loading="stockStore.loading" @tap="submitSearch">查询</button>
            <button class="secondary-button stock-search__button" @tap="scanCode">扫码</button>
            <!-- #ifdef H5 -->
            <button class="secondary-button stock-search__button" :loading="pcScanLoading" @tap="startPcScan">手机扫码到电脑</button>
            <!-- #endif -->
            <button class="secondary-button stock-search__button" @tap="openCartPage">{{ cartButtonLabel }}</button>
            <button class="secondary-button stock-search__button" @tap="clearSearch">清空</button>
          </view>
        </view>
        <view class="stock-search__switch">
          <switch :checked="stockStore.inStockOnly" color="#1f6fb2" @change="toggleInStock" />
          <text>只显示有库存产品</text>
        </view>
      </view>

      <view
        v-if="stockStore.items.length || stockStore.totalPending || stockStore.total"
        class="stock-result-meta"
        :class="{ 'stock-result-meta--with-selected': selectedItemIds.length > 0 }"
      >
        <text>{{ stockResultSummary }}</text>
        <text class="stock-result-meta__note">当前显示按 1 件估算的参考客户价，最终以购物车中的实际数量和报价单为准。</text>
        <text v-if="selectedItemIds.length" class="stock-result-meta__selected">已选 {{ selectedItemIds.length }} 个产品</text>
      </view>

      <view v-if="stockStore.items.length" class="stock-table-shell">
        <view class="stock-table-shell__header">
          <scroll-view
            scroll-x
            class="stock-table-scroll stock-table-scroll--header"
            :scroll-left="tableScrollLeft"
            @scroll="handleTableHorizontalScroll"
          >
            <view class="stock-table stock-table--header">
              <view class="stock-table__header">
                <view class="stock-table__sticky-group stock-table__sticky-group--select">
                  <view class="stock-table__check-wrap" @tap="toggleCurrentPageSelection">
                    <view class="stock-checkmark" :class="{ 'stock-checkmark--active': allCurrentPageSelected }">
                      <text v-if="allCurrentPageSelected" class="stock-checkmark__icon">✓</text>
                    </view>
                  </view>
                  <view class="stock-table__sticky-label stock-table__sticky-cell--secondary">序号</view>
                </view>
                <text>厂家编码</text>
                <text>订货编码</text>
                <text>产品信息</text>
                <text>单位</text>
                <text class="stock-table__number">数量</text>
                <text class="stock-table__number">可用库存</text>
                <text class="stock-table__number">面价</text>
                <text class="stock-table__number">客户价</text>
                <text class="stock-table__number">优惠率</text>
                <text>匹配方式</text>
              </view>
            </view>
          </scroll-view>
        </view>

        <scroll-view
          scroll-x
          class="stock-table-scroll stock-table-scroll--body"
          :scroll-left="tableScrollLeft"
          @scroll="handleTableHorizontalScroll"
        >
          <view class="stock-table card stock-table--body">
            <view
              v-for="(item, index) in stockStore.items"
              :key="`table-${item.id}`"
              class="stock-table__row"
            >
              <view class="stock-table__sticky-group stock-table__sticky-group--row">
                <view class="stock-table__check-wrap" @tap="toggleItemSelection(item.id)">
                  <view class="stock-checkmark" :class="{ 'stock-checkmark--active': isSelected(item.id) }">
                    <text v-if="isSelected(item.id)" class="stock-checkmark__icon">✓</text>
                  </view>
                </view>
                <view class="stock-table__sequence stock-table__sticky-cell--secondary">{{ (stockStore.page - 1) * stockStore.pageSize + index + 1 }}</view>
              </view>
              <text class="stock-table__cell stock-copyable" @tap="copyText(item.manufacturer_code, '厂家编码')">{{ item.manufacturer_code || "-" }}</text>
              <text class="stock-table__cell stock-copyable" @tap="copyText(item.order_code, '订货编码')">{{ item.order_code || "-" }}</text>
              <view class="stock-table__product">
                <view v-if="item.main_image_url" class="stock-table__product-media">
                  <image class="stock-table__product-thumb" :src="item.main_image_url" mode="aspectFill" />
                </view>
                <view class="stock-table__product-content">
                  <text class="stock-table__product-name stock-copyable" @tap="copyText(item.name, '产品名称')">{{ item.name }}</text>
                  <text class="stock-table__product-meta stock-copyable" @tap="copyText(item.model, '型号')">{{ item.model || "-" }}</text>
                </view>
              </view>
              <text class="stock-table__cell stock-copyable" @tap="copyText(item.uom_name, '单位')">{{ item.uom_name || "-" }}</text>
              <view class="stock-table__qty-cell">
                <view class="stock-qty-stepper">
                  <button class="stock-qty-stepper__button" @tap="stepQuantity(item.id, -1)">-</button>
                  <input
                    class="stock-qty-stepper__input"
                    type="number"
                    :value="String(getSelectedQuantity(item.id))"
                    @input="handleQuantityInput(item.id, $event)"
                  />
                  <button class="stock-qty-stepper__button" @tap="stepQuantity(item.id, 1)">+</button>
                </view>
              </view>
              <text class="stock-table__cell stock-table__cell--number stock-copyable" @tap="copyText(item.free_qty, '可用库存')">{{ item.free_qty }}</text>
              <text class="stock-table__cell stock-table__cell--number">{{ item.list_price == null ? "-" : formatMoney(item.list_price, item.currency || "CNY") }}</text>
              <text class="stock-table__cell stock-table__cell--number stock-table__price">{{ item.customer_price == null ? "-" : formatMoney(item.customer_price, item.currency || "CNY") }}</text>
              <text class="stock-table__cell stock-table__cell--number stock-table__discount">{{ formatDiscount(item.discount_rate) }}</text>
              <text class="stock-table__cell">{{ item.matched_by || "-" }}</text>
            </view>
          </view>
        </scroll-view>
      </view>

      <view v-if="stockStore.items.length" class="stock-result-list stock-result-list--cards">
        <view v-for="item in stockStore.items" :key="item.id" class="stock-item card">
          <view class="stock-item__header">
            <view class="stock-item__main">
              <text class="stock-item__name stock-copyable" @tap="copyText(item.name, '产品名称')">{{ item.name }}</text>
              <text class="stock-item__hint">点击字段可复制</text>
            </view>
            <view class="stock-item__side">
              <view class="stock-item__select" @tap="toggleItemSelection(item.id)">
                <view class="stock-checkmark" :class="{ 'stock-checkmark--active': isSelected(item.id) }">
                  <text v-if="isSelected(item.id)" class="stock-checkmark__icon">✓</text>
                </view>
                <text class="stock-item__select-label">{{ isSelected(item.id) ? "已选中" : "选择" }}</text>
              </view>
              <button class="secondary-button stock-copy-button" @tap="copyStockItem(item)">复制全部</button>
              <view class="stock-item__qty">
                <text class="stock-item__qty-value stock-copyable" @tap="copyText(item.free_qty, '可用库存')">{{ item.free_qty }}</text>
                <text class="stock-item__qty-label">可用库存</text>
              </view>
            </view>
          </view>

          <view class="stock-item__grid">
            <view>
              <text class="field-label">厂家编码</text>
              <text class="field-value stock-copyable" @tap="copyText(item.manufacturer_code, '厂家编码')">{{ item.manufacturer_code || "-" }}</text>
            </view>
            <view>
              <text class="field-label">订货编码</text>
              <text class="field-value stock-copyable" @tap="copyText(item.order_code, '订货编码')">{{ item.order_code || "-" }}</text>
            </view>
            <view>
              <text class="field-label">型号</text>
              <text class="field-value stock-copyable" @tap="copyText(item.model, '型号')">{{ item.model || "-" }}</text>
            </view>
            <view>
              <text class="field-label">单位</text>
              <text class="field-value stock-copyable" @tap="copyText(item.uom_name, '单位')">{{ item.uom_name || "-" }}</text>
            </view>
            <view>
              <text class="field-label">数量</text>
              <view class="stock-qty-stepper stock-qty-stepper--card">
                <button class="stock-qty-stepper__button" @tap="stepQuantity(item.id, -1)">-</button>
                <input
                  class="stock-qty-stepper__input"
                  type="number"
                  :value="String(getSelectedQuantity(item.id))"
                  @input="handleQuantityInput(item.id, $event)"
                />
                <button class="stock-qty-stepper__button" @tap="stepQuantity(item.id, 1)">+</button>
              </view>
            </view>
          </view>

          <view class="stock-item__price-panel">
            <view class="stock-item__price-head">
              <text class="stock-item__price-title">客户价格</text>
              <text class="stock-item__price-note">按 {{ item.price_basis_qty || 1 }} {{ item.uom_name || "件" }} 参考</text>
            </view>
            <view class="stock-item__price-grid">
              <view class="stock-item__price-cell">
                <text class="field-label">面价</text>
                <text class="field-value stock-item__price-value">{{ item.list_price == null ? "-" : formatMoney(item.list_price, item.currency || "CNY") }}</text>
              </view>
              <view class="stock-item__price-cell">
                <text class="field-label">客户价</text>
                <text class="field-value stock-item__price-value stock-item__price-value--accent">{{ item.customer_price == null ? "-" : formatMoney(item.customer_price, item.currency || "CNY") }}</text>
              </view>
              <view class="stock-item__price-cell">
                <text class="field-label">优惠率</text>
                <text class="field-value stock-item__discount">{{ formatDiscount(item.discount_rate) }}</text>
              </view>
              <view class="stock-item__price-cell">
                <text class="field-label">匹配方式</text>
                <text class="field-value">{{ item.matched_by || "-" }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <EmptyState
        v-else-if="stockStore.hasSearched && !stockStore.loading"
        title="没有找到符合条件的产品"
        description="请检查编码，或换一个型号关键字。"
      />

      <view v-if="stockStore.items.length || stockStore.totalPending || stockStore.total" class="pager-row">
        <button class="secondary-button pager-button" :disabled="stockStore.page <= 1" @tap="stockStore.prevPage">上一页</button>
        <text class="pager-text">第 {{ stockStore.page }} 页</text>
        <button class="secondary-button pager-button" :disabled="!stockStore.hasNext" @tap="stockStore.nextPage">下一页</button>
      </view>
    </scroll-view>

    <view v-if="selectedItemIds.length" class="stock-selection-bar card">
      <view class="stock-selection-bar__meta">
        <text class="stock-selection-bar__title">已选 {{ selectedItemIds.length }} 个产品</text>
        <text class="stock-selection-bar__subtitle">先加入购物车，再在购物车中生成官方报价单</text>
      </view>
      <view class="stock-selection-bar__actions">
        <button class="secondary-button stock-selection-bar__button" @tap="resetSelection">清空选择</button>
        <button class="secondary-button stock-selection-bar__button" @tap="openCartPage">查看购物车</button>
        <button class="primary-button stock-selection-bar__button" :loading="addingToCart" @tap="addSelectedToCart">加入购物车</button>
      </view>
    </view>

    <BottomNav current="stock" />

    <!-- #ifdef H5 -->
    <view v-if="pcScanVisible" class="stock-pc-scan-mask" @tap="closePcScanDialog()">
      <view class="stock-pc-scan-dialog card" @tap.stop>
        <text class="stock-pc-scan-dialog__title">手机扫码到电脑</text>
        <text class="stock-pc-scan-dialog__subtitle">请用手机打开客户门户扫码页，或直接扫码打开本页，扫完后结果会自动回到电脑。</text>
        <image v-if="pcScanImage" :src="pcScanImage" class="stock-pc-scan-dialog__image" mode="aspectFit" />
        <view class="stock-pc-scan-dialog__meta">
          <text class="stock-pc-scan-dialog__count">已接收 {{ pcScanReceivedCount }} 条</text>
          <text class="stock-pc-scan-dialog__status">{{ pcScanStatus }}</text>
        </view>
        <view v-if="pcScanRecentResults.length" class="stock-pc-scan-dialog__results">
          <text class="stock-pc-scan-dialog__results-title">最近结果</text>
          <view v-for="item in pcScanRecentResults" :key="item.id" class="stock-pc-scan-dialog__result-row">
            <text class="stock-pc-scan-dialog__result-text">{{ item.result_text }}</text>
            <text class="stock-pc-scan-dialog__result-meta">{{ item.submitted_by || "手机端" }}</text>
          </view>
        </view>
        <button class="secondary-button stock-pc-scan-dialog__button" @tap="closePcScanDialog()">关闭窗口</button>
      </view>
    </view>
    <!-- #endif -->
  </view>
</template>

<style scoped lang="scss">
.page-heading {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12rpx;
}

.stock-entry-row {
  display: flex;
  width: 100%;
  flex-direction: column;
  align-items: flex-start;
  gap: 12rpx;
}

.stock-entry-row__button {
  margin: 0;
}

.stock-entry-row__hint {
  font-size: 24rpx;
  line-height: 1.6;
  color: var(--portal-text-muted);
}

.stock-guide {
  width: 100%;
  margin-top: 6rpx;
  padding: 20rpx 22rpx;
  background: var(--portal-surface-muted);
  box-shadow: none;
}

.stock-guide__title {
  display: block;
  font-size: 24rpx;
  font-weight: 700;
  color: var(--portal-text);
}

.stock-guide__list {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  margin-top: 14rpx;
}

.stock-guide__item {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.stock-guide__label {
  font-size: 22rpx;
  font-weight: 600;
  color: var(--portal-text-muted);
}

.stock-guide__value {
  display: inline-flex;
  width: fit-content;
  max-width: 100%;
  padding: 8rpx 14rpx;
  border-radius: 999rpx;
  background: var(--portal-primary-tint);
  border: 1px solid var(--portal-border);
  font-size: 24rpx;
  font-weight: 700;
  color: var(--portal-text);
}

.stock-guide__value--small {
  padding: 6rpx 12rpx;
  font-size: 22rpx;
}

.stock-guide__note-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10rpx;
}

.stock-guide__note {
  display: block;
  font-size: 22rpx;
  line-height: 1.6;
  color: var(--portal-text);
}

.stock-search {
  display: flex;
  flex-direction: column;
  gap: 18rpx;
  margin-top: 24rpx;
  padding: 24rpx;
}

.stock-search__row {
  display: flex;
  flex-direction: column;
  gap: 18rpx;
}

.stock-search__input {
  height: 92rpx;
  padding: 0 24rpx;
  border: 1px solid var(--portal-border);
  border-radius: 20rpx;
  background: #ffffff;
  font-size: 28rpx;
}

.stock-search__helper {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.stock-search__helper-label {
  font-size: 24rpx;
  font-weight: 700;
  color: var(--portal-text);
}

.stock-search__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.stock-search__chip {
  min-height: 52rpx;
  padding: 0 18rpx;
  border-radius: 999rpx;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(31, 111, 178, 0.08);
  border: 1px solid rgba(31, 111, 178, 0.14);
  font-size: 22rpx;
  color: var(--portal-primary);
}

.stock-search__chip--recent {
  background: #ffffff;
  color: var(--portal-text);
}

.stock-search__chip--assist {
  background: rgba(31, 111, 178, 0.14);
  border-color: rgba(31, 111, 178, 0.22);
  font-weight: 700;
}

.stock-search__actions {
  display: flex;
  gap: 16rpx;
  flex-wrap: wrap;
}

.stock-search__button {
  margin: 0;
  flex: 1;
  min-width: 180rpx;
  border: none;
}

.stock-search__switch {
  display: flex;
  align-items: center;
  gap: 12rpx;
  font-size: 26rpx;
  color: var(--portal-text-muted);
}

.stock-result-meta {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  margin-top: 20rpx;
  font-size: 24rpx;
  color: var(--portal-text-muted);
}

.stock-result-meta--with-selected {
  padding-right: 240rpx;
}

.stock-result-meta__selected {
  position: absolute;
  top: 0;
  right: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 42rpx;
  padding: 0 18rpx;
  border-radius: 999rpx;
  background: rgba(31, 111, 178, 0.08);
  border: 1px solid rgba(31, 111, 178, 0.16);
  font-size: 22rpx;
  font-weight: 700;
  color: var(--portal-primary);
  white-space: nowrap;
}

.stock-result-meta__note {
  font-size: 22rpx;
  line-height: 1.6;
}

.stock-result-list {
  display: flex;
  flex-direction: column;
  gap: 18rpx;
  margin-top: 18rpx;
}

.stock-selection-bar {
  position: fixed;
  left: 24rpx;
  right: 24rpx;
  bottom: 132rpx;
  z-index: 24;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  padding: 20rpx 22rpx;
}

.stock-selection-bar__meta {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.stock-selection-bar__title {
  font-size: 28rpx;
  font-weight: 800;
  color: var(--portal-text);
}

.stock-selection-bar__subtitle {
  font-size: 22rpx;
  line-height: 1.5;
  color: var(--portal-text-muted);
}

.stock-selection-bar__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.stock-selection-bar__button {
  margin: 0;
  flex: 1;
  min-width: 180rpx;
}

.stock-table {
  display: none;
}

.stock-item {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
  padding: 24rpx;
}

.stock-item__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20rpx;
}

.stock-item__main {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 8rpx;
}

.stock-item__name {
  display: block;
  font-size: 30rpx;
  font-weight: 700;
  color: var(--portal-text);
}

.stock-item__hint {
  font-size: 22rpx;
  color: var(--portal-text-muted);
}

.stock-item__side {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 14rpx;
}

.stock-item__select {
  display: inline-flex;
  align-items: center;
  gap: 10rpx;
}

.stock-item__select-label {
  font-size: 22rpx;
  font-weight: 700;
  color: var(--portal-text);
}

.stock-copy-button {
  margin: 0;
  min-width: 164rpx;
}

.stock-item__qty {
  display: flex;
  min-width: 160rpx;
  flex-direction: column;
  align-items: flex-end;
}

.stock-item__qty-value {
  font-size: 42rpx;
  font-weight: 700;
  color: var(--portal-primary);
}

.stock-item__qty-label {
  font-size: 22rpx;
  color: var(--portal-text-muted);
}

.stock-item__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18rpx;
}

.stock-qty-stepper {
  display: inline-grid;
  grid-template-columns: 56rpx minmax(76rpx, auto) 56rpx;
  align-items: center;
  min-height: 68rpx;
  border: 1px solid var(--portal-border);
  border-radius: 16rpx;
  background: #ffffff;
  overflow: hidden;
}

.stock-qty-stepper--card {
  margin-top: 8rpx;
}

.stock-qty-stepper__button {
  display: flex;
  min-width: 0;
  min-height: 68rpx;
  align-items: center;
  justify-content: center;
  margin: 0;
  border: none;
  border-radius: 0;
  background: var(--portal-surface-muted);
  color: var(--portal-text);
  font-size: 30rpx;
  font-weight: 700;
}

.stock-qty-stepper__input {
  min-width: 0;
  height: 68rpx;
  padding: 0 12rpx;
  text-align: center;
  font-size: 26rpx;
  font-weight: 700;
}

.stock-item__price-panel {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  padding: 20rpx;
  border-radius: 20rpx;
  background: var(--portal-surface-muted);
}

.stock-item__price-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}

.stock-item__price-title {
  font-size: 24rpx;
  font-weight: 700;
  color: var(--portal-text);
}

.stock-item__price-note {
  font-size: 22rpx;
  color: var(--portal-text-muted);
}

.stock-item__price-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18rpx;
}

.stock-item__price-cell {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 8rpx;
}

.stock-item__price-value {
  font-weight: 700;
}

.stock-item__price-value--accent {
  color: var(--portal-primary);
}

.stock-item__discount {
  font-weight: 700;
  color: #b45309;
}

.stock-copyable {
  cursor: pointer;
}

.pager-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
  margin-top: 28rpx;
}

.pager-button {
  margin: 0;
  flex: 1;
  border: none;
}

.pager-text {
  min-width: 120rpx;
  text-align: center;
  font-size: 24rpx;
  color: var(--portal-text-muted);
}

.stock-pc-scan-mask {
  position: fixed;
  inset: 0;
  z-index: 40;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32rpx;
  background: rgba(15, 23, 42, 0.52);
}

.stock-pc-scan-dialog {
  display: flex;
  width: 100%;
  max-width: 720rpx;
  flex-direction: column;
  align-items: center;
  padding: 36rpx 32rpx;
  text-align: center;
}

.stock-pc-scan-dialog__title {
  font-size: 34rpx;
  font-weight: 700;
  color: var(--portal-text);
}

.stock-pc-scan-dialog__subtitle {
  margin-top: 12rpx;
  font-size: 24rpx;
  line-height: 1.6;
  color: var(--portal-text-muted);
}

.stock-pc-scan-dialog__image {
  width: 360rpx;
  height: 360rpx;
  margin-top: 28rpx;
}

.stock-pc-scan-dialog__meta {
  display: flex;
  width: 100%;
  flex-direction: column;
  gap: 10rpx;
  margin-top: 20rpx;
}

.stock-pc-scan-dialog__count {
  font-size: 28rpx;
  font-weight: 700;
  color: var(--portal-text);
}

.stock-pc-scan-dialog__status {
  font-size: 24rpx;
  color: var(--portal-text-muted);
}

.stock-pc-scan-dialog__results {
  display: flex;
  width: 100%;
  flex-direction: column;
  gap: 12rpx;
  margin-top: 20rpx;
  padding: 18rpx;
  border-radius: 20rpx;
  background: var(--portal-surface-muted);
  text-align: left;
}

.stock-pc-scan-dialog__results-title {
  font-size: 22rpx;
  font-weight: 700;
  color: var(--portal-text-muted);
}

.stock-pc-scan-dialog__result-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14rpx;
}

.stock-pc-scan-dialog__result-text {
  flex: 1;
  min-width: 0;
  font-size: 24rpx;
  font-weight: 700;
  color: var(--portal-text);
  word-break: break-all;
}

.stock-pc-scan-dialog__result-meta {
  flex-shrink: 0;
  font-size: 22rpx;
  color: var(--portal-text-muted);
}

.stock-pc-scan-dialog__button {
  margin-top: 24rpx;
}

@media (min-width: 1024px) {
  .page-heading {
    gap: 10px;
  }

  .stock-guide {
    max-width: 760px;
    margin-top: 2px;
    padding: 16px 18px;
  }

  .stock-guide__title {
    font-size: 13px;
  }

  .stock-guide__list {
    gap: 10px;
    margin-top: 10px;
  }

  .stock-guide__item {
    display: grid;
    grid-template-columns: 76px minmax(0, 1fr);
    align-items: center;
    gap: 12px;
  }

  .stock-guide__label,
  .stock-guide__note {
    font-size: 12px;
  }

  .stock-guide__value {
    padding: 6px 10px;
    font-size: 12px;
  }

  .stock-guide__value--small {
    padding: 5px 10px;
  }

  .stock-search {
    gap: 16px;
    margin-top: 24px;
    padding: 24px;
  }

  .stock-search__row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 16px;
    align-items: center;
  }

  .stock-search__input {
    height: 52px;
    padding: 0 18px;
    border-radius: 14px;
    font-size: 15px;
  }

  .stock-search__actions {
    gap: 12px;
    flex-wrap: nowrap;
  }

  .stock-search__button {
    min-width: 104px;
    min-height: 52px;
    flex: none;
  }

  .stock-search__switch {
    font-size: 14px;
  }

  .stock-result-meta {
    margin-top: 18px;
    font-size: 13px;
  }

  .stock-result-meta--with-selected {
    padding-right: 160px;
  }

  .stock-result-meta__note {
    font-size: 12px;
  }

  .stock-result-meta__selected {
    min-height: 28px;
    padding: 0 12px;
    font-size: 12px;
  }

  .stock-result-list {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
    margin-top: 18px;
  }

  .stock-table-shell {
    margin-top: 18px;
  }

  .stock-table-shell__header {
    position: sticky;
    top: 0;
    z-index: 8;
  }

  .stock-table-scroll {
    display: block;
    width: 100%;
    overflow-x: auto;
  }

  .stock-table {
    display: flex;
    flex-direction: column;
    width: max-content;
    min-width: 1628px;
    padding: 0;
    overflow: visible;
  }

  .stock-table__header,
  .stock-table__row {
    display: grid;
    grid-template-columns: 88px 168px 136px minmax(320px, 1.6fr) 72px 132px 96px 112px 112px 92px 92px;
    gap: 0;
    align-items: stretch;
  }

  .stock-table__header {
    border-bottom: 1px solid var(--portal-border);
    background: linear-gradient(180deg, #f8fbff 0%, #eef4fb 100%);
    box-shadow: 0 10px 18px rgba(15, 23, 42, 0.08);
  }

  .stock-table--header {
    padding: 0;
    min-width: 1628px;
  }

  .stock-table--body {
    border-top-left-radius: 0;
    border-top-right-radius: 0;
  }

  .stock-table__header text {
    padding: 14px 16px;
    font-size: 12px;
    font-weight: 700;
    color: #566985;
    letter-spacing: 0.02em;
  }

  .stock-table__row {
    border-bottom: 1px solid var(--portal-border);
    transition: background 0.18s ease;
  }

  .stock-table__row:nth-child(odd) {
    background: #ffffff;
  }

  .stock-table__row:nth-child(even) {
    background: #f9fbfe;
  }

  .stock-table__row:hover {
    background: #eef5ff;
  }

  .stock-table__cell,
  .stock-table__product {
    display: flex;
    min-width: 0;
    align-items: center;
    padding: 16px;
    font-size: 13px;
    color: var(--portal-text);
    word-break: break-all;
  }

  .stock-table__qty-cell {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
  }

  .stock-table__cell--number,
  .stock-table__number {
    justify-content: flex-end;
    text-align: right;
  }

  .stock-table__product {
    gap: 12px;
    align-items: flex-start;
  }

  .stock-table__product-media {
    flex: 0 0 56px;
  }

  .stock-table__product-thumb {
    width: 56px;
    height: 56px;
    border-radius: 12px;
    background: #f2f6fb;
  }

  .stock-table__product-content {
    display: flex;
    min-width: 0;
    flex: 1;
    flex-direction: column;
    gap: 4px;
  }

  .stock-table__product-name {
    font-size: 14px;
    font-weight: 700;
    line-height: 1.4;
    color: var(--portal-text);
  }

  .stock-table__product-meta {
    font-size: 12px;
    line-height: 1.5;
    color: var(--portal-text-muted);
  }

  .stock-table__sticky-group {
    position: sticky;
    left: 0;
    z-index: 3;
    display: grid;
    grid-template-columns: 44px 44px;
    align-items: center;
    min-width: 88px;
    background: inherit;
    box-shadow: 1px 0 0 var(--portal-border);
  }

  .stock-table__sticky-cell--secondary {
    border-left: 1px solid rgba(207, 216, 230, 0.72);
  }

  .stock-table__sticky-group--select {
    z-index: 7;
    background: linear-gradient(180deg, #f8fbff 0%, #eef4fb 100%);
  }

  .stock-table__check-wrap {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100%;
    padding: 12px 0;
    cursor: pointer;
  }

  .stock-checkmark {
    display: flex;
    width: 18px;
    height: 18px;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--portal-border);
    border-radius: 6px;
    background: #ffffff;
    transition: all 0.18s ease;
  }

  .stock-checkmark--active {
    border-color: var(--portal-primary);
    background: var(--portal-primary);
    color: #ffffff;
  }

  .stock-checkmark__icon {
    font-size: 11px;
    font-weight: 700;
    line-height: 1;
  }

  .stock-table__sticky-label,
  .stock-table__sequence {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 8px;
    font-size: 12px;
    font-weight: 700;
    color: #566985;
    text-align: center;
    white-space: nowrap;
    writing-mode: horizontal-tb;
  }

  .stock-table__sequence {
    color: var(--portal-text);
  }

  .stock-table__header .stock-table__sticky-label {
    padding: 0 8px;
  }

  .stock-table__price {
    font-weight: 700;
    color: var(--portal-primary);
  }

  .stock-table__discount {
    font-weight: 700;
    color: #b45309;
  }

  .stock-result-list--cards {
    display: none;
  }

  .stock-item {
    gap: 18px;
    padding: 22px;
  }

  .stock-item__main {
    gap: 6px;
  }

  .stock-item__name {
    font-size: 19px;
    line-height: 1.35;
  }

  .stock-item__hint {
    font-size: 12px;
  }

  .stock-item__side {
    gap: 10px;
  }

  .stock-item__select-label {
    font-size: 12px;
  }

  .stock-copy-button {
    min-width: 92px;
  }

  .stock-item__qty {
    min-width: 120px;
  }

  .stock-item__qty-value {
    font-size: 32px;
  }

  .stock-item__qty-label {
    font-size: 12px;
  }

  .stock-item__grid {
    gap: 16px 18px;
  }

  .stock-item__price-panel {
    gap: 12px;
    padding: 16px;
    border-radius: 16px;
  }

  .stock-item__price-title,
  .stock-item__price-value,
  .stock-item__discount {
    font-size: 14px;
  }

  .stock-item__price-note {
    font-size: 12px;
  }

  .stock-item__price-grid {
    gap: 14px 16px;
  }

  .stock-qty-stepper {
    grid-template-columns: 34px minmax(48px, auto) 34px;
    min-height: 38px;
    border-radius: 10px;
  }

  .stock-qty-stepper__button {
    min-height: 38px;
    font-size: 18px;
    cursor: pointer;
  }

  .stock-qty-stepper__input {
    height: 38px;
    padding: 0 8px;
    font-size: 13px;
  }

  .stock-selection-bar {
    left: 284px;
    right: 36px;
    bottom: 24px;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 16px 18px;
  }

  .stock-selection-bar__meta {
    flex: 1;
    min-width: 0;
    gap: 4px;
  }

  .stock-selection-bar__title {
    font-size: 15px;
  }

  .stock-selection-bar__subtitle {
    font-size: 12px;
  }

  .stock-selection-bar__actions {
    flex-wrap: nowrap;
    gap: 10px;
  }

  .stock-selection-bar__button {
    flex: none;
    min-width: 110px;
  }

  .pager-row {
    justify-content: flex-end;
    gap: 14px;
    margin-top: 24px;
  }

  .pager-button {
    flex: none;
    min-width: 116px;
  }

  .pager-text {
    min-width: 84px;
    font-size: 13px;
  }

  .stock-pc-scan-mask {
    padding: 24px;
  }

  .stock-pc-scan-dialog {
    max-width: 440px;
    padding: 26px 24px;
  }

  .stock-pc-scan-dialog__title {
    font-size: 22px;
  }

  .stock-pc-scan-dialog__subtitle,
  .stock-pc-scan-dialog__status {
    font-size: 13px;
  }

  .stock-pc-scan-dialog__count {
    font-size: 15px;
  }

  .stock-pc-scan-dialog__image {
    width: 220px;
    height: 220px;
    margin-top: 20px;
  }

  .stock-pc-scan-dialog__meta {
    margin-top: 16px;
    gap: 6px;
  }

  .stock-pc-scan-dialog__results {
    gap: 8px;
    margin-top: 16px;
    padding: 12px 14px;
    border-radius: 14px;
  }

  .stock-pc-scan-dialog__results-title,
  .stock-pc-scan-dialog__result-meta {
    font-size: 12px;
  }

  .stock-pc-scan-dialog__result-text {
    font-size: 13px;
  }

  .stock-pc-scan-dialog__button {
    margin-top: 18px;
    min-width: 132px;
  }
}
</style>
