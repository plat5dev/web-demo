import type { Role } from "./types"

/** A role's labels, or a member session's: `null` = every label. Empty array is distinct. */
export function labelsSummary(labels: string[] | null): string {
  if (labels === null) return "every label"
  if (labels.length === 0) return "no labels"
  return labels.join(", ")
}

export function roleLabels(r: Role): string {
  return labelsSummary(r.labels)
}

/** Whether the session's role labels hold a label. null = every label. */
export function holds(labels: string[] | null, label: string): boolean {
  return labels === null || labels.includes(label)
}

/** "" option label for a create: the server picks default_role. */
export function defaultOption(defaultRole: string | null | undefined) {
  return { label: `default${defaultRole ? ` (${defaultRole})` : ""}` }
}
