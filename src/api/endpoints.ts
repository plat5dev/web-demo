import { apiFetch, type FetchAuth } from "./client"
import type {
  ApiKeyCreated,
  ApiKeyListed,
  Membership,
  MembershipRole,
  MembershipStatus,
  Organization,
  Profile,
  Project,
  Task,
  TaskStatus,
} from "./types"

function orgBase(orgId: string): string {
  return `/api/organizations/${orgId}`
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
      body: JSON.stringify({ ...body, settings: {} }),
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

  listMemberships: async (orgId: string) => {
    const data = await apiFetch<{ memberships: Membership[] }>(
      `${orgBase(orgId)}/memberships`,
    )
    return data.memberships ?? []
  },

  createMembership: (
    orgId: string,
    body: { user_id: string; role?: MembershipRole },
  ) =>
    apiFetch<Membership>(`${orgBase(orgId)}/memberships`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  updateMembership: (
    orgId: string,
    membershipId: string,
    body: { role?: MembershipRole; status?: MembershipStatus },
  ) =>
    apiFetch<Membership>(`${orgBase(orgId)}/memberships/${membershipId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  deleteMembership: (orgId: string, membershipId: string) =>
    apiFetch<void>(`${orgBase(orgId)}/memberships/${membershipId}`, {
      method: "DELETE",
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

  listApiKeys: async () => {
    const data = await apiFetch<{ keys: ApiKeyListed[] }>("/api/keys")
    return data.keys ?? []
  },

  createApiKey: (body: { name: string }) =>
    apiFetch<ApiKeyCreated>("/api/keys", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  deleteApiKey: (id: string) =>
    apiFetch<{ revoked: boolean }>(`/api/keys/${id}`, {
      method: "DELETE",
    }),

  /** Call any gateway path with explicit auth (for API key try-it / isolation). */
  probe: <T>(path: string, auth?: FetchAuth) =>
    apiFetch<T>(path, auth ? { auth } : {}),
}
