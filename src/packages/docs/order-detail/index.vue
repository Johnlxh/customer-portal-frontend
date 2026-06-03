<script setup lang="ts">
import { computed, ref } from "vue"
import { onLoad } from "@dcloudio/uni-app"

import { getOrderDetail } from "../../../api/order"
import { useDetailLoader } from "../../../composables/useDetailLoader"
import BottomNav from "../../../components/BottomNav.vue"
import DetailHero from "../../../components/DetailHero.vue"
import DetailInfoCard from "../../../components/DetailInfoCard.vue"
import DetailLineList from "../../../components/DetailLineList.vue"
import DocumentCard from "../../../components/DocumentCard.vue"
import EmptyState from "../../../components/EmptyState.vue"
import PageContextBar from "../../../components/PageContextBar.vue"
import type { SaleOrderDetail } from "../../../types/api"
import { formatDate } from "../../../utils/date"
import { formatMoney } from "../../../utils/money"
import { openPdfUrl } from "../../../utils/platform"
import { goBackOr, openDeliveryDetail, openReturnDetail } from "../../../utils/navigation"

const { detail, loading, errorMessage, loadDetail } = useDetailLoader<SaleOrderDetail>(getOrderDetail)
const detailLineItems = computed(() =>
  detail.value
    ? detail.value.lines.map((line) => ({
        id: line.id,
        title: line.name,
        meta: `${line.product_code || "-"} · ${line.quantity} ${line.uom_name}`,
        amount: formatMoney(line.amount, detail.value?.currency),
        imageSrc: line.main_image_url,
        previewUrls: line.media?.detail_images?.length ? line.media.detail_images : line.media?.gallery_images || [],
      }))
    : [],
)
const detailTotalAmount = computed(() => (detail.value ? formatMoney(detail.value.amount_total, detail.value.currency) : ""))

onLoad(async (query) => {
  await loadDetail(String(query?.id || ""))
})
</script>

<template>
  <view class="page-shell page-shell--with-nav">
    <scroll-view scroll-y class="page-shell__content page-shell__content--detail">
      <template v-if="detail">
        <view class="detail-container">
          <!-- Left Column: Main Info -->
          <view class="detail-main">
            <PageContextBar
              current-label="销售单详情"
              parent-label="销售单"
              back-label="返回销售单"
              @back="goBackOr('/pages/orders/index')"
            />

            <DetailHero
              :title="detail.name"
              :subtitle="detail.client_order_ref || '未填写客户参考'"
              :pdf-url="detail.pdf_url"
              @pdf="openPdfUrl(detail.pdf_url)"
            />

            <view class="detail-grid">
              <DetailInfoCard
                title="单据信息"
                :items="[
                  { label: '下单日期', value: formatDate(detail.date_order) },
                  { label: '状态', value: detail.status_label },
                  { label: '付款条件', value: detail.payment_term || '-' },
                  { label: '备注', value: detail.note || '-' }
                ]"
              />
              <DetailInfoCard
                title="收货信息"
                :items="[
                  { label: '联系人', value: detail.shipping_info.name || '-' },
                  { label: '联系电话', value: detail.shipping_info.phone || '-' },
                  { label: '地址', value: detail.shipping_info.address || '-' }
                ]"
              />
            </view>

            <view class="detail-section">
              <DetailLineList
                title="产品明细"
                :items="detailLineItems"
                :show-images="true"
                total-label="合计"
                :total-value="detailTotalAmount"
              />
            </view>
          </view>

          <!-- Right Column: Sidebar (Related Docs) -->
          <view class="detail-sidebar">
            <view class="section">
              <text class="section-title">最近出库单</text>
              <view v-if="detail.recent_deliveries.length" class="list-stack">
                <DocumentCard
                  v-for="item in detail.recent_deliveries"
                  :key="item.id"
                  :title="item.name"
                  :meta="formatDate(item.date)"
                  :status="item.status_label"
                  @click="openDeliveryDetail(item.id)"
                />
              </view>
              <EmptyState v-else title="暂时没有关联出库单" />
            </view>

            <view class="section">
              <text class="section-title">关联退单</text>
              <view v-if="detail.returns.length" class="list-stack">
                <DocumentCard
                  v-for="item in detail.returns"
                  :key="item.id"
                  :title="item.name"
                  :meta="formatDate(item.date)"
                  :status="item.status_label"
                  @click="openReturnDetail(item.id)"
                />
              </view>
              <EmptyState v-else title="暂时没有退单记录" />
            </view>
          </view>
        </view>
      </template>
      <EmptyState v-else-if="loading" title="正在加载销售单详情" />
      <EmptyState v-else :title="errorMessage || '暂时没有销售单详情'" />
    </scroll-view>

    <BottomNav current="orders" />
  </view>
</template>

<style scoped lang="scss">
@use "../../../styles/mixins/page-layout.scss" as pageLayout;

@include pageLayout.document-detail-layout(true, 24rpx, 32px);

.section {
  margin-top: 0;
  padding: 24rpx;
  border: 1px solid var(--portal-border);
  border-radius: var(--portal-radius);
  background: var(--portal-surface);
}

.list-stack {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

@media (min-width: 1024px) {
  .section {
    margin-top: 0;
    padding: 18px;
  }
}
</style>
