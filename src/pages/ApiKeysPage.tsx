import { useEffect, useState, type FormEvent } from "react"
import { api } from "../api/endpoints"
import type { ApiKeyCreated, ApiKeyListed } from "../api/types"
import { ApiError } from "../api/client"
import { ErrorAlert } from "../components/ErrorAlert"
import { useOrg } from "../org/OrgContext"

export function ApiKeysPage() {
  const { activeOrg } = useOrg()
  const [keys, setKeys] = useState<ApiKeyListed[]>([])
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [created, setCreated] = useState<ApiKeyCreated | null>(null)
  const [tryKey, setTryKey] = useState("")
  const [tryPath, setTryPath] = useState("/api/organizations")
  const [trying, setTrying] = useState(false)
  const [tryResult, setTryResult] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      setKeys(await api.listApiKeys())
    } catch (e) {
      setError(e)
      setKeys([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  useEffect(() => {
    if (activeOrg) {
      setTryPath(`/api/organizations/${activeOrg.id}/projects`)
    }
  }, [activeOrg?.id])

  async function onCreate(e: FormEvent) {
    e.preventDefault()
    setCreating(true)
    setError(null)
    setCreated(null)
    try {
      const key = await api.createApiKey({ name: name.trim() })
      setName("")
      setCreated(key)
      setTryKey(key.key)
      await load()
    } catch (err) {
      setError(err)
    } finally {
      setCreating(false)
    }
  }

  async function onRevoke(id: string) {
    if (!confirm("Revoke this API key?")) return
    setError(null)
    try {
      await api.deleteApiKey(id)
      if (created?.id === id) setCreated(null)
      await load()
    } catch (err) {
      setError(err)
    }
  }

  async function onTry(e: FormEvent) {
    e.preventDefault()
    if (!tryKey.trim()) return
    setTrying(true)
    setTryResult(null)
    setError(null)
    try {
      const data = await api.probe<unknown>(tryPath.trim(), {
        mode: "api-key",
        apiKey: tryKey.trim(),
      })
      setTryResult(JSON.stringify(data, null, 2))
    } catch (err) {
      if (err instanceof ApiError) {
        setTryResult(
          JSON.stringify(
            {
              status: err.status,
              code: err.code,
              message: err.message,
              request_id: err.requestId,
              body: err.body,
            },
            null,
            2,
          ),
        )
      } else {
        setError(err)
      }
    } finally {
      setTrying(false)
    }
  }

  return (
    <div>
      <h1 className="h3 mb-1">API keys</h1>
      <p className="text-muted small mb-3">
        Platform API (<code>/api/keys</code>, user scope). Same gateway scopes
        as JWT — send <code>X-API-Key</code> instead of{" "}
        <code>Authorization: Bearer</code>. Plaintext shown once on create.
      </p>

      <ErrorAlert error={error} onDismiss={() => setError(null)} />

      {created && (
        <div className="alert alert-warning">
          <div className="fw-semibold mb-1">
            Copy now — plaintext will not be shown again
          </div>
          <code className="user-select-all d-block text-break">
            {created.key}
          </code>
          <div className="small mt-1 text-muted">
            prefix <code>{created.key_prefix}</code> · id{" "}
            <code className="font-monospace">{created.id}</code>
          </div>
        </div>
      )}

      <div className="row">
        <div className="col-lg-6 mb-4">
          <h2 className="h5">Your keys</h2>
          {loading && <div className="text-muted">Loading…</div>}
          <div className="list-group">
            {!loading && keys.length === 0 && (
              <div className="list-group-item text-muted">No keys yet.</div>
            )}
            {keys.map((k) => (
              <div
                key={k.id}
                className="list-group-item d-flex justify-content-between align-items-start gap-2"
              >
                <div>
                  <div className="fw-semibold">
                    {k.name}{" "}
                    {k.revoked_at && (
                      <span className="badge text-bg-secondary">revoked</span>
                    )}
                  </div>
                  <div className="small font-monospace text-muted">
                    {k.key_prefix}… · {k.id}
                  </div>
                  <div className="small text-muted">
                    created {k.created_at}
                    {k.revoked_at ? ` · revoked ${k.revoked_at}` : ""}
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

          <div className="card mt-3">
            <div className="card-header">Create key</div>
            <div className="card-body">
              <form onSubmit={(e) => void onCreate(e)}>
                <div className="mb-3">
                  <label className="form-label" htmlFor="key_name">
                    Name
                  </label>
                  <input
                    id="key_name"
                    className="form-control"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    maxLength={128}
                    placeholder="ci-bot"
                  />
                </div>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={creating || !name.trim()}
                >
                  {creating ? "Creating…" : "Create"}
                </button>
              </form>
            </div>
          </div>
        </div>

        <div className="col-lg-6 mb-4">
          <h2 className="h5">Try with X-API-Key</h2>
          <p className="small text-muted">
            Calls the gateway with only <code>X-API-Key</code> (no session
            JWT). Use a freshly created key.
          </p>
          <form className="card card-body" onSubmit={(e) => void onTry(e)}>
            <div className="mb-3">
              <label className="form-label" htmlFor="try_key">
                API key
              </label>
              <input
                id="try_key"
                className="form-control font-monospace"
                value={tryKey}
                onChange={(e) => setTryKey(e.target.value)}
                placeholder="plat5-sk-1-…"
                required
              />
            </div>
            <div className="mb-3">
              <label className="form-label" htmlFor="try_path">
                Path
              </label>
              <input
                id="try_path"
                className="form-control font-monospace"
                value={tryPath}
                onChange={(e) => setTryPath(e.target.value)}
                required
              />
              <div className="form-text">
                Examples: <code>/api/organizations</code>,{" "}
                <code>/api/keys</code>, org projects path
              </div>
            </div>
            <button
              type="submit"
              className="btn btn-outline-primary"
              disabled={trying || !tryKey.trim()}
            >
              {trying ? "Calling…" : "GET"}
            </button>
          </form>
          {tryResult && (
            <pre
              className="mt-3 p-3 bg-body-secondary rounded small overflow-auto"
              style={{ maxHeight: "24rem" }}
            >
              {tryResult}
            </pre>
          )}
        </div>
      </div>
    </div>
  )
}
