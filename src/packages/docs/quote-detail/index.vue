<script setup lang="ts">
import { computed } from "vue"
import { onLoad } from "@dcloudio/uni-app"

import { getQuoteDetail } from "../../../api/quote"
import { useDetailLoader } from "../../../composables/useDetailLoader"
import BottomNav from "../../../components/BottomNav.vue"
import DetailHero from "../../../components/DetailHero.vue"
import DetailInfoCard from "../../../components/DetailInfoCard.vue"
import DetailLineList from "../../../components/DetailLineList.vue"
import EmptyState from "../../../components/EmptyState.vue"
import PageContextBar from "../../../components/PageContextBar.vue"
import type { SaleOrderDetail } from "../../../types/api"
import { formatDate } from "../../../utils/date"
import { formatMoney } from "../../../utils/money"
import { openPdfUrl } from "../../../utils/platform"
import { goBackOr } from "../../../utils/navigation"

const { detail, loading, errorMessage, loadDetail } = useDetailLoader<SaleOrderDetail>(getQuoteDetail)
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
          <view class="detail-main">
            <PageContextBar
              current-label="报价单详情"
              parent-label="报价单"
              back-label="返回报价单"
              @back="goBackOr('/pages/quotes/index')"
            />

            <DetailHero
              :title="detail.name"
              :subtitle="`有效期 ${formatDate(detail.validity_date)}`"
              :pdf-url="detail.pdf_url"
              @pdf="openPdfUrl(detail.pdf_url)"
            />

            <view class="detail-grid">
              <DetailInfoCard
                title="报价信息"
                :items="[
                  { label: '状态', value: detail.status_label },
                  { label: '客户参考', value: detail.client_order_ref || '-' },
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
        </view>
      </template>
      <EmptyState v-else-if="loading" title="正在加载报价单详情" />
      <EmptyState v-else :title="errorMessage || '暂时没有报价单详情'" />
    </scroll-view>

    <BottomNav current="quotes" />
  </view>
</template>

<style scoped lang="scss">
@use "../../../styles/mixins/page-layout.scss" as pageLayout;

@include pageLayout.document-detail-layout(false);
</style>
