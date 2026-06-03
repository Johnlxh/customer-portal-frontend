<script setup lang="ts">
import { getReturns, getReturnsTotal } from "../../../api/return"
import { usePaginatedList } from "../../../composables/usePaginatedList"
import { useSessionGuard } from "../../../composables/useSessionGuard"
import BottomNav from "../../../components/BottomNav.vue"
import DocumentCard from "../../../components/DocumentCard.vue"
import EmptyState from "../../../components/EmptyState.vue"
import PageContextBar from "../../../components/PageContextBar.vue"
import { formatDate } from "../../../utils/date"
import { openReturnDetail } from "../../../utils/navigation"

const { items, page, pagination, loading, pageText, hasPrevPage, hasNextPage, loadData, nextPage, prevPage } =
  usePaginatedList((pageNumber, pageSize) => getReturns(pageNumber, pageSize, false), {
    emptyErrorMessage: "加载失败",
    selectItems: (data) => data.items,
    selectHasNext: (data) => data.has_next,
    selectTotalPending: (data) => Boolean(data.total_pending),
    fetchTotal: async () => {
      const response = await getReturnsTotal()
      return response.data.total || 0
    },
  })

function goBackOrders() {
  uni.switchTab({ url: "/pages/orders/index" })
}

useSessionGuard(loadData)
</script>

<template>
  <view class="page-shell page-shell--with-nav">
    <scroll-view scroll-y class="page-shell__content">
      <PageContextBar
        current-label="退单记录"
        parent-label="销售单"
        back-label="返回销售单"
        @back="goBackOrders"
      />

      <view class="page-header">
        <view class="page-header__text page-heading">
          <text class="page-title">退单记录</text>
          <text class="page-subtitle">查看退单状态、处理结果和关联单据。</text>
        </view>

        <view v-if="pagination" class="page-toolbar">
          <view class="page-toolbar__meta">
            <text>{{ pageText }}</text>
          </view>
          <view class="page-toolbar__actions">
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
            :meta="formatDate(item.date)"
            :status="item.status_label"
            @click="openReturnDetail(item.id)"
          />
        </view>
        <EmptyState v-else-if="!loading" title="暂时没有退单记录" />
      </view>

      <view v-if="pagination" class="pager-row">
        <button class="secondary-button pager-button" :disabled="!hasPrevPage" @tap="prevPage">上一页</button>
        <button class="secondary-button pager-button" :disabled="!hasNextPage" @tap="nextPage">下一页</button>
      </view>
    </scroll-view>

    <BottomNav current="orders" />
  </view>
</template>

<style scoped lang="scss">
@use "../../../styles/mixins/page-layout.scss" as pageLayout;

@include pageLayout.document-list-page;
</style>
