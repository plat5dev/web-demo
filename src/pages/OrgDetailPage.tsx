import { useEffect, useState, type FormEvent } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { api } from "../api/endpoints"
import { ApiError } from "../api/client"
import type {
  InviteCreated,
  InviteListed,
  Member,
  MemberRole,
  Organization,
  Profile,
  ServiceAccount,
} from "../api/types"
import { ErrorAlert } from "../components/ErrorAlert"
import { MemberKeysPanel } from "../components/MemberKeysPanel"
import { useOrg } from "../org/OrgContext"
import { memberKeyPrefix } from "../config"
import { INVITE_QUERY } from "../auth/session"

const HUMAN_ROLES: MemberRole[] = ["member", "admin", "owner"]
const SA_ROLES: MemberRole[] = ["member", "admin"]

function inviteCopyLink(token: string): string {
  return `${window.location.origin}/login?${INVITE_QUERY}=${token}`
}

export function OrgDetailPage() {
  const { orgId = "" } = useParams()
  const navigate = useNavigate()
  const { refresh: refreshOrgs, setActiveOrgId, activeOrg } = useOrg()

  const [org, setOrg] = useState<Organization | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [serviceAccounts, setServiceAccounts] = useState<ServiceAccount[]>([])
  const [invites, setInvites] = useState<InviteListed[]>([])
  const [me, setMe] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)

  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [memberUserId, setMemberUserId] = useState("")
  const [memberRole, setMemberRole] = useState<MemberRole>("member")
  const [adding, setAdding] = useState(false)

  const [inviteRole, setInviteRole] = useState<MemberRole>("member")
  const [minting, setMinting] = useState(false)
  const [createdInvite, setCreatedInvite] = useState<InviteCreated | null>(null)
  const [copiedInvite, setCopiedInvite] = useState(false)

  const [saName, setSaName] = useState("")
  const [creatingSa, setCreatingSa] = useState(false)

  const [keysMemberId, setKeysMemberId] = useState<string | null>(null)

  const [probeOrgId, setProbeOrgId] = useState("")
  const [probing, setProbing] = useState(false)
  const [probeResult, setProbeResult] = useState<string | null>(null)

  async function load(id: string) {
    setLoading(true)
    setError(null)
    try {
      const [o, m, sas, profile, inviteList] = await Promise.all([
        api.getOrganization(id),
        api.listMembers(id),
        api.listServiceAccounts(id),
        api.getProfileMe(),
        api.listInvites(id),
      ])
      setOrg(o)
      setName(o.name)
      setSlug(o.slug)
      setMembers(m)
      setServiceAccounts(sas)
      setMe(profile)
      setInvites(inviteList)
    } catch (e) {
      setError(e)
      setOrg(null)
      setMembers([])
      setServiceAccounts([])
      setInvites([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!orgId) return
    void load(orgId)
  }, [orgId])

  const myMember = members.find(
    (m) => m.principal === "user" && m.user_id === me?.user_id,
  )

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
      await api.createMember(org.id, {
        user_id: memberUserId.trim(),
        role: memberRole,
      })
      setMemberUserId("")
      setMembers(await api.listMembers(org.id))
    } catch (err) {
      setError(err)
    } finally {
      setAdding(false)
    }
  }

  async function copyInviteLink(token: string) {
    const link = inviteCopyLink(token)
    try {
      await navigator.clipboard.writeText(link)
      setCopiedInvite(true)
    } catch {
      setCopiedInvite(false)
    }
  }

  async function onMintInvite(e: FormEvent) {
    e.preventDefault()
    if (!org) return
    setMinting(true)
    setError(null)
    setCreatedInvite(null)
    setCopiedInvite(false)
    try {
      const created = await api.createInvite(org.id, { role: inviteRole })
      setCreatedInvite(created)
      await copyInviteLink(created.token)
      setInvites(await api.listInvites(org.id))
    } catch (err) {
      setError(err)
    } finally {
      setMinting(false)
    }
  }

  async function onRevokeInvite(invite: InviteListed) {
    if (!org) return
    if (!confirm(`Revoke invite ${invite.id}?`)) return
    setError(null)
    try {
      await api.revokeInvite(org.id, invite.id)
      if (createdInvite?.id === invite.id) setCreatedInvite(null)
      setInvites(await api.listInvites(org.id))
    } catch (err) {
      setError(err)
    }
  }

  async function onRole(m: Member, role: MemberRole) {
    if (!org || m.role === role) return
    setError(null)
    try {
      const updated = await api.updateMember(org.id, m.id, { role })
      setMembers((prev) =>
        prev.map((x) => (x.id === updated.id ? updated : x)),
      )
    } catch (err) {
      setError(err)
    }
  }

  async function onRemove(m: Member) {
    if (!org) return
    const label =
      m.principal === "service_account"
        ? (serviceAccounts.find((s) => s.id === m.service_account_id)?.name ??
          m.service_account_id)
        : m.user_id
    if (!confirm(`Remove member ${label ?? m.id}?`)) return
    setError(null)
    try {
      await api.deleteMember(org.id, m.id)
      const [mList, saList] = await Promise.all([
        api.listMembers(org.id),
        api.listServiceAccounts(org.id),
      ])
      setMembers(mList)
      setServiceAccounts(saList)
      if (keysMemberId === m.id) setKeysMemberId(null)
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
      await api.createServiceAccount(org.id, { name: saName.trim() })
      setSaName("")
      const [mList, saList] = await Promise.all([
        api.listMembers(org.id),
        api.listServiceAccounts(org.id),
      ])
      setMembers(mList)
      setServiceAccounts(saList)
    } catch (err) {
      setError(err)
    } finally {
      setCreatingSa(false)
    }
  }

  async function onToggleSa(sa: ServiceAccount) {
    if (!org) return
    const suspend = sa.status === "active"
    if (
      !confirm(
        suspend
          ? `Suspend service account "${sa.name}"?`
          : `Re-enable service account "${sa.name}"?`,
      )
    )
      return
    setError(null)
    try {
      await api.updateMember(org.id, sa.member_id, {
        status: suspend ? "suspended" : "active",
      })
      const [mList, saList] = await Promise.all([
        api.listMembers(org.id),
        api.listServiceAccounts(org.id),
      ])
      setMembers(mList)
      setServiceAccounts(saList)
    } catch (err) {
      setError(err)
    }
  }

  async function onDeleteSa(sa: ServiceAccount) {
    if (!org) return
    if (
      !confirm(
        `Delete service account "${sa.name}"? Removes its member row and keys.`,
      )
    )
      return
    setError(null)
    try {
      await api.deleteServiceAccount(org.id, sa.id)
      const [mList, saList] = await Promise.all([
        api.listMembers(org.id),
        api.listServiceAccounts(org.id),
      ])
      setMembers(mList)
      setServiceAccounts(saList)
      if (keysMemberId === sa.member_id) setKeysMemberId(null)
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

  const keysMember = keysMemberId
    ? members.find((m) => m.id === keysMemberId)
    : null

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

          <div className="card mb-3">
            <div className="card-header">Service accounts</div>
            <div className="card-body">
              <p className="small text-muted">
                Non-human org principals. Create adds an SA + active member
                (default role <code>member</code>). Cannot be{" "}
                <code>owner</code>. Admin/owner only.
              </p>
              <div className="list-group mb-3">
                {serviceAccounts.length === 0 && (
                  <div className="list-group-item text-muted">None yet.</div>
                )}
                {serviceAccounts.map((sa) => (
                  <div
                    key={sa.id}
                    className="list-group-item d-flex flex-wrap gap-2 justify-content-between align-items-start"
                  >
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
                    <div className="d-flex flex-wrap gap-1">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-primary"
                        onClick={() =>
                          setKeysMemberId((cur) =>
                            cur === sa.member_id ? null : sa.member_id,
                          )
                        }
                      >
                        Keys
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => void onToggleSa(sa)}
                      >
                        {sa.status === "suspended" ? "Enable" : "Suspend"}
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => void onDeleteSa(sa)}
                      >
                        Delete
                      </button>
                    </div>
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
          <h2 className="h5">Members</h2>
          <p className="small text-muted">
            Platform API. Your user id:{" "}
            <code className="user-select-all">{me?.user_id ?? "…"}</code>
            {" — "}add another user’s id (from their Profile page) to demo
            multi-user access. SA members appear here too (
            <code>principal=service_account</code>).
          </p>

          <div className="list-group mb-3">
            {members.length === 0 && (
              <div className="list-group-item text-muted">No members.</div>
            )}
            {members.map((m) => {
              const roles =
                m.principal === "service_account" ? SA_ROLES : HUMAN_ROLES
              const isMe =
                m.principal === "user" && m.user_id === me?.user_id
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
                  <div className="d-flex gap-2 align-items-center">
                    <button
                      type="button"
                      className={`btn btn-sm ${
                        keysMemberId === m.id
                          ? "btn-primary"
                          : "btn-outline-primary"
                      }`}
                      onClick={() =>
                        setKeysMemberId((cur) => (cur === m.id ? null : m.id))
                      }
                    >
                      Keys
                    </button>
                    <select
                      className="form-select form-select-sm"
                      style={{ width: "auto" }}
                      value={m.role}
                      onChange={(e) =>
                        void onRole(m, e.target.value as MemberRole)
                      }
                    >
                      {!roles.includes(m.role) && (
                        <option value={m.role}>{m.role}</option>
                      )}
                      {roles.map((r) => (
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
              )
            })}
          </div>

          {keysMember && (
            <div className="mb-4">
              <MemberKeysPanel
                orgId={org.id}
                memberId={keysMember.id}
                label={memberLabel(keysMember)}
              />
              <p className="small text-muted mt-2 mb-0">
                Human: self or admin/owner. SA: admin/owner only. Try keys on{" "}
                <Link to="/api-keys">API keys</Link> probe (org-scope path).
              </p>
            </div>
          )}

          {myMember && !keysMemberId && (
            <p className="small text-muted mb-3">
              Tip: open <strong>Keys</strong> on your row or a service account
              to mint <code>{memberKeyPrefix}</code> keys for org-scope automation.
            </p>
          )}

          <div className="card mb-4">
            <div className="card-header">Add user member</div>
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
                      setMemberRole(e.target.value as MemberRole)
                    }
                  >
                    {HUMAN_ROLES.map((r) => (
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

          <div className="card mb-4">
            <div className="card-header">Copy invite link</div>
            <div className="card-body">
              <p className="small text-muted">
                Mints a one-shot token. Share{" "}
                <code>
                  {`{app origin}/login?${INVITE_QUERY}=`}
                </code>
                — the recipient’s browser starts PKCE and forwards{" "}
                <code>invite=</code> onto Auth <code>/authorize</code>. Not an
                Auth issuer URL (no per-browser <code>code_challenge</code>).
                Token is shown once, like an API key. List/revoke never include
                it. No SMTP. Expires in 7 days if omitted.
              </p>

              {createdInvite && (
                <div className="alert alert-warning py-2 small">
                  <div className="fw-semibold mb-1">
                    Copy now — token will not be shown again
                  </div>
                  <code className="user-select-all d-block text-break">
                    {createdInvite.token}
                  </code>
                  <div className="small mt-2">
                    Link{" "}
                    <code className="user-select-all d-block text-break">
                      {inviteCopyLink(createdInvite.token)}
                    </code>
                  </div>
                  <div className="small text-muted mt-1">
                    {createdInvite.role} · expires {createdInvite.expires_at} ·
                    id{" "}
                    <code className="font-monospace">{createdInvite.id}</code>
                    {copiedInvite ? " · copied to clipboard" : ""}
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary mt-2"
                    onClick={() => void copyInviteLink(createdInvite.token)}
                  >
                    Copy link
                  </button>
                </div>
              )}

              <div className="list-group mb-3">
                {invites.length === 0 && (
                  <div className="list-group-item text-muted">
                    No invites yet.
                  </div>
                )}
                {invites.map((inv) => (
                  <div
                    key={inv.id}
                    className="list-group-item d-flex flex-wrap gap-2 justify-content-between align-items-start"
                  >
                    <div>
                      <div className="fw-semibold">
                        {inv.role}{" "}
                        {inv.revoked_at && (
                          <span className="badge text-bg-secondary">
                            revoked
                          </span>
                        )}
                        {inv.redeemed_at && (
                          <span className="badge text-bg-success">
                            redeemed
                          </span>
                        )}
                      </div>
                      <div className="small font-monospace text-muted">
                        {inv.id}
                      </div>
                      <div className="small text-muted">
                        expires {inv.expires_at}
                      </div>
                    </div>
                    {!inv.revoked_at && !inv.redeemed_at && (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => void onRevokeInvite(inv)}
                      >
                        Revoke
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <form
                className="row g-2 align-items-end"
                onSubmit={(e) => void onMintInvite(e)}
              >
                <div className="col-md-4">
                  <label className="form-label" htmlFor="invite_role">
                    Role
                  </label>
                  <select
                    id="invite_role"
                    className="form-select"
                    value={inviteRole}
                    onChange={(e) =>
                      setInviteRole(e.target.value as MemberRole)
                    }
                  >
                    {HUMAN_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-auto">
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={minting}
                  >
                    {minting ? "Minting…" : "Mint copy-link"}
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
