import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import { ChevronRight, ClipboardCheck, FileText } from "lucide-react"
import { api } from "@/lib/api"
import { timeAgo } from "@/lib/format"
import type { WorkflowAction } from "@/types"
import { Avatar } from "@/components/Avatar"
import { PageHeader } from "@/components/PageHeader"
import { Panel } from "@/components/Panel"
import { StatusBadge } from "@/components/StatusBadge"
import { Skeleton } from "@/components/ui/skeleton"

const REVIEW_ACTIONS: WorkflowAction[] = ["START_REVIEW", "APPROVE", "REJECT", "REQUEST_CHANGES"]

export function ReviewQueuePage() {
  const submitted = useQuery({
    queryKey: ["documents", "queue", "SUBMITTED"],
    queryFn: () => api.listDocuments(0, 50, "SUBMITTED"),
  })
  const underReview = useQuery({
    queryKey: ["documents", "queue", "UNDER_REVIEW"],
    queryFn: () => api.listDocuments(0, 50, "UNDER_REVIEW"),
  })

  const isLoading = submitted.isLoading || underReview.isLoading
  const isError = submitted.isError || underReview.isError

  // Only documents this reviewer can actually act on; their own submissions are left out.
  const items = [...(submitted.data?.content ?? []), ...(underReview.data?.content ?? [])]
    .filter((d) => d.allowedActions.some((a) => REVIEW_ACTIONS.includes(a)))
    .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt)) // oldest first

  return (
    <div className="space-y-6">
      <PageHeader
        title="Review queue"
        subtitle={
          isLoading
            ? "Loading…"
            : items.length === 0
              ? "Nothing is waiting for you."
              : `${items.length} document${items.length === 1 ? "" : "s"} need your attention, oldest first.`
        }
      />

      <Panel className="overflow-hidden">
        {isLoading && (
          <div className="space-y-3 p-4">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        )}

        {isError && <p className="p-6 text-sm text-red-600">Could not load the review queue.</p>}

        {!isLoading && !isError && items.length === 0 && (
          <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
              <ClipboardCheck className="size-6" />
            </span>
            <div>
              <p className="font-medium">You are all caught up</p>
              <p className="mt-1 text-sm text-muted-foreground">New submissions will appear here.</p>
            </div>
          </div>
        )}

        <ul className="divide-y">
          {items.map((doc) => (
            <li key={doc.id}>
              <Link to={`/documents/${doc.id}`} className="flex items-center gap-4 p-4 transition-colors hover:bg-muted/60">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                  <FileText className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{doc.title}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <Avatar name={doc.ownerName} className="size-5 text-[9px]" />
                      {doc.ownerName}
                    </span>
                    <span>Waiting since {timeAgo(doc.updatedAt)}</span>
                  </div>
                </div>
                <StatusBadge status={doc.status} />
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  )
}