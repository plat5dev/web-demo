import { apiFetch, type FetchAuth } from "./client"
import type {
  ApiKeyCreated,
  ApiKeyListed,
  CreateApiKeyBody,
  InviteCreated,
  InviteListed,
  Member,
  MemberRole,
  MemberStatus,
  Organization,
  Profile,
  Project,
  ServiceAccount,
  Task,
  TaskStatus,
} from "./types"

function orgBase(orgId: string): string {
  return `/api/organizations/${orgId}`
}

function userKeysBase(userId: string): string {
  return `/api/users/${userId}/api-keys`
}

function memberKeysBase(orgId: string, memberId: string): string {
  return `${orgBase(orgId)}/members/${memberId}/api-keys`
}

function saBase(orgId: string): string {
  return `${orgBase(orgId)}/service-accounts`
}

function invitesBase(orgId: string): string {
  return `${orgBase(orgId)}/invites`
}

export const api = {
  getProfileMe: () => apiFetch<Profile>("/api/profiles/me"),

  putProfileMe: (body: { display_name: string; bio?: string }) =>
    apiFetch<Profile>("/api/profiles/me", {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  listOrganizations: async () => {
    const data = await apiFetch<{ organizations: Organization[] }>(
      "/api/organizations",
    )
    return data.organizations ?? []
  },

  getOrganization: (orgId: string) =>
    apiFetch<Organization>(orgBase(orgId)),

  createOrganization: (body: { name: string; slug?: string }) =>
    apiFetch<Organization>("/api/organizations", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  updateOrganization: (
    orgId: string,
    body: { name?: string; slug?: string },
  ) =>
    apiFetch<Organization>(orgBase(orgId), {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  deleteOrganization: (orgId: string) =>
    apiFetch<void>(orgBase(orgId), { method: "DELETE" }),

  listMembers: async (orgId: string) => {
    const data = await apiFetch<{ members: Member[] }>(
      `${orgBase(orgId)}/members`,
    )
    return data.members ?? []
  },

  createMember: (
    orgId: string,
    body: { user_id: string; role?: MemberRole },
  ) =>
    apiFetch<Member>(`${orgBase(orgId)}/members`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  updateMember: (
    orgId: string,
    memberId: string,
    body: { role?: MemberRole; status?: MemberStatus },
  ) =>
    apiFetch<Member>(`${orgBase(orgId)}/members/${memberId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  deleteMember: (orgId: string, memberId: string) =>
    apiFetch<void>(`${orgBase(orgId)}/members/${memberId}`, {
      method: "DELETE",
    }),

  listInvites: async (orgId: string) => {
    const data = await apiFetch<{ invites: InviteListed[] }>(
      invitesBase(orgId),
    )
    return data.invites ?? []
  },

  createInvite: (
    orgId: string,
    body?: { role?: MemberRole; expires_in_seconds?: number },
  ) =>
    apiFetch<InviteCreated>(invitesBase(orgId), {
      method: "POST",
      body: JSON.stringify(body ?? {}),
    }),

  revokeInvite: (orgId: string, inviteId: string) =>
    apiFetch<void>(`${invitesBase(orgId)}/${inviteId}`, {
      method: "DELETE",
    }),

  /** User-scope redeem. Body is `{ token }` only; caller is the session JWT. */
  redeemInvite: (token: string) =>
    apiFetch<Member>("/api/invites/redeem", {
      method: "POST",
      body: JSON.stringify({ token }),
    }),

  listProjects: async (orgId: string) => {
    const data = await apiFetch<{ projects: Project[] }>(
      `${orgBase(orgId)}/projects`,
    )
    return data.projects
  },

  createProject: (
    orgId: string,
    body: { name: string; description?: string },
  ) =>
    apiFetch<Project>(`${orgBase(orgId)}/projects`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  getProject: (orgId: string, projectId: string) =>
    apiFetch<Project>(`${orgBase(orgId)}/projects/${projectId}`),

  updateProject: (
    orgId: string,
    projectId: string,
    body: { name?: string; description?: string },
  ) =>
    apiFetch<Project>(`${orgBase(orgId)}/projects/${projectId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  deleteProject: (orgId: string, projectId: string) =>
    apiFetch<void>(`${orgBase(orgId)}/projects/${projectId}`, {
      method: "DELETE",
    }),

  listTasks: async (orgId: string, projectId: string) => {
    const data = await apiFetch<{ tasks: Task[] }>(
      `${orgBase(orgId)}/projects/${projectId}/tasks`,
    )
    return data.tasks
  },

  createTask: (
    orgId: string,
    projectId: string,
    body: { title: string; status?: TaskStatus },
  ) =>
    apiFetch<Task>(`${orgBase(orgId)}/projects/${projectId}/tasks`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  updateTask: (
    orgId: string,
    projectId: string,
    taskId: string,
    body: { title?: string; status?: TaskStatus },
  ) =>
    apiFetch<Task>(
      `${orgBase(orgId)}/projects/${projectId}/tasks/${taskId}`,
      {
        method: "PATCH",
        body: JSON.stringify(body),
      },
    ),

  deleteTask: (orgId: string, projectId: string, taskId: string) =>
    apiFetch<void>(
      `${orgBase(orgId)}/projects/${projectId}/tasks/${taskId}`,
      { method: "DELETE" },
    ),

  listServiceAccounts: async (orgId: string) => {
    const data = await apiFetch<{ service_accounts: ServiceAccount[] }>(
      saBase(orgId),
    )
    return data.service_accounts ?? []
  },

  createServiceAccount: (orgId: string, body: { name: string }) =>
    apiFetch<ServiceAccount>(saBase(orgId), {
      method: "POST",
      body: JSON.stringify(body),
    }),

  updateServiceAccount: (
    orgId: string,
    saId: string,
    body: { name: string },
  ) =>
    apiFetch<ServiceAccount>(`${saBase(orgId)}/${saId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  deleteServiceAccount: (orgId: string, saId: string) =>
    apiFetch<void>(`${saBase(orgId)}/${saId}`, { method: "DELETE" }),

  listApiKeys: async (userId: string) => {
    const data = await apiFetch<{ keys: ApiKeyListed[] }>(
      userKeysBase(userId),
    )
    return data.keys ?? []
  },

  createApiKey: (userId: string, body: CreateApiKeyBody) =>
    apiFetch<ApiKeyCreated>(userKeysBase(userId), {
      method: "POST",
      body: JSON.stringify(body),
    }),

  deleteApiKey: (userId: string, id: string) =>
    apiFetch<void>(`${userKeysBase(userId)}/${id}`, {
      method: "DELETE",
    }),

  listMemberApiKeys: async (orgId: string, memberId: string) => {
    const data = await apiFetch<{ keys: ApiKeyListed[] }>(
      memberKeysBase(orgId, memberId),
    )
    return data.keys ?? []
  },

  createMemberApiKey: (
    orgId: string,
    memberId: string,
    body: CreateApiKeyBody,
  ) =>
    apiFetch<ApiKeyCreated>(memberKeysBase(orgId, memberId), {
      method: "POST",
      body: JSON.stringify(body),
    }),

  deleteMemberApiKey: (orgId: string, memberId: string, keyId: string) =>
    apiFetch<void>(`${memberKeysBase(orgId, memberId)}/${keyId}`, {
      method: "DELETE",
    }),

  /** Call any gateway path with explicit auth (for API key try-it / isolation). */
  probe: <T>(path: string, auth?: FetchAuth) =>
    apiFetch<T>(path, auth ? { auth } : {}),
}
