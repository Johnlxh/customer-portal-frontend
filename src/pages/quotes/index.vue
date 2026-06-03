<script setup lang="ts">
import BottomNav from "../../components/BottomNav.vue"
import { getQuotes, getQuotesTotal } from "../../api/quote"
import { usePaginatedList } from "../../composables/usePaginatedList"
import { useSessionGuard } from "../../composables/useSessionGuard"
import DocumentCard from "../../components/DocumentCard.vue"
import EmptyState from "../../components/EmptyState.vue"
import PageContextBar from "../../components/PageContextBar.vue"
import { formatDate } from "../../utils/date"
import { formatMoney } from "../../utils/money"
import { openQuoteDetail, openRootPage } from "../../utils/navigation"

const { items, page, pagination, loading, pageText, hasPrevPage, hasNextPage, loadData, nextPage, prevPage } =
  usePaginatedList((pageNumber, pageSize) => getQuotes(pageNumber, pageSize, false), {
    emptyErrorMessage: "加载失败",
    selectItems: (data) => data.items,
    selectHasNext: (data) => data.has_next,
    selectTotalPending: (data) => Boolean(data.total_pending),
    fetchTotal: async () => {
      const response = await getQuotesTotal()
      return response.data.total || 0
    },
  })

useSessionGuard(loadData)
</script>

<template>
  <view class="page-shell page-shell--with-nav">
    <scroll-view scroll-y class="page-shell__content">
      <PageContextBar current-label="报价单" parent-label="工作台" back-label="返回工作台" @back="openRootPage('home')" />

      <view class="page-header">
        <view class="page-header__text page-heading">
          <text class="page-title">报价单</text>
          <text class="page-subtitle">查看报价状态、有效期和待处理单据。</text>
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
            :subtitle="item.client_order_ref || '未填写客户参考'"
            :helper="`有效期 ${formatDate(item.validity_date)}`"
            :amount="formatMoney(item.amount_total, item.currency)"
            :status="item.status_label"
            @click="openQuoteDetail(item.id)"
          />
        </view>
        <EmptyState v-else-if="!loading" title="暂时没有报价单" />
      </view>

      <view v-if="pagination" class="pager-row">
        <button class="secondary-button pager-button" :disabled="!hasPrevPage" @tap="prevPage">上一页</button>
        <button class="secondary-button pager-button" :disabled="!hasNextPage" @tap="nextPage">下一页</button>
      </view>
    </scroll-view>

    <BottomNav current="quotes" />
  </view>
</template>

<style scoped lang="scss">
@use "../../styles/mixins/page-layout.scss" as pageLayout;

@include pageLayout.document-list-page;
</style>
