import { useState } from "react"
import { Navigate, useLocation } from "react-router-dom"
import { useAuth } from "../auth/AuthContext"
import { ErrorAlert } from "../components/ErrorAlert"

export function LoginPage() {
  const { ready, authenticated, login } = useAuth()
  const location = useLocation()
  const from =
    (location.state as { from?: string } | null)?.from || "/profile"
  const [error, setError] = useState<unknown>(null)

  if (!ready) {
    return (
      <div className="text-center py-5 text-muted">Loading session…</div>
    )
  }

  if (authenticated) {
    return <Navigate to={from} replace />
  }

  return (
    <div className="row justify-content-center">
      <div className="col-md-6 col-lg-5">
        <div className="card shadow-sm">
          <div className="card-body p-4">
            <h1 className="h4 mb-3">Sign in</h1>
            <ErrorAlert error={error} onDismiss={() => setError(null)} />
            <p className="text-muted">
              Redirects to Plat5 Auth (password code). Dev codes appear in
              Auth issuer logs when SMTP is unset.
            </p>
            <button
              type="button"
              className="btn btn-primary w-100"
              onClick={() => {
                void login(from).catch((e: unknown) => setError(e))
              }}
            >
              Continue to Auth
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
