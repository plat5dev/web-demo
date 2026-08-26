import { useEffect, useState, type FormEvent } from "react"
import { api } from "../api/endpoints"
import type { InviteCreated, InviteListed, MemberRole } from "../api/types"
import { inviteAppUrl } from "../auth/session"

const HUMAN_ROLES: MemberRole[] = ["member", "admin", "owner"]

const INVITE_TTL_OPTIONS: { label: string; value: string }[] = [
  { label: "Default", value: "" },
  { label: "1 hour", value: "3600" },
  { label: "1 day", value: "86400" },
  { label: "7 days", value: "604800" },
  { label: "30 days", value: "2592000" },
]

export function InvitePanel({
  orgId,
  onError,
}: {
  orgId: string
  onError: (err: unknown) => void
}) {
  const [invites, setInvites] = useState<InviteListed[]>([])
  const [inviteRole, setInviteRole] = useState<MemberRole>("member")
  const [inviteTtl, setInviteTtl] = useState("")
  const [creatingInvite, setCreatingInvite] = useState(false)
  const [createdInvite, setCreatedInvite] = useState<InviteCreated | null>(null)
  const [copied, setCopied] = useState<"link" | "token" | null>(null)

  async function loadInvites() {
    try {
      setInvites(await api.listInvites(orgId))
    } catch {
      setInvites([])
    }
  }

  useEffect(() => {
    setCreatedInvite(null)
    void loadInvites()
  }, [orgId])

  useEffect(() => {
    if (!copied) return
    const t = window.setTimeout(() => setCopied(null), 2000)
    return () => window.clearTimeout(t)
  }, [copied])

  async function onCreateInvite(e: FormEvent) {
    e.preventDefault()
    setCreatingInvite(true)
    setCreatedInvite(null)
    try {
      const body: { role: MemberRole; expires_in_seconds?: number } = {
        role: inviteRole,
      }
      if (inviteTtl) body.expires_in_seconds = Number(inviteTtl)
      const created = await api.createInvite(orgId, body)
      setCreatedInvite(created)
      await loadInvites()
    } catch (err) {
      onError(err)
    } finally {
      setCreatingInvite(false)
    }
  }

  async function onRevokeInvite(id: string) {
    if (!confirm("Revoke this invite?")) return
    try {
      await api.revokeInvite(orgId, id)
      if (createdInvite?.id === id) setCreatedInvite(null)
      await loadInvites()
    } catch (err) {
      onError(err)
    }
  }

  async function copyInvite(which: "link" | "token") {
    if (!createdInvite) return
    const text =
      which === "link"
        ? inviteAppUrl(createdInvite.token)
        : createdInvite.token
    try {
      await navigator.clipboard.writeText(text)
      setCopied(which)
    } catch {
      setCopied(null)
    }
  }

  const createdLink = createdInvite
    ? inviteAppUrl(createdInvite.token)
    : null

  return (
    <div className="card mb-4">
      <div className="card-header">Copy invite link</div>
      <div className="card-body">
        <p className="small text-muted">
          Mint a one-shot token (like an API key). Invitee opens the demo
          URL, this browser starts PKCE, and Auth authorize gets{" "}
          <code>invite=&lt;token&gt;</code>. They sign up or log in and land
          as an <strong>active</strong> member — no SMTP, no pending row.
          Add-by-user_id below still works.
        </p>
        {createdInvite && createdLink && (
          <div className="alert alert-warning">
            <div className="fw-semibold mb-1">
              Copy now — token will not be shown again
            </div>
            <code className="user-select-all d-block text-break mb-2">
              {createdLink}
            </code>
            <div className="d-flex flex-wrap gap-2 mb-2">
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={() => void copyInvite("link")}
              >
                {copied === "link" ? "Copied link" : "Copy link"}
              </button>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={() => void copyInvite("token")}
              >
                {copied === "token" ? "Copied token" : "Copy token"}
              </button>
            </div>
            <div className="small text-muted">
              role <code>{createdInvite.role}</code> · expires{" "}
              {createdInvite.expires_at} · id{" "}
              <code className="font-monospace">{createdInvite.id}</code>
            </div>
          </div>
        )}
        <div className="list-group mb-3">
          {invites.length === 0 && (
            <div className="list-group-item text-muted">
              No invites listed.
            </div>
          )}
          {invites.map((inv) => (
            <div
              key={inv.id}
              className="list-group-item d-flex flex-wrap gap-2 justify-content-between align-items-start"
            >
              <div>
                <div className="small font-monospace">{inv.id}</div>
                <div className="small text-muted">
                  {inv.role} · expires {inv.expires_at}
                  {inv.redeemed_at ? " · redeemed" : ""}
                  {inv.revoked_at ? " · revoked" : ""}
                </div>
              </div>
              {!inv.revoked_at && !inv.redeemed_at && (
                <button
                  type="button"
                  className="btn btn-sm btn-outline-danger"
                  onClick={() => void onRevokeInvite(inv.id)}
                >
                  Revoke
                </button>
              )}
            </div>
          ))}
        </div>
        <form
          className="row g-2 align-items-end"
          onSubmit={(e) => void onCreateInvite(e)}
        >
          <div className="col-md-4">
            <label className="form-label" htmlFor="invite_role">
              Role
            </label>
            <select
              id="invite_role"
              className="form-select"
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as MemberRole)}
            >
              {HUMAN_ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-5">
            <label className="form-label" htmlFor="invite_ttl">
              Expires
            </label>
            <select
              id="invite_ttl"
              className="form-select"
              value={inviteTtl}
              onChange={(e) => setInviteTtl(e.target.value)}
            >
              {INVITE_TTL_OPTIONS.map((opt) => (
                <option key={opt.label} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-3">
            <button
              type="submit"
              className="btn btn-primary w-100"
              disabled={creatingInvite}
            >
              {creatingInvite ? "…" : "Create link"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
