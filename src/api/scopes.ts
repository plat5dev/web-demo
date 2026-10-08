/** Role labels (a role, or a member session's): `null` = unrestricted. Empty array is distinct. */
export function scopesSummary(scopes: string[] | null | undefined): string {
  if (scopes == null) return "unrestricted"
  if (scopes.length === 0) return "none"
  return scopes.join(", ")
}
