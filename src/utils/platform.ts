import { getStoredToken } from "./auth"

export function getApiBaseUrl() {
  if (typeof window !== "undefined" && import.meta.env.DEV) {
    return ""
  }
  const explicitBaseUrl = import.meta.env.VITE_API_BASE_URL
  if (explicitBaseUrl) {
    return explicitBaseUrl.replace(/\/$/, "")
  }
  if (typeof window !== "undefined") {
    return ""
  }
  return "http://localhost:1269"
}

export function getDocumentBaseUrl() {
  if (typeof window !== "undefined" && import.meta.env.DEV) {
    return ""
  }
  const explicitDocumentBaseUrl = import.meta.env.VITE_DOCUMENT_BASE_URL
  if (explicitDocumentBaseUrl) {
    return explicitDocumentBaseUrl.replace(/\/$/, "")
  }

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL
  if (apiBaseUrl) {
    return apiBaseUrl.replace(/\/$/, "")
  }

  return "http://localhost:1269"
}

export function toAbsoluteUrl(path?: string | false) {
  if (!path) {
    return ""
  }
  if (/^https?:\/\//.test(path)) {
    return path
  }
  return `${getApiBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`
}

export function openPdfUrl(path?: string | false) {
  const url = !path ? "" : toAbsoluteUrl(path)
  if (!url) {
    uni.showToast({ title: "暂无 PDF", icon: "none" })
    return
  }
  if (typeof window !== "undefined") {
    const token = getStoredToken()
    if (!token) {
      window.open(url, "_blank", "noopener,noreferrer")
      return
    }

    const popup = window.open("", "_blank")
    if (popup) {
      popup.opener = null
      popup.document.title = "加载 PDF..."
      popup.document.body.innerHTML = "<p style='font-family: sans-serif; padding: 24px;'>正在加载 PDF...</p>"
    }

    void fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(async (response) => {
        if (!response.ok) {
          let message = `PDF 打开失败（${response.status}）`
          const contentType = response.headers.get("content-type") || ""
          if (contentType.includes("application/json")) {
            const payload = await response.json().catch(() => null)
            if (payload?.message) {
              message = payload.message
            }
          } else {
            const text = await response.text().catch(() => "")
            if (text) {
              message = text.slice(0, 120)
            }
          }
          throw new Error(message)
        }
        const blob = await response.blob()
        const blobUrl = window.URL.createObjectURL(blob)
        if (popup) {
          popup.location.href = blobUrl
        } else {
          window.open(blobUrl, "_blank", "noopener,noreferrer")
        }
        window.setTimeout(() => {
          window.URL.revokeObjectURL(blobUrl)
        }, 60_000)
      })
      .catch((error: unknown) => {
        popup?.close()
        const message = error instanceof Error ? error.message : "PDF 打开失败"
        uni.showToast({ title: message, icon: "none" })
      })
    return
  }
  uni.setClipboardData({
    data: url,
    showToast: false,
    success: () => {
      uni.showToast({ title: "PDF 链接已复制", icon: "none" })
    }
  })
}
