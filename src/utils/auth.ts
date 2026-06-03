const TOKEN_KEY = "customer_portal_token"

export function getStoredToken() {
  return uni.getStorageSync(TOKEN_KEY) || ""
}

export function setStoredToken(token: string) {
  uni.setStorageSync(TOKEN_KEY, token)
}

export function clearStoredToken() {
  uni.removeStorageSync(TOKEN_KEY)
}
