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

export type Organization = {
  id: string
  name: string
  slug: string
  created_at: string
  updated_at: string
}

export type MemberRole = "member" | "admin" | "owner"

export type MemberStatus = "active" | "suspended" | "removed"

export type Member = {
  id: string
  organization_id: string
  principal: "user" | "service_account"
  user_id: string | null
  service_account_id: string | null
  role: MemberRole
  status: MemberStatus
  added_by: string | null
  created_at: string
  updated_at: string
}

/** @deprecated use Member */
export type Membership = Member
/** @deprecated use MemberRole */
export type MembershipRole = MemberRole
/** @deprecated use MemberStatus */
export type MembershipStatus = MemberStatus

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
}

export type ApiKeyCreated = ApiKeyListed & {
  key: string
}

/** Mint response — token is returned once, like an API key. */
export type InviteCreated = {
  id: string
  token: string
  expires_at: string
  role: MemberRole
}

/** List/revoke echo; never includes token. */
export type InviteListed = {
  id: string
  role: MemberRole
  expires_at: string
  created_at?: string
  revoked_at?: string | null
  redeemed_at?: string | null
}
