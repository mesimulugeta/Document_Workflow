import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Link, useParams } from "react-router-dom"
import { ArrowLeft } from "lucide-react"
import { toast } from "sonner"
import { api, ApiError } from "@/lib/api"
import type { DocumentDto, WorkflowAction } from "@/types"
import { AttachmentsCard } from "@/components/AttachmentsCard"
import { StatusBadge, statusLabel } from "@/components/StatusBadge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
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
const DESTRUCTIVE: WorkflowAction[] = ["REJECT", "WITHDRAW"]

const INPUT =
  "w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"

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
    <div className="mx-auto max-w-3xl space-y-4">
      <Link
        to="/documents"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to documents
      </Link>

      {docQuery.isLoading && <Skeleton className="h-40 w-full" />}

      {docQuery.isError && (
        <Card className="p-6 text-red-600">
          {docQuery.error instanceof Error ? docQuery.error.message : "Could not load the document."}
        </Card>
      )}

      {doc && (
        <>
          <Card className="space-y-3 p-6">
            {editing ? (
              <EditForm doc={doc} onDone={() => setEditing(false)} />
            ) : (
              <>
                <div className="flex items-start justify-between gap-4">
                  <h1 className="text-2xl font-semibold">{doc.title}</h1>
                  <StatusBadge status={doc.status} />
                </div>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {doc.description ?? "No description."}
                </p>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {doc.ownerName} · updated {new Date(doc.updatedAt).toLocaleString()}
                  </span>
                  {doc.editable && (
                    <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                      Edit
                    </Button>
                  )}
                </div>
              </>
            )}
          </Card>

          <AttachmentsCard doc={doc} />

          {doc.allowedActions.length > 0 && (
            <Card className="space-y-3 p-6">
              <h2 className="font-semibold">Actions</h2>
              {doc.allowedActions.some((a) => NEEDS_COMMENT.includes(a)) && (
                <textarea
                  className={INPUT}
                  rows={3}
                  placeholder="Comment (required for Reject and Request changes)"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
              )}
              <div className="flex flex-wrap gap-2">
                {doc.allowedActions.map((action) => (
                  <Button
                    key={action}
                    variant={DESTRUCTIVE.includes(action) ? "destructive" : action === "APPROVE" ? "default" : "outline"}
                    disabled={act.isPending || (NEEDS_COMMENT.includes(action) && !comment.trim())}
                    onClick={() => act.mutate(action)}
                  >
                    {ACTION_LABELS[action]}
                  </Button>
                ))}
              </div>
            </Card>
          )}

          <Card className="space-y-3 p-6">
            <h2 className="font-semibold">History</h2>
            {historyQuery.isLoading && <Skeleton className="h-16 w-full" />}
            <ol className="space-y-4 border-l pl-6">
              {historyQuery.data?.map((entry) => (
                <li key={entry.id} className="relative">
                  <span className="absolute left-[-1.85rem] top-1.5 size-2.5 rounded-full bg-primary" />
                  <div className="text-sm font-medium">
                    {HISTORY_LABELS[entry.action] ?? entry.action}{" "}
                    <span className="font-normal text-muted-foreground">by {entry.actorName}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(entry.createdAt).toLocaleString()}
                    {entry.fromStatus && entry.fromStatus !== entry.toStatus
                      ? ` · ${statusLabel(entry.fromStatus)} → ${statusLabel(entry.toStatus)}`
                      : ""}
                  </div>
                  {entry.comment && <p className="mt-1 rounded-md bg-muted px-3 py-2 text-sm">{entry.comment}</p>}
                </li>
              ))}
            </ol>
          </Card>
        </>
      )}
    </div>
  )
}