import { Navigate, useLocation } from "react-router-dom"
import { useAuth } from "../auth/AuthContext"

export function LoginPage() {
  const { authenticated, login } = useAuth()
  const location = useLocation()
  const from =
    (location.state as { from?: string } | null)?.from || "/profile"

  if (authenticated) {
    return <Navigate to={from} replace />
  }

  return (
    <div className="row justify-content-center">
      <div className="col-md-6 col-lg-5">
        <div className="card shadow-sm">
          <div className="card-body p-4">
            <h1 className="h4 mb-3">Sign in</h1>
            <p className="text-muted">
              Redirects to Plat5 Auth (password code). Dev codes appear in
              Auth issuer logs when SMTP is unset.
            </p>
            <button
              type="button"
              className="btn btn-primary w-100"
              onClick={() => void login(from)}
            >
              Continue to Auth
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
