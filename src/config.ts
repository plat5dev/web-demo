function required(name: string, fallback: string): string {
  const v = import.meta.env[name] as string | undefined
  if (v !== undefined && v !== "") return v
  return fallback
}

export const config = {
  gatewayUrl: required("VITE_GATEWAY_URL", "http://localhost:5001").replace(/\/$/, ""),
  authIssuer: required("VITE_AUTH_ISSUER", "http://localhost:5000").replace(/\/$/, ""),
  authClientId: required("VITE_AUTH_CLIENT_ID", "plat5"),
  authRedirectUri: required(
    "VITE_AUTH_REDIRECT_URI",
    `${window.location.origin}/callback`,
  ),
  authAudience: (import.meta.env.VITE_AUTH_AUDIENCE as string | undefined) || undefined,
  apiKeyBrand: required("VITE_APIKEY_BRAND", "plat5"),
} as const

export const userKeyPrefix = `${config.apiKeyBrand}-sk-1-`
export const memberKeyPrefix = `${config.apiKeyBrand}-mk-1-`
