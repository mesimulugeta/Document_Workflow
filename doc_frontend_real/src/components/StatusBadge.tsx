import { cn } from "@/lib/utils"
import type { DocumentStatus } from "@/types"

const STYLES: Record<DocumentStatus, { badge: string; dot: string }> = {
  DRAFT: { badge: "bg-slate-100 text-slate-700 ring-slate-200", dot: "bg-slate-400" },
  SUBMITTED: { badge: "bg-blue-50 text-blue-700 ring-blue-200", dot: "bg-blue-500" },
  UNDER_REVIEW: { badge: "bg-amber-50 text-amber-800 ring-amber-200", dot: "bg-amber-500" },
  CHANGES_REQUESTED: { badge: "bg-orange-50 text-orange-800 ring-orange-200", dot: "bg-orange-500" },
  APPROVED: { badge: "bg-green-50 text-green-800 ring-green-200", dot: "bg-green-500" },
  REJECTED: { badge: "bg-red-50 text-red-700 ring-red-200", dot: "bg-red-500" },
  WITHDRAWN: { badge: "bg-zinc-100 text-zinc-600 ring-zinc-200", dot: "bg-zinc-400" },
}

export function statusLabel(status: DocumentStatus): string {
  const text = status.toLowerCase().replace(/_/g, " ")
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export function statusDot(status: DocumentStatus): string {
  return STYLES[status].dot
}

export function StatusBadge({ status, className }: { status: DocumentStatus; className?: string }) {
  const style = STYLES[status]
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        style.badge,
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", style.dot)} />
      {statusLabel(status)}
    </span>
  )
}