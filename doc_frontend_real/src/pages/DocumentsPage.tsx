import { useState } from "react"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { Link, useNavigate } from "react-router-dom"
import { FileText, Inbox, Plus, Search } from "lucide-react"
import { useAuth } from "@/auth/AuthProvider"
import { api } from "@/lib/api"
import { formatDateTime, timeAgo } from "@/lib/format"
import { useDebounced } from "@/lib/hooks"
import { cn } from "@/lib/utils"
import type { DocumentStatus } from "@/types"
import { Avatar } from "@/components/Avatar"
import { PageHeader } from "@/components/PageHeader"
import { Panel } from "@/components/Panel"
import { StatusBadge } from "@/components/StatusBadge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

const PAGE_SIZE = 10

type Tab = DocumentStatus | "ALL"

const TABS: { value: Tab; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "DRAFT", label: "Drafts" },
  { value: "SUBMITTED", label: "Submitted" },
  { value: "UNDER_REVIEW", label: "In review" },
  { value: "CHANGES_REQUESTED", label: "Needs changes" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
]

function StatCard({ label, value, hint, dot }: { label: string; value?: number; hint: string; dot: string }) {
  return (
    <Panel className="p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className={cn("size-2.5 rounded-full", dot)} />
      </div>
      <div className="mt-2 text-3xl font-semibold tracking-tight">{value ?? "–"}</div>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </Panel>
  )
}

export function DocumentsPage() {
  const navigate = useNavigate()
  const { firstName, isReviewer } = useAuth()
  const [page, setPage] = useState(0)
  const [tab, setTab] = useState<Tab>("ALL")
  const [search, setSearch] = useState("")
  const q = useDebounced(search.trim(), 300)
  const status = tab === "ALL" ? undefined : tab

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["documents", page, status, q],
    queryFn: () => api.listDocuments(page, PAGE_SIZE, status, q || undefined),
    placeholderData: keepPreviousData,
  })
  const stats = useQuery({ queryKey: ["stats"], queryFn: () => api.stats() })

  const by = stats.data?.byStatus ?? {}
  const n = (s: DocumentStatus) => by[s] ?? 0
  const loaded = stats.data !== undefined

  const cards = isReviewer
    ? [
        { label: "Waiting for review", value: loaded ? n("SUBMITTED") : undefined, hint: "Submitted, not started", dot: "bg-blue-500" },
        { label: "In review", value: loaded ? n("UNDER_REVIEW") : undefined, hint: "Being reviewed now", dot: "bg-amber-500" },
        { label: "Approved", value: loaded ? n("APPROVED") : undefined, hint: "Completed and final", dot: "bg-green-500" },
        { label: "Rejected", value: loaded ? n("REJECTED") : undefined, hint: "Closed without approval", dot: "bg-red-500" },
      ]
    : [
        { label: "Drafts", value: loaded ? n("DRAFT") : undefined, hint: "Not submitted yet", dot: "bg-slate-400" },
        { label: "In review", value: loaded ? n("SUBMITTED") + n("UNDER_REVIEW") : undefined, hint: "Waiting for a decision", dot: "bg-amber-500" },
        { label: "Needs changes", value: loaded ? n("CHANGES_REQUESTED") : undefined, hint: "Action needed from you", dot: "bg-orange-500" },
        { label: "Approved", value: loaded ? n("APPROVED") : undefined, hint: "Completed and final", dot: "bg-green-500" },
      ]

  const filtered = tab !== "ALL" || q !== ""

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back, ${firstName}!`}
        subtitle={
          isReviewer
            ? "Here is everything submitted for review and where it stands."
            : "Here are your documents and where they stand."
        }
        actions={
          <Button onClick={() => navigate("/documents/new")}>
            <Plus className="size-4" />
            New document
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </div>

      <Panel className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-1 overflow-x-auto">
            {TABS.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => {
                  setTab(t.value)
                  setPage(0)
                }}
                className={cn(
                  "whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                  tab === t.value
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="relative sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(0)
              }}
              placeholder="Search by title"
              className="w-full rounded-xl border bg-background py-2 pl-9 pr-3 text-sm outline-none transition placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/15"
            />
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead className="hidden md:table-cell">Owner</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden sm:table-cell">Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={4}>
                    <Skeleton className="h-9 w-full" />
                  </TableCell>
                </TableRow>
              ))}

            {isError && (
              <TableRow>
                <TableCell colSpan={4} className="text-red-600">
                  Could not load documents: {error instanceof Error ? error.message : "unknown error"}
                </TableCell>
              </TableRow>
            )}

            {data?.content.map((doc) => (
              <TableRow key={doc.id} className="cursor-pointer" onClick={() => navigate(`/documents/${doc.id}`)}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                      <FileText className="size-4" />
                    </span>
                    <div className="min-w-0">
                      <Link
                        to={`/documents/${doc.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="block max-w-[18rem] truncate font-medium hover:underline"
                      >
                        {doc.title}
                      </Link>
                      <span className="block max-w-[18rem] truncate text-xs text-muted-foreground">
                        {doc.description ?? "No description"}
                      </span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <div className="flex items-center gap-2">
                    <Avatar name={doc.ownerName} className="size-7 text-[10px]" />
                    <span className="text-sm">{doc.ownerName}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <StatusBadge status={doc.status} />
                </TableCell>
                <TableCell className="hidden text-sm text-muted-foreground sm:table-cell" title={formatDateTime(doc.updatedAt)}>
                  {timeAgo(doc.updatedAt)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {data?.content.length === 0 && (
          <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
              <Inbox className="size-6" />
            </span>
            <div>
              <p className="font-medium">{filtered ? "Nothing matches your filters" : "No documents yet"}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {filtered ? "Try another tab or a different search." : "Create your first document to get started."}
              </p>
            </div>
            {!filtered && (
              <Button onClick={() => navigate("/documents/new")}>
                <Plus className="size-4" />
                New document
              </Button>
            )}
          </div>
        )}
      </Panel>

      {data && data.page.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Page {data.page.number + 1} of {data.page.totalPages} · {data.page.totalElements} documents
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page + 1 >= data.page.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}