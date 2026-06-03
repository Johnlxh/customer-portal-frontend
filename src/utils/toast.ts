export function getErrorMessage(error: unknown, fallback = "操作失败，请稍后重试") {
  return error instanceof Error ? error.message : fallback
}

export function showToast(title: string, icon: "none" | "success" = "none") {
  uni.showToast({ title, icon })
}

export function showErrorToast(error: unknown, fallback = "操作失败，请稍后重试") {
  showToast(getErrorMessage(error, fallback), "none")
}

export function showSuccessToast(title: string) {
  showToast(title, "success")
}
