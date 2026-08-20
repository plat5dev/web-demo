import { useEffect, useState, type FormEvent } from "react"
import { Link } from "react-router-dom"
import { api } from "../api/endpoints"
import type { ApiKeyCreated, ApiKeyListed } from "../api/types"
import { ApiError } from "../api/client"
import { ErrorAlert } from "../components/ErrorAlert"
import { useOrg } from "../org/OrgContext"
import { memberKeyPrefix, userKeyPrefix } from "../config"

type ProbeRow = {
  label: string
  path: string
  expect: string
}

export function ApiKeysPage() {
  const { activeOrg } = useOrg()
  const [userId, setUserId] = useState<string | null>(null)
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
  const [matrixRunning, setMatrixRunning] = useState(false)
  const [matrixResult, setMatrixResult] = useState<string | null>(null)

  async function load(uid: string) {
    setLoading(true)
    setError(null)
    try {
      setKeys(await api.listApiKeys(uid))
    } catch (e) {
      setError(e)
      setKeys([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const profile = await api.getProfileMe()
        setUserId(profile.user_id)
        await load(profile.user_id)
      } catch (e) {
        setError(e)
        setKeys([])
        setLoading(false)
      }
    })()
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
      if (!userId) throw new Error("missing user id")
      const key = await api.createApiKey(userId, { name: name.trim() })
      setName("")
      setCreated(key)
      setTryKey(key.key)
      await load(userId)
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
      if (!userId) throw new Error("missing user id")
      await api.deleteApiKey(userId, id)
      if (created?.id === id) setCreated(null)
      await load(userId)
    } catch (err) {
      setError(err)
    }
  }

  async function runProbe(path: string, key: string): Promise<string> {
    try {
      const data = await api.probe<unknown>(path, {
        mode: "api-key",
        apiKey: key,
      })
      return `HTTP 200\n${JSON.stringify(data, null, 2)}`
    } catch (err) {
      if (err instanceof ApiError) {
        return [
          `HTTP ${err.status} ${err.code}`,
          err.message,
          err.requestId ? `request_id=${err.requestId}` : null,
        ]
          .filter(Boolean)
          .join("\n")
      }
      throw err
    }
  }

  async function onTry(e: FormEvent) {
    e.preventDefault()
    if (!tryKey.trim()) return
    setTrying(true)
    setTryResult(null)
    setError(null)
    try {
      setTryResult(await runProbe(tryPath.trim(), tryKey.trim()))
    } catch (err) {
      setError(err)
    } finally {
      setTrying(false)
    }
  }

  function probeRows(key: string): ProbeRow[] {
    const isMemberKey = key.startsWith(memberKeyPrefix)
    const orgPath = activeOrg
      ? `/api/organizations/${activeOrg.id}/projects`
      : null
    const wrongOrgPath =
      "/api/organizations/01ARZ3NDEKTSV4RRFFQ69G5FAV/projects"
    const userPath = userId
      ? `/api/users/${userId}/api-keys`
      : "/api/organizations"

    const rows: ProbeRow[] = [
      {
        label: "user-scope",
        path: userPath,
        expect: isMemberKey
          ? "401 (member keys invalid on user scope)"
          : "200 (user key)",
      },
    ]
    if (orgPath) {
      rows.push({
        label: "org-scope (active org)",
        path: orgPath,
        expect: isMemberKey
          ? "200 if key’s member is in this org"
          : "200 if you are an active member (resolve)",
      })
    }
    rows.push({
      label: "org-scope (unknown org)",
      path: wrongOrgPath,
      expect: isMemberKey
        ? "404 (org id ≠ key org) or 401"
        : "404 (not a member)",
    })
    return rows
  }

  async function onMatrix() {
    const key = tryKey.trim()
    if (!key) return
    setMatrixRunning(true)
    setMatrixResult(null)
    setError(null)
    try {
      const rows = probeRows(key)
      const kind = key.startsWith(memberKeyPrefix)
        ? `member key (${memberKeyPrefix})`
        : key.startsWith(userKeyPrefix)
          ? `user key (${userKeyPrefix})`
          : "unknown prefix"
      const parts: string[] = [`Key kind: ${kind}`, ""]
      for (const row of rows) {
        const result = await runProbe(row.path, key)
        parts.push(`### ${row.label}`)
        parts.push(`GET ${row.path}`)
        parts.push(`expect: ${row.expect}`)
        parts.push(result)
        parts.push("")
      }
      setMatrixResult(parts.join("\n"))
    } catch (err) {
      setError(err)
    } finally {
      setMatrixRunning(false)
    }
  }

  return (
    <div>
      <h1 className="h3 mb-1">User API keys</h1>
      <p className="text-muted small mb-3">
        Person credentials (<code>/api/users/{"{user_id}"}/api-keys</code>,
        prefix <code>{userKeyPrefix}</code>). Same gateway as JWT via{" "}
        <code>X-API-Key</code>. Member keys (<code>{memberKeyPrefix}</code>) are
        minted on{" "}
        <Link to={activeOrg ? `/orgs/${activeOrg.id}` : "/orgs"}>
          org detail
        </Link>{" "}
        under a member or service account — paste them below to compare scopes.
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
          <h2 className="h5">Your user keys</h2>
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
            <div className="card-header">Create user key</div>
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
                  disabled={creating || !name.trim() || !userId}
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
            JWT). User keys work on user + org (via member resolve). Member
            keys work on <strong>org scope only</strong>.
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
                placeholder={`${userKeyPrefix}… or ${memberKeyPrefix}…`}
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
              <div className="form-text d-flex flex-wrap gap-2 mt-2">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => setTryPath("/api/organizations")}
                >
                  list orgs
                </button>
                {userId && (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() =>
                      setTryPath(`/api/users/${userId}/api-keys`)
                    }
                  >
                    user keys
                  </button>
                )}
                {activeOrg && (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() =>
                      setTryPath(
                        `/api/organizations/${activeOrg.id}/projects`,
                      )
                    }
                  >
                    active org projects
                  </button>
                )}
              </div>
            </div>
            <div className="d-flex flex-wrap gap-2">
              <button
                type="submit"
                className="btn btn-outline-primary"
                disabled={trying || !tryKey.trim()}
              >
                {trying ? "Calling…" : "GET path"}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={matrixRunning || !tryKey.trim()}
                onClick={() => void onMatrix()}
              >
                {matrixRunning ? "Running…" : "Run scope matrix"}
              </button>
            </div>
          </form>
          {!activeOrg && (
            <p className="small text-muted mt-2 mb-0">
              Select an active org in the nav for the org-scope matrix row.
            </p>
          )}
          {tryResult && (
            <pre
              className="mt-3 p-3 bg-body-secondary rounded small overflow-auto"
              style={{ maxHeight: "16rem" }}
            >
              {tryResult}
            </pre>
          )}
          {matrixResult && (
            <pre
              className="mt-3 p-3 bg-body-secondary rounded small overflow-auto"
              style={{ maxHeight: "28rem" }}
            >
              {matrixResult}
            </pre>
          )}
        </div>
      </div>
    </div>
  )
}
