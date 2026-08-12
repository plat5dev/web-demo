import { useEffect, useState, type FormEvent } from "react"
import { api } from "../api/endpoints"
import type { ApiKeyCreated, ApiKeyListed } from "../api/types"
import { ErrorAlert } from "./ErrorAlert"

type Props = {
  orgId: string
  memberId: string
  label: string
  onCreatedKey?: (key: string) => void
}

export function MemberKeysPanel({
  orgId,
  memberId,
  label,
  onCreatedKey,
}: Props) {
  const [keys, setKeys] = useState<ApiKeyListed[]>([])
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [created, setCreated] = useState<ApiKeyCreated | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      setKeys(await api.listMemberApiKeys(orgId, memberId))
    } catch (e) {
      setError(e)
      setKeys([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [orgId, memberId])

  async function onCreate(e: FormEvent) {
    e.preventDefault()
    setCreating(true)
    setError(null)
    setCreated(null)
    try {
      const key = await api.createMemberApiKey(orgId, memberId, {
        name: name.trim(),
      })
      setName("")
      setCreated(key)
      onCreatedKey?.(key.key)
      await load()
    } catch (err) {
      setError(err)
    } finally {
      setCreating(false)
    }
  }

  async function onRevoke(id: string) {
    if (!confirm("Revoke this member API key?")) return
    setError(null)
    try {
      await api.deleteMemberApiKey(orgId, memberId, id)
      if (created?.id === id) setCreated(null)
      await load()
    } catch (err) {
      setError(err)
    }
  }

  return (
    <div className="border rounded p-3 bg-body-tertiary">
      <div className="fw-semibold small mb-2">
        Member keys · <span className="text-muted">{label}</span>
      </div>
      <p className="small text-muted mb-2">
        Prefix <code>plat5-mk-1-</code> · org scope only (
        <code>X-API-Key</code>).
      </p>

      <ErrorAlert error={error} onDismiss={() => setError(null)} />

      {created && (
        <div className="alert alert-warning py-2 small">
          <div className="fw-semibold mb-1">Copy now — shown once</div>
          <code className="user-select-all d-block text-break">
            {created.key}
          </code>
        </div>
      )}

      {loading && <div className="text-muted small">Loading keys…</div>}
      <div className="list-group list-group-flush mb-2">
        {!loading && keys.length === 0 && (
          <div className="list-group-item px-0 text-muted small">
            No member keys.
          </div>
        )}
        {keys.map((k) => (
          <div
            key={k.id}
            className="list-group-item px-0 d-flex justify-content-between align-items-start gap-2"
          >
            <div>
              <div className="small fw-semibold">
                {k.name}{" "}
                {k.revoked_at && (
                  <span className="badge text-bg-secondary">revoked</span>
                )}
              </div>
              <div className="small font-monospace text-muted">
                {k.key_prefix}… · {k.id}
              </div>
            </div>
            {!k.revoked_at && (
              <button
                type="button"
                className="btn btn-sm btn-outline-danger"
                onClick={() => void onRevoke(k.id)}
              >
                Revoke
              </button>
            )}
          </div>
        ))}
      </div>

      <form className="row g-2 align-items-end" onSubmit={(e) => void onCreate(e)}>
        <div className="col">
          <label className="form-label small mb-1" htmlFor={`mk_${memberId}`}>
            Name
          </label>
          <input
            id={`mk_${memberId}`}
            className="form-control form-control-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={128}
            placeholder="deploy-ci"
          />
        </div>
        <div className="col-auto">
          <button
            type="submit"
            className="btn btn-sm btn-primary"
            disabled={creating || !name.trim()}
          >
            {creating ? "…" : "Create"}
          </button>
        </div>
      </form>
    </div>
  )
}
