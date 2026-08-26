import { useEffect, useState, type FormEvent } from "react"
import { api } from "../api/endpoints"
import type { InviteCreated, InviteListed, MemberRole } from "../api/types"
import { inviteAppUrl } from "../auth/session"

const HUMAN_ROLES: MemberRole[] = ["member", "admin", "owner"]

const INVITE_TTL_OPTIONS: { label: string; value: string }[] = [
  { label: "Default (7 days)", value: "" },
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

  async function copyText(which: "link" | "token", token: string) {
    const text = which === "link" ? inviteAppUrl(token) : token
    try {
      await navigator.clipboard.writeText(text)
      setCopied(which)
    } catch {
      setCopied(null)
    }
  }

  async function onCreateInvite(e: FormEvent) {
    e.preventDefault()
    setCreatingInvite(true)
    setCreatedInvite(null)
    setCopied(null)
    try {
      const body: { role: MemberRole; expires_in_seconds?: number } = {
        role: inviteRole,
      }
      if (inviteTtl) body.expires_in_seconds = Number(inviteTtl)
      const created = await api.createInvite(orgId, body)
      setCreatedInvite(created)
      await copyText("link", created.token)
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

  const createdLink = createdInvite
    ? inviteAppUrl(createdInvite.token)
    : null

  return (
    <div className="card mb-4">
      <div className="card-header">Copy invite link</div>
      <div className="card-body">
        <p className="small text-muted">
          Mint a one-shot token (like an API key). Clipboard gets{" "}
          <code>{"${origin}/login?invite="}</code>
          {createdInvite ? "" : "{token}"}. The invitee’s browser starts PKCE
          and forwards <code>invite=</code> onto Auth <code>/authorize</code>
          — not an Auth issuer URL. They land as an <strong>active</strong>{" "}
          member. No SMTP, no pending row. Add-by-user_id below still works.
          Expires in 7 days if omitted.
        </p>
        {createdInvite && createdLink && (
          <div className="alert alert-warning">
            <div className="fw-semibold mb-1">
              Copy now — token will not be shown again
            </div>
            <code className="user-select-all d-block text-break mb-2">
              {createdInvite.token}
            </code>
            <div className="small mb-2">
              Link{" "}
              <code className="user-select-all d-block text-break">
                {createdLink}
              </code>
            </div>
            <div className="d-flex flex-wrap gap-2 mb-2">
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={() => void copyText("link", createdInvite.token)}
              >
                {copied === "link" ? "Copied link" : "Copy link"}
              </button>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={() => void copyText("token", createdInvite.token)}
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
              {creatingInvite ? "…" : "Mint copy-link"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
