import type { Role } from "./types"

/** The label that grants every label. */
export const EVERY_LABEL = "*"

/** A role's labels, or a member session's. `["*"]` = every label; `[]` = none. */
export function labelsSummary(labels: string[]): string {
  if (labels.includes(EVERY_LABEL)) return "every label"
  if (labels.length === 0) return "no labels"
  return labels.join(", ")
}

export function roleLabels(r: Role): string {
  return labelsSummary(r.labels)
}

/** Whether the session's role labels hold a label. `*` holds them all. */
export function holds(labels: string[], label: string): boolean {
  return labels.includes(EVERY_LABEL) || labels.includes(label)
}

/** "" option label for a create: the server picks default_role. */
export function defaultOption(defaultRole: string | null | undefined) {
  return { label: `default${defaultRole ? ` (${defaultRole})` : ""}` }
}
