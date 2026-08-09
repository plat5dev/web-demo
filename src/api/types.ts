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
  settings: Record<string, unknown>
  created_at: string
  updated_at: string
}

export type MembershipRole = "member" | "admin" | "owner"

export type MembershipStatus =
  | "pending"
  | "active"
  | "suspended"
  | "removed"

export type Membership = {
  id: string
  organization_id: string
  user_id: string
  role: MembershipRole
  status: MembershipStatus
  invited_by: string | null
  created_at: string
  updated_at: string
}

export type Project = {
  id: string
  organization_id: string
  name: string
  description: string
  created_by_membership_id: string
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
  created_by_membership_id: string
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
