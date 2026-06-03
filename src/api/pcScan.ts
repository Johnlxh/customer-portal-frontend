import type { PcScanCreateResponse, PcScanStatusResponse, PcScanSubmitResponse } from "../types/api"
import { APP_DEVICE_NAME, AUTH_PLATFORMS } from "../constants/app"

import { request } from "./http"

export function createPcScanSession(params?: { source?: string; ttl_minutes?: number; platform?: string; device_name?: string }) {
  return request<PcScanCreateResponse>({
    url: "/api/v1/pc-scan/create",
    method: "POST",
    data: {
      source: params?.source || "stock",
      ttl_minutes: params?.ttl_minutes || 3,
      platform: params?.platform || AUTH_PLATFORMS.pcH5,
      device_name: params?.device_name || APP_DEVICE_NAME,
    },
  })
}

export function getPcScanStatus(sessionToken: string, afterId = 0) {
  return request<PcScanStatusResponse>({
    url: "/api/v1/pc-scan/status",
    params: {
      session_token: sessionToken,
      after_id: afterId
    },
    auth: false,
  })
}

export function submitPcScanResult(payload: {
  session_token: string
  result_text: string
  platform?: string
  device_name?: string
}) {
  return request<PcScanSubmitResponse>({
    url: "/api/v1/pc-scan/submit",
    method: "POST",
    data: {
      session_token: payload.session_token,
      result_text: payload.result_text,
      platform: payload.platform || AUTH_PLATFORMS.mpWeixin,
      device_name: payload.device_name || APP_DEVICE_NAME,
    },
  })
}

export function cancelPcScanSession(sessionToken: string) {
  return request<{ status: PcScanStatusResponse["status"] }>({
    url: "/api/v1/pc-scan/cancel",
    method: "POST",
    data: {
      session_token: sessionToken,
    },
  })
}
