import { useEffect } from "react"
import { Navigate, useLocation, useSearchParams } from "react-router-dom"
import { useAuth } from "../auth/AuthContext"
import { INVITE_QUERY } from "../auth/session"

/** Survives React Strict Mode double-mount; one authorize redirect per invite. */
let inviteLoginStarted: string | null = null

export function LoginPage() {
  const { authenticated, login } = useAuth()
  const location = useLocation()
  const [params] = useSearchParams()
  const invite = params.get(INVITE_QUERY)?.trim() || ""
  const from =
    (location.state as { from?: string } | null)?.from || "/profile"
  const returnTo = invite ? "/orgs" : from

  useEffect(() => {
    if (!invite) return
    if (inviteLoginStarted === invite) return
    inviteLoginStarted = invite
    void login(returnTo, invite)
  }, [invite, login, returnTo])

  if (authenticated && !invite) {
    return <Navigate to={from} replace />
  }

  return (
    <div className="row justify-content-center">
      <div className="col-md-6 col-lg-5">
        <div className="card shadow-sm">
          <div className="card-body p-4">
            <h1 className="h4 mb-3">{invite ? "Join organization" : "Sign in"}</h1>
            {invite ? (
              <p className="text-muted">
                One-shot invite. Continue to Auth to sign up or log in; you
                land as an active member (no pending row). This starts PKCE
                in this browser and passes <code>invite</code> on authorize.
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
              onClick={() => void login(returnTo, invite || undefined)}
            >
              Continue to Auth
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
