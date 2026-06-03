import type { ApiEnvelope } from "../types/api"
import { LOGIN_PAGE_URL } from "../constants/app"
import { clearStoredToken, getStoredToken } from "../utils/auth"
import { getApiBaseUrl } from "../utils/platform"
import { withQuery } from "../utils/query"

type HttpMethod = "GET" | "POST"
let redirectingForAuth = false

interface RequestOptions {
  url: string
  method?: HttpMethod
  data?: Record<string, unknown>
  params?: Record<string, string | number | boolean | undefined>
  auth?: boolean
}

function normalizeError(message: string) {
  return message || "请求失败，请稍后重试。"
}

function handleUnauthorized(message: string) {
  clearStoredToken()
  if (redirectingForAuth) {
    return
  }
  redirectingForAuth = true
  uni.showToast({ title: message || "登录状态已失效，请重新登录。", icon: "none" })
  setTimeout(() => {
    uni.reLaunch({ url: LOGIN_PAGE_URL })
    redirectingForAuth = false
  }, 250)
}

function isApiEnvelope<T>(value: unknown): value is ApiEnvelope<T> {
  return (
    typeof value === "object" &&
    value !== null &&
    "code" in value &&
    "message" in value &&
    "data" in value
  )
}

export async function request<T>({
  url,
  method = "GET",
  data,
  params,
  auth = true,
}: RequestOptions): Promise<ApiEnvelope<T>> {
  const token = getStoredToken()
  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  }

  if (auth && token) {
    headers.Authorization = `Bearer ${token}`
  }

  let response: Awaited<ReturnType<typeof uni.request>>
  try {
    response = await uni.request({
      url: `${getApiBaseUrl()}${withQuery(url, params || {})}`,
      method,
      data,
      header: headers
    })
  } catch (error) {
    throw new Error(normalizeError(error instanceof Error ? error.message : "网络异常，请稍后重试。"))
  }

  if (!isApiEnvelope<T>(response.data)) {
    throw new Error("服务返回格式异常，请稍后重试。")
  }

  const body = response.data
  if (response.statusCode === 401 && auth && [1001, 1002, 1003, 1004].includes(body.code)) {
    handleUnauthorized(body.message)
  }
  if (response.statusCode >= 400 || body.code !== 0) {
    throw new Error(normalizeError(body.message))
  }
  return body
}
