<script setup lang="ts">
import BottomNav from "../../components/BottomNav.vue"
import { getOrders, getOrdersTotal } from "../../api/order"
import { usePaginatedList } from "../../composables/usePaginatedList"
import { useSessionGuard } from "../../composables/useSessionGuard"
import DocumentCard from "../../components/DocumentCard.vue"
import EmptyState from "../../components/EmptyState.vue"
import PageContextBar from "../../components/PageContextBar.vue"
import { formatDate } from "../../utils/date"
import { formatMoney } from "../../utils/money"
import { openOrderDetail, openReturnsPage, openRootPage } from "../../utils/navigation"

const { items, page, pagination, loading, pageText, hasPrevPage, hasNextPage, loadData, nextPage, prevPage } =
  usePaginatedList((pageNumber, pageSize) => getOrders(pageNumber, pageSize, false), {
    emptyErrorMessage: "加载失败",
    selectItems: (data) => data.items,
    selectHasNext: (data) => data.has_next,
    selectTotalPending: (data) => Boolean(data.total_pending),
    fetchTotal: async () => {
      const response = await getOrdersTotal()
      return response.data.total || 0
    },
  })

useSessionGuard(loadData)
</script>

<template>
  <view class="page-shell page-shell--with-nav">
    <scroll-view scroll-y class="page-shell__content">
      <PageContextBar current-label="销售单" parent-label="工作台" back-label="返回工作台" @back="openRootPage('home')" />

      <view class="page-header">
        <view class="page-header__text page-heading">
          <text class="page-title">销售单</text>
          <text class="page-subtitle">查看订单状态、出库进度和退单记录。</text>
        </view>

        <view v-if="pagination" class="page-toolbar">
          <view class="page-toolbar__meta">
            <text>{{ pageText }}</text>
          </view>
          <view class="page-toolbar__actions">
            <button class="secondary-button toolbar-button" @tap="openReturnsPage">退单记录</button>
            <button class="secondary-button toolbar-button" :disabled="!hasPrevPage" @tap="prevPage">上一页</button>
            <button class="primary-button toolbar-button" :disabled="!hasNextPage" @tap="nextPage">下一页</button>
          </view>
        </view>
      </view>

      <view class="section">
        <view v-if="pagination" class="list-meta">
          <text>{{ pageText }}</text>
        </view>

        <view v-if="items.length" class="list-stack">
          <DocumentCard
            v-for="item in items"
            :key="item.id"
            :title="item.name"
            :subtitle="item.client_order_ref || '未填写客户参考'"
            :meta="formatDate(item.date_order)"
            :amount="formatMoney(item.amount_total, item.currency)"
            :status="item.status_label"
            @click="openOrderDetail(item.id)"
          />
        </view>
        <EmptyState v-else-if="!loading" title="暂时没有销售单" />
      </view>

      <view v-if="pagination" class="pager-row">
        <button class="secondary-button pager-button" :disabled="!hasPrevPage" @tap="prevPage">上一页</button>
        <button class="secondary-button pager-button pager-button--mobile-only" @tap="openReturnsPage">退单记录</button>
        <button class="secondary-button pager-button" :disabled="!hasNextPage" @tap="nextPage">下一页</button>
      </view>
    </scroll-view>

    <BottomNav current="orders" />
  </view>
</template>

<style scoped lang="scss">
@use "../../styles/mixins/page-layout.scss" as pageLayout;

@include pageLayout.document-list-page;

.pager-button {
  margin: 0;
  flex: 1;
  border: none;
}

.pager-button--mobile-only {
  display: inline-flex;
}

@media (min-width: 1024px) {
  .pager-button--mobile-only {
    display: none;
  }
}
</style>
