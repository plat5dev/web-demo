import { useEffect, useState, type FormEvent } from "react"
import { api } from "../api/endpoints"
import type { Invite } from "../api/types"
import { inviteAppUrl } from "../auth/session"

const INVITE_TTL_OPTIONS: { label: string; value: string }[] = [
  { label: "Default (7 days)", value: "" },
  { label: "1 hour", value: "3600" },
  { label: "1 day", value: "86400" },
  { label: "7 days", value: "604800" },
  { label: "30 days", value: "2592000" },
]

export function InvitePanel({
  sessionToken,
  onError,
}: {
  sessionToken: string
  onError: (err: unknown) => void
}) {
  const [invites, setInvites] = useState<Invite[]>([])
  const [inviteTtl, setInviteTtl] = useState("")
  const [creatingInvite, setCreatingInvite] = useState(false)
  const [createdInvite, setCreatedInvite] = useState<Invite | null>(null)
  const [copied, setCopied] = useState<"link" | "token" | null>(null)

  async function loadInvites() {
    try {
      setInvites(await api.listInvites(sessionToken))
    } catch {
      setInvites([])
    }
  }

  useEffect(() => {
    let cancelled = false
    setCreatedInvite(null)
    setInvites([])
    void (async () => {
      try {
        const list = await api.listInvites(sessionToken)
        if (!cancelled) setInvites(list)
      } catch {
        if (!cancelled) setInvites([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [sessionToken])

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
      const body: { expires_in_seconds?: number } = {}
      if (inviteTtl) body.expires_in_seconds = Number(inviteTtl)
      const created = await api.createInvite(sessionToken, body)
      setCreatedInvite(created)
      if (created.token) await copyText("link", created.token)
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
      await api.revokeInvite(sessionToken, id)
      if (createdInvite?.id === id) setCreatedInvite(null)
      await loadInvites()
    } catch (err) {
      onError(err)
    }
  }

  const createdLink = createdInvite?.token
    ? inviteAppUrl(createdInvite.token)
    : null

  return (
    <div className="card mb-4">
      <div className="card-header">Copy invite link</div>
      <div className="card-body">
        <p className="small text-muted">
          Mint an invite on <code>POST /org/invites</code> with the member
          session. Clipboard gets <code>/login?invite=</code> on this app
          origin. Already signed in → redeem immediately (skip PKCE). Else the
          invitee’s browser stashes the token (first-party cookie + OAuth{" "}
          <code>state</code>-keyed stash), strips the query, and starts PKCE —
          no <code>invite=</code> on <code>/authorize</code>, token never in
          OAuth <code>state</code>. Then <code>POST /user/invites/redeem</code>{" "}
          with <code>{"{ token }"}</code> and the user JWT. They land as an{" "}
          <strong>active</strong> member. Email is unbound. No SMTP. Add-by-
          user_id below still works. Token is on the row while the invite is
          active. Expires in 7 days if omitted.
        </p>
        {createdInvite && createdLink && createdInvite.token && (
          <div className="alert alert-warning">
            <div className="fw-semibold mb-1">Invite minted</div>
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
                onClick={() => void copyText("link", createdInvite.token!)}
              >
                {copied === "link" ? "Copied link" : "Copy link"}
              </button>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={() => void copyText("token", createdInvite.token!)}
              >
                {copied === "token" ? "Copied token" : "Copy token"}
              </button>
            </div>
            <div className="small text-muted">
              {createdInvite.status} · expires {createdInvite.expires_at} · id{" "}
              <code className="font-monospace">{createdInvite.id}</code>
            </div>
          </div>
        )}
        <div className="list-group mb-3">
          {invites.length === 0 && (
            <div className="list-group-item text-muted">No invites listed.</div>
          )}
          {invites.map((inv) => (
            <div
              key={inv.id}
              className="list-group-item d-flex flex-wrap gap-2 justify-content-between align-items-start"
            >
              <div>
                <div className="small font-monospace">
                  {inv.token_prefix}… · {inv.id}
                </div>
                <div className="small text-muted">
                  {inv.status}
                  {inv.email ? ` · ${inv.email}` : ""}
                  {` · ${inv.use_count}/${inv.max_uses ?? "unlimited"}`}
                  {` · expires ${inv.expires_at}`}
                </div>
              </div>
              <div className="d-flex flex-wrap gap-1">
                {inv.token && (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => void copyText("link", inv.token!)}
                  >
                    Copy link
                  </button>
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
          ))}
        </div>
        <form
          className="row g-2 align-items-end"
          onSubmit={(e) => void onCreateInvite(e)}
        >
          <div className="col-md-8">
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
          <div className="col-md-4">
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
