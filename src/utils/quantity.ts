export function normalizeQuantityValue(value: number, fallback = 1) {
  return Number.isFinite(value) ? Math.max(fallback, Math.floor(value)) : fallback
}

export function readQuantity(quantityMap: Record<number, number>, id: number, fallback = 1) {
  return quantityMap[id] || fallback
}

export function patchQuantityMap(
  quantityMap: Record<number, number>,
  id: number,
  value: number,
  fallback = 1,
) {
  return {
    ...quantityMap,
    [id]: normalizeQuantityValue(value, fallback),
  }
}

export function buildQuantityMap<T>(
  items: T[],
  getId: (item: T) => number,
  getValue: (item: T) => number,
  fallback = 1,
) {
  return Object.fromEntries(
    items.map((item) => [getId(item), normalizeQuantityValue(getValue(item), fallback)]),
  )
}

export function parseQuantityInput(event: Event | { detail?: { value?: string | number } }) {
  const rawValue = String((event as { detail?: { value?: string | number } })?.detail?.value ?? "").trim()
  return Number(rawValue)
}
