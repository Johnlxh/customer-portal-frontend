<script setup lang="ts">
import { computed, ref } from "vue"
import { onLoad, onShow } from "@dcloudio/uni-app"

import * as pcScanApi from "../../api/pcScan"
import BottomNav from "../../components/BottomNav.vue"
import EmptyState from "../../components/EmptyState.vue"
import PageContextBar from "../../components/PageContextBar.vue"
import { APP_DEVICE_NAME, AUTH_PLATFORMS, LOGIN_PAGE_URL } from "../../constants/app"
import { useAuthStore } from "../../stores/auth"
import { goBackOr } from "../../utils/navigation"
import { showErrorToast, showSuccessToast, showToast } from "../../utils/toast"

const authStore = useAuthStore()
const sessionToken = ref("")
const relayStatus = ref("先扫描电脑上的二维码，再扫描产品码。")
const relayInput = ref("")
const checking = ref(false)
const submitting = ref(false)
const relayReceivedCount = ref(0)
const relayRecentResults = ref<Array<{ id: number; result_text: string; submitted_at?: string | false; submitted_by?: string }>>([])
const relaySessionState = ref<"idle" | "connected" | "closed" | "expired">("idle")

const canSubmit = computed(() => Boolean(sessionToken.value && authStore.isLoggedIn))
const relaySessionLabel = computed(() => {
  if (relaySessionState.value === "connected") {
    return "已连接"
  }
  if (relaySessionState.value === "closed") {
    return "已关闭"
  }
  if (relaySessionState.value === "expired") {
    return "已过期"
  }
  return "未连接"
})

function extractSessionToken(value: string) {
  const raw = (value || "").trim()
  if (!raw) {
    return ""
  }
  if (raw.startsWith("somro-pc-scan:")) {
    return raw.slice("somro-pc-scan:".length).trim()
  }
  try {
    const parsed = new URL(raw)
    const directToken = (parsed.searchParams.get("session_token") || parsed.searchParams.get("token") || "").trim()
    if (directToken) {
      return directToken
    }
    const fragment = parsed.hash.startsWith("#") ? parsed.hash.slice(1) : parsed.hash
    const fragmentQuery = fragment.includes("?") ? fragment.split("?", 2)[1] : ""
    return new URLSearchParams(fragmentQuery).get("session_token") || new URLSearchParams(fragmentQuery).get("token") || ""
  } catch (error) {
    return raw
  }
}

function setSessionToken(value: string) {
  const nextToken = (value || "").trim()
  if (nextToken !== sessionToken.value) {
    relayInput.value = ""
  }
  sessionToken.value = nextToken
  relayStatus.value = nextToken
    ? "先扫描产品码，结果会自动回到电脑。"
    : "先扫描电脑上的二维码，再扫描产品码。"
  relayReceivedCount.value = 0
  relayRecentResults.value = []
  relaySessionState.value = nextToken ? "connected" : "idle"
}

function syncSessionToken(rawValue = "") {
  const explicitToken = extractSessionToken(rawValue)
  if (explicitToken) {
    setSessionToken(explicitToken)
    return
  }
  if (typeof window !== "undefined") {
    setSessionToken(extractSessionToken(window.location.href))
    return
  }
  if (sessionToken.value) {
    return
  }
  setSessionToken("")
}

async function refreshScanSessionStatus() {
  if (!sessionToken.value) {
    relayStatus.value = "先扫描电脑上的二维码，再扫描产品码。"
    relaySessionState.value = "idle"
    return
  }
  checking.value = true
  try {
    const response = await pcScanApi.getPcScanStatus(sessionToken.value)
    const status = response.data.status
    relayReceivedCount.value = response.data.received_count || 0
    relayRecentResults.value = response.data.results.slice(-5)
    if (status === "pending") {
      relaySessionState.value = "connected"
      relayStatus.value = relayReceivedCount.value
        ? `电脑端已连接，已接收 ${relayReceivedCount.value} 条，可继续扫码。`
        : "电脑端已连接，继续扫描产品码即可回传。"
      return
    }
    if (status === "cancelled") {
      relaySessionState.value = "closed"
      relayStatus.value = "电脑端扫码窗口已关闭，请重新发起。"
      return
    }
    if (status === "expired") {
      relaySessionState.value = "expired"
      relayStatus.value = "扫码会话已过期，请在电脑端重新发起。"
      return
    }
    relaySessionState.value = "idle"
    relayStatus.value = "扫码会话不存在，请重新扫描电脑二维码。"
  } catch (error) {
    relayStatus.value = error instanceof Error ? error.message : "扫码会话检查失败，请稍后重试。"
  } finally {
    checking.value = false
  }
}

async function bindPcSessionByScan() {
  uni.scanCode({
    success: async (result) => {
      const token = extractSessionToken(result.result)
      if (!token) {
        showToast("二维码无效")
        return
      }
      setSessionToken(token)
      await refreshScanSessionStatus()
    },
    fail: () => {
      showToast("扫码已取消")
    },
  })
}

async function submitScanResult(resultText: string) {
  if (!authStore.isLoggedIn) {
    relayStatus.value = "请先登录后再继续扫码。"
    return
  }
  if (!sessionToken.value) {
    relayStatus.value = "请先扫描电脑上的二维码。"
    return
  }
  const cleanResult = (resultText || "").trim()
  if (!cleanResult) {
    showToast("扫码结果不能为空")
    return
  }
  submitting.value = true
  try {
    const response = await pcScanApi.submitPcScanResult({
      session_token: sessionToken.value,
      result_text: cleanResult,
      platform: typeof window === "undefined" ? AUTH_PLATFORMS.mpWeixin : AUTH_PLATFORMS.mobileH5,
      device_name: APP_DEVICE_NAME,
    })
    relayInput.value = ""
    relayReceivedCount.value = response.data.received_count || relayReceivedCount.value + 1
    relayRecentResults.value = [...relayRecentResults.value, response.data.item].slice(-5)
    relayStatus.value = `已发送 ${relayReceivedCount.value} 条，可继续扫码。`
    showSuccessToast("已发送到电脑")
  } catch (error) {
    relayStatus.value = error instanceof Error ? error.message : "扫码结果提交失败"
    showErrorToast(new Error(relayStatus.value), "扫码结果提交失败")
  } finally {
    submitting.value = false
  }
}

function scanProductCode() {
  if (!canSubmit.value) {
    relayStatus.value = authStore.isLoggedIn ? "请先扫描电脑二维码。" : "请先登录后再继续扫码。"
    return
  }
  uni.scanCode({
    success: async (result) => {
      await submitScanResult(result.result)
    },
    fail: () => {
      showToast("扫码已取消")
    },
  })
}

async function submitManualResult() {
  await submitScanResult(relayInput.value)
}

function goLogin() {
  uni.reLaunch({ url: LOGIN_PAGE_URL })
}

onLoad(async (query) => {
  syncSessionToken(String(query?.session_token || query?.token || query?.qr_content || ""))
})

onShow(async () => {
  syncSessionToken()
  await authStore.initialize()
  await refreshScanSessionStatus()
})
</script>

<template>
  <view class="page-shell page-shell--with-nav">
    <scroll-view scroll-y class="page-shell__content">
      <PageContextBar current-label="电脑扫码" parent-label="我的" back-label="返回我的" @back="goBackOr('/pages/me/index')" />

      <view class="page-heading">
        <text class="page-title">电脑扫码</text>
        <text class="page-subtitle">连接电脑上的扫码窗口，扫描后结果会自动回到电脑。</text>
      </view>

      <view class="card relay-card">
        <text class="section-title relay-card__title">连接状态</text>
        <view class="relay-stats">
          <view class="relay-stat">
            <text class="relay-stat__value">{{ relayReceivedCount }}</text>
            <text class="relay-stat__label">已发送</text>
          </view>
          <view class="relay-stat">
            <text class="relay-stat__value">{{ relaySessionLabel }}</text>
            <text class="relay-stat__label">电脑会话</text>
          </view>
        </view>
        <text class="relay-card__status">{{ relayStatus }}</text>
        <view class="relay-card__actions">
          <button class="secondary-button relay-card__button" :loading="checking" @tap="bindPcSessionByScan">先扫电脑二维码</button>
          <button v-if="authStore.isLoggedIn" class="primary-button relay-card__button" :disabled="!sessionToken" :loading="submitting" @tap="scanProductCode">扫描产品码</button>
          <button v-else class="primary-button relay-card__button" @tap="goLogin">先登录</button>
        </view>
        <view v-if="relayRecentResults.length" class="relay-results">
          <text class="relay-results__title">最近发送</text>
          <view v-for="item in relayRecentResults" :key="item.id" class="relay-results__row">
            <text class="relay-results__text">{{ item.result_text }}</text>
            <text class="relay-results__meta">{{ item.submitted_by || "当前手机" }}</text>
          </view>
        </view>
      </view>

      <view class="card relay-card relay-card--manual">
        <text class="section-title relay-card__title">H5 测试回填</text>
        <text class="relay-card__desc">手机浏览器不方便直接扫码时，可以把结果手工填进来，先验证电脑回填链路。</text>
        <input
          v-model="relayInput"
          class="relay-input"
          placeholder="输入扫码结果，例如厂家编码、订货编码或完整条码"
          confirm-type="done"
          @confirm="submitManualResult"
        />
        <button class="secondary-button relay-card__button relay-card__button--single" :disabled="!canSubmit" :loading="submitting" @tap="submitManualResult">发送到电脑</button>
      </view>

      <EmptyState
        v-if="!sessionToken"
        title="还没有连接电脑"
        description="先扫描电脑上的二维码，建立本次扫码会话。"
      />
    </scroll-view>

    <BottomNav current="me" />
  </view>
</template>

<style scoped lang="scss">
.relay-card {
  display: flex;
  flex-direction: column;
  gap: 18rpx;
  margin-top: 24rpx;
  padding: 24rpx;
}

.relay-card__title {
  margin-bottom: 0;
}

.relay-card__status,
.relay-card__desc {
  font-size: 24rpx;
  line-height: 1.6;
  color: var(--portal-text-muted);
}

.relay-stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14rpx;
}

.relay-stat {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  padding: 18rpx;
  border-radius: 20rpx;
  background: var(--portal-surface-muted);
}

.relay-stat__value {
  font-size: 30rpx;
  font-weight: 700;
  color: var(--portal-text);
}

.relay-stat__label {
  font-size: 22rpx;
  color: var(--portal-text-muted);
}

.relay-card__actions {
  display: flex;
  flex-direction: column;
  gap: 14rpx;
}

.relay-card__button {
  margin: 0;
}

.relay-card__button--single {
  width: 100%;
}

.relay-results {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  padding: 18rpx;
  border-radius: 20rpx;
  background: var(--portal-surface-muted);
}

.relay-results__title {
  font-size: 22rpx;
  font-weight: 700;
  color: var(--portal-text-muted);
}

.relay-results__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14rpx;
}

.relay-results__text {
  flex: 1;
  min-width: 0;
  font-size: 24rpx;
  font-weight: 700;
  color: var(--portal-text);
  word-break: break-all;
}

.relay-results__meta {
  flex-shrink: 0;
  font-size: 22rpx;
  color: var(--portal-text-muted);
}

.relay-input {
  height: 92rpx;
  padding: 0 24rpx;
  border: 1px solid var(--portal-border);
  border-radius: 20rpx;
  background: #ffffff;
  font-size: 28rpx;
}

@media (min-width: 1024px) {
  .relay-card {
    gap: 14px;
    margin-top: 20px;
    padding: 20px;
    max-width: 760px;
  }

  .relay-card__status,
  .relay-card__desc {
    font-size: 13px;
  }

  .relay-stat {
    padding: 14px;
    border-radius: 14px;
  }

  .relay-stat__value {
    font-size: 18px;
  }

  .relay-stat__label,
  .relay-results__title,
  .relay-results__meta {
    font-size: 12px;
  }

  .relay-card__actions {
    flex-direction: row;
    flex-wrap: wrap;
  }

  .relay-card__button {
    min-width: 132px;
  }

  .relay-card__button--single {
    width: auto;
  }

  .relay-results {
    gap: 8px;
    padding: 12px 14px;
    border-radius: 14px;
  }

  .relay-results__text {
    font-size: 13px;
  }

  .relay-input {
    height: 48px;
    padding: 0 16px;
    border-radius: 12px;
    font-size: 14px;
  }
}
</style>
