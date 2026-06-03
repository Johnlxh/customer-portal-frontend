<script setup lang="ts">
import { onLoad } from "@dcloudio/uni-app"

import { getDeliveryDetail } from "../../../api/delivery"
import { useDetailLoader } from "../../../composables/useDetailLoader"
import BottomNav from "../../../components/BottomNav.vue"
import DetailHero from "../../../components/DetailHero.vue"
import DetailInfoCard from "../../../components/DetailInfoCard.vue"
import DetailLineList from "../../../components/DetailLineList.vue"
import EmptyState from "../../../components/EmptyState.vue"
import PageContextBar from "../../../components/PageContextBar.vue"
import type { DeliveryDetail } from "../../../types/api"
import { formatDate } from "../../../utils/date"
import { openPdfUrl } from "../../../utils/platform"
import { goBackOr, openOrderDetail, openReturnDetail } from "../../../utils/navigation"

const { detail, loading, errorMessage, loadDetail } = useDetailLoader<DeliveryDetail>(getDeliveryDetail)

onLoad(async (query) => {
  await loadDetail(String(query?.id || ""))
})
</script>

<template>
  <view class="page-shell page-shell--with-nav">
    <scroll-view scroll-y class="page-shell__content page-shell__content--detail">
      <template v-if="detail">
        <view class="detail-container">
          <!-- Left Column -->
          <view class="detail-main">
            <PageContextBar
              current-label="出库单详情"
              parent-label="销售单"
              back-label="返回销售单"
              @back="goBackOr(detail.sale_order ? `/packages/docs/order-detail/index?id=${detail.sale_order.id}` : '/pages/orders/index')"
            />

            <DetailHero
              :title="detail.name"
              :subtitle="`${detail.status_label} · ${formatDate(detail.delivery_date)}`"
              :pdf-url="detail.pdf_url"
              @pdf="openPdfUrl(detail.pdf_url)"
            />

            <view class="detail-grid">
              <DetailInfoCard
                title="出库信息"
                :items="[
                  { label: '来源单据', value: detail.origin || '-' },
                  { label: '作业类型', value: detail.operation_type || '-' },
                  { label: '出库日期', value: formatDate(detail.delivery_date) }
                ]"
              />
            </view>

            <view class="detail-section">
              <DetailLineList
                title="产品行"
                :items="detail.lines.map((line) => ({
                  id: line.id,
                  title: line.name,
                  meta: line.product_code || '-',
                  amount: `${line.done_qty} / ${line.planned_qty} ${line.uom_name}`
                }))"
              />
            </view>
          </view>

          <!-- Right Column (Sidebar) -->
          <view class="detail-sidebar">
            <view class="detail-info card">
              <text class="section-title">关联单据</text>
              <button class="secondary-button inline-button" :disabled="!detail.sale_order" @tap="detail.sale_order && openOrderDetail(detail.sale_order.id)">返回销售单</button>
              <button class="secondary-button inline-button" :disabled="!detail.related_return" @tap="detail.related_return && openReturnDetail(detail.related_return.id)">查看关联退单</button>
            </view>
          </view>
        </view>
      </template>
      <EmptyState v-else-if="loading" title="正在加载出库单详情" />
      <EmptyState v-else :title="errorMessage || '暂时没有出库单详情'" />
    </scroll-view>

    <BottomNav current="orders" />
  </view>
</template>

<style scoped lang="scss">
@use "../../../styles/mixins/page-layout.scss" as pageLayout;

@include pageLayout.document-detail-layout(true);
@include pageLayout.detail-sidebar-card;
</style>
