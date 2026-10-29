import { useState } from "react"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { Link, useNavigate } from "react-router-dom"
import { Plus } from "lucide-react"
import { api } from "@/lib/api"
import { StatusBadge } from "@/components/StatusBadge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

const PAGE_SIZE = 10

export function DocumentsPage() {
  const navigate = useNavigate()
  const [page, setPage] = useState(0)
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["documents", page],
    queryFn: () => api.listDocuments(page, PAGE_SIZE),
    placeholderData: keepPreviousData,
  })

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Documents</h1>
        <Button onClick={() => navigate("/documents/new")}>
          <Plus className="size-4" />
          New document
        </Button>
      </div>

      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={4}>
                    <Skeleton className="h-5 w-full" />
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

            {data?.content.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                  No documents yet. Create your first one with the button above.
                </TableCell>
              </TableRow>
            )}

            {data?.content.map((doc) => (
              <TableRow key={doc.id}>
                <TableCell className="font-medium">
                  <Link to={`/documents/${doc.id}`} className="hover:underline">
                    {doc.title}
                  </Link>
                </TableCell>
                <TableCell>{doc.ownerName}</TableCell>
                <TableCell>
                  <StatusBadge status={doc.status} />
                </TableCell>
                <TableCell className="text-muted-foreground">{new Date(doc.updatedAt).toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

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