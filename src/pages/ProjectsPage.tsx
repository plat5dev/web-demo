import { useEffect, useState, type FormEvent } from "react"
import { Link } from "react-router-dom"
import { api } from "../api/endpoints"
import type { Project } from "../api/types"
import { ErrorAlert } from "../components/ErrorAlert"
import { useOrg } from "../org/OrgContext"

export function ProjectsPage() {
  const { activeOrg } = useOrg()
  const [projects, setProjects] = useState<Project[]>([])
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<unknown>(null)

  async function load(orgId: string) {
    setLoading(true)
    setError(null)
    try {
      setProjects(await api.listProjects(orgId))
    } catch (e) {
      setError(e)
      setProjects([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!activeOrg) {
      setProjects([])
      return
    }
    void load(activeOrg.id)
  }, [activeOrg?.id])

  async function onCreate(e: FormEvent) {
    e.preventDefault()
    if (!activeOrg) return
    setCreating(true)
    setError(null)
    try {
      await api.createProject(activeOrg.id, {
        name: name.trim(),
        description: description.trim() || undefined,
      })
      setName("")
      setDescription("")
      await load(activeOrg.id)
    } catch (err) {
      setError(err)
    } finally {
      setCreating(false)
    }
  }

  async function onDelete(projectId: string) {
    if (!activeOrg) return
    if (!confirm("Delete this project?")) return
    setError(null)
    try {
      await api.deleteProject(activeOrg.id, projectId)
      await load(activeOrg.id)
    } catch (err) {
      setError(err)
    }
  }

  if (!activeOrg) {
    return (
      <div className="alert alert-warning">
        Select or create an organization first.{" "}
        <Link to="/orgs">Organizations</Link>
      </div>
    )
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-start mb-3">
        <div>
          <h1 className="h3 mb-1">Projects</h1>
          <p className="text-muted small mb-0">
            Org <strong>{activeOrg.name}</strong> · organization scope via
            gateway
          </p>
        </div>
      </div>

      <ErrorAlert error={error} onDismiss={() => setError(null)} />

      <div className="row">
        <div className="col-lg-7 mb-4">
          {loading && <div className="text-muted">Loading…</div>}
          <div className="list-group">
            {!loading && projects.length === 0 && (
              <div className="list-group-item text-muted">No projects yet.</div>
            )}
            {projects.map((p) => (
              <div
                key={p.id}
                className="list-group-item d-flex justify-content-between align-items-start"
              >
                <div>
                  <Link
                    className="fw-semibold text-decoration-none"
                    to={`/projects/${p.id}`}
                  >
                    {p.name}
                  </Link>
                  {p.description && (
                    <div className="small text-muted">{p.description}</div>
                  )}
                  <div className="small font-monospace text-muted">{p.id}</div>
                </div>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-danger"
                  onClick={() => void onDelete(p.id)}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="col-lg-5">
          <div className="card">
            <div className="card-header">New project</div>
            <div className="card-body">
              <form onSubmit={(e) => void onCreate(e)}>
                <div className="mb-3">
                  <label className="form-label" htmlFor="proj_name">
                    Name
                  </label>
                  <input
                    id="proj_name"
                    className="form-control"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    maxLength={255}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label" htmlFor="proj_desc">
                    Description
                  </label>
                  <textarea
                    id="proj_desc"
                    className="form-control"
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    maxLength={2000}
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
      </div>
    </div>
  )
}
