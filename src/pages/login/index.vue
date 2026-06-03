<script setup lang="ts">
import { useLoginPage } from "../../features/auth/useLoginPage"

const {
  loginName,
  password,
  loading,
  wechatLoading,
  phoneLoading,
  miniConfigReady,
  webLoginMode,
  pcQrVisible,
  pcQrLoading,
  pcQrImage,
  pcQrStatus,
  submit,
  startWechatLogin,
  startPcQrLogin,
  handleMiniWechatAuth,
  closePcQrDialog,
  getH5WechatHint,
} = useLoginPage()
</script>

<template>
  <view class="login-page">
    <view class="login-container">
      <!-- #ifndef MP-WEIXIN -->
      <view class="login-hero">
        <view class="login-hero__content">
          <view class="login-hero__brand">
            <view class="login-hero__logo"></view>
            <text class="login-hero__brand-name">工业超人</text>
          </view>
          <text class="login-hero__title">开启智能工业新视界</text>
          <text class="login-hero__subtitle">专业的工业品采购平台，为您提供高效、便捷的供应链服务体验。</text>
        </view>
        <view class="login-hero__shape login-hero__shape--1"></view>
        <view class="login-hero__shape login-hero__shape--2"></view>
      </view>
      <!-- #endif -->

      <view class="login-card">
        <text class="login-card__brand">Somro</text>
        <view class="login-card__header">
          <text class="login-card__title">客户门户</text>
        </view>
        <!-- #ifdef MP-WEIXIN -->
        <text class="login-card__subtitle">测试阶段可直接用账号密码登录；如需验证正式链路，也可以继续用微信一键登录。</text>
        <!-- #endif -->
        <!-- #ifndef MP-WEIXIN -->
        <text class="login-card__subtitle">欢迎回来，请登录您的工作台</text>
        <!-- #endif -->

        <view class="login-card__form">
          <view class="login-input-wrapper">
            <input v-model="loginName" class="login-input" placeholder="请输入账号" />
          </view>
          <view class="login-input-wrapper">
            <input v-model="password" class="login-input" password placeholder="请输入密码" />
          </view>
        </view>

        <!-- #ifdef MP-WEIXIN -->
        <button class="login-button" :loading="loading" @tap="submit">账号登录</button>
        <view class="login-card__divider">
          <view class="login-card__divider-line"></view>
          <text class="login-card__divider-text">或使用微信能力</text>
          <view class="login-card__divider-line"></view>
        </view>
        <button
          class="login-button login-button--bind"
          :loading="phoneLoading || wechatLoading"
          open-type="getPhoneNumber"
          @getphonenumber="handleMiniWechatAuth"
        >
          微信一键登录
        </button>
        <text class="login-card__hint">账号登录适合真机联调业务功能；微信一键登录继续用于验证绑定与微信能力。</text>
        <!-- #endif -->

        <!-- #ifndef MP-WEIXIN -->
        <button class="login-button" :loading="loading" @tap="submit">登 录</button>
        <view class="login-card__divider">
          <view class="login-card__divider-line"></view>
          <text class="login-card__divider-text">其他登录方式</text>
          <view class="login-card__divider-line"></view>
        </view>
        <view class="login-other-methods">
          <button
            v-if="miniConfigReady"
            class="login-action-btn login-action-btn--primary"
            :loading="pcQrLoading"
            @tap="startPcQrLogin"
          >
            小程序扫码
          </button>
          <button
            v-if="webLoginMode === 'real'"
            class="login-action-btn login-action-btn--wechat"
            :loading="wechatLoading"
            @tap="startWechatLogin"
          >
            微信扫码
          </button>
        </view>
        <text class="login-card__hint">{{ getH5WechatHint() }}</text>
        <!-- #endif -->
      </view>
    </view>

    <view v-if="pcQrVisible" class="qr-mask" @tap="closePcQrDialog">
      <view class="qr-dialog card" @tap.stop>
        <text class="qr-dialog__title">小程序扫码登录</text>
        <text class="qr-dialog__subtitle">请使用已登录的客户门户小程序扫码，确认后电脑端会自动登录。</text>
        <image v-if="pcQrImage" :src="pcQrImage" class="qr-dialog__image" mode="aspectFit" />
        <text class="qr-dialog__status">{{ pcQrStatus }}</text>
        <button class="secondary-button qr-dialog__button" @tap="closePcQrDialog">返回账号登录</button>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.login-page {
  display: flex;
  min-height: 100vh;
  align-items: center;
  justify-content: center;
  padding: 32rpx;
  background: var(--portal-bg);
}

.login-container {
  position: relative;
  display: flex;
  width: 100%;
  max-width: 1000rpx;
  overflow: hidden;
  border-radius: var(--portal-radius);
  background: var(--portal-surface);
  box-shadow: var(--portal-shadow);
}

.login-hero {
  display: none;
}

.login-card {
  z-index: 2;
  display: flex;
  flex: 1;
  flex-direction: column;
  padding: 60rpx 48rpx;
  background: var(--portal-surface);
}

.login-card__brand {
  display: inline-block;
  margin-bottom: 24rpx;
  font-size: 28rpx;
  font-weight: 800;
  letter-spacing: 2rpx;
  color: var(--portal-primary);
}

.login-card__header {
  display: flex;
  align-items: baseline;
  gap: 16rpx;
  margin-bottom: 8rpx;
}

.login-card__title {
  font-size: 56rpx;
  font-weight: 800;
  letter-spacing: -1rpx;
  color: var(--portal-text);
}

.login-card__subtitle {
  margin-bottom: 48rpx;
  font-size: 28rpx;
  line-height: 1.6;
  color: var(--portal-text-muted);
}

.login-card__form {
  display: flex;
  flex-direction: column;
  gap: 32rpx;
  margin-bottom: 48rpx;
}

.login-input-wrapper {
  position: relative;
}

.login-input {
  height: 104rpx;
  padding: 0 32rpx;
  border: 2rpx solid var(--portal-border);
  border-radius: 16rpx;
  background: var(--portal-surface-muted);
  font-size: 30rpx;
  color: var(--portal-text);
  transition: all 0.2s ease;
}

.login-input:focus {
  border-color: var(--portal-primary);
  background: var(--portal-surface);
  box-shadow: 0 0 0 6rpx var(--portal-primary-soft);
}

.login-button {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 104rpx;
  margin: 0;
  overflow: hidden;
  border: none;
  border-radius: 16rpx;
  background: var(--portal-primary);
  box-shadow: 0 8rpx 24rpx -6rpx rgba(8, 86, 160, 0.4);
  color: #fff;
  font-size: 32rpx;
  font-weight: 700;
  letter-spacing: 4rpx;
  transition: all 0.2s;
}

.login-button:active {
  transform: translateY(2rpx);
}

.login-button--bind {
  margin-bottom: 24rpx;
  background: #0f766e;
  box-shadow: 0 8rpx 24rpx -6rpx rgba(15, 118, 110, 0.4);
}

.login-card__divider {
  display: flex;
  align-items: center;
  gap: 24rpx;
  margin: 48rpx 0;
}

.login-card__divider-line {
  flex: 1;
  height: 1px;
  background: var(--portal-border);
}

.login-card__divider-text {
  font-size: 24rpx;
  color: var(--portal-text-placeholder);
}

.login-other-methods {
  display: flex;
  gap: 24rpx;
}

.login-action-btn {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  height: 88rpx;
  margin: 0;
  border-radius: 16rpx;
  font-size: 28rpx;
  font-weight: 600;
  transition: all 0.2s;
}

.login-action-btn--primary {
  border: 1px solid transparent;
  background: var(--portal-primary-soft);
  color: var(--portal-primary);
}

.login-action-btn--wechat {
  border: 1px solid transparent;
  background: #f0fdf4;
  color: #16a34a;
}

.login-card__hint {
  margin-top: 32rpx;
  font-size: 24rpx;
  line-height: 1.6;
  text-align: center;
  color: var(--portal-text-placeholder);
}

.qr-mask {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32rpx;
  background: var(--portal-bg-mask);
  backdrop-filter: blur(4px);
}

.qr-dialog {
  display: flex;
  width: 100%;
  max-width: 640rpx;
  flex-direction: column;
  align-items: center;
  padding: 48rpx 40rpx;
  text-align: center;
}

.qr-dialog__title {
  margin-bottom: 16rpx;
  font-size: 36rpx;
  font-weight: 800;
  color: var(--portal-text);
}

.qr-dialog__subtitle {
  font-size: 26rpx;
  line-height: 1.6;
  color: var(--portal-text-muted);
}

.qr-dialog__image {
  width: 400rpx;
  height: 400rpx;
  margin: 40rpx 0;
  border-radius: 16rpx;
  background: #fff;
  padding: 24rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.05);
}

.qr-dialog__status {
  margin-bottom: 40rpx;
  font-size: 28rpx;
  font-weight: 500;
  color: var(--portal-primary);
}

.qr-dialog__button {
  width: 100%;
  margin: 0;
}

@media (min-width: 1024px) {
  .login-page {
    padding: 0;
    align-items: stretch;
    background: #f1f5f9;
  }

  .login-container {
    max-width: 100%;
    border-radius: 0;
    box-shadow: none;
    flex-direction: row;
  }

  .login-hero {
    position: relative;
    display: flex;
    flex: 1.2;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    padding: 80px;
    background: linear-gradient(135deg, var(--portal-primary) 0%, #064077 100%);
  }

  .login-hero__content {
    position: relative;
    z-index: 10;
    max-width: 520px;
    color: #fff;
  }

  .login-hero__brand {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 40px;
  }

  .login-hero__logo {
    position: relative;
    width: 48px;
    height: 48px;
    border-radius: 12px;
    background: var(--portal-danger);
  }

  .login-hero__logo::after {
    content: "";
    position: absolute;
    inset: 12px;
    border: 3px solid #fff;
    border-radius: 6px;
  }

  .login-hero__brand-name {
    font-size: 28px;
    font-weight: 800;
    letter-spacing: 2px;
  }

  .login-hero__title {
    display: block;
    margin-bottom: 24px;
    font-size: 48px;
    font-weight: 800;
    line-height: 1.2;
    letter-spacing: -1px;
  }

  .login-hero__subtitle {
    display: block;
    font-size: 18px;
    line-height: 1.6;
    color: rgba(255, 255, 255, 0.8);
  }

  .login-hero__shape {
    position: absolute;
    background: rgba(255, 255, 255, 0.05);
  }

  .login-hero__shape--1 {
    top: -100px;
    right: -200px;
    width: 600px;
    height: 600px;
    transform: rotate(15deg);
    border: 2px solid rgba(255, 255, 255, 0.1);
    border-radius: 30%;
  }

  .login-hero__shape--2 {
    bottom: -150px;
    left: -100px;
    width: 400px;
    height: 400px;
    transform: rotate(-25deg);
    border-radius: 10%;
    background: linear-gradient(135deg, rgba(202, 29, 29, 0.1) 0%, transparent 100%);
  }

  .login-card {
    flex: 0 0 520px;
    justify-content: center;
    padding: 0 80px;
  }

  .login-card__brand {
    display: none;
  }

  .login-card__title {
    font-size: 40px;
  }

  .qr-dialog {
    max-width: 440px;
    padding: 56px 48px;
  }
}
</style>
