import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import { Activity } from "lucide-react"
import { api } from "@/lib/api"
import { formatDateTime, timeAgo } from "@/lib/format"
import { Avatar } from "@/components/Avatar"
import { PageHeader } from "@/components/PageHeader"
import { Panel } from "@/components/Panel"
import { StatusBadge } from "@/components/StatusBadge"
import { Skeleton } from "@/components/ui/skeleton"

const VERBS: Record<string, string> = {
  CREATE: "created",
  UPDATE: "edited",
  UPLOAD_FILE: "attached a file to",
  DELETE_FILE: "removed a file from",
  SUBMIT: "submitted",
  START_REVIEW: "started reviewing",
  APPROVE: "approved",
  REJECT: "rejected",
  REQUEST_CHANGES: "requested changes on",
  RESUBMIT: "resubmitted",
  WITHDRAW: "withdrew",
}

export function ActivityPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["activity"],
    queryFn: () => api.activity(40),
    refetchInterval: 15000,
  })

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader title="Activity" subtitle="The latest actions across all documents. Visible to administrators only." />

      <Panel className="overflow-hidden">
        {isLoading && (
          <div className="space-y-3 p-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        )}
        {isError && <p className="p-6 text-sm text-red-600">Could not load the activity feed.</p>}

        {data?.length === 0 && (
          <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
              <Activity className="size-6" />
            </span>
            <p className="font-medium">No activity yet</p>
          </div>
        )}

        <ul className="divide-y">
          {data?.map((entry) => (
            <li key={entry.id} className="flex items-start gap-4 p-4">
              <Avatar name={entry.actorName ?? "?"} />
              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  <span className="font-medium">{entry.actorName ?? "Someone"}</span>{" "}
                  {VERBS[entry.action] ?? entry.action.toLowerCase()}{" "}
                  <Link to={`/documents/${entry.documentId}`} className="font-medium text-primary hover:underline">
                    {entry.documentTitle ?? `document #${entry.documentId}`}
                  </Link>
                </p>
                {entry.comment && <p className="mt-1.5 rounded-xl bg-muted px-3 py-2 text-sm">{entry.comment}</p>}
                <p className="mt-1 text-xs text-muted-foreground" title={formatDateTime(entry.createdAt)}>
                  {timeAgo(entry.createdAt)}
                </p>
              </div>
              <StatusBadge status={entry.toStatus} />
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  )
}