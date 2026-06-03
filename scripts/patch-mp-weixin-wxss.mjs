import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs"
import { join } from "node:path"

const OUTPUT_DIR = "dist/build/mp-weixin"

const PORTAL_TOKENS = {
  "--portal-primary": "#2f6fde",
  "--portal-primary-hover": "#255bc0",
  "--portal-primary-soft": "#e9f1ff",
  "--portal-primary-tint": "#f3f7ff",
  "--portal-success": "#1f7a62",
  "--portal-warning": "#b7791f",
  "--portal-danger": "#c24141",
  "--portal-bg": "#eef2f8",
  "--portal-surface": "#ffffff",
  "--portal-surface-muted": "#f4f7fb",
  "--portal-border": "#d3dbe8",
  "--portal-border-strong": "#9fb4d8",
  "--portal-panel": "#0e1b2e",
  "--portal-panel-soft": "#152640",
  "--portal-text": "#16253b",
  "--portal-text-muted": "#62718a",
  "--portal-text-placeholder": "#93a0b5",
  "--portal-radius": "18rpx",
  "--portal-shadow": "0 14rpx 36rpx -24rpx rgba(18, 37, 63, 0.18)",
  "--portal-shadow-hover": "0 18rpx 44rpx -26rpx rgba(18, 37, 63, 0.18)",
  "--portal-shell-gap": "32px",
  "--portal-content-max": "1360px",
  "--portal-transition": "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  "--portal-bg-mask": "rgba(15, 23, 42, 0.4)",
}

function walk(dir) {
  const entries = readdirSync(dir)
  const files = []

  for (const entry of entries) {
    const target = join(dir, entry)
    const stats = statSync(target)
    if (stats.isDirectory()) {
      files.push(...walk(target))
      continue
    }
    if (target.endsWith(".wxss")) {
      files.push(target)
    }
  }

  return files
}

function replacePortalTokens(source) {
  return source.replace(/var\((--portal-[a-z0-9-]+)\)/gi, (match, token) => {
    return PORTAL_TOKENS[token] || match
  })
}

function main() {
  const files = walk(OUTPUT_DIR)
  let patchedFiles = 0

  for (const file of files) {
    const original = readFileSync(file, "utf8")
    const patched = replacePortalTokens(original)
    if (patched === original) {
      continue
    }
    writeFileSync(file, patched, "utf8")
    patchedFiles += 1
  }

  console.log(`[patch-mp-weixin-wxss] patched ${patchedFiles} wxss files`)
}

main()
