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
            Sample SPA against the gateway: OIDC login, user/member API keys,
            orgs + members + service accounts, and org-scoped projects/tasks.
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
                User API keys
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
              <strong>User API keys</strong> (<code>plat5-sk-1-</code>) → user
              + org scope via <code>X-API-Key</code>
            </li>
            <li className="list-group-item">
              <strong>Member API keys</strong> (<code>plat5-mk-1-</code>) → org
              scope only; mint on a member or service account
            </li>
            <li className="list-group-item">
              <strong>Orgs + members + service accounts</strong> → identity;
              admission probe shows non-member <code>404</code>
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
              Create an org → SA + member keys → user keys probe matrix →
              projects &amp; tasks
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
