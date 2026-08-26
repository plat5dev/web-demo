import { config } from "../config"
import { randomString, sha256Challenge } from "./pkce"

const STORAGE_KEY = "plat5.web-demo.tokens"
const PKCE_KEY = "plat5.web-demo.pkce"
const INVITE_KEY = "plat5.web-demo.invite"

/** Web-demo login query (`/login?invite=`). Not forwarded to Auth `/authorize`. */
export const INVITE_QUERY = "invite"

export type TokenSet = {
  access_token: string
  refresh_token?: string
  expires_at: number
}

type PkceState = {
  state: string
  verifier: string
  returnTo: string
}

function loadTokens(): TokenSet | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as TokenSet
  } catch {
    return null
  }
}

function saveTokens(tokens: TokenSet | null): void {
  if (!tokens) {
    sessionStorage.removeItem(STORAGE_KEY)
    return
  }
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(tokens))
}

export function clearSession(): void {
  saveTokens(null)
  sessionStorage.removeItem(PKCE_KEY)
}

export function getStoredTokens(): TokenSet | null {
  return loadTokens()
}

/**
 * Copy-link URL for an org invite token.
 * Origin path so this tab can stash the token, then start its own PKCE.
 * Auth `/authorize` must not receive `invite=`.
 */
export function inviteAppUrl(
  token: string,
  origin = window.location.origin,
): string {
  const url = new URL("/login", origin)
  url.searchParams.set(INVITE_QUERY, token)
  return url.toString()
}

export function stashInvite(token: string): void {
  const trimmed = token.trim()
  if (!trimmed) {
    sessionStorage.removeItem(INVITE_KEY)
    return
  }
  sessionStorage.setItem(INVITE_KEY, trimmed)
}

export function peekStashedInvite(): string | null {
  const trimmed = sessionStorage.getItem(INVITE_KEY)?.trim() || ""
  return trimmed || null
}

export function clearStashedInvite(): void {
  sessionStorage.removeItem(INVITE_KEY)
}

export async function beginLogin(returnTo = "/"): Promise<void> {
  const state = randomString(16)
  const verifier = randomString(32)
  const challenge = await sha256Challenge(verifier)
  const pkce: PkceState = { state, verifier, returnTo }
  sessionStorage.setItem(PKCE_KEY, JSON.stringify(pkce))

  const url = new URL(`${config.authIssuer}/authorize`)
  url.searchParams.set("client_id", config.authClientId)
  url.searchParams.set("redirect_uri", config.authRedirectUri)
  url.searchParams.set("response_type", "code")
  url.searchParams.set("state", state)
  url.searchParams.set("code_challenge", challenge)
  url.searchParams.set("code_challenge_method", "S256")
  url.searchParams.set("provider", "password")
  if (config.authAudience) {
    url.searchParams.set("audience", config.authAudience)
  }

  window.location.assign(url.toString())
}

/** Survives React Strict Mode double-mount; one code exchange per page load. */
let completeLoginInflight: Promise<string> | null = null

export function completeLogin(search: string): Promise<string> {
  if (!completeLoginInflight) {
    completeLoginInflight = completeLoginOnce(search)
  }
  return completeLoginInflight
}

async function completeLoginOnce(search: string): Promise<string> {
  const params = new URLSearchParams(search)
  const err = params.get("error")
  if (err) {
    throw new Error(params.get("error_description") || err)
  }

  const code = params.get("code")
  const state = params.get("state")
  if (!code || !state) {
    throw new Error("Missing code or state in callback")
  }

  // Already finished this callback (e.g. Strict Mode remount after success)
  const existing = loadTokens()
  if (existing && !sessionStorage.getItem(PKCE_KEY)) {
    return "/"
  }

  const raw = sessionStorage.getItem(PKCE_KEY)
  if (!raw) throw new Error("Missing PKCE state (try signing in again)")
  const pkce = JSON.parse(raw) as PkceState

  if (pkce.state !== state) {
    throw new Error("OAuth state mismatch")
  }

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: config.authRedirectUri,
    client_id: config.authClientId,
    code_verifier: pkce.verifier,
  })

  const res = await fetch(`${config.authIssuer}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Token exchange failed: ${text || res.statusText}`)
  }

  const data = (await res.json()) as {
    access_token: string
    refresh_token?: string
    expires_in?: number
  }

  const expiresIn = data.expires_in ?? 3600
  saveTokens({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + expiresIn * 1000 - 30_000,
  })
  // Clear PKCE only after a successful exchange
  sessionStorage.removeItem(PKCE_KEY)

  return pkce.returnTo || "/"
}

async function refreshTokens(refreshToken: string): Promise<TokenSet> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: config.authClientId,
  })

  const res = await fetch(`${config.authIssuer}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  })

  if (!res.ok) {
    clearSession()
    throw new Error("Session expired — sign in again")
  }

  const data = (await res.json()) as {
    access_token: string
    refresh_token?: string
    expires_in?: number
  }

  const expiresIn = data.expires_in ?? 3600
  const tokens: TokenSet = {
    access_token: data.access_token,
    refresh_token: data.refresh_token ?? refreshToken,
    expires_at: Date.now() + expiresIn * 1000 - 30_000,
  }
  saveTokens(tokens)
  return tokens
}

export async function getAccessToken(): Promise<string | null> {
  let tokens = loadTokens()
  if (!tokens) return null

  if (Date.now() >= tokens.expires_at) {
    if (!tokens.refresh_token) {
      clearSession()
      return null
    }
    tokens = await refreshTokens(tokens.refresh_token)
  }

  return tokens.access_token
}

export function isLoggedIn(): boolean {
  return loadTokens() !== null
}
