import { ApiError } from "../api/client"

function reasonFromDetails(details: unknown): string | null {
  if (!details || typeof details !== "object") return null
  const r = (details as { reason?: unknown }).reason
  return typeof r === "string" && r.length > 0 ? r : null
}

export function ErrorAlert({
  error,
  onDismiss,
}: {
  error: unknown
  onDismiss?: () => void
}) {
  if (!error) return null

  let title = "Error"
  let message = "Something went wrong"
  let meta: string | null = null

  if (error instanceof ApiError) {
    title = error.code
    message = error.message
    const reason = reasonFromDetails(error.body?.error?.details)
    meta = [
      `HTTP ${error.status}`,
      reason ? `reason=${reason}` : null,
      error.requestId ? `request_id=${error.requestId}` : null,
    ]
      .filter(Boolean)
      .join(" · ")
  } else if (error instanceof Error) {
    message = error.message
  } else {
    message = String(error)
  }

  return (
    <div className="alert alert-danger alert-dismissible" role="alert">
      <strong className="me-2">{title}</strong>
      {message}
      {meta && (
        <div className="small text-danger-emphasis mt-1 font-monospace">{meta}</div>
      )}
      {onDismiss && (
        <button
          type="button"
          className="btn-close"
          aria-label="Close"
          onClick={onDismiss}
        />
      )}
    </div>
  )
}
