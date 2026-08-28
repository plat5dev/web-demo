# Plat5 web demo

Sample **SPA** that talks to Plat5 through the **gateway** and signs in with **Plat5 Auth** (browser OAuth/PKCE redirect). Not a template or product — dogfood UI for profiles, user/member API keys, orgs/members/service accounts, copy-invite-link, projects, and tasks.

Stack: Vite · React · TypeScript · Bootstrap 5.

## Prerequisites

1. **Plat5 Auth** on `:5000` with SPA allowlists (defaults are often Postman-only):

   ```bash
   AUTH_ALLOWED_CLIENTS=plat5
   AUTH_ALLOWED_REDIRECT_URIS=http://localhost:5173/callback,https://oauth.pstmn.io/v1/callback
   AUTH_ALLOWED_ORIGINS=http://localhost:5173
   ```

   Auth: [`plat5dev/auth`](https://github.com/plat5dev/auth).

2. **Plat5** gateway on `:5001`. Empty `ALLOWED_ORIGINS` is fine locally (`*`).

3. A backend behind gateway routes for profiles / projects / tasks (e.g. a template API on `:3000` with routes applied).

## Run

```bash
cp .env.example .env   # optional; defaults match local ports
bun install
bun run dev            # http://localhost:5173
```

Sign in → Auth password UI (dev codes in Auth issuer logs when SMTP unset) → profile / user API keys / orgs (members, invites, service accounts, member keys, admission probe) / projects / tasks.

Invite copy-link is `{origin}/invites?invite={token}`. There is no `/login?invite=` alias. Identity list returns plaintext `token` for admin/owner while the row is `active`; the app builds the URL. Members see prefix/status/role/expiry, not the token. Create `max_uses` omitted = 1; JSON `null` = unlimited.

Already signed in: redeem immediately (skip PKCE). Else the app stashes the token in a first-party cookie (`plat5_web_demo_invite`, not Auth’s `plat5_invite_token`) plus an origin stash keyed by OAuth CSRF `state`, strips the query so Referer to Auth cannot leak it, starts PKCE (Auth `/authorize` does **not** get `invite=`; token never in OAuth `state`), then `POST /api/invites/redeem` with `{ "token" }` and the session JWT. Cookie/stash clear only after a successful redeem. Dead redeem (redeemed / revoked / expired) is **409** `CONFLICT`. Unknown token is **404**. Add-by-`user_id` still works. Email is unbound. No SMTP.

## Env

| Variable | Default |
|----------|---------|
| `VITE_GATEWAY_URL` | `http://localhost:5001` |
| `VITE_AUTH_ISSUER` | `http://localhost:5000` |
| `VITE_AUTH_CLIENT_ID` | `plat5` |
| `VITE_AUTH_REDIRECT_URI` | `http://localhost:5173/callback` |
| `VITE_AUTH_AUDIENCE` | (unset) |
| `VITE_APIKEY_BRAND` | `plat5` |

## Auth notes

Plat5 Auth (OpenAuth) returns **access + refresh** tokens (no `id_token`). This app uses authorization-code + **PKCE** against `/authorize` and `/token`, not a full OIDC client library.

API calls send `Authorization: Bearer <access_token>` only. Never inject identity headers from the browser.

**JWT `iss` must match gateway `AUTH_ISSUER` exactly.**  
`http://localhost:5000` ≠ `http://127.0.0.1:5000`. Use the same host string in:

- browser Auth URL (`VITE_AUTH_ISSUER`)
- gateway `AUTH_ISSUER`

Mismatch → `401` with `details.reason=invalid_issuer`.

## Boundaries

No monorepo imports. Wire by published URLs / env only.

## License

MIT — see [LICENSE](LICENSE).
