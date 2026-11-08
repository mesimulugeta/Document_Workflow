import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Link, useParams } from "react-router-dom"
import { ArrowLeft, Clock, FileText, Pencil, ShieldCheck } from "lucide-react"
import { toast } from "sonner"
import { api, ApiError } from "@/lib/api"
import { formatDateTime, timeAgo } from "@/lib/format"
import { INPUT } from "@/lib/styles"
import { cn } from "@/lib/utils"
import type { DocumentDto, WorkflowAction } from "@/types"
import { AttachmentsCard } from "@/components/AttachmentsCard"
import { Avatar } from "@/components/Avatar"
import { Panel } from "@/components/Panel"
import { StatusBadge, statusDot, statusLabel } from "@/components/StatusBadge"
import { WorkflowProgress } from "@/components/WorkflowProgress"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

const ACTION_LABELS: Record<WorkflowAction, string> = {
  SUBMIT: "Submit for review",
  START_REVIEW: "Start review",
  APPROVE: "Approve",
  REJECT: "Reject",
  REQUEST_CHANGES: "Request changes",
  RESUBMIT: "Resubmit",
  WITHDRAW: "Withdraw",
}

const HISTORY_LABELS: Record<string, string> = {
  CREATE: "Created the draft",
  UPDATE: "Edited the document",
  UPLOAD_FILE: "Attached a file",
  DELETE_FILE: "Removed a file",
  SUBMIT: "Submitted for review",
  START_REVIEW: "Started the review",
  APPROVE: "Approved",
  REJECT: "Rejected",
  REQUEST_CHANGES: "Requested changes",
  RESUBMIT: "Resubmitted",
  WITHDRAW: "Withdrew the document",
}

const NEEDS_COMMENT: WorkflowAction[] = ["REJECT", "REQUEST_CHANGES"]
const PRIMARY_ACTIONS: WorkflowAction[] = ["SUBMIT", "START_REVIEW", "APPROVE", "RESUBMIT"]

function variantFor(action: WorkflowAction): "default" | "outline" | "destructive" {
  if (action === "REJECT") return "destructive"
  if (PRIMARY_ACTIONS.includes(action)) return "default"
  return "outline"
}

function EditForm({ doc, onDone }: { doc: DocumentDto; onDone: () => void }) {
  const queryClient = useQueryClient()
  const [title, setTitle] = useState(doc.title)
  const [description, setDescription] = useState(doc.description ?? "")
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const save = useMutation({
    mutationFn: () => api.updateDocument(doc.id, { title, description: description || undefined }),
    onSuccess: () => {
      toast.success("Saved")
      queryClient.invalidateQueries({ queryKey: ["document", doc.id] })
      queryClient.invalidateQueries({ queryKey: ["history", doc.id] })
      queryClient.invalidateQueries({ queryKey: ["documents"] })
      onDone()
    },
    onError: (err) => {
      if (err instanceof ApiError && err.fieldErrors) {
        setFieldErrors(err.fieldErrors)
      } else {
        toast.error(err instanceof Error ? err.message : "Could not save")
      }
    },
  })

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault()
        setFieldErrors({})
        save.mutate()
      }}
    >
      <div className="space-y-1">
        <input className={INPUT} value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} />
        {fieldErrors.title && <p className="text-sm text-red-600">{fieldErrors.title}</p>}
      </div>
      <textarea
        className={INPUT}
        rows={4}
        maxLength={2000}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={save.isPending}>
          {save.isPending ? "Saving…" : "Save"}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  )
}

export function DocumentDetailPage() {
  const { id } = useParams()
  const docId = Number(id)
  const queryClient = useQueryClient()
  const [comment, setComment] = useState("")
  const [editing, setEditing] = useState(false)

  const docQuery = useQuery({ queryKey: ["document", docId], queryFn: () => api.getDocument(docId) })
  const historyQuery = useQuery({ queryKey: ["history", docId], queryFn: () => api.history(docId) })

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["document", docId] })
    queryClient.invalidateQueries({ queryKey: ["history", docId] })
    queryClient.invalidateQueries({ queryKey: ["files", docId] })
    queryClient.invalidateQueries({ queryKey: ["documents"] })
    queryClient.invalidateQueries({ queryKey: ["stats"] })
  }

  const act = useMutation({
    mutationFn: (action: WorkflowAction) => api.perform(docId, action, comment.trim() || undefined),
    onSuccess: () => {
      toast.success("Document updated")
      setComment("")
      refresh()
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Action failed")
      refresh() // someone else may have changed the document, so show its current state
    },
  })

  const doc = docQuery.data

  return (
    <div className="space-y-6">
      <Link
        to="/documents"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to documents
      </Link>

      {docQuery.isLoading && <Skeleton className="h-40 w-full" />}

      {docQuery.isError && (
        <Panel className="p-6 text-red-600">
          {docQuery.error instanceof Error ? docQuery.error.message : "Could not load the document."}
        </Panel>
      )}

      {doc && (
        <>
          <Panel className="p-6">
            {editing ? (
              <EditForm doc={doc} onDone={() => setEditing(false)} />
            ) : (
              <div className="flex flex-wrap items-start gap-4">
                <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
                  <FileText className="size-7" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-2xl font-semibold tracking-tight">{doc.title}</h1>
                    <StatusBadge status={doc.status} />
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                    {doc.description ?? "No description."}
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-2">
                      <Avatar name={doc.ownerName} className="size-6 text-[10px]" />
                      {doc.ownerName}
                    </span>
                    <span className="inline-flex items-center gap-1.5" title={formatDateTime(doc.updatedAt)}>
                      <Clock className="size-3.5" />
                      Updated {timeAgo(doc.updatedAt)}
                    </span>
                  </div>
                </div>
                {doc.editable && (
                  <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                    <Pencil className="size-4" />
                    Edit
                  </Button>
                )}
              </div>
            )}
          </Panel>

          <Panel className="p-6">
            <WorkflowProgress status={doc.status} />
          </Panel>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="order-last space-y-6 lg:order-0 lg:col-span-2">
              <AttachmentsCard doc={doc} />

              <Panel className="space-y-4 p-6">
                <h2 className="font-semibold">History</h2>
                {historyQuery.isLoading && <Skeleton className="h-16 w-full" />}
                <ol className="relative space-y-5 border-l pl-6">
                  {historyQuery.data?.map((entry) => (
                    <li key={entry.id} className="relative">
                      <span
                        className={cn(
                          "absolute left-[-1.85rem] top-1.5 size-2.5 rounded-full ring-4 ring-card",
                          statusDot(entry.toStatus),
                        )}
                      />
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="text-sm font-medium">
                            {HISTORY_LABELS[entry.action] ?? entry.action}{" "}
                            <span className="font-normal text-muted-foreground">by {entry.actorName}</span>
                          </div>
                          <div className="text-xs text-muted-foreground">{formatDateTime(entry.createdAt)}</div>
                        </div>
                        {entry.fromStatus && entry.fromStatus !== entry.toStatus && (
                          <span className="text-xs text-muted-foreground">
                            {statusLabel(entry.fromStatus)} → {statusLabel(entry.toStatus)}
                          </span>
                        )}
                      </div>
                      {entry.comment && (
                        <p className="mt-2 rounded-xl bg-muted px-3 py-2 text-sm">{entry.comment}</p>
                      )}
                    </li>
                  ))}
                </ol>
              </Panel>
            </div>

            <div className="space-y-6 lg:order-none">
              <Panel className="space-y-4 p-6">
                <h2 className="font-semibold">Actions</h2>
                {doc.allowedActions.length === 0 ? (
                  <div className="flex items-start gap-3 text-sm text-muted-foreground">
                    <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
                    <p>There are no actions available to you on this document right now.</p>
                  </div>
                ) : (
                  <>
                    {doc.allowedActions.some((a) => NEEDS_COMMENT.includes(a)) && (
                      <textarea
                        className={INPUT}
                        rows={3}
                        placeholder="Comment (required for Reject and Request changes)"
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                      />
                    )}
                    <div className="flex flex-col gap-2">
                      {doc.allowedActions.map((action) => (
                        <Button
                          key={action}
                          variant={variantFor(action)}
                          className={cn(action === "WITHDRAW" && "text-red-600")}
                          disabled={act.isPending || (NEEDS_COMMENT.includes(action) && !comment.trim())}
                          onClick={() => act.mutate(action)}
                        >
                          {ACTION_LABELS[action]}
                        </Button>
                      ))}
                    </div>
                  </>
                )}
              </Panel>

              <Panel className="space-y-3 p-6 text-sm">
                <h2 className="font-semibold">Details</h2>
                <dl className="space-y-2 text-muted-foreground">
                  <div className="flex justify-between gap-4">
                    <dt>Document</dt>
                    <dd className="text-foreground">#{doc.id}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt>Owner</dt>
                    <dd className="text-foreground">{doc.ownerName}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt>Created</dt>
                    <dd className="text-foreground">{formatDateTime(doc.createdAt)}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt>Status</dt>
                    <dd className="text-foreground">{statusLabel(doc.status)}</dd>
                  </div>
                </dl>
              </Panel>
            </div>
          </div>
        </>
      )}
    </div>
  )
}