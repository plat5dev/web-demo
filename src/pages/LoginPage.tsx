import { useEffect, useState } from "react"
import { Navigate, useLocation } from "react-router-dom"
import { api } from "../api/endpoints"
import { useAuth } from "../auth/AuthContext"
import {
  captureInviteQuery,
  clearStashedInvite,
  peekStashedInvite,
} from "../auth/session"
import { ErrorAlert } from "../components/ErrorAlert"

/** Survives React Strict Mode double-mount; one authorize or redeem per invite. */
let inviteLoginStarted: string | null = null
let inviteRedeemStarted: string | null = null

export function LoginPage() {
  const { ready, authenticated, login } = useAuth()
  const location = useLocation()
  const from =
    (location.state as { from?: string } | null)?.from || "/profile"
  const [error, setError] = useState<unknown>(null)
  const [joining, setJoining] = useState(false)
  const [pendingInvite, setPendingInvite] = useState(
    () => Boolean(peekStashedInvite()),
  )

  useEffect(() => {
    if (!ready) return

    const token = captureInviteQuery()
    if (token) setPendingInvite(true)
    if (!token) return

    if (authenticated) {
      if (inviteRedeemStarted === token) return
      inviteRedeemStarted = token
      setJoining(true)
      void (async () => {
        try {
          await api.redeemInvite(token)
          clearStashedInvite()
          window.location.replace("/orgs")
        } catch (e: unknown) {
          inviteRedeemStarted = null
          setJoining(false)
          setError(e)
        }
      })()
      return
    }

    if (inviteLoginStarted === token) return
    inviteLoginStarted = token
    void login("/orgs").catch((e: unknown) => {
      inviteLoginStarted = null
      setError(e)
    })
  }, [ready, authenticated, login])

  if (!ready) {
    return (
      <div className="text-center py-5 text-muted">Loading session…</div>
    )
  }

  if (authenticated && !pendingInvite && !joining) {
    return <Navigate to={from} replace />
  }

  if (joining) {
    return (
      <div className="text-center py-5 text-muted">Joining organization…</div>
    )
  }

  return (
    <div className="row justify-content-center">
      <div className="col-md-6 col-lg-5">
        <div className="card shadow-sm">
          <div className="card-body p-4">
            <h1 className="h4 mb-3">
              {pendingInvite ? "Join organization" : "Sign in"}
            </h1>
            <ErrorAlert error={error} onDismiss={() => setError(null)} />
            {pendingInvite ? (
              <p className="text-muted">
                One-shot invite. If you are already signed in, this page redeems
                immediately (no PKCE). Otherwise the token is stashed in a
                first-party cookie and keyed by OAuth <code>state</code> on this
                origin — <code>invite=</code> is stripped so Referer cannot leak
                it, and is not sent to <code>/authorize</code>. After sign-in the
                app <code>POST /api/invites/redeem</code>s with the session JWT.
              </p>
            ) : (
              <p className="text-muted">
                Redirects to Plat5 Auth (password code). Dev codes appear in
                Auth issuer logs when SMTP is unset.
              </p>
            )}
            <button
              type="button"
              className="btn btn-primary w-100"
              onClick={() => {
                if (pendingInvite && authenticated) {
                  const token = peekStashedInvite()
                  if (!token) return
                  setJoining(true)
                  void (async () => {
                    try {
                      await api.redeemInvite(token)
                      clearStashedInvite()
                      window.location.replace("/orgs")
                    } catch (e: unknown) {
                      setJoining(false)
                      setError(e)
                    }
                  })()
                  return
                }
                void login(pendingInvite ? "/orgs" : from)
              }}
            >
              {pendingInvite && authenticated
                ? "Retry join"
                : "Continue to Auth"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
