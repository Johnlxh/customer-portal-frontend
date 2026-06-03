<script setup lang="ts">
import { computed, ref } from "vue"

import { generateQuoteFromCart, getCart, removeCartLine, updateCartLineQuantity } from "../../api/cart"
import BottomNav from "../../components/BottomNav.vue"
import EmptyState from "../../components/EmptyState.vue"
import PageContextBar from "../../components/PageContextBar.vue"
import ProductThumb from "../../components/ProductThumb.vue"
import { useSessionGuard } from "../../composables/useSessionGuard"
import { useCartStore } from "../../stores/cart"
import type { CartLine, CartResponse } from "../../types/api"
import { formatMoney } from "../../utils/money"
import { goBackOr, openQuoteDetail, openRootPage } from "../../utils/navigation"
import { buildQuantityMap, parseQuantityInput, patchQuantityMap, readQuantity } from "../../utils/quantity"
import { showErrorToast, showToast } from "../../utils/toast"

useSessionGuard(loadCart)
const cartStore = useCartStore()
const cart = ref<CartResponse | null>(null)
const loading = ref(false)
const submitting = ref(false)
const selectedLineIds = ref<number[]>([])
const quantities = ref<Record<number, number>>({})
const clientOrderRef = ref("")
const quoteNote = ref("")

const items = computed(() => cart.value?.items || [])
const allSelected = computed(() => items.value.length > 0 && items.value.every((item) => selectedLineIds.value.includes(item.id)))
const selectedItems = computed(() => items.value.filter((item) => selectedLineIds.value.includes(item.id)))
const selectedAmount = computed(() =>
  selectedItems.value.reduce((total, item) => total + (item.subtotal || 0), 0),
)
const selectedQuantity = computed(() =>
  selectedItems.value.reduce((total, item) => total + (quantities.value[item.id] || item.quantity || 0), 0),
)
const currency = computed(() => cart.value?.currency || items.value[0]?.currency || "CNY")

function syncQuantities(lines: CartLine[]) {
  quantities.value = buildQuantityMap(lines, (line) => line.id, (line) => line.quantity || 1)
}

function syncSelection(lines: CartLine[]) {
  const lineIds = lines.map((line) => line.id)
  const preserved = selectedLineIds.value.filter((lineId) => lineIds.includes(lineId))
  selectedLineIds.value = preserved.length ? preserved : lineIds
}

function applyCart(response: CartResponse) {
  cart.value = response
  cartStore.applyCart(response)
  syncQuantities(response.items || [])
  syncSelection(response.items || [])
}

async function loadCart() {
  loading.value = true
  try {
    const response = await getCart()
    applyCart(response.data)
  } catch (error) {
    showErrorToast(error, "购物车加载失败")
  } finally {
    loading.value = false
  }
}

function getQuantity(lineId: number) {
  return readQuantity(quantities.value, lineId)
}

function normalizeQuantity(lineId: number, value: number) {
  quantities.value = patchQuantityMap(quantities.value, lineId, value)
}

function handleQuantityInput(lineId: number, event: any) {
  normalizeQuantity(lineId, parseQuantityInput(event))
}

async function syncLineQuantity(lineId: number) {
  try {
    const response = await updateCartLineQuantity(lineId, getQuantity(lineId))
    applyCart(response.data)
  } catch (error) {
    showErrorToast(error, "数量更新失败")
    await loadCart()
  }
}

async function stepLineQuantity(lineId: number, delta: number) {
  normalizeQuantity(lineId, getQuantity(lineId) + delta)
  await syncLineQuantity(lineId)
}

async function removeLine(lineId: number) {
  try {
    const response = await removeCartLine(lineId)
    selectedLineIds.value = selectedLineIds.value.filter((id) => id !== lineId)
    applyCart(response.data)
  } catch (error) {
    showErrorToast(error, "移除失败")
  }
}

function toggleLine(lineId: number) {
  if (selectedLineIds.value.includes(lineId)) {
    selectedLineIds.value = selectedLineIds.value.filter((id) => id !== lineId)
    return
  }
  selectedLineIds.value = [...selectedLineIds.value, lineId]
}

function toggleAll() {
  if (allSelected.value) {
    selectedLineIds.value = []
    return
  }
  selectedLineIds.value = items.value.map((item) => item.id)
}

async function generateQuote() {
  if (!selectedLineIds.value.length) {
    showToast("请先选择需要生成报价单的商品。")
    return
  }

  submitting.value = true
  try {
    const response = await generateQuoteFromCart(selectedLineIds.value, {
      client_order_ref: clientOrderRef.value.trim(),
      note: quoteNote.value.trim(),
    })
    applyCart(response.data.cart)
    clientOrderRef.value = ""
    quoteNote.value = ""
    showToast("报价单已生成")
    openQuoteDetail(response.data.quote.id)
  } catch (error) {
    showErrorToast(error, "报价单生成失败")
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <view class="page-shell page-shell--with-nav">
    <scroll-view
      scroll-y
      class="page-shell__content cart-page__content"
      :class="{ 'cart-page__content--with-submit': items.length > 0 }"
    >
      <PageContextBar current-label="购物车" parent-label="库存查询" back-label="返回库存查询" @back="goBackOr('/pages/stock/index')" />

      <view class="page-heading">
        <text class="page-title">购物车</text>
        <text class="page-subtitle">在这里确认数量和价格，再生成官方报价单给销售处理。</text>
      </view>

      <view class="cart-meta card">
        <text>共 {{ cart?.line_count || 0 }} 行，当前已选 {{ selectedLineIds.length }} 行</text>
        <button class="secondary-button cart-meta__button" @tap="openRootPage('stock')">继续选品</button>
      </view>

      <view v-if="items.length" class="cart-form card">
        <view class="cart-form__header">
          <text class="cart-form__title">生成报价单</text>
          <text class="cart-form__desc">补充客户参考和备注后，销售会在后台处理这张官方报价单。</text>
        </view>
        <view class="cart-form__grid">
          <view class="cart-form__field">
            <text class="cart-form__label">客户参考</text>
            <input
              v-model="clientOrderRef"
              class="cart-form__input"
              maxlength="64"
              placeholder="例如：PO20260317001"
            />
          </view>
          <view class="cart-form__field cart-form__field--full">
            <text class="cart-form__label">备注</text>
            <textarea
              v-model="quoteNote"
              class="cart-form__textarea"
              maxlength="300"
              auto-height
              placeholder="例如：请优先拆单发货，或请保留当前客户价。"
            />
          </view>
        </view>
      </view>

      <view v-if="items.length" class="cart-table card">
        <view class="cart-table__header">
          <view class="cart-table__check" @tap="toggleAll">
            <view class="stock-checkmark" :class="{ 'stock-checkmark--active': allSelected }">
              <text v-if="allSelected" class="stock-checkmark__icon">✓</text>
            </view>
          </view>
          <text>产品</text>
          <text>厂家编码</text>
          <text class="cart-table__number">数量</text>
          <text class="cart-table__number">可用库存</text>
          <text class="cart-table__number">客户价</text>
          <text class="cart-table__number">优惠率</text>
          <text class="cart-table__number">小计</text>
          <text>操作</text>
        </view>

        <view v-for="line in items" :key="line.id" class="cart-table__row">
          <view class="cart-table__check" @tap="toggleLine(line.id)">
            <view class="stock-checkmark" :class="{ 'stock-checkmark--active': selectedLineIds.includes(line.id) }">
              <text v-if="selectedLineIds.includes(line.id)" class="stock-checkmark__icon">✓</text>
            </view>
          </view>
          <view class="cart-table__product">
            <view class="cart-table__product-media">
              <ProductThumb
                class="cart-table__product-thumb"
                :src="line.main_image_url"
                :preview-urls="line.media?.detail_images?.length ? line.media.detail_images : line.media?.gallery_images || []"
              />
            </view>
            <view class="cart-table__product-content">
              <text class="cart-table__product-name">{{ line.name }}</text>
              <text class="cart-table__product-meta">{{ line.model || line.order_code || "未设置型号" }}</text>
            </view>
          </view>
          <text>{{ line.manufacturer_code || "-" }}</text>
          <view class="cart-table__qty">
            <view class="cart-qty-stepper">
              <button class="cart-qty-stepper__button" @tap="stepLineQuantity(line.id, -1)">-</button>
              <input
                class="cart-qty-stepper__input"
                type="number"
                :value="String(getQuantity(line.id))"
                @input="handleQuantityInput(line.id, $event)"
                @blur="syncLineQuantity(line.id)"
              />
              <button class="cart-qty-stepper__button" @tap="stepLineQuantity(line.id, 1)">+</button>
            </view>
          </view>
          <text class="cart-table__number">{{ line.free_qty }}</text>
          <text class="cart-table__number cart-table__price">{{ formatMoney(line.customer_price, line.currency) }}</text>
          <text class="cart-table__number cart-table__discount">{{ line.discount_rate.toFixed(2) }}%</text>
          <text class="cart-table__number">{{ formatMoney(line.subtotal, line.currency) }}</text>
          <view class="cart-table__actions">
            <button class="secondary-button cart-table__remove" @tap="removeLine(line.id)">移除</button>
          </view>
        </view>
      </view>

      <EmptyState v-else-if="!loading" title="购物车还是空的" description="先去库存查询页选中产品，再加入购物车。" />
    </scroll-view>

    <view v-if="items.length" class="cart-submit-bar card">
      <view class="cart-submit-bar__meta">
        <text class="cart-submit-bar__title">已选 {{ selectedLineIds.length }} 行</text>
        <view class="cart-submit-bar__meta-copy">
          <text class="cart-submit-bar__subtitle">合计 {{ selectedQuantity }} 件</text>
          <text class="cart-submit-bar__amount">{{ formatMoney(selectedAmount, currency) }}</text>
        </view>
      </view>
      <view class="cart-submit-bar__actions">
        <button class="secondary-button cart-submit-bar__button" @tap="toggleAll">{{ allSelected ? "取消全选" : "全选" }}</button>
        <button class="primary-button cart-submit-bar__button" :loading="submitting" @tap="generateQuote">生成报价单</button>
      </view>
    </view>

    <BottomNav current="cart" />
  </view>
</template>

<style scoped lang="scss">
.cart-page__content--with-submit {
  padding-bottom: 300rpx;
}

.cart-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  margin-top: 24rpx;
  padding: 20rpx 24rpx;
  font-size: 24rpx;
  color: var(--portal-text-muted);
}

.cart-meta__button {
  margin: 0;
}

.cart-table {
  display: flex;
  flex-direction: column;
  margin-top: 20rpx;
  overflow: hidden;
}

.cart-form {
  display: flex;
  flex-direction: column;
  gap: 18rpx;
  margin-top: 20rpx;
  padding: 24rpx;
}

.cart-form__header {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.cart-form__title {
  font-size: 30rpx;
  font-weight: 800;
  color: var(--portal-text);
}

.cart-form__desc {
  font-size: 22rpx;
  line-height: 1.5;
  color: var(--portal-text-muted);
}

.cart-form__grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16rpx;
}

.cart-form__field {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.cart-form__field--full {
  grid-column: 1 / -1;
}

.cart-form__label {
  font-size: 22rpx;
  font-weight: 700;
  color: #566985;
}

.cart-form__input,
.cart-form__textarea {
  width: 100%;
  min-height: 88rpx;
  padding: 0 20rpx;
  border: 1px solid var(--portal-border);
  border-radius: 18rpx;
  background: #ffffff;
  font-size: 24rpx;
  color: var(--portal-text);
  box-sizing: border-box;
}

.cart-form__textarea {
  min-height: 156rpx;
  padding-top: 18rpx;
  padding-bottom: 18rpx;
  line-height: 1.6;
}

.cart-table__header,
.cart-table__row {
  display: grid;
  grid-template-columns: 70rpx minmax(240rpx, 1.6fr) 180rpx 220rpx 120rpx 140rpx 120rpx 140rpx 120rpx;
  align-items: center;
}

.cart-table__header {
  border-bottom: 1px solid var(--portal-border);
  background: linear-gradient(180deg, #f8fbff 0%, #eef4fb 100%);
}

.cart-table__header text {
  padding: 20rpx 18rpx;
  font-size: 22rpx;
  font-weight: 700;
  color: #566985;
}

.cart-table__row {
  border-bottom: 1px solid var(--portal-border);
}

.cart-table__row > text,
.cart-table__product,
.cart-table__qty,
.cart-table__actions,
.cart-table__check {
  min-width: 0;
  padding: 20rpx 18rpx;
  font-size: 24rpx;
  color: var(--portal-text);
}

.cart-table__row:nth-child(odd) {
  background: #ffffff;
}

.cart-table__row:nth-child(even) {
  background: #f9fbfe;
}

.cart-table__check {
  display: flex;
  align-items: center;
  justify-content: center;
}

.cart-table__product {
  display: flex;
  align-items: flex-start;
  gap: 12rpx;
}

.cart-table__product-media {
  flex: 0 0 88rpx;
}

.cart-table__product-thumb {
  width: 88rpx;
  height: 88rpx;
  border-radius: 18rpx;
  background: #f2f6fb;
}

.cart-table__product-content {
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: column;
  gap: 8rpx;
}

.cart-table__product-name {
  font-size: 28rpx;
  font-weight: 700;
  color: var(--portal-text);
}

.cart-table__product-meta {
  font-size: 22rpx;
  color: var(--portal-text-muted);
}

.cart-table__number {
  text-align: right;
  justify-content: flex-end;
}

.cart-table__qty,
.cart-table__actions {
  display: flex;
  align-items: center;
  justify-content: center;
}

.cart-qty-stepper {
  display: inline-grid;
  grid-template-columns: 56rpx minmax(84rpx, auto) 56rpx;
  align-items: center;
  min-height: 72rpx;
  border: 1px solid var(--portal-border);
  border-radius: 16rpx;
  background: #ffffff;
  overflow: hidden;
}

.cart-qty-stepper__button {
  margin: 0;
  min-height: 72rpx;
  border: none;
  border-radius: 0;
  background: var(--portal-surface-muted);
  font-size: 30rpx;
  font-weight: 700;
  color: var(--portal-text);
}

.cart-qty-stepper__input {
  height: 72rpx;
  padding: 0 12rpx;
  text-align: center;
  font-size: 24rpx;
  font-weight: 700;
}

.cart-table__price {
  font-weight: 700;
  color: var(--portal-primary);
}

.cart-table__discount {
  font-weight: 700;
  color: #b45309;
}

.cart-table__remove {
  margin: 0;
}

.cart-submit-bar {
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

.cart-submit-bar__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}

.cart-submit-bar__meta-copy {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6rpx;
}

.cart-submit-bar__title {
  font-size: 28rpx;
  font-weight: 800;
  color: var(--portal-text);
}

.cart-submit-bar__subtitle {
  font-size: 22rpx;
  color: var(--portal-text-muted);
}

.cart-submit-bar__amount {
  font-size: 30rpx;
  font-weight: 800;
  color: var(--portal-primary);
}

.cart-submit-bar__actions {
  display: flex;
  gap: 12rpx;
}

.cart-submit-bar__button {
  margin: 0;
  flex: 1;
}

@media (max-width: 1023px) {
  .cart-table {
    overflow-x: auto;
  }
}

@media (min-width: 1024px) {
  .cart-page__content--with-submit {
    padding-bottom: 180px;
  }

  .cart-meta {
    margin-top: 18px;
    padding: 16px 18px;
    font-size: 13px;
  }

  .cart-table {
    margin-top: 18px;
  }

  .cart-form {
    margin-top: 18px;
    gap: 16px;
    padding: 20px;
  }

  .cart-form__title {
    font-size: 18px;
  }

  .cart-form__desc {
    font-size: 13px;
  }

  .cart-form__grid {
    grid-template-columns: minmax(240px, 360px) minmax(0, 1fr);
    gap: 14px 18px;
  }

  .cart-form__label {
    font-size: 12px;
  }

  .cart-form__input,
  .cart-form__textarea {
    min-height: 42px;
    padding: 0 14px;
    border-radius: 12px;
    font-size: 13px;
  }

  .cart-form__textarea {
    min-height: 98px;
    padding-top: 12px;
    padding-bottom: 12px;
  }

  .cart-table__header,
  .cart-table__row {
    grid-template-columns: 52px minmax(260px, 1.8fr) 160px 170px 100px 112px 96px 120px 96px;
  }

  .cart-table__header text {
    padding: 14px 16px;
    font-size: 12px;
  }

  .cart-table__row > text,
  .cart-table__product,
  .cart-table__qty,
  .cart-table__actions,
  .cart-table__check {
    padding: 16px;
    font-size: 13px;
  }

  .cart-table__product {
    gap: 4px;
  }

  .cart-table__product-media {
    flex: 0 0 56px;
  }

  .cart-table__product-thumb {
    width: 56px;
    height: 56px;
    border-radius: 12px;
  }

  .cart-table__product-content {
    gap: 4px;
  }

  .cart-table__product-name {
    font-size: 14px;
  }

  .cart-table__product-meta {
    font-size: 12px;
  }

  .cart-qty-stepper {
    grid-template-columns: 34px minmax(48px, auto) 34px;
    min-height: 38px;
    border-radius: 10px;
  }

  .cart-qty-stepper__button {
    min-height: 38px;
    font-size: 18px;
    cursor: pointer;
  }

  .cart-qty-stepper__input {
    height: 38px;
    font-size: 13px;
  }

  .cart-submit-bar {
    left: 284px;
    right: 36px;
    bottom: 24px;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 16px 18px;
  }

  .cart-submit-bar__title {
    font-size: 15px;
  }

  .cart-submit-bar__subtitle {
    font-size: 12px;
  }

  .cart-submit-bar__amount {
    font-size: 18px;
  }

  .cart-submit-bar__actions {
    gap: 10px;
  }

  .cart-submit-bar__button {
    flex: none;
    min-width: 108px;
  }
}
</style>
