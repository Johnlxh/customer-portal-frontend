const RECENT_SEARCHES_KEY = "portal.stock.recent-searches.v1"
const MAX_RECENT_SEARCHES = 8

const SEARCH_SYNONYM_GROUPS = [
  ["微断", "小型断路器"],
  ["空开", "空气断路器"],
  ["漏保", "漏电保护器"],
  ["塑壳", "塑壳断路器"],
] as const

export interface SearchVariant {
  query: string
  reason: "raw" | "segmented" | "alias"
}

export interface SearchPlan {
  rawQuery: string
  normalizedQuery: string
  variants: SearchVariant[]
}

export function normalizeSearchText(input: string) {
  return toHalfWidth(input)
    .replace(/[‐‑–—_+/\\|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase()
}

export function buildSearchPlan(input: string): SearchPlan {
  const rawQuery = `${input || ""}`.trim()
  const normalizedQuery = normalizeSearchText(rawQuery)
  const variants: SearchVariant[] = []

  pushVariant(variants, normalizedQuery, "raw")
  pushVariant(variants, segmentCompactQuery(normalizedQuery), "segmented")

  for (const variant of [...variants]) {
    for (const synonymQuery of expandSynonymQuery(variant.query)) {
      pushVariant(variants, synonymQuery, "alias")
    }
  }

  return {
    rawQuery,
    normalizedQuery,
    variants,
  }
}

export function matchesSearchText(fields: Array<string | undefined | null>, query: string) {
  const plan = buildSearchPlan(query)
  if (!plan.normalizedQuery) {
    return true
  }

  const haystack = normalizeSearchText(fields.filter(Boolean).join(" "))
  const compactHaystack = compactSearchText(haystack)

  return plan.variants.some((variant) => {
    const compactVariant = compactSearchText(variant.query)
    if (haystack.includes(variant.query) || compactHaystack.includes(compactVariant)) {
      return true
    }
    const tokens = variant.query.split(" ").filter(Boolean)
    return tokens.length > 1 && tokens.every((token) => haystack.includes(token) || compactHaystack.includes(token))
  })
}

export function loadRecentSearches() {
  try {
    const saved = uni.getStorageSync(RECENT_SEARCHES_KEY)
    if (!Array.isArray(saved)) {
      return [] as string[]
    }
    return saved.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
  } catch (error) {
    return [] as string[]
  }
}

export function saveRecentSearch(query: string) {
  const normalized = `${query || ""}`.trim()
  if (!normalized) {
    return loadRecentSearches()
  }
  const next = [normalized, ...loadRecentSearches().filter((item) => item !== normalized)].slice(0, MAX_RECENT_SEARCHES)
  try {
    uni.setStorageSync(RECENT_SEARCHES_KEY, next)
  } catch (error) {
    return next
  }
  return next
}

function pushVariant(variants: SearchVariant[], query: string, reason: SearchVariant["reason"]) {
  const normalized = normalizeSearchText(query)
  if (!normalized || variants.some((item) => item.query === normalized)) {
    return
  }
  variants.push({ query: normalized, reason })
}

function compactSearchText(input: string) {
  return normalizeSearchText(input).replace(/\s+/g, "")
}

function segmentCompactQuery(input: string) {
  return input
    .split(" ")
    .filter(Boolean)
    .map((part) => {
      if (/[\u4e00-\u9fff]/.test(part)) {
        return part
      }
      const segments = part.match(/[A-Z]+|[0-9]+/g)
      if (!segments || segments.length <= 1) {
        return part
      }
      return segments.join(" ")
    })
    .join(" ")
}

function expandSynonymQuery(query: string) {
  const variants = new Set<string>()

  for (const group of SEARCH_SYNONYM_GROUPS) {
    const target = group[group.length - 1]
    for (const alias of group) {
      if (!query.includes(alias.toUpperCase())) {
        continue
      }
      variants.add(query.replace(new RegExp(alias.toUpperCase(), "g"), target.toUpperCase()))
    }
  }

  return [...variants]
}

function toHalfWidth(input: string) {
  return input.replace(/[！-～]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0)).replace(/　/g, " ")
}
