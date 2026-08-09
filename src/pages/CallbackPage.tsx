import { useEffect, useState } from "react"
import { completeLogin } from "../auth/session"
import { ErrorAlert } from "../components/ErrorAlert"

export function CallbackPage() {
  const [error, setError] = useState<unknown>(null)

  useEffect(() => {
    // completeLogin is deduped — safe under React Strict Mode double-invoke
    void completeLogin(window.location.search)
      .then((returnTo) => {
        window.location.replace(returnTo || "/")
      })
      .catch((e: unknown) => {
        setError(e)
      })
  }, [])

  if (error) {
    return (
      <div className="row justify-content-center">
        <div className="col-md-8">
          <h1 className="h4 mb-3">Sign-in failed</h1>
          <ErrorAlert error={error} />
          <a className="btn btn-outline-secondary" href="/login">
            Try again
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="text-center py-5 text-muted">Completing sign-in…</div>
  )
}
