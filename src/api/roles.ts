import type { Role } from "./types"

export function roleLabels(r: Role): string {
  if (r.scopes === null) return "every label"
  if (r.scopes.length === 0) return "no labels"
  return r.scopes.join(", ")
}

/** Whether the session's role labels hold a label. null = unrestricted. */
export function holds(scopes: string[] | null, label: string): boolean {
  return scopes === null || scopes.includes(label)
}

/** "" option label for a create: the server picks default_role. */
export function defaultOption(defaultRole: string | null | undefined) {
  return { label: `default${defaultRole ? ` (${defaultRole})` : ""}` }
}
