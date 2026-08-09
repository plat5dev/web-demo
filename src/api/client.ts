import { config } from "../config"
import type { ApiErrorBody } from "./types"

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly requestId: string | null
  readonly body: ApiErrorBody | null

  constructor(
    status: number,
    message: string,
    code = "UNKNOWN",
    requestId: string | null = null,
    body: ApiErrorBody | null = null,
  ) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.code = code
    this.requestId = requestId
    this.body = body
  }
}

export type TokenProvider = () => Promise<string | null>

export type FetchAuth =
  | { mode?: "session" }
  | { mode: "api-key"; apiKey: string }
  | { mode: "none" }

export type ApiFetchInit = RequestInit & { auth?: FetchAuth }

let getAccessToken: TokenProvider = async () => null

export function setTokenProvider(provider: TokenProvider): void {
  getAccessToken = provider
}

export async function apiFetch<T>(
  path: string,
  init: ApiFetchInit = {},
): Promise<T> {
  const { auth, ...fetchInit } = init
  const headers = new Headers(fetchInit.headers)
  if (!headers.has("Accept")) headers.set("Accept", "application/json")
  if (fetchInit.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json")
  }

  if (auth?.mode === "api-key") {
    headers.set("X-API-Key", auth.apiKey)
  } else if (auth?.mode !== "none") {
    const token = await getAccessToken()
    if (token) headers.set("Authorization", `Bearer ${token}`)
  }

  const res = await fetch(`${config.gatewayUrl}${path}`, {
    ...fetchInit,
    headers,
  })

  if (res.status === 204) {
    return undefined as T
  }

  const text = await res.text()
  let data: unknown = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = null
    }
  }

  if (!res.ok) {
    const err = data as ApiErrorBody | null
    if (err?.error) {
      throw new ApiError(
        res.status,
        err.error.message || res.statusText,
        err.error.code,
        err.error.request_id,
        err,
      )
    }
    throw new ApiError(res.status, text || res.statusText)
  }

  return data as T
}
