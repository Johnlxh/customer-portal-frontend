<script setup lang="ts">
import { computed, onMounted } from "vue"

import { useAuthStore } from "../stores/auth"
import { useCartStore } from "../stores/cart"
import type { RootPageKey } from "../utils/navigation"
import { openCartPage, openRootPage } from "../utils/navigation"

type NavKey = RootPageKey | "cart"

const props = defineProps<{
  current: NavKey
}>()

const authStore = useAuthStore()
const cartStore = useCartStore()

const items: Array<{ key: NavKey; label: string; desktopOnly?: boolean }> = [
  { key: "home", label: "首页" },
  { key: "stock", label: "库存" },
  { key: "cart", label: "购物车", desktopOnly: true },
  { key: "orders", label: "销售单" },
  { key: "quotes", label: "报价单" },
  { key: "me", label: "我的" },
]

const cartBadgeLabel = computed(() => {
  if (!cartStore.lineCount) {
    return ""
  }
  return cartStore.lineCount > 99 ? "99+" : String(cartStore.lineCount)
})

onMounted(() => {
  if (authStore.isLoggedIn && !cartStore.ready) {
    void cartStore.refresh().catch(() => {})
  }
})

function navigate(page: NavKey) {
  if (page === props.current) {
    return
  }
  if (page === "cart") {
    openCartPage()
    return
  }
  openRootPage(page)
}
</script>

<template>
  <!-- #ifndef MP-WEIXIN -->
  <view class="bottom-nav card">
    <view class="bottom-nav__brand">
      <view class="bottom-nav__brand-lockup">
        <view class="bottom-nav__brand-badge">IS</view>
        <view class="bottom-nav__brand-copy">
          <text class="bottom-nav__brand-title">工业超人</text>
          <text class="bottom-nav__brand-subtitle">客户门户</text>
        </view>
      </view>
    </view>
    <view
      v-for="item in items"
      :key="item.key"
      class="bottom-nav__item"
      :class="{
        'bottom-nav__item--desktop-only': item.desktopOnly,
        'is-active': item.key === current,
      }"
      @tap="navigate(item.key)"
    >
      <text class="bottom-nav__label">{{ item.label }}</text>
      <view
        v-if="item.key === 'cart' && cartBadgeLabel"
        class="bottom-nav__badge"
      >
        <text class="bottom-nav__badge-label">{{ cartBadgeLabel }}</text>
      </view>
    </view>
  </view>
  <!-- #endif -->
</template>

<style scoped lang="scss">
.bottom-nav {
  margin: 0 24rpx 24rpx;
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  padding: 10rpx;
  padding-bottom: calc(10rpx + env(safe-area-inset-bottom, 0px));
  min-height: 108rpx;
  flex-shrink: 0;
}

.bottom-nav__brand {
  display: none;
}

.bottom-nav__item {
  display: flex;
  position: relative;
  min-height: 88rpx;
  align-items: center;
  justify-content: center;
  border-radius: 18rpx;
}

.bottom-nav__item--desktop-only {
  display: none;
}

.bottom-nav__label {
  font-size: 24rpx;
  font-weight: 600;
  color: var(--portal-text-muted);
}

.bottom-nav__badge {
  position: absolute;
  top: 14rpx;
  right: 18rpx;
  display: inline-flex;
  min-width: 34rpx;
  height: 34rpx;
  padding: 0 10rpx;
  align-items: center;
  justify-content: center;
  border-radius: 999rpx;
  background: #d44949;
  box-shadow: 0 10rpx 18rpx -14rpx rgba(212, 73, 73, 0.7);
}

.bottom-nav__badge-label {
  font-size: 20rpx;
  font-weight: 800;
  line-height: 1;
  color: #ffffff;
}

.is-active {
  background: var(--portal-primary-soft);
}

.is-active .bottom-nav__label {
  color: var(--portal-primary);
}

@media (min-width: 1024px) {
  .bottom-nav.card {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    width: 248px;
    margin: 0;
    grid-template-columns: 1fr;
    align-content: start;
    gap: 10px;
    padding: 28px 20px;
    min-height: 100vh;
    border-radius: 0;
    box-shadow: none;
    border: none;
    background: var(--portal-panel);
    z-index: 100;
  }

  .bottom-nav__brand {
    display: flex;
    padding: 6px 8px 22px;
    margin-bottom: 8px;
  }

  .bottom-nav__brand-lockup {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .bottom-nav__brand-badge {
    display: flex;
    width: 42px;
    height: 42px;
    align-items: center;
    justify-content: center;
    border-radius: 12px;
    background: var(--portal-primary);
    color: #fff;
    font-size: 15px;
    font-weight: 800;
    letter-spacing: 0.08em;
  }

  .bottom-nav__brand-title {
    font-size: 21px;
    font-weight: 700;
    color: #f7faff;
  }

  .bottom-nav__brand-copy {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .bottom-nav__brand-subtitle {
    font-size: 14px;
    font-weight: 700;
    color: #a8bce0;
  }

  .bottom-nav__item {
    justify-content: flex-start;
    padding: 0 18px;
    min-height: 52px;
    cursor: pointer;
    transition: all 0.2s ease;
    border-radius: 12px;
    border: 1px solid rgba(158, 180, 216, 0.14);
    background: rgba(255, 255, 255, 0.04);
  }

  .bottom-nav__item--desktop-only {
    display: flex;
  }

  .bottom-nav__item:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(158, 180, 216, 0.28);
    transform: none;
  }

  .bottom-nav__item.is-active {
    background: var(--portal-primary);
    border-color: transparent;
  }

  .bottom-nav__label {
    font-size: 15px;
    font-weight: 700;
    color: #e4ecfa;
  }

  .bottom-nav__badge {
    top: 8px;
    right: 10px;
    min-width: 22px;
    height: 22px;
    padding: 0 7px;
    box-shadow: 0 10px 22px -18px rgba(212, 73, 73, 0.8);
  }

  .bottom-nav__badge-label {
    font-size: 11px;
  }

  .bottom-nav__item.is-active .bottom-nav__label {
    color: #ffffff;
  }
}
</style>
