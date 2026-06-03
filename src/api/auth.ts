import type {
  AuthOptionsResponse,
  LoginResponse,
  MeResponse,
  PcQrCreateResponse,
  PcQrStatusResponse,
  WechatMiniLoginResponse
} from "../types/api"
import { APP_DEVICE_NAME, AUTH_PLATFORMS } from "../constants/app"

import { request } from "./http"

export function login(loginName: string, password: string) {
  return request<LoginResponse>({
    url: "/api/v1/auth/login",
    method: "POST",
    auth: false,
    data: {
      login: loginName,
      password,
      platform: AUTH_PLATFORMS.app,
      device_name: APP_DEVICE_NAME
    }
  })
}

export function logout() {
  return request({
    url: "/api/v1/auth/logout",
    method: "POST"
  })
}

export function getAuthOptions() {
  return request<AuthOptionsResponse>({
    url: "/api/v1/auth/options",
    auth: false
  })
}

export function createPcQrSession() {
  return request<PcQrCreateResponse>({
    url: "/api/v1/auth/pc-qr/create",
    method: "POST",
    auth: false
  })
}

export function getPcQrStatus(sessionToken: string) {
  return request<PcQrStatusResponse>({
    url: "/api/v1/auth/pc-qr/status",
    params: {
      session_token: sessionToken
    },
    auth: false
  })
}

export function exchangePcQrSession(sessionToken: string, platform = AUTH_PLATFORMS.pcQr) {
  return request<LoginResponse>({
    url: "/api/v1/auth/pc-qr/exchange",
    method: "POST",
    auth: false,
    data: {
      session_token: sessionToken,
      platform,
      device_name: APP_DEVICE_NAME
    }
  })
}

export function confirmPcQrSession(sessionToken: string, platform = AUTH_PLATFORMS.mpWeixin) {
  return request({
    url: "/api/v1/auth/pc-qr/confirm",
    method: "POST",
    data: {
      session_token: sessionToken,
      platform,
      device_name: APP_DEVICE_NAME
    }
  })
}

export function exchangeTicket(ticket: string, platform = AUTH_PLATFORMS.web) {
  return request<LoginResponse>({
    url: "/api/v1/auth/exchange-ticket",
    method: "POST",
    auth: false,
    data: {
      ticket,
      platform,
      device_name: APP_DEVICE_NAME
    }
  })
}

export function wechatMiniLogin(code: string, platform = AUTH_PLATFORMS.mpWeixin) {
  return request<WechatMiniLoginResponse>({
    url: "/api/v1/auth/wechat/mini/login",
    method: "POST",
    auth: false,
    data: {
      code,
      platform,
      device_name: APP_DEVICE_NAME
    }
  })
}

export function wechatMiniBindPhone(loginCode: string, phoneCode: string, platform = AUTH_PLATFORMS.mpWeixin) {
  return request<WechatMiniLoginResponse>({
    url: "/api/v1/auth/wechat/mini/bind-phone",
    method: "POST",
    auth: false,
    data: {
      login_code: loginCode,
      phone_code: phoneCode,
      platform,
      device_name: APP_DEVICE_NAME
    }
  })
}

export function getMe() {
  return request<MeResponse>({
    url: "/api/v1/me"
  })
}
