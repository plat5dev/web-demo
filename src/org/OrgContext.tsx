import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { api } from "../api/endpoints"
import type { Organization } from "../api/types"
import { useAuth } from "../auth/AuthContext"

const STORAGE_KEY = "plat5.web-demo.active-org"

type OrgState = {
  orgs: Organization[]
  activeOrg: Organization | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  setActiveOrgId: (id: string | null) => void
}

const OrgContext = createContext<OrgState | null>(null)

export function OrgProvider({ children }: { children: ReactNode }) {
  const { authenticated } = useAuth()
  const [orgs, setOrgs] = useState<Organization[]>([])
  const [activeOrgId, setActiveOrgIdState] = useState<string | null>(() =>
    localStorage.getItem(STORAGE_KEY),
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!authenticated) {
      setOrgs([])
      return
    }
    setLoading(true)
    setError(null)
    try {
      const list = await api.listOrganizations()
      setOrgs(list)
      if (activeOrgId && !list.some((o) => o.id === activeOrgId)) {
        setActiveOrgIdState(null)
        localStorage.removeItem(STORAGE_KEY)
      } else if (!activeOrgId && list.length === 1) {
        const id = list[0]!.id
        setActiveOrgIdState(id)
        localStorage.setItem(STORAGE_KEY, id)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load organizations")
      setOrgs([])
    } finally {
      setLoading(false)
    }
  }, [authenticated, activeOrgId])

  useEffect(() => {
    void refresh()
  }, [authenticated]) // eslint-disable-line react-hooks/exhaustive-deps

  const setActiveOrgId = useCallback((id: string | null) => {
    setActiveOrgIdState(id)
    if (id) localStorage.setItem(STORAGE_KEY, id)
    else localStorage.removeItem(STORAGE_KEY)
  }, [])

  const activeOrg = useMemo(
    () => orgs.find((o) => o.id === activeOrgId) ?? null,
    [orgs, activeOrgId],
  )

  const value = useMemo(
    () => ({
      orgs,
      activeOrg,
      loading,
      error,
      refresh,
      setActiveOrgId,
    }),
    [orgs, activeOrg, loading, error, refresh, setActiveOrgId],
  )

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>
}

export function useOrg(): OrgState {
  const ctx = useContext(OrgContext)
  if (!ctx) throw new Error("useOrg outside OrgProvider")
  return ctx
}
