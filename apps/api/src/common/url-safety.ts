import { createHash } from "node:crypto"

export function hashUrl(url: string): string {
  return createHash("sha256").update(url).digest("hex")
}

export function maskUrl(url: string): string {
  try {
    const parsed = new URL(url)
    const host = parsed.hostname
    const masked = host.length > 6 ? host.slice(0, 4) + "***" : "***"
    return `${parsed.protocol}//${masked}/...`
  } catch {
    return "[invalid-url]"
  }
}
