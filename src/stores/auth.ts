import { defineStore } from "pinia"

import { AUTH_PLATFORMS, LOGIN_PAGE_URL } from "../constants/app"
import * as authApi from "../api/auth"
import { useCartStore } from "./cart"
import type { ContactCard, MeResponse, WechatMiniLoginResponse } from "../types/api"
import { clearStoredToken, getStoredToken, setStoredToken } from "../utils/auth"

interface AuthState {
  token: string
  ready: boolean
  user: MeResponse["user"] | null
  company: MeResponse["company"] | null
  contact: ContactCard | null
}

export const useAuthStore = defineStore("auth", {
  state: (): AuthState => ({
    token: "",
    ready: false,
    user: null,
    company: null,
    contact: null
  }),
  getters: {
    isLoggedIn(state) {
      return Boolean(state.token && state.user)
    }
  },
  actions: {
    async initialize() {
      if (this.ready) {
        return this.isLoggedIn
      }
      const token = getStoredToken()
      if (!token) {
        this.clearProfile()
        this.ready = true
        return false
      }
      this.token = token
      try {
        await this.fetchMe()
      } catch (error) {
        this.reset()
      }
      this.ready = true
      return this.isLoggedIn
    },
    async ensureSession() {
      const ok = await this.initialize()
      if (!ok) {
        uni.reLaunch({ url: LOGIN_PAGE_URL })
      }
      return ok
    },
    async login(loginName: string, password: string) {
      const response = await authApi.login(loginName, password)
      await this.applySessionToken(response.data.token)
    },
    async loginWithTicket(ticket: string, platform = AUTH_PLATFORMS.web) {
      const response = await authApi.exchangeTicket(ticket, platform)
      await this.applySessionToken(response.data.token)
    },
    async loginWithPcQrSession(sessionToken: string, platform = AUTH_PLATFORMS.pcQr) {
      const response = await authApi.exchangePcQrSession(sessionToken, platform)
      await this.applySessionToken(response.data.token)
    },
    async loginWithMiniCode(code: string, platform = AUTH_PLATFORMS.mpWeixin) {
      const response = await authApi.wechatMiniLogin(code, platform)
      await this.applyWechatResponse(response.data)
      return response.data
    },
    async bindMiniPhone(loginCode: string, phoneCode: string, platform = AUTH_PLATFORMS.mpWeixin) {
      const response = await authApi.wechatMiniBindPhone(loginCode, phoneCode, platform)
      await this.applyWechatResponse(response.data)
      return response.data
    },
    async applyWechatResponse(data: WechatMiniLoginResponse) {
      if (!data.token) {
        this.ready = true
        return
      }
      await this.applySessionToken(data.token)
    },
    async fetchMe() {
      const response = await authApi.getMe()
      this.user = response.data.user
      this.company = response.data.company
      this.contact = response.data.contact
    },
    async applySessionToken(token: string) {
      this.token = token
      setStoredToken(token)
      await this.fetchMe()
      this.ready = true
    },
    async logout() {
      try {
        if (this.token) {
          await authApi.logout()
        }
      } catch (error) {
        // best effort logout
      }
      this.reset()
      uni.reLaunch({ url: LOGIN_PAGE_URL })
    },
    clearProfile() {
      this.token = ""
      this.user = null
      this.company = null
      this.contact = null
    },
    reset() {
      useCartStore().clear()
      clearStoredToken()
      this.clearProfile()
      this.ready = true
    }
  }
})
