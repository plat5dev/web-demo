import { roleLabels } from "../api/roles"
import type { Role } from "../api/types"

/**
 * Picks a role from the deployment's roles file. Renders nothing without one.
 * The empty option is value "": on a create it means "omit role" (the server
 * picks default_role); on an existing member with no role it is just a label.
 */
export function RoleSelect({
  id,
  roles,
  value,
  onChange,
  empty,
  disabled,
  ariaLabel,
}: {
  id?: string
  roles: Role[]
  value: string
  onChange: (role: string) => void
  empty?: { label: string; disabled?: boolean }
  disabled?: boolean
  ariaLabel?: string
}) {
  if (roles.length === 0) return null
  return (
    <select
      id={id}
      className="form-select form-select-sm"
      style={{ width: "auto" }}
      aria-label={ariaLabel ?? "Role"}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
    >
      {empty && (
        <option value="" disabled={empty.disabled}>
          {empty.label}
        </option>
      )}
      {roles.map((r) => (
        <option key={r.slug} value={r.slug} title={roleLabels(r)}>
          {r.slug}
        </option>
      ))}
    </select>
  )
}
