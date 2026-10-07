export type ApiErrorBody = {
  error: {
    type: string
    code: string
    message: string
    request_id: string | null
    details?: unknown
  }
}

export type Profile = {
  user_id: string
  display_name: string
  bio: string
  created_at: string
  updated_at: string
}

export type OrganizationRef = {
  id: string
  name: string
  slug: string
}

export type Organization = OrganizationRef & {
  created_at: string
  updated_at: string
}

/** Active user membership. `id` is the member id. */
export type Membership = {
  id: string
  organization: OrganizationRef
  status: "active"
}

export type MemberStatus = "active" | "suspended" | "removed"

/** `PATCH /member` accepts these only. */
export type MemberPatchStatus = "active" | "suspended"

export type Member = {
  id: string
  organization_id: string
  principal: "user" | "service_account"
  user_id: string | null
  service_account_id: string | null
  status: MemberStatus
  added_by: string | null
  created_at: string
  updated_at: string
}

export type MemberSession = {
  token: string
  expires_at: string
  member_id: string
  organization_id: string
  /** null = unrestricted (minted from a login). A list only when minted from a restricted user key. */
  scopes: string[] | null
}

export type Project = {
  id: string
  organization_id: string
  name: string
  description: string
  created_by_member_id: string
  created_at: string
  updated_at: string
}

export type TaskStatus = "todo" | "in_progress" | "done"

export type Task = {
  id: string
  organization_id: string
  project_id: string
  title: string
  status: TaskStatus
  created_by_member_id: string
  created_at: string
  updated_at: string
}

export type ServiceAccount = {
  id: string
  organization_id: string
  member_id: string
  name: string
  status: MemberStatus
  created_by_user_id: string | null
  created_at: string
  updated_at: string
}

export type ApiKeyListed = {
  id: string
  key_prefix: string
  name: string
  created_at: string
  revoked_at: string | null
  /** App-owned labels. `null`/omitted = unrestricted. List never includes the secret. */
  scopes?: string[] | null
}

export type ApiKeyCreated = ApiKeyListed & {
  key: string
}

/** Mint JSON. Omit `scopes` for unrestricted; never send `null` or `[]`. */
export type CreateApiKeyBody = {
  name: string
  scopes?: string[]
}

export type InviteStatus = "active" | "redeemed" | "revoked" | "expired"

/** Invite row. `token` is present while `status` is `active`. */
export type Invite = {
  id: string
  organization_id: string
  email: string | null
  token_prefix: string
  token?: string
  status: InviteStatus
  max_uses: number | null
  use_count: number
  expires_at: string
  created_by: string | null
  created_at: string
}

export type CreateInviteBody = {
  email?: string
  expires_in_seconds?: number
  max_uses?: number | null
}
