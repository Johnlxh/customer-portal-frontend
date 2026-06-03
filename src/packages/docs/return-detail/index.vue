<script setup lang="ts">
import { onLoad } from "@dcloudio/uni-app"

import { getReturnDetail } from "../../../api/return"
import { useDetailLoader } from "../../../composables/useDetailLoader"
import BottomNav from "../../../components/BottomNav.vue"
import DetailHero from "../../../components/DetailHero.vue"
import DetailInfoCard from "../../../components/DetailInfoCard.vue"
import DetailLineList from "../../../components/DetailLineList.vue"
import EmptyState from "../../../components/EmptyState.vue"
import PageContextBar from "../../../components/PageContextBar.vue"
import type { ReturnDetail } from "../../../types/api"
import { formatDate } from "../../../utils/date"
import { openPdfUrl } from "../../../utils/platform"
import { goBackOr, openDeliveryDetail, openOrderDetail } from "../../../utils/navigation"

const { detail, loading, errorMessage, loadDetail } = useDetailLoader<ReturnDetail>(getReturnDetail)

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
              current-label="退单详情"
              parent-label="退单记录"
              back-label="返回退单记录"
              @back="goBackOr('/packages/docs/returns/index')"
            />

            <DetailHero
              :title="detail.name"
              :subtitle="`${detail.status_label} · ${formatDate(detail.processed_date)}`"
              :pdf-url="detail.pdf_url"
              @pdf="openPdfUrl(detail.pdf_url)"
            />

            <view class="detail-grid">
              <DetailInfoCard
                title="退单信息"
                :items="[
                  { label: '来源单据', value: detail.origin || '-' },
                  { label: '作业类型', value: detail.operation_type || '-' },
                  { label: '处理日期', value: formatDate(detail.processed_date) }
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
              <button class="secondary-button inline-button" :disabled="!detail.sale_order" @tap="detail.sale_order && openOrderDetail(detail.sale_order.id)">来源销售单</button>
              <button class="secondary-button inline-button" :disabled="!detail.source_delivery" @tap="detail.source_delivery && openDeliveryDetail(detail.source_delivery.id)">关联出库单</button>
            </view>
          </view>
        </view>
      </template>
      <EmptyState v-else-if="loading" title="正在加载退单详情" />
      <EmptyState v-else :title="errorMessage || '暂时没有退单详情'" />
    </scroll-view>

    <BottomNav current="orders" />
  </view>
</template>

<style scoped lang="scss">
@use "../../../styles/mixins/page-layout.scss" as pageLayout;

@include pageLayout.document-detail-layout(true);
@include pageLayout.detail-sidebar-card;
</style>
