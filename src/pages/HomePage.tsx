import { Link } from "react-router-dom"
import { useAuth } from "../auth/AuthContext"
import { useOrg } from "../org/OrgContext"
import { config } from "../config"

export function HomePage() {
  const { authenticated, login } = useAuth()
  const { activeOrg } = useOrg()

  return (
    <div className="row justify-content-center">
      <div className="col-lg-8">
        <div className="p-4 p-md-5 mb-4 bg-body-tertiary rounded-3">
          <img src="/logo.jpg" alt="Plat5" className="home-logo mb-3" />
          <h1 className="display-6">Plat5 web demo</h1>
          <p className="lead mb-3">
            Sample SPA against the gateway: OIDC login, API keys, orgs +
            memberships, and org-scoped projects/tasks from the Bun + Effect
            template API.
          </p>
          {!authenticated ? (
            <button
              type="button"
              className="btn btn-primary btn-lg"
              onClick={() => void login("/")}
            >
              Sign in with Plat5 Auth
            </button>
          ) : (
            <div className="d-flex flex-wrap gap-2">
              <Link className="btn btn-outline-primary" to="/profile">
                Profile
              </Link>
              <Link className="btn btn-outline-primary" to="/orgs">
                Organizations
              </Link>
              <Link className="btn btn-outline-primary" to="/api-keys">
                API keys
              </Link>
              <Link
                className="btn btn-primary"
                to="/projects"
                aria-disabled={!activeOrg}
              >
                Projects
              </Link>
            </div>
          )}
        </div>

        <div className="card mb-3">
          <div className="card-header">What this demos</div>
          <ul className="list-group list-group-flush">
            <li className="list-group-item">
              <strong>OIDC + PKCE</strong> → JWT on every gateway call
            </li>
            <li className="list-group-item">
              <strong>API keys</strong> → same scopes via{" "}
              <code>X-API-Key</code>
            </li>
            <li className="list-group-item">
              <strong>Orgs + memberships</strong> → platform identity; admission
              probe shows non-member <code>404</code>
            </li>
            <li className="list-group-item">
              <strong>Projects / tasks</strong> → template business API
              (org scope)
            </li>
          </ul>
        </div>

        <div className="card">
          <div className="card-header">Local setup checklist</div>
          <ul className="list-group list-group-flush">
            <li className="list-group-item">
              Auth on <code>{config.authIssuer}</code> with redirect{" "}
              <code>{config.authRedirectUri}</code> allowed
            </li>
            <li className="list-group-item">
              Plat5 gateway on <code>{config.gatewayUrl}</code>
            </li>
            <li className="list-group-item">
              Template API on <code>:3000</code> with routes applied
            </li>
            <li className="list-group-item">
              Create an organization → members / API keys → projects &amp; tasks
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
