import { useEffect, useState, type FormEvent } from "react"
import { api } from "../api/endpoints"
import type { CreateInviteBody, InviteListed, MemberRole } from "../api/types"
import { inviteAppUrl } from "../auth/session"

const HUMAN_ROLES: MemberRole[] = ["member", "admin", "owner"]

const INVITE_TTL_OPTIONS: { label: string; value: string }[] = [
  { label: "Default (7 days)", value: "" },
  { label: "1 hour", value: "3600" },
  { label: "1 day", value: "86400" },
  { label: "7 days", value: "604800" },
  { label: "30 days", value: "2592000" },
]

const MAX_USES_OPTIONS: { label: string; value: string }[] = [
  { label: "1 (default)", value: "" },
  { label: "5", value: "5" },
  { label: "10", value: "10" },
  { label: "Unlimited", value: "unlimited" },
]

function rowToken(inv: InviteListed): string | null {
  const t = inv.token?.trim()
  return t ? t : null
}

function usesLabel(inv: InviteListed): string {
  const used = inv.use_count ?? 0
  if (inv.max_uses == null && inv.status === "active") {
    return `${used}/∞`
  }
  if (inv.max_uses == null) return `${used}`
  return `${used}/${inv.max_uses}`
}

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
  const [maxUses, setMaxUses] = useState("")
  const [creatingInvite, setCreatingInvite] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  async function loadInvites() {
    try {
      setInvites(await api.listInvites(orgId))
    } catch {
      setInvites([])
    }
  }

  useEffect(() => {
    void loadInvites()
  }, [orgId])

  useEffect(() => {
    if (!copied) return
    const t = window.setTimeout(() => setCopied(null), 2000)
    return () => window.clearTimeout(t)
  }, [copied])

  async function copyText(key: string, which: "link" | "token", token: string) {
    const text = which === "link" ? inviteAppUrl(token) : token
    try {
      await navigator.clipboard.writeText(text)
      setCopied(key)
    } catch {
      setCopied(null)
    }
  }

  async function onCreateInvite(e: FormEvent) {
    e.preventDefault()
    setCreatingInvite(true)
    setCopied(null)
    try {
      const body: CreateInviteBody = { role: inviteRole }
      if (inviteTtl) body.expires_in_seconds = Number(inviteTtl)
      if (maxUses === "unlimited") body.max_uses = null
      else if (maxUses) body.max_uses = Number(maxUses)
      await api.createInvite(orgId, body)
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
      await loadInvites()
    } catch (err) {
      onError(err)
    }
  }

  return (
    <div className="card mb-4">
      <div className="card-header">Invites</div>
      <div className="card-body">
        <p className="small text-muted">
          Mint an invite. Admin/owner can copy{" "}
          <code>/invites?invite=</code> from an active row (identity returns{" "}
          <code>token</code> only while active). Members see prefix and status,
          not the token. Already signed in → redeem immediately. Else the app
          stashes the token, strips the query, and starts PKCE — no{" "}
          <code>invite=</code> on <code>/authorize</code>. Then{" "}
          <code>POST /api/invites/redeem</code>. Omit max uses for 1; unlimited
          sends JSON <code>null</code>. Add-by-user_id below still works.
        </p>
        <div className="list-group mb-3">
          {invites.length === 0 && (
            <div className="list-group-item text-muted">No invites listed.</div>
          )}
          {invites.map((inv) => {
            const token = rowToken(inv)
            const copyable = Boolean(token) && inv.status === "active"
            return (
              <div
                key={inv.id}
                className="list-group-item d-flex flex-wrap gap-2 justify-content-between align-items-start"
              >
                <div>
                  <div className="small font-monospace">
                    {inv.token_prefix || inv.id}
                  </div>
                  <div className="small text-muted">
                    {inv.role} · {inv.status} · {usesLabel(inv)} · expires{" "}
                    {inv.expires_at}
                  </div>
                </div>
                <div className="d-flex flex-wrap gap-2">
                  {copyable && token && (
                    <>
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        onClick={() => void copyText(`${inv.id}-link`, "link", token)}
                      >
                        {copied === `${inv.id}-link` ? "Copied link" : "Copy link"}
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => void copyText(`${inv.id}-token`, "token", token)}
                      >
                        {copied === `${inv.id}-token` ? "Copied token" : "Copy token"}
                      </button>
                    </>
                  )}
                  {inv.status === "active" && (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => void onRevokeInvite(inv.id)}
                    >
                      Revoke
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        <form
          className="row g-2 align-items-end"
          onSubmit={(e) => void onCreateInvite(e)}
        >
          <div className="col-md-3">
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
          <div className="col-md-3">
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
            <label className="form-label" htmlFor="invite_max_uses">
              Max uses
            </label>
            <select
              id="invite_max_uses"
              className="form-select"
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
            >
              {MAX_USES_OPTIONS.map((opt) => (
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
              {creatingInvite ? "…" : "Mint invite"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
