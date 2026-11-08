import { useQuery } from "@tanstack/react-query"
import { Check, KeyRound, LogOut, Mail } from "lucide-react"
import { useAuth } from "@/auth/AuthProvider"
import { api } from "@/lib/api"
import { Avatar } from "@/components/Avatar"
import { PageHeader } from "@/components/PageHeader"
import { Panel } from "@/components/Panel"
import { Button } from "@/components/ui/button"

const USER_ABILITIES = [
  "Create drafts and attach files",
  "Edit a document while it is a draft or needs changes",
  "Submit, resubmit or withdraw your own documents",
  "Follow every step in the history of your documents",
]
const REVIEWER_ABILITIES = [
  "See every submitted document in the review queue",
  "Start reviews, approve, reject or request changes",
  "Comments are required when rejecting or requesting changes",
  "You can never review your own documents",
]
const ADMIN_ABILITIES = ["Everything a reviewer can do", "See the system-wide activity feed"]

export function ProfilePage() {
  const { name, email, roles, roleLabel, isReviewer, isAdmin, manageAccount, logout } = useAuth()
  const stats = useQuery({ queryKey: ["stats"], queryFn: () => api.stats() })
  const by = stats.data?.byStatus ?? {}

  const abilities = [...USER_ABILITIES, ...(isReviewer ? REVIEWER_ABILITIES : []), ...(isAdmin ? ADMIN_ABILITIES : [])]

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader title="Your profile" subtitle="Your account, your role and what you can do in DocFlow." />

      <Panel className="flex flex-wrap items-center gap-5 p-6">
        <Avatar name={name} className="size-16 text-xl" />
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-semibold tracking-tight">{name}</h2>
          {email && (
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              <Mail className="size-4" />
              {email}
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">{roleLabel}</span>
            {roles.map((r) => (
              <span key={r} className="rounded-full border px-3 py-1 text-xs text-muted-foreground">
                {r}
              </span>
            ))}
          </div>
        </div>
      </Panel>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: isReviewer ? "Visible documents" : "My documents", value: stats.data?.total },
          { label: "Approved", value: stats.data ? (by.APPROVED ?? 0) : undefined },
          { label: "Rejected", value: stats.data ? (by.REJECTED ?? 0) : undefined },
          { label: "In progress", value: stats.data ? (by.SUBMITTED ?? 0) + (by.UNDER_REVIEW ?? 0) : undefined },
        ].map((s) => (
          <Panel key={s.label} className="p-5">
            <div className="text-sm text-muted-foreground">{s.label}</div>
            <div className="mt-1 text-3xl font-semibold tracking-tight">{s.value ?? "–"}</div>
          </Panel>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Panel className="space-y-4 p-6">
          <h2 className="font-semibold">What you can do</h2>
          <ul className="space-y-3">
            {abilities.map((a) => (
              <li key={a} className="flex items-start gap-3 text-sm">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
                  <Check className="size-3" />
                </span>
                {a}
              </li>
            ))}
          </ul>
        </Panel>

        <Panel className="space-y-4 p-6">
          <h2 className="font-semibold">Account and security</h2>
          <p className="text-sm text-muted-foreground">
            Your password, name and email are managed by the secure sign-in service. Changes there apply everywhere.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={manageAccount}>
              <KeyRound className="size-4" />
              Manage account
            </Button>
            <Button variant="outline" onClick={logout}>
              <LogOut className="size-4" />
              Sign out
            </Button>
          </div>
        </Panel>
      </div>
    </div>
  )
}