import type { CreateApiKeyBody } from "./types"

/**
 * Freeform comma/space-separated labels (apps own the vocabulary).
 * Blank → undefined so mint JSON omits `scopes` (unrestricted).
 * Does not return `[]` or `null` — empty list is not sent.
 */
export function parseScopeLabels(raw: string): string[] | undefined {
  const labels = raw
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
  return labels.length > 0 ? labels : undefined
}

export function mintKeyBody(name: string, scopesRaw: string): CreateApiKeyBody {
  const body: CreateApiKeyBody = { name }
  const scopes = parseScopeLabels(scopesRaw)
  if (scopes) body.scopes = scopes
  return body
}

/** List/get echo: `null` or missing = unrestricted. Empty array is distinct. */
export function scopesSummary(scopes: string[] | null | undefined): string {
  if (scopes == null) return "unrestricted"
  if (scopes.length === 0) return "none"
  return scopes.join(", ")
}
