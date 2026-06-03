<script setup lang="ts">
import { computed } from "vue"

import BottomNav from "../../components/BottomNav.vue"
import DocumentCard from "../../components/DocumentCard.vue"
import EmptyState from "../../components/EmptyState.vue"
import PageContextBar from "../../components/PageContextBar.vue"
import StatCard from "../../components/StatCard.vue"
import { useAuthStore } from "../../stores/auth"
import { useCartStore } from "../../stores/cart"
import { useDashboardStore } from "../../stores/dashboard"
import { useSessionGuard } from "../../composables/useSessionGuard"
import { formatDate } from "../../utils/date"
import { formatMoney } from "../../utils/money"
import { openCartPage, openOrderDetail, openQuoteDetail, openReturnDetail, openReturnsPage, openRootPage } from "../../utils/navigation"

const authStore = useAuthStore()
const cartStore = useCartStore()
const dashboardStore = useDashboardStore()

const counts = computed(() => dashboardStore.payload?.counts)
const countsPending = computed(() => dashboardStore.countsLoading || dashboardStore.payload?.counts_pending)
const recentOrders = computed(() => dashboardStore.payload?.recent_orders || [])
const recentQuotes = computed(() => dashboardStore.payload?.recent_quotes || [])
const recentReturns = computed(() => dashboardStore.payload?.recent_returns || [])
const heroCompany = computed(() => authStore.company?.name || "客户门户")
const heroMeta = computed(() => {
  const account = authStore.user?.name || "Portal 演示账号"
  const phone = authStore.contact?.phone || "未设置联系电话"
  return `${account} · ${phone}`
})
const cartQuickDesc = computed(() =>
  cartStore.lineCount
    ? `当前 ${cartStore.lineCount} 行待确认，点击继续生成报价单`
    : "确认数量与价格，生成官方报价单",
)

useSessionGuard(async () => {
  await dashboardStore.refresh()
  void cartStore.refresh().catch(() => {})
})

function goRoot(page: "stock" | "orders" | "quotes") {
  openRootPage(page)
}
</script>

<template>
  <view class="page-shell page-shell--with-nav">
    <scroll-view scroll-y class="page-shell__content">
      <PageContextBar current-label="工作台" />

      <view class="page-topbar">
        <view class="page-topbar__copy">
          <text class="page-title">工作台</text>
        </view>
        <view class="page-topbar__meta card">
          <text>已登录</text>
        </view>
      </view>

      <view class="home-hero card">
        <view class="home-hero__main">
          <text class="home-hero__title">{{ heroCompany }}</text>
          <text class="home-hero__desc">{{ heroMeta }}</text>
        </view>
        <view class="home-hero__side">
          <view class="home-hero__cta" @tap="goRoot('stock')">
            <text>进入库存查询</text>
          </view>
        </view>
      </view>

      <view class="stats-grid">
        <StatCard
          title="销售单"
          :value="countsPending ? '--' : (counts?.orders || 0)"
          :helper="countsPending ? '正在统计中...' : '已确认与已完成'"
          clickable
          @click="goRoot('orders')"
        />
        <StatCard
          title="报价单"
          :value="countsPending ? '--' : (counts?.quotes || 0)"
          :helper="countsPending ? '正在统计中...' : '待确认与已取消'"
          clickable
          @click="goRoot('quotes')"
        />
        <StatCard
          title="退单记录"
          :value="countsPending ? '--' : (counts?.returns || 0)"
          :helper="countsPending ? '正在统计中...' : '已处理完成或已取消'"
          clickable
          @click="openReturnsPage"
        />
      </view>

      <view class="home-dashboard">
        <view class="home-main">
          <view class="section">
            <text class="section-title">最近销售单</text>
            <view v-if="recentOrders.length" class="list-stack">
              <DocumentCard
                v-for="item in recentOrders"
                :key="item.id"
                :title="item.name"
                :subtitle="item.client_order_ref || '未填写客户参考'"
                :meta="formatDate(item.date_order)"
                :amount="formatMoney(item.amount_total, item.currency)"
                :status="item.status_label"
                @click="openOrderDetail(item.id)"
              />
            </view>
            <EmptyState v-else title="暂时没有销售单" />
          </view>

          <view class="section">
            <text class="section-title">最近报价单</text>
            <view v-if="recentQuotes.length" class="list-stack">
              <DocumentCard
                v-for="item in recentQuotes"
                :key="item.id"
                :title="item.name"
                :subtitle="item.client_order_ref || '未填写客户参考'"
                :helper="`有效期 ${formatDate(item.validity_date)}`"
                :amount="formatMoney(item.amount_total, item.currency)"
                :status="item.status_label"
                @click="openQuoteDetail(item.id)"
              />
            </view>
            <EmptyState v-else title="暂时没有报价单" />
          </view>
        </view>

        <view class="home-side">
          <view class="section">
            <text class="section-title">快捷入口</text>
            <view class="quick-grid">
              <view class="quick-item card" @tap="goRoot('stock')">
                <text class="quick-item__title">库存查询</text>
                <text class="quick-item__desc">按编码或型号快速查库存</text>
              </view>
              <view class="quick-item card" @tap="openCartPage">
                <text class="quick-item__title">购物车</text>
                <text class="quick-item__desc">{{ cartQuickDesc }}</text>
              </view>
              <view class="quick-item card" @tap="goRoot('orders')">
                <text class="quick-item__title">销售单</text>
                <text class="quick-item__desc">查看订单、出库单和退单关联</text>
              </view>
              <view class="quick-item card" @tap="goRoot('quotes')">
                <text class="quick-item__title">报价单</text>
                <text class="quick-item__desc">跟进待确认报价</text>
              </view>
              <view class="quick-item card" @tap="openReturnsPage">
                <text class="quick-item__title">退单记录</text>
                <text class="quick-item__desc">查看已处理退单</text>
              </view>
            </view>
          </view>

          <view class="section section--compact">
            <text class="section-title">最近退单</text>
            <view v-if="recentReturns.length" class="list-stack">
              <DocumentCard
                v-for="item in recentReturns"
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
    </scroll-view>

    <BottomNav current="home" />
  </view>
</template>

<style scoped lang="scss">
.page-topbar {
  display: flex;
  flex-direction: column;
  gap: 18rpx;
  margin-top: 24rpx;
}

.page-topbar__copy {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.page-topbar__meta {
  display: inline-flex;
  width: fit-content;
  align-items: center;
  padding: 16rpx 20rpx;
  border-radius: 16rpx;
  font-size: 22rpx;
  font-weight: 700;
  color: var(--portal-text);
}

.home-hero {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  padding: 28rpx;
  margin-top: 24rpx;
  border: 1px solid var(--portal-border);
  box-shadow: var(--portal-shadow);
}

.home-hero__main {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.home-hero__title {
  font-size: 42rpx;
  font-weight: 800;
  line-height: 1.18;
  color: var(--portal-text);
}

.home-hero__desc {
  font-size: 24rpx;
  line-height: 1.5;
  color: var(--portal-text-muted);
}

.home-hero__side {
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.home-hero__cta {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 88rpx;
  padding: 0 24rpx;
  border-radius: 16rpx;
  background: var(--portal-primary);
  color: #fff;
  font-size: 24rpx;
  font-weight: 800;
}

.home-hero__cta:active {
  background: var(--portal-primary-hover);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18rpx;
  margin-top: 24rpx;
}

.home-dashboard {
  display: flex;
  flex-direction: column;
}

.section {
  margin-top: 28rpx;
}

.section--compact {
  margin-top: 20rpx;
}

.quick-grid,
.list-stack {
  display: flex;
  flex-direction: column;
  gap: 18rpx;
}

.quick-item {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
  padding: 24rpx;
}

.quick-item__title {
  font-size: 30rpx;
  font-weight: 700;
  color: var(--portal-text);
}

.quick-item__desc {
  font-size: 24rpx;
  line-height: 1.5;
  color: var(--portal-text-muted);
}

@media (min-width: 1024px) {
  .page-topbar {
    flex-direction: row;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    margin-top: 0;
  }

  .page-topbar__copy {
    max-width: 760px;
  }

  .page-topbar__meta {
    flex-shrink: 0;
    min-height: 42px;
    padding: 0 16px;
    border-radius: 10px;
    font-size: 12px;
  }

  .home-hero {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 220px;
    gap: 18px;
    align-items: center;
    padding: 22px 24px;
    margin-top: 18px;
    border: 1px solid var(--portal-border);
    box-shadow: var(--portal-shadow);
  }

  .home-hero__main {
    gap: 8px;
  }

  .home-hero__title {
    font-size: 28px;
    letter-spacing: -0.8px;
  }

  .home-hero__desc {
    font-size: 14px;
  }

  .home-hero__cta {
    min-height: 48px;
    padding: 0 16px;
    border-radius: 10px;
    font-size: 12px;
  }

  .stats-grid {
    gap: 18px;
    margin-top: 18px;
  }

  .home-dashboard {
    display: grid;
    grid-template-columns: minmax(0, 1.55fr) minmax(360px, 0.95fr);
    gap: 26px;
    align-items: start;
  }

  .section {
    margin-top: 24px;
  }

  .section--compact {
    margin-top: 24px;
  }

  .quick-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
  }

  .list-stack {
    gap: 14px;
  }

  .quick-item {
    gap: 8px;
    min-height: 132px;
    padding: 20px;
    cursor: pointer;
    transition: transform 0.18s ease, box-shadow 0.18s ease;
  }

  .quick-item:hover {
    transform: translateY(-2px);
    box-shadow: 0 18px 42px rgba(25, 33, 46, 0.08);
  }

  .quick-item__title {
    font-size: 18px;
  }

  .quick-item__desc {
    font-size: 14px;
  }
}
</style>
