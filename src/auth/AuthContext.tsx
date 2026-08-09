import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { setTokenProvider } from "../api/client"
import {
  beginLogin,
  clearSession,
  getAccessToken,
  isLoggedIn,
} from "./session"

type AuthState = {
  ready: boolean
  authenticated: boolean
  login: (returnTo?: string) => Promise<void>
  logout: () => void
  getToken: () => Promise<string | null>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [authenticated, setAuthenticated] = useState(false)

  useEffect(() => {
    setTokenProvider(getAccessToken)
    setAuthenticated(isLoggedIn())
    setReady(true)
  }, [])

  const login = useCallback(async (returnTo = "/") => {
    await beginLogin(returnTo)
  }, [])

  const logout = useCallback(() => {
    clearSession()
    setAuthenticated(false)
  }, [])

  const value = useMemo(
    () => ({
      ready,
      authenticated,
      login,
      logout,
      getToken: getAccessToken,
    }),
    [ready, authenticated, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth outside AuthProvider")
  return ctx
}

