import { onBeforeUnmount, ref } from "vue"
import QRCode from "qrcode"

import * as pcScanApi from "../../api/pcScan"
import { APP_DEVICE_NAME, AUTH_PLATFORMS } from "../../constants/app"
import type { PcScanResultItem } from "../../types/api"
import { showErrorToast } from "../../utils/toast"

interface UsePcScanDialogOptions {
  onResult: (resultText: string) => Promise<void>
}

const DEFAULT_STATUS = "请用手机打开扫码页，完成扫码后结果会自动回到电脑。"

export function usePcScanDialog(options: UsePcScanDialogOptions) {
  const pcScanVisible = ref(false)
  const pcScanLoading = ref(false)
  const pcScanImage = ref("")
  const pcScanSessionToken = ref("")
  const pcScanStatus = ref(DEFAULT_STATUS)
  const pcScanReceivedCount = ref(0)
  const pcScanLastItemId = ref(0)
  const pcScanRecentResults = ref<PcScanResultItem[]>([])
  let pcScanPollTimer: ReturnType<typeof setTimeout> | null = null

  function clearPcScanPolling() {
    if (pcScanPollTimer) {
      clearTimeout(pcScanPollTimer)
      pcScanPollTimer = null
    }
  }

  function resetPcScanState() {
    pcScanVisible.value = false
    pcScanImage.value = ""
    pcScanStatus.value = DEFAULT_STATUS
    pcScanReceivedCount.value = 0
    pcScanLastItemId.value = 0
    pcScanRecentResults.value = []
  }

  function getPcScanRelayUrl(sessionToken: string) {
    if (typeof window === "undefined") {
      return `somro-pc-scan:${sessionToken}`
    }
    return `${window.location.origin}/#/pages/pc-scan/index?session_token=${encodeURIComponent(sessionToken)}`
  }

  async function cancelPcScan() {
    const token = pcScanSessionToken.value
    if (!token) {
      return
    }
    pcScanSessionToken.value = ""
    try {
      await pcScanApi.cancelPcScanSession(token)
    } catch (error) {
      // best effort cancel
    }
  }

  async function closePcScanDialog(cancelSession = true) {
    clearPcScanPolling()
    resetPcScanState()
    if (cancelSession) {
      await cancelPcScan()
      return
    }
    pcScanSessionToken.value = ""
  }

  async function pollPcScanStatus() {
    if (!pcScanSessionToken.value) {
      return
    }
    try {
      const response = await pcScanApi.getPcScanStatus(pcScanSessionToken.value, pcScanLastItemId.value)
      const status = response.data.status
      pcScanReceivedCount.value = response.data.received_count || 0
      if (response.data.latest_item_id) {
        pcScanLastItemId.value = response.data.latest_item_id
      }
      if (response.data.results.length) {
        pcScanRecentResults.value = [...pcScanRecentResults.value, ...response.data.results].slice(-5)
        const latestResult = response.data.results[response.data.results.length - 1]
        pcScanStatus.value = latestResult.submitted_by
          ? `${latestResult.submitted_by} 已回传第 ${pcScanReceivedCount.value} 条扫码结果`
          : `已收到第 ${pcScanReceivedCount.value} 条扫码结果`
        await options.onResult(latestResult.result_text)
      }
      if (status === "cancelled") {
        pcScanStatus.value = "电脑端扫码窗口已关闭。"
        return
      }
      if (status === "expired") {
        pcScanStatus.value = "扫码会话已过期，请重新发起。"
        return
      }
      if (status === "invalid") {
        pcScanStatus.value = "扫码会话不存在，请重新发起。"
        return
      }
      if (!response.data.results.length) {
        pcScanStatus.value = pcScanReceivedCount.value
          ? `已接收 ${pcScanReceivedCount.value} 条，等待下一次扫码…`
          : "等待手机扫码并回传结果…"
      }
      clearPcScanPolling()
      pcScanPollTimer = setTimeout(pollPcScanStatus, 2000)
    } catch (error) {
      pcScanStatus.value = "扫码状态检查失败，请稍后重试。"
    }
  }

  async function startPcScan() {
    pcScanLoading.value = true
    clearPcScanPolling()
    try {
      const response = await pcScanApi.createPcScanSession({
        source: "stock",
        ttl_minutes: 3,
        platform: AUTH_PLATFORMS.pcH5,
        device_name: APP_DEVICE_NAME,
      })
      pcScanSessionToken.value = response.data.session_token
      pcScanImage.value = await QRCode.toDataURL(getPcScanRelayUrl(response.data.session_token), {
        margin: 1,
        width: 240,
        color: {
          dark: "#16385a",
          light: "#ffffff",
        },
      })
      pcScanStatus.value = "等待手机扫码并回传结果…"
      pcScanReceivedCount.value = 0
      pcScanLastItemId.value = 0
      pcScanRecentResults.value = []
      pcScanVisible.value = true
      pcScanPollTimer = setTimeout(pollPcScanStatus, response.data.status_poll_seconds * 1000)
    } catch (error) {
      showErrorToast(error, "二维码生成失败")
    } finally {
      pcScanLoading.value = false
    }
  }

  onBeforeUnmount(() => {
    clearPcScanPolling()
    if (pcScanSessionToken.value) {
      void cancelPcScan()
    }
  })

  return {
    pcScanVisible,
    pcScanLoading,
    pcScanImage,
    pcScanStatus,
    pcScanReceivedCount,
    pcScanRecentResults,
    closePcScanDialog,
    startPcScan,
  }
}
