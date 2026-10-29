import { NavLink, Outlet } from "react-router-dom"
import { ClipboardCheck, FileText, LogOut } from "lucide-react"
import { useAuth } from "@/auth/AuthProvider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

function NavItem({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
          isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
        }`
      }
    >
      {icon}
      {label}
    </NavLink>
  )
}

export function AppLayout() {
  const { name, roles, isReviewer, logout } = useAuth()

  return (
    <div className="flex min-h-screen bg-muted/30">
      <aside className="hidden w-60 shrink-0 border-r bg-background p-4 md:block">
        <div className="mb-6 px-3 text-lg font-semibold">Workflow</div>
        <nav className="space-y-1">
          <NavItem to="/documents" icon={<FileText className="size-4" />} label="Documents" />
          {isReviewer && <NavItem to="/review" icon={<ClipboardCheck className="size-4" />} label="Review queue" />}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-end gap-3 border-b bg-background px-6 py-3">
          <div className="flex gap-1">
            {roles.map((r) => (
              <Badge key={r} variant="secondary">
                {r}
              </Badge>
            ))}
          </div>
          <span className="text-sm font-medium">{name}</span>
          <Button variant="outline" size="sm" onClick={logout}>
            <LogOut className="size-4" />
            Sign out
          </Button>
        </header>
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}