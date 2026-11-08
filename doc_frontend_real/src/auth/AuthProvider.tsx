import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { Leaf } from "lucide-react"
import { initKeycloak, keycloak } from "./keycloak"

const KNOWN_ROLES = ["ADMIN", "APPROVER", "REVIEWER", "USER"]
const REVIEWER_ROLES = ["REVIEWER", "APPROVER", "ADMIN"]
const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrator",
  APPROVER: "Approver",
  REVIEWER: "Reviewer",
  USER: "Submitter",
}

interface AuthContextValue {
  name: string
  firstName: string
  email: string
  roles: string[]
  roleLabel: string
  isReviewer: boolean
  isAdmin: boolean
  manageAccount: () => void
  logout: () => void
}

interface TokenClaims {
  name?: string
  given_name?: string
  email?: string
  preferred_username?: string
  realm_access?: { roles?: string[] }
}

const AuthContext = createContext<AuthContextValue | null>(null)

function Splash({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
        <Leaf className="size-6" />
      </span>
      {children}
    </div>
  )
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    initKeycloak()
      .then(() => setReady(true))
      .catch(() => setError("Could not reach the login server. Is Keycloak running on port 8080?"))
  }, [])

  if (error) {
    return (
      <Splash>
        <p className="max-w-sm text-sm text-red-600">{error}</p>
      </Splash>
    )
  }
  if (!ready) {
    return (
      <Splash>
        <p className="text-sm text-muted-foreground">Signing you in…</p>
      </Splash>
    )
  }

  const claims = (keycloak.tokenParsed ?? {}) as TokenClaims
  const tokenRoles = claims.realm_access?.roles ?? []
  const roles = KNOWN_ROLES.filter((r) => tokenRoles.includes(r)) // highest role first
  const name = claims.name ?? claims.preferred_username ?? "Unknown user"

  const value: AuthContextValue = {
    name,
    firstName: claims.given_name ?? name.split(" ")[0] ?? name,
    email: claims.email ?? "",
    roles,
    roleLabel: ROLE_LABELS[roles[0] ?? "USER"] ?? "Member",
    isReviewer: roles.some((r) => REVIEWER_ROLES.includes(r)),
    isAdmin: roles.includes("ADMIN"),
    manageAccount: () => window.open(keycloak.createAccountUrl(), "_blank", "noopener"),
    logout: () => keycloak.logout({ redirectUri: window.location.origin }),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider")
  return ctx
}