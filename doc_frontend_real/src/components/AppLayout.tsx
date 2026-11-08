import { useEffect, useRef, useState } from "react"
import { NavLink, Outlet } from "react-router-dom"
import { Activity, ChevronDown, ClipboardCheck, FileText, Leaf, LogOut, Menu, User, X } from "lucide-react"
import { useAuth } from "@/auth/AuthProvider"
import { Avatar } from "@/components/Avatar"
import { cn } from "@/lib/utils"

function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
        <Leaf className="size-5" />
      </span>
      <span className="text-lg font-semibold tracking-tight">DocFlow</span>
    </div>
  )
}

function NavItem({
  to,
  icon,
  label,
  onNavigate,
}: {
  to: string
  icon: React.ReactNode
  label: string
  onNavigate?: () => void
}) {
  return (
    <NavLink
      to={to}
      onClick={onNavigate}
      className={({ isActive }: { isActive: boolean }) =>
        cn(
          "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
          isActive
            ? "bg-accent text-accent-foreground shadow-sm"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )
      }
    >
      {icon}
      {label}
    </NavLink>
  )
}

function UserMenu({ onNavigate }: { onNavigate?: () => void }) {
  const { name, roleLabel, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [])

  return (
    <div ref={ref} className="relative">
      {open && (
        <div className="absolute inset-x-0 bottom-full mb-2 overflow-hidden rounded-xl border bg-popover p-1 shadow-lg">
          <NavLink
            to="/profile"
            onClick={() => {
              setOpen(false)
              onNavigate?.()
            }}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-muted"
          >
            <User className="size-4" />
            Profile
          </NavLink>
          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50"
          >
            <LogOut className="size-4" />
            Sign out
          </button>
        </div>
      )}
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 rounded-xl border bg-card p-2.5 text-left shadow-sm transition hover:bg-muted"
      >
        <Avatar name={name} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{name}</span>
          <span className="block truncate text-xs text-muted-foreground">{roleLabel}</span>
        </span>
        <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
    </div>
  )
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { isReviewer, isAdmin } = useAuth()
  return (
    <div className="flex h-full flex-col gap-6 p-4">
      <div className="px-2 pt-1">
        <Brand />
      </div>
      <nav className="space-y-1">
        <NavItem to="/documents" icon={<FileText className="size-4" />} label="Documents" onNavigate={onNavigate} />
        {isReviewer && (
          <NavItem
            to="/review"
            icon={<ClipboardCheck className="size-4" />}
            label="Review queue"
            onNavigate={onNavigate}
          />
        )}
        {isAdmin && (
          <NavItem to="/activity" icon={<Activity className="size-4" />} label="Activity" onNavigate={onNavigate} />
        )}
        <NavItem to="/profile" icon={<User className="size-4" />} label="Profile" onNavigate={onNavigate} />
      </nav>
      <div className="mt-auto">
        <UserMenu onNavigate={onNavigate} />
      </div>
    </div>
  )
}

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r bg-card/80 backdrop-blur lg:block">
        <SidebarContent />
      </aside>

      <header className="sticky top-0 z-20 flex items-center justify-between border-b bg-card/80 px-4 py-3 backdrop-blur lg:hidden">
        <Brand />
        <button
          type="button"
          aria-label="Open menu"
          onClick={() => setMobileOpen(true)}
          className="rounded-lg p-2 hover:bg-muted"
        >
          <Menu className="size-5" />
        </button>
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-black/30"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-72 bg-card shadow-xl">
            <button
              type="button"
              aria-label="Close menu"
              className="absolute right-3 top-3 rounded-lg p-2 hover:bg-muted"
              onClick={() => setMobileOpen(false)}
            >
              <X className="size-5" />
            </button>
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <main className="lg:pl-64">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-8 sm:py-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}