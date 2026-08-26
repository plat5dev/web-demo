import { useEffect, useState } from "react"
import { api } from "../api/endpoints"
import {
  clearStashedInvite,
  completeLogin,
  peekStashedInvite,
} from "../auth/session"
import { ErrorAlert } from "../components/ErrorAlert"

/** Survives React Strict Mode double-mount; one redeem per callback. */
let callbackStarted = false

export function CallbackPage() {
  const [error, setError] = useState<unknown>(null)

  useEffect(() => {
    if (callbackStarted) return
    callbackStarted = true
    void (async () => {
      try {
        const params = new URLSearchParams(window.location.search)
        const oauthState = params.get("state")
        const token = peekStashedInvite(oauthState)
        const returnTo = await completeLogin(window.location.search)
        if (token) {
          try {
            await api.redeemInvite(token)
          } catch (e: unknown) {
            // Keep cookie + by-state stash so the user can retry.
            throw e
          }
          clearStashedInvite(oauthState)
          window.location.replace("/orgs")
          return
        }
        window.location.replace(returnTo || "/")
      } catch (e: unknown) {
        setError(e)
      }
    })()
  }, [])

  if (error) {
    return (
      <div className="row justify-content-center">
        <div className="col-md-8">
          <h1 className="h4 mb-3">Sign-in failed</h1>
          <ErrorAlert error={error} />
          <div className="d-flex flex-wrap gap-2">
            <a className="btn btn-outline-secondary" href="/login">
              Try again
            </a>
            <a className="btn btn-outline-primary" href="/orgs">
              Organizations
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="text-center py-5 text-muted">Completing sign-in…</div>
  )
}
