import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { initKeycloak, keycloak } from "./keycloak"

const KNOWN_ROLES = ["ADMIN", "APPROVER", "REVIEWER", "USER"]
const REVIEWER_ROLES = ["REVIEWER", "APPROVER", "ADMIN"]

interface AuthContextValue {
  name: string
  roles: string[]
  isReviewer: boolean
  isAdmin: boolean
  logout: () => void
}

interface TokenClaims {
  name?: string
  preferred_username?: string
  realm_access?: { roles?: string[] }
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    initKeycloak()
      .then(() => setReady(true))
      .catch(() => setError("Could not reach the login server. Is Keycloak running on port 8080?"))
  }, [])

  if (error) return <div className="p-8 text-red-600">{error}</div>
  if (!ready) return <div className="p-8 text-muted-foreground">Signing you in…</div>

  const claims = (keycloak.tokenParsed ?? {}) as TokenClaims
  const tokenRoles = claims.realm_access?.roles ?? []
  const roles = KNOWN_ROLES.filter((r) => tokenRoles.includes(r))

  const value: AuthContextValue = {
    name: claims.name ?? claims.preferred_username ?? "Unknown user",
    roles,
    isReviewer: roles.some((r) => REVIEWER_ROLES.includes(r)),
    isAdmin: roles.includes("ADMIN"),
    logout: () => keycloak.logout({ redirectUri: window.location.origin }),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider")
  return ctx
}