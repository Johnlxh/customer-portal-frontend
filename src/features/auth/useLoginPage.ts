import { onBeforeUnmount, ref } from "vue"
import { onShow } from "@dcloudio/uni-app"
import QRCode from "qrcode"

import * as authApi from "../../api/auth"
import { AUTH_PLATFORMS, LOGIN_PAGE_URL } from "../../constants/app"
import { useAuthStore } from "../../stores/auth"
import type { AuthOptionsResponse } from "../../types/api"
import { openRootPage } from "../../utils/navigation"
import { getDocumentBaseUrl } from "../../utils/platform"
import { showErrorToast, showToast } from "../../utils/toast"

const DEFAULT_PC_QR_STATUS = "请使用已登录的小程序扫码确认"

export function useLoginPage() {
  const authStore = useAuthStore()

  const loginName = ref("")
  const password = ref("")
  const loading = ref(false)
  const wechatLoading = ref(false)
  const phoneLoading = ref(false)
  const authOptionsLoading = ref(false)
  const miniConfigReady = ref(false)
  const webLoginMode = ref<AuthOptionsResponse["wechat"]["web_login_mode"]>("disabled")
  const webLoginMessage = ref("正在检查 PC 微信登录配置…")
  const pcQrVisible = ref(false)
  const pcQrLoading = ref(false)
  const pcQrImage = ref("")
  const pcQrSessionToken = ref("")
  const pcQrStatus = ref(DEFAULT_PC_QR_STATUS)
  let pcQrPollTimer: ReturnType<typeof setTimeout> | null = null

  function isMiniWechat() {
    return typeof window === "undefined" && typeof (globalThis as { wx?: unknown }).wx !== "undefined"
  }

  function requestWechatLoginCode() {
    return new Promise<string>((resolve, reject) => {
      uni.login({
        provider: "weixin",
        success: (result) => {
          if (result.code) {
            resolve(result.code)
            return
          }
          reject(new Error("微信登录凭证获取失败"))
        },
        fail: () => {
          reject(new Error("微信登录凭证获取失败"))
        }
      })
    })
  }

  function getWechatCallbackParams() {
    if (typeof window === "undefined") {
      return new URLSearchParams()
    }
    const hash = window.location.hash || ""
    const fragment = hash.startsWith("#") ? hash.slice(1) : hash
    const query = fragment.includes("?") ? fragment.split("?", 2)[1] : ""
    return new URLSearchParams(query)
  }

  function clearWechatCallbackParams() {
    if (typeof window === "undefined") {
      return
    }
    window.location.hash = LOGIN_PAGE_URL
  }

  function clearPcQrPolling() {
    if (pcQrPollTimer) {
      clearTimeout(pcQrPollTimer)
      pcQrPollTimer = null
    }
  }

  function closePcQrDialog() {
    clearPcQrPolling()
    pcQrVisible.value = false
    pcQrImage.value = ""
    pcQrSessionToken.value = ""
    pcQrStatus.value = DEFAULT_PC_QR_STATUS
  }

  async function loadAuthOptions() {
    if (isMiniWechat()) {
      return
    }
    authOptionsLoading.value = true
    try {
      const response = await authApi.getAuthOptions()
      miniConfigReady.value = response.data.wechat.mini_config_ready
      webLoginMode.value = response.data.wechat.web_login_mode
      webLoginMessage.value = response.data.wechat.web_login_message
    } catch (error) {
      miniConfigReady.value = false
      webLoginMode.value = "disabled"
      webLoginMessage.value = "暂时无法获取 PC 微信登录配置，请稍后再试。"
    } finally {
      authOptionsLoading.value = false
    }
  }

  async function handleWechatCallback() {
    if (typeof window === "undefined") {
      return false
    }
    const params = getWechatCallbackParams()
    const ticket = params.get("ticket") || ""
    const bindRequired = params.get("bind_required") === "1"
    const error = params.get("error") || ""

    if (!ticket && !bindRequired && !error) {
      return false
    }

    clearWechatCallbackParams()
    if (bindRequired) {
      uni.showModal({
        title: "请先完成绑定",
        content: "请先在微信小程序完成手机号绑定，再使用 PC 微信扫码登录。",
        showCancel: false
      })
      return true
    }
    if (error) {
      showToast(error)
      return true
    }
    if (!ticket) {
      return true
    }

    wechatLoading.value = true
    try {
      await authStore.loginWithTicket(ticket, AUTH_PLATFORMS.web)
      openRootPage("home")
    } catch (callbackError) {
      showErrorToast(callbackError, "微信登录失败")
    } finally {
      wechatLoading.value = false
    }
    return true
  }

  async function pollPcQrStatus() {
    if (!pcQrSessionToken.value) {
      return
    }
    try {
      const response = await authApi.getPcQrStatus(pcQrSessionToken.value)
      const status = response.data.status
      if (status === "confirmed") {
        pcQrStatus.value = response.data.confirmed_user
          ? `${response.data.confirmed_user} 已确认，正在登录…`
          : "已确认，正在登录…"
        await authStore.loginWithPcQrSession(pcQrSessionToken.value, AUTH_PLATFORMS.pcQr)
        closePcQrDialog()
        openRootPage("home")
        return
      }
      if (status === "expired") {
        pcQrStatus.value = "二维码已过期，请关闭后重新生成"
        return
      }
      if (status === "consumed") {
        pcQrStatus.value = "二维码已被使用，请重新生成"
        return
      }
      if (status === "invalid") {
        pcQrStatus.value = "二维码已失效，请重新生成"
        return
      }
      pcQrStatus.value = "等待小程序扫码确认…"
      clearPcQrPolling()
      pcQrPollTimer = setTimeout(pollPcQrStatus, 2000)
    } catch (error) {
      pcQrStatus.value = "二维码状态检查失败，请稍后重试"
    }
  }

  onShow(async () => {
    const ok = await authStore.initialize()
    if (ok) {
      openRootPage("home")
      return
    }

    if (!isMiniWechat()) {
      const handled = await handleWechatCallback()
      if (handled) {
        return
      }
      void loadAuthOptions()
    }
  })

  onBeforeUnmount(() => {
    clearPcQrPolling()
  })

  async function submit() {
    if (!loginName.value.trim() || !password.value) {
      showToast("请输入账号和密码")
      return
    }
    loading.value = true
    try {
      await authStore.login(loginName.value.trim(), password.value)
      openRootPage("home")
    } catch (error) {
      showErrorToast(error, "登录失败")
    } finally {
      loading.value = false
    }
  }

  function startWechatLogin() {
    if (typeof window === "undefined") {
      showToast("请在 H5 端使用微信登录")
      return
    }
    if (webLoginMode.value === "disabled") {
      showToast("当前未启用 PC 微信登录")
      return
    }
    const frontendRedirectUri = `${window.location.origin}/#${LOGIN_PAGE_URL}`
    const mockIdentity = webLoginMode.value === "mock" ? "&mock_identity=portal.demo%40somro.local" : ""
    window.location.href =
      `${getDocumentBaseUrl()}/api/v1/auth/wechat/web/start` +
      `?frontend_redirect_uri=${encodeURIComponent(frontendRedirectUri)}${mockIdentity}`
  }

  async function startPcQrLogin() {
    pcQrLoading.value = true
    clearPcQrPolling()
    try {
      const response = await authApi.createPcQrSession()
      pcQrSessionToken.value = response.data.session_token
      pcQrImage.value = await QRCode.toDataURL(response.data.qr_content, {
        margin: 1,
        width: 240,
        color: {
          dark: "#16385a",
          light: "#ffffff"
        }
      })
      pcQrStatus.value = DEFAULT_PC_QR_STATUS
      pcQrVisible.value = true
      pcQrPollTimer = setTimeout(pollPcQrStatus, response.data.status_poll_seconds * 1000)
    } catch (error) {
      showErrorToast(error, "二维码生成失败")
    } finally {
      pcQrLoading.value = false
    }
  }

  async function handleMiniWechatAuth(event: { detail?: { code?: string; errMsg?: string } }) {
    const phoneCode = event.detail?.code || ""
    wechatLoading.value = true
    try {
      const loginCode = await requestWechatLoginCode()
      const result = await authStore.loginWithMiniCode(loginCode, AUTH_PLATFORMS.mpWeixin)
      if (!result.need_bind) {
        openRootPage("home")
        return
      }

      if (!phoneCode) {
        const message = event.detail?.errMsg?.includes("deny") ? "首次登录需完成微信手机号验证" : "手机号验证失败"
        showToast(message)
        return
      }

      phoneLoading.value = true
      const bindLoginCode = await requestWechatLoginCode()
      await authStore.bindMiniPhone(bindLoginCode, phoneCode, AUTH_PLATFORMS.mpWeixin)
      openRootPage("home")
    } catch (error) {
      const message = error instanceof Error ? error.message : "微信登录失败"
      if (message.includes("AppID / AppSecret")) {
        uni.showModal({
          title: "后端微信密钥未配置",
          content: "当前还没配置 Odoo 侧的小程序 AppSecret。要不要先用本地 Mock 登录继续联调页面？",
          confirmText: "Mock 登录",
          cancelText: "取消",
          success: async (result) => {
            if (!result.confirm) {
              return
            }
            try {
              await authStore.loginWithMiniCode("mock:jack", AUTH_PLATFORMS.mpWeixin)
              openRootPage("home")
            } catch (mockError) {
              showErrorToast(mockError, "Mock 登录失败")
            }
          }
        })
        return
      }
      showToast(message)
    } finally {
      wechatLoading.value = false
      phoneLoading.value = false
    }
  }

  function getH5WechatHint() {
    if (authOptionsLoading.value) {
      return "正在检查微信登录配置…"
    }
    if (miniConfigReady.value) {
      return "请先在小程序完成手机号绑定，之后 PC 端用小程序扫码即可直接登录。"
    }
    if (webLoginMode.value === "real") {
      return "已启用真实 PC 微信扫码登录。"
    }
    return webLoginMessage.value
  }

  return {
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
  }
}
