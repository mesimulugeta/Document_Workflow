import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import { api } from "@/lib/api"
import type { WorkflowAction } from "@/types"
import { StatusBadge } from "@/components/StatusBadge"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

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

  const items = [...(submitted.data?.content ?? []), ...(underReview.data?.content ?? [])]
    .filter((d) => d.allowedActions.some((a) => REVIEW_ACTIONS.includes(a)))
    .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt)) // oldest first

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <h1 className="text-2xl font-semibold">Review queue</h1>
      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Submitted by</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Waiting since</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={4}>
                  <Skeleton className="h-5 w-full" />
                </TableCell>
              </TableRow>
            )}
            {isError && (
              <TableRow>
                <TableCell colSpan={4} className="text-red-600">
                  Could not load the review queue.
                </TableCell>
              </TableRow>
            )}
            {!isLoading && !isError && items.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                  Nothing is waiting for your review.
                </TableCell>
              </TableRow>
            )}
            {items.map((doc) => (
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
    </div>
  )
}