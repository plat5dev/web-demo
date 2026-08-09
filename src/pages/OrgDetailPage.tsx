import { useEffect, useState, type FormEvent } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { api } from "../api/endpoints"
import { ApiError } from "../api/client"
import type {
  Membership,
  MembershipRole,
  Organization,
  Profile,
} from "../api/types"
import { ErrorAlert } from "../components/ErrorAlert"
import { useOrg } from "../org/OrgContext"

const ROLES: MembershipRole[] = ["member", "admin", "owner"]

export function OrgDetailPage() {
  const { orgId = "" } = useParams()
  const navigate = useNavigate()
  const { refresh: refreshOrgs, setActiveOrgId, activeOrg } = useOrg()

  const [org, setOrg] = useState<Organization | null>(null)
  const [memberships, setMemberships] = useState<Membership[]>([])
  const [me, setMe] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)

  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [memberUserId, setMemberUserId] = useState("")
  const [memberRole, setMemberRole] = useState<MembershipRole>("member")
  const [adding, setAdding] = useState(false)

  const [probeOrgId, setProbeOrgId] = useState("")
  const [probing, setProbing] = useState(false)
  const [probeResult, setProbeResult] = useState<string | null>(null)

  async function load(id: string) {
    setLoading(true)
    setError(null)
    try {
      const [o, m, profile] = await Promise.all([
        api.getOrganization(id),
        api.listMemberships(id),
        api.getProfileMe(),
      ])
      setOrg(o)
      setName(o.name)
      setSlug(o.slug)
      setMemberships(m)
      setMe(profile)
    } catch (e) {
      setError(e)
      setOrg(null)
      setMemberships([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!orgId) return
    void load(orgId)
  }, [orgId])

  async function onSave(e: FormEvent) {
    e.preventDefault()
    if (!org) return
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const body: { name?: string; slug?: string } = {}
      if (name.trim() !== org.name) body.name = name.trim()
      if (slug.trim() !== org.slug) body.slug = slug.trim()
      if (Object.keys(body).length === 0) {
        setSaved(true)
        return
      }
      const updated = await api.updateOrganization(org.id, body)
      setOrg(updated)
      setName(updated.name)
      setSlug(updated.slug)
      setSaved(true)
      await refreshOrgs()
    } catch (err) {
      setError(err)
    } finally {
      setSaving(false)
    }
  }

  async function onDeleteOrg() {
    if (!org) return
    if (!confirm(`Delete organization "${org.name}"? This cannot be undone.`))
      return
    setError(null)
    try {
      await api.deleteOrganization(org.id)
      if (activeOrg?.id === org.id) setActiveOrgId(null)
      await refreshOrgs()
      navigate("/orgs")
    } catch (err) {
      setError(err)
    }
  }

  async function onAddMember(e: FormEvent) {
    e.preventDefault()
    if (!org) return
    setAdding(true)
    setError(null)
    try {
      await api.createMembership(org.id, {
        user_id: memberUserId.trim(),
        role: memberRole,
      })
      setMemberUserId("")
      setMemberships(await api.listMemberships(org.id))
    } catch (err) {
      setError(err)
    } finally {
      setAdding(false)
    }
  }

  async function onRole(m: Membership, role: MembershipRole) {
    if (!org || m.role === role) return
    setError(null)
    try {
      const updated = await api.updateMembership(org.id, m.id, { role })
      setMemberships((prev) =>
        prev.map((x) => (x.id === updated.id ? updated : x)),
      )
    } catch (err) {
      setError(err)
    }
  }

  async function onRemove(m: Membership) {
    if (!org) return
    if (!confirm(`Remove user ${m.user_id}?`)) return
    setError(null)
    try {
      await api.deleteMembership(org.id, m.id)
      setMemberships(await api.listMemberships(org.id))
    } catch (err) {
      setError(err)
    }
  }

  async function onProbe(e: FormEvent) {
    e.preventDefault()
    const id = probeOrgId.trim()
    if (!id) return
    setProbing(true)
    setProbeResult(null)
    setError(null)
    const path = `/api/organizations/${id}/projects`
    try {
      const data = await api.listProjects(id)
      setProbeResult(
        `GET ${path}\nHTTP 200 (member)\n${JSON.stringify(data, null, 2)}`,
      )
    } catch (err) {
      if (err instanceof ApiError) {
        setProbeResult(
          [
            `GET ${path}`,
            `HTTP ${err.status} ${err.code}`,
            err.message,
            err.requestId ? `request_id=${err.requestId}` : null,
            "",
            err.status === 404
              ? "Expected for non-members: gateway org admission returns 404 (not 403)."
              : null,
          ]
            .filter((line) => line !== null)
            .join("\n"),
        )
      } else {
        setError(err)
      }
    } finally {
      setProbing(false)
    }
  }

  if (loading) {
    return <div className="text-muted">Loading…</div>
  }

  if (!org) {
    return (
      <>
        <ErrorAlert error={error} />
        <Link to="/orgs">← Organizations</Link>
      </>
    )
  }

  return (
    <div>
      <nav aria-label="breadcrumb">
        <ol className="breadcrumb">
          <li className="breadcrumb-item">
            <Link to="/orgs">Organizations</Link>
          </li>
          <li className="breadcrumb-item active" aria-current="page">
            {org.name}
          </li>
        </ol>
      </nav>

      <div className="d-flex flex-wrap gap-2 justify-content-between align-items-start mb-3">
        <div>
          <h1 className="h3 mb-1">{org.name}</h1>
          <p className="small font-monospace text-muted mb-0">{org.id}</p>
        </div>
        <div className="d-flex gap-2">
          <button
            type="button"
            className="btn btn-sm btn-outline-primary"
            onClick={() => setActiveOrgId(org.id)}
          >
            Set active
          </button>
          <Link className="btn btn-sm btn-outline-secondary" to="/projects">
            Projects
          </Link>
        </div>
      </div>

      <ErrorAlert error={error} onDismiss={() => setError(null)} />
      {saved && <div className="alert alert-success py-2">Saved.</div>}

      <div className="row">
        <div className="col-lg-5 mb-4">
          <div className="card mb-3">
            <div className="card-header">Edit organization</div>
            <div className="card-body">
              <form onSubmit={(e) => void onSave(e)}>
                <div className="mb-3">
                  <label className="form-label" htmlFor="org_name">
                    Name
                  </label>
                  <input
                    id="org_name"
                    className="form-control"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    maxLength={128}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label" htmlFor="org_slug">
                    Slug
                  </label>
                  <input
                    id="org_slug"
                    className="form-control font-monospace"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    required
                    maxLength={128}
                  />
                </div>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                >
                  {saving ? "Saving…" : "Save"}
                </button>
              </form>
            </div>
          </div>

          <div className="card border-danger">
            <div className="card-header text-danger">Danger zone</div>
            <div className="card-body">
              <p className="small text-muted mb-2">
                Owner only. Soft-deletes org after checks.
              </p>
              <button
                type="button"
                className="btn btn-outline-danger btn-sm"
                onClick={() => void onDeleteOrg()}
              >
                Delete organization
              </button>
            </div>
          </div>
        </div>

        <div className="col-lg-7 mb-4">
          <h2 className="h5">Memberships</h2>
          <p className="small text-muted">
            Platform API. Your user id:{" "}
            <code className="user-select-all">{me?.user_id ?? "…"}</code>
            {" — "}add another user’s id (from their Profile page) to demo
            multi-user access.
          </p>

          <div className="list-group mb-3">
            {memberships.length === 0 && (
              <div className="list-group-item text-muted">No members.</div>
            )}
            {memberships.map((m) => (
              <div
                key={m.id}
                className="list-group-item d-flex flex-wrap gap-2 justify-content-between align-items-center"
              >
                <div>
                  <div className="font-monospace small">{m.user_id}</div>
                  <div className="small text-muted">
                    {m.status} · {m.id}
                  </div>
                </div>
                <div className="d-flex gap-2 align-items-center">
                  <select
                    className="form-select form-select-sm"
                    style={{ width: "auto" }}
                    value={m.role}
                    onChange={(e) =>
                      void onRole(m, e.target.value as MembershipRole)
                    }
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger"
                    onClick={() => void onRemove(m)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="card mb-4">
            <div className="card-header">Add member</div>
            <div className="card-body">
              <form
                className="row g-2 align-items-end"
                onSubmit={(e) => void onAddMember(e)}
              >
                <div className="col-md-7">
                  <label className="form-label" htmlFor="member_uid">
                    User ID
                  </label>
                  <input
                    id="member_uid"
                    className="form-control font-monospace"
                    value={memberUserId}
                    onChange={(e) => setMemberUserId(e.target.value)}
                    required
                    placeholder="user id from Profile"
                  />
                </div>
                <div className="col-md-3">
                  <label className="form-label" htmlFor="member_role">
                    Role
                  </label>
                  <select
                    id="member_role"
                    className="form-select"
                    value={memberRole}
                    onChange={(e) =>
                      setMemberRole(e.target.value as MembershipRole)
                    }
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-2">
                  <button
                    type="submit"
                    className="btn btn-primary w-100"
                    disabled={adding || !memberUserId.trim()}
                  >
                    {adding ? "…" : "Add"}
                  </button>
                </div>
              </form>
            </div>
          </div>

          <h2 className="h5">Org admission probe</h2>
          <p className="small text-muted">
            <code>GET …/projects</code> for an org you are not a member of →
            gateway <strong>404</strong> (existence policy), not 403.
          </p>
          <form className="card card-body" onSubmit={(e) => void onProbe(e)}>
            <div className="mb-3">
              <label className="form-label" htmlFor="probe_org">
                Organization ID
              </label>
              <input
                id="probe_org"
                className="form-control font-monospace"
                value={probeOrgId}
                onChange={(e) => setProbeOrgId(e.target.value)}
                placeholder="another org id or random ULID"
                required
              />
              <div className="form-text">
                Tip: create a second org, copy its id, switch back here.
              </div>
            </div>
            <button
              type="submit"
              className="btn btn-outline-secondary"
              disabled={probing || !probeOrgId.trim()}
            >
              {probing ? "Probing…" : "Probe projects"}
            </button>
          </form>
          {probeResult && (
            <pre
              className="mt-3 p-3 bg-body-secondary rounded small overflow-auto"
              style={{ maxHeight: "16rem" }}
            >
              {probeResult}
            </pre>
          )}
        </div>
      </div>
    </div>
  )
}
