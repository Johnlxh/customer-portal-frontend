export function formatMoney(amount?: number, currency = "CNY") {
  const numeric = Number(amount || 0)
  try {
    return new Intl.NumberFormat("zh-CN", {
      style: "currency",
      currency,
      minimumFractionDigits: 2
    }).format(numeric)
  } catch (error) {
    return `${numeric.toFixed(2)} ${currency}`
  }
}
