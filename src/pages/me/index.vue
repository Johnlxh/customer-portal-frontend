<script setup lang="ts">
import * as authApi from "../../api/auth"
import BottomNav from "../../components/BottomNav.vue"
import PageContextBar from "../../components/PageContextBar.vue"
import { AUTH_PLATFORMS } from "../../constants/app"
import { useSessionGuard } from "../../composables/useSessionGuard"
import { useAuthStore } from "../../stores/auth"
import { openPcScanPage, openReturnsPage, openRootPage } from "../../utils/navigation"
import { showErrorToast, showSuccessToast, showToast } from "../../utils/toast"

const authStore = useAuthStore()

useSessionGuard()

async function scanPcLoginQr() {
  uni.scanCode({
    success: async (result) => {
      try {
        await authApi.confirmPcQrSession(result.result, AUTH_PLATFORMS.mpWeixin)
        showSuccessToast("电脑端登录已确认")
      } catch (error) {
        showErrorToast(error, "扫码确认失败")
      }
    },
    fail: () => {
      showToast("扫码已取消")
    }
  })
}

</script>

<template>
  <view class="page-shell page-shell--with-nav">
    <scroll-view scroll-y class="page-shell__content page-shell__content--me">
      <PageContextBar current-label="我的" parent-label="工作台" back-label="返回工作台" @back="openRootPage('home')" />

      <view class="page-header">
        <view class="page-header__text page-heading">
          <text class="page-title">我的</text>
          <text class="page-subtitle">查看账号资料、企业信息和常用操作。</text>
        </view>
        <view class="action-stack action-stack--header">
          <!-- #ifdef MP-WEIXIN -->
          <button class="secondary-button action-btn" @tap="scanPcLoginQr">扫码登录 PC</button>
          <button class="primary-button action-btn action-btn--danger" @tap="authStore.logout()">退出登录并返回</button>
          <!-- #endif -->
          <!-- #ifndef MP-WEIXIN -->
          <button class="primary-button action-btn action-btn--danger" @tap="authStore.logout()">退出登录</button>
          <!-- #endif -->
        </view>
      </view>

      <!-- #ifdef MP-WEIXIN -->
      <view class="card alert-card">
        <view class="alert-card__icon"></view>
        <text class="alert-card__text">当前会复用上次成功登录的小程序会话。若要重新测试微信登录或手机号绑定，请先退出登录并返回登录页。</text>
      </view>
      <!-- #endif -->

      <view class="dashboard-grid">
        <!-- User Identity Card -->
        <view class="card info-card">
          <text class="info-card__title">账号信息</text>
          <view class="info-card__content">
            <view class="info-row">
              <text class="field-label">账号登录名</text>
              <text class="field-value">{{ authStore.user?.login || "-" }}</text>
            </view>
            <view class="info-row">
              <text class="field-label">姓名</text>
              <text class="field-value">{{ authStore.user?.name || "-" }}</text>
            </view>
          </view>
        </view>

        <!-- Company Info Card -->
        <view class="card info-card">
          <text class="info-card__title">企业与联系方式</text>
          <view class="info-card__content">
            <view class="info-row">
              <text class="field-label">企业名称</text>
              <text class="field-value">{{ authStore.company?.name || "-" }}</text>
            </view>
            <view class="info-row">
              <text class="field-label">联系电话</text>
              <text class="field-value">{{ authStore.contact?.phone || "-" }}</text>
            </view>
            <view class="info-row info-row--full">
              <text class="field-label">联系地址</text>
              <text class="field-value field-value--address">{{ authStore.contact?.address || "-" }}</text>
            </view>
          </view>
        </view>

        <!-- Shortcut Links Card -->
        <view class="card info-card info-card--shortcuts">
          <text class="info-card__title">常用功能</text>
          <view class="shortcut-list">
            <view class="shortcut-item" @tap="openPcScanPage()">
              <text class="shortcut-item__text">电脑扫码</text>
              <text class="shortcut-item__arrow">></text>
            </view>
            <view class="shortcut-item" @tap="openReturnsPage">
              <text class="shortcut-item__text">退单记录</text>
              <text class="shortcut-item__arrow">></text>
            </view>
          </view>
        </view>
      </view>

      <!-- Mobile fallback button stack if screen is too narrow to put them in header -->
      <view class="action-stack action-stack--mobile">
        <button class="secondary-button action-btn" @tap="openPcScanPage()">电脑扫码</button>
        <button class="secondary-button action-btn" @tap="openReturnsPage">退单记录</button>
        <!-- #ifdef MP-WEIXIN -->
        <button class="secondary-button action-btn" @tap="scanPcLoginQr">扫码登录PC</button>
        <button class="primary-button action-btn action-btn--danger" @tap="authStore.logout()">退出登录并返回</button>
        <!-- #endif -->
        <!-- #ifndef MP-WEIXIN -->
        <button class="primary-button action-btn action-btn--danger" @tap="authStore.logout()">退出登录</button>
        <!-- #endif -->
      </view>
    </scroll-view>

    <BottomNav current="me" />
  </view>
</template>

<style scoped lang="scss">
.page-header {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.page-header__text {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12rpx;
}

.dashboard-grid {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
  margin-top: 24rpx;
}

.info-card {
  padding: 28rpx 24rpx;
  display: flex;
  flex-direction: column;
}

.info-card__title {
  font-size: 30rpx;
  font-weight: 700;
  color: var(--portal-text);
  margin-bottom: 16rpx;
}

.info-card__content {
  display: flex;
  flex-direction: column;
  gap: 14rpx;
}

.info-row {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  padding: 18rpx 20rpx;
  border-radius: 16rpx;
  background: var(--portal-surface-muted);
}

.alert-card {
  margin-top: 20rpx;
  padding: 22rpx 24rpx;
  background: #eef4ff;
  border-color: var(--portal-border-strong);
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
}

.alert-card__icon {
  width: 12rpx;
  height: 12rpx;
  background: var(--portal-primary);
  border-radius: 50%;
  margin-top: 12rpx;
  flex-shrink: 0;
}

.alert-card__text {
  color: var(--portal-text);
  font-size: 24rpx;
  line-height: 1.6;
}

.shortcut-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.shortcut-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 22rpx 20rpx;
  background: var(--portal-surface-muted);
  border-radius: 16rpx;
  transition: all 0.2s;
  cursor: pointer;
}

.shortcut-item:active {
  background: var(--portal-primary-tint);
}

.shortcut-item__text {
  font-size: 26rpx;
  font-weight: 700;
  color: var(--portal-text);
}

.shortcut-item__arrow {
  font-size: 22rpx;
  font-weight: 700;
  color: var(--portal-primary);
}

.action-stack {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  margin-top: 32rpx;
}

.action-stack--header {
  display: none;
}

.action-btn {
  margin: 0;
}

.action-btn--danger {
  background: #fff5f5;
  color: var(--portal-danger);
  border: 1px solid #f1b7b7;
  box-shadow: none;
}

.action-btn--danger:active {
  background: #fdecec;
}

@media (min-width: 1024px) {
  .page-header {
    flex-direction: row;
    align-items: flex-end;
    justify-content: space-between;
    gap: 16px;
  }

  .page-header__text {
    gap: 10px;
  }

  .action-stack--mobile {
    display: none;
  }

  .action-stack--header {
    display: flex;
    flex-direction: row;
    margin-top: 0;
  }
  
  .dashboard-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 18px;
    margin-top: 18px;
  }

  .info-card {
    padding: 18px;
  }
  
  .info-card--shortcuts {
    grid-column: auto;
  }

  .info-card__title {
    margin-bottom: 12px;
    font-size: 20px;
  }

  .info-card__content {
    gap: 10px;
  }

  .info-row {
    min-width: 0;
    gap: 6px;
    padding: 14px 16px;
    border-radius: 10px;
  }
  
  .info-row--full {
    flex: 1 1 100%;
  }

  .shortcut-list {
    flex-direction: column;
  }

  .shortcut-item {
    padding: 14px 16px;
    border-radius: 10px;
  }
  
  .shortcut-item:hover {
    background: var(--portal-primary-soft);
    transform: none;
  }
  
  .shortcut-item:hover .shortcut-item__text,
  .shortcut-item:hover .shortcut-item__arrow {
    color: var(--portal-primary);
  }

  .shortcut-item__text {
    font-size: 13px;
  }

  .shortcut-item__arrow {
    font-size: 12px;
  }
}
</style>
