import { useEffect, useState, type FormEvent } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { api } from "../api/endpoints"
import { ApiError } from "../api/client"
import type {
  Member,
  MemberPatchStatus,
  MemberSession,
  Organization,
  Profile,
  ServiceAccount,
} from "../api/types"
import { ErrorAlert } from "../components/ErrorAlert"
import { InvitePanel } from "../components/InvitePanel"
import { MemberKeysPanel } from "../components/MemberKeysPanel"
import { ServiceAccountKeys } from "../components/ServiceAccountKeys"
import { useOrg } from "../org/OrgContext"

const SELF_STATUSES: MemberPatchStatus[] = ["active", "suspended"]

export function OrgDetailPage() {
  const { orgId = "" } = useParams()
  const {
    activeOrgId,
    setActiveOrgId,
    session,
    sessionLoading,
    sessionError,
    refreshSession,
  } = useOrg()

  useEffect(() => {
    if (orgId && orgId !== activeOrgId) setActiveOrgId(orgId)
  }, [orgId, activeOrgId, setActiveOrgId])

  if (!orgId) {
    return <Link to="/orgs">← Organizations</Link>
  }

  if (sessionError && activeOrgId === orgId) {
    return (
      <>
        <ErrorAlert error={sessionError} />
        <p className="small text-muted">
          {sessionError instanceof ApiError && sessionError.status === 404
            ? "Not an active member. Organization routes are not called with the user JWT."
            : "Organization and member routes use a member session, not the user JWT."}
        </p>
        <div className="d-flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={refreshSession}
          >
            Retry session
          </button>
          <Link to="/orgs">← Organizations</Link>
        </div>
      </>
    )
  }

  if (
    sessionLoading ||
    activeOrgId !== orgId ||
    !session ||
    session.organization_id !== orgId
  ) {
    return <div className="text-muted">Opening member session…</div>
  }

  return <OrgDetailLoaded key={session.token} session={session} />
}

function OrgDetailLoaded({ session }: { session: MemberSession }) {
  const navigate = useNavigate()
  const { refresh: refreshOrgs, setActiveOrgId, activeOrg } = useOrg()

  const [org, setOrg] = useState<Organization | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [serviceAccounts, setServiceAccounts] = useState<ServiceAccount[]>([])
  const [me, setMe] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)

  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [memberUserId, setMemberUserId] = useState("")
  const [adding, setAdding] = useState(false)
  const [statusSaving, setStatusSaving] = useState(false)

  const [saName, setSaName] = useState("")
  const [creatingSa, setCreatingSa] = useState(false)

  const [probeOrgId, setProbeOrgId] = useState("")
  const [probing, setProbing] = useState(false)
  const [probeResult, setProbeResult] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const [o, m, sas, self] = await Promise.all([
          api.getOrg(session.token),
          api.listMembers(session.token),
          api.listServiceAccounts(session.token),
          api.getMember(session.token),
        ])
        if (cancelled) return
        setOrg(o)
        setName(o.name)
        setSlug(o.slug)
        setMembers(m.some((row) => row.id === self.id) ? m : [self, ...m])
        setServiceAccounts(sas)
        void api.getProfile().then(
          (profile) => {
            if (!cancelled) setMe(profile)
          },
          () => {
            if (!cancelled) setMe(null)
          },
        )
      } catch (e) {
        if (cancelled) return
        setError(e)
        setOrg(null)
        setMembers([])
        setServiceAccounts([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [session.token])

  async function reloadMembers() {
    const [mList, saList, self] = await Promise.all([
      api.listMembers(session.token),
      api.listServiceAccounts(session.token),
      api.getMember(session.token),
    ])
    setMembers(mList.some((row) => row.id === self.id) ? mList : [self, ...mList])
    setServiceAccounts(saList)
  }

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
      const updated = await api.updateOrg(session.token, body)
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
      await api.deleteOrg(session.token)
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
      await api.createMember(session.token, { user_id: memberUserId.trim() })
      setMemberUserId("")
      await reloadMembers()
    } catch (err) {
      setError(err)
    } finally {
      setAdding(false)
    }
  }

  async function onSelfStatus(status: MemberPatchStatus) {
    const mine = members.find((m) => m.id === session.member_id)
    if (!mine || mine.status === status) return
    if (status === "suspended") {
      if (
        !confirm(
          "Suspend your membership? A suspended member does not get a member session, so organization routes will not admit you.",
        )
      )
        return
    }
    setStatusSaving(true)
    setError(null)
    try {
      await api.updateMember(session.token, { status })
      if (status === "suspended") {
        setActiveOrgId(null)
        await refreshOrgs()
        navigate("/orgs")
        return
      }
      await reloadMembers()
    } catch (err) {
      setError(err)
    } finally {
      setStatusSaving(false)
    }
  }

  async function onLeave() {
    if (!org) return
    if (!confirm(`Leave "${org.name}"?`)) return
    setError(null)
    try {
      await api.deleteMember(session.token)
      setActiveOrgId(null)
      await refreshOrgs()
      navigate("/orgs")
    } catch (err) {
      setError(err)
    }
  }

  async function onCreateSa(e: FormEvent) {
    e.preventDefault()
    if (!org) return
    setCreatingSa(true)
    setError(null)
    try {
      await api.createServiceAccount(session.token, { name: saName.trim() })
      setSaName("")
      await reloadMembers()
    } catch (err) {
      setError(err)
    } finally {
      setCreatingSa(false)
    }
  }

  async function onDeleteSa(sa: ServiceAccount) {
    if (!org) return
    if (!confirm(`Delete service account "${sa.name}"?`)) return
    setError(null)
    try {
      await api.deleteServiceAccount(session.token, sa.id)
      await reloadMembers()
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
    const path = `POST /user/organizations/${id}/session`
    try {
      const minted = await api.createMemberSession(id)
      setProbeResult(
        [
          path,
          "HTTP 201",
          "Member session. Send as X-API-Key on organization and member routes.",
          "This probe does not replace the app session, and does not call /org with the user JWT.",
          minted.token,
          `member_id=${minted.member_id}`,
          `organization_id=${minted.organization_id}`,
          `expires_at=${minted.expires_at}`,
        ].join("\n"),
      )
    } catch (err) {
      if (err instanceof ApiError) {
        setProbeResult(
          [
            path,
            `HTTP ${err.status} ${err.code}`,
            err.message,
            err.requestId ? `request_id=${err.requestId}` : null,
            "",
            err.status === 404
              ? "Not an active member. Organization routes are not called with the user JWT."
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

  function memberLabel(m: Member): string {
    if (m.principal === "service_account") {
      const sa = serviceAccounts.find((s) => s.id === m.service_account_id)
      return sa?.name ?? m.service_account_id ?? m.id
    }
    return m.user_id ?? m.id
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
          <p className="small font-monospace text-muted mb-0">
            member {session.member_id}
          </p>
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

      <p className="small text-muted">
        <code>GET/PATCH/DELETE /org</code> uses the member session (
        <code>X-API-Key</code>), not the user JWT. The gateway fills the
        subject into the path.
      </p>

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

          <div className="card mb-3">
            <div className="card-header">Service accounts</div>
            <div className="card-body">
              <p className="small text-muted">
                Non-human members of this org. Create adds a service account
                and an active member. Keys are member keys, minted here for
                that service account.
              </p>
              <div className="list-group mb-3">
                {serviceAccounts.length === 0 && (
                  <div className="list-group-item text-muted">None yet.</div>
                )}
                {serviceAccounts.map((sa) => (
                  <div key={sa.id} className="list-group-item">
                    <div className="d-flex flex-wrap gap-2 justify-content-between align-items-start">
                      <div>
                        <div className="fw-semibold">
                          {sa.name}{" "}
                          {sa.status === "suspended" && (
                            <span className="badge text-bg-secondary">
                              suspended
                            </span>
                          )}
                        </div>
                        <div className="small font-monospace text-muted">
                          sa {sa.id}
                        </div>
                        <div className="small font-monospace text-muted">
                          member {sa.member_id}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => void onDeleteSa(sa)}
                      >
                        Delete
                      </button>
                    </div>
                    <ServiceAccountKeys
                      sessionToken={session.token}
                      serviceAccountId={sa.id}
                    />
                  </div>
                ))}
              </div>
              <form
                className="row g-2 align-items-end"
                onSubmit={(e) => void onCreateSa(e)}
              >
                <div className="col">
                  <label className="form-label" htmlFor="sa_name">
                    Name
                  </label>
                  <input
                    id="sa_name"
                    className="form-control"
                    value={saName}
                    onChange={(e) => setSaName(e.target.value)}
                    required
                    maxLength={128}
                    placeholder="deploy-bot"
                  />
                </div>
                <div className="col-auto">
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={creatingSa || !saName.trim()}
                  >
                    {creatingSa ? "…" : "Create"}
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div className="card border-danger">
            <div className="card-header text-danger">Danger zone</div>
            <div className="card-body">
              <p className="small text-muted mb-2">
                Deletes the organization and its members, invites, service
                accounts, and keys.
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
          <h2 className="h5">Members</h2>
          <p className="small text-muted">
            <code>GET/POST /org/members</code> with the member session. Your
            user id:{" "}
            <code className="user-select-all">{me?.user_id ?? "…"}</code>
            {" — "}add another user’s id (from their Profile page). Service
            accounts appear here too (<code>principal=service_account</code>).
            Your status is <code>PATCH /member</code> (<code>active</code> or{" "}
            <code>suspended</code>).
          </p>

          <div className="list-group mb-3">
            {members.length === 0 && (
              <div className="list-group-item text-muted">No members.</div>
            )}
            {members.map((m) => {
              const isMe = m.id === session.member_id
              return (
                <div
                  key={m.id}
                  className="list-group-item d-flex flex-wrap gap-2 justify-content-between align-items-center"
                >
                  <div>
                    <div className="d-flex flex-wrap align-items-center gap-2">
                      <span className="font-monospace small">
                        {memberLabel(m)}
                      </span>
                      <span
                        className={`badge ${
                          m.principal === "service_account"
                            ? "text-bg-info"
                            : "text-bg-light border"
                        }`}
                      >
                        {m.principal}
                      </span>
                      {isMe && (
                        <span className="badge text-bg-primary">you</span>
                      )}
                    </div>
                    <div className="small text-muted">
                      {m.status} · member {m.id}
                    </div>
                  </div>
                  {isMe && (
                    <div className="d-flex gap-2 align-items-center">
                      <select
                        className="form-select form-select-sm"
                        style={{ width: "auto" }}
                        aria-label="Your membership status"
                        value={
                          m.status === "active" || m.status === "suspended"
                            ? m.status
                            : "active"
                        }
                        disabled={statusSaving}
                        onChange={(e) =>
                          void onSelfStatus(e.target.value as MemberPatchStatus)
                        }
                      >
                        {SELF_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => void onLeave()}
                      >
                        Leave
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div className="mb-4">
            <MemberKeysPanel
              sessionToken={session.token}
              memberId={session.member_id}
            />
          </div>

          <InvitePanel sessionToken={session.token} onError={setError} />

          <div className="card mb-4">
            <div className="card-header">Add user member</div>
            <div className="card-body">
              <form
                className="row g-2 align-items-end"
                onSubmit={(e) => void onAddMember(e)}
              >
                <div className="col">
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
                <div className="col-auto">
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={adding || !memberUserId.trim()}
                  >
                    {adding ? "…" : "Add"}
                  </button>
                </div>
              </form>
            </div>
          </div>

          <h2 className="h5">Member session probe</h2>
          <p className="small text-muted">
            <code>POST /user/organizations/{"{id}"}/session</code> with the user
            JWT. Not an active member → <strong>404</strong>. A user JWT on{" "}
            <code>/org</code> is 401; this probe does not send one.
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
              {probing ? "Probing…" : "Mint session"}
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
