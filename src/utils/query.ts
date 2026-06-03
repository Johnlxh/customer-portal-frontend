export function withQuery(path: string, params: Record<string, string | number | boolean | undefined>) {
  const search = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== "")
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join("&")
  return search ? `${path}?${search}` : path
}

export function decodeQueryValue(value: unknown, fallback = "") {
  if (value == null || value === "") {
    return fallback
  }
  const normalized = Array.isArray(value) ? String(value[0] || "") : String(value)
  try {
    return decodeURIComponent(normalized)
  } catch {
    return normalized
  }
}
