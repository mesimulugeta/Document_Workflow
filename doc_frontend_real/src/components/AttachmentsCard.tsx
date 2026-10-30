import { useRef, useState, type ChangeEvent } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Download, Paperclip, Trash2, Upload } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/api"
import type { DocumentDto, FileDto } from "@/types"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

const MAX_BYTES = 10 * 1024 * 1024
const ACCEPT = ".pdf,.png,.jpg,.jpeg,.txt,.csv,.docx,.xlsx,.pptx"

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function AttachmentsCard({ doc }: { doc: DocumentDto }) {
  const queryClient = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [downloadingId, setDownloadingId] = useState<number | null>(null)

  const filesQuery = useQuery({ queryKey: ["files", doc.id], queryFn: () => api.listFiles(doc.id) })

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["files", doc.id] })
    queryClient.invalidateQueries({ queryKey: ["history", doc.id] })
  }

  const upload = useMutation({
    mutationFn: (file: File) => api.uploadFile(doc.id, file),
    onSuccess: () => {
      toast.success("File attached")
      refresh()
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Upload failed"),
  })

  const remove = useMutation({
    mutationFn: (fileId: number) => api.deleteFile(doc.id, fileId),
    onSuccess: () => {
      toast.success("File removed")
      refresh()
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Could not remove the file")
      refresh()
    },
  })

  function onPick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = "" // lets the user pick the same file again later
    if (!file) return
    if (file.size > MAX_BYTES) {
      toast.error("The file is larger than 10 MB")
      return
    }
    upload.mutate(file)
  }

  async function download(file: FileDto) {
    try {
      setDownloadingId(file.id)
      await api.downloadFile(doc.id, file)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Download failed")
    } finally {
      setDownloadingId(null)
    }
  }

  const files = filesQuery.data ?? []

  return (
    <Card className="space-y-3 p-6">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-semibold">
          <Paperclip className="size-4" />
          Attachments
        </h2>
        {doc.editable && (
          <>
            <input ref={inputRef} type="file" accept={ACCEPT} className="hidden" onChange={onPick} />
            <Button size="sm" variant="outline" disabled={upload.isPending} onClick={() => inputRef.current?.click()}>
              <Upload className="size-4" />
              {upload.isPending ? "Uploading…" : "Attach file"}
            </Button>
          </>
        )}
      </div>

      {filesQuery.isLoading && <Skeleton className="h-10 w-full" />}
      {filesQuery.isError && <p className="text-sm text-red-600">Could not load the attachments.</p>}
      {!filesQuery.isLoading && !filesQuery.isError && files.length === 0 && (
        <p className="text-sm text-muted-foreground">No attachments.</p>
      )}

      <ul className="divide-y">
        {files.map((file) => (
          <li key={file.id} className="flex items-center justify-between gap-3 py-2">
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">{file.filename}</div>
              <div className="text-xs text-muted-foreground">
                {formatSize(file.sizeBytes)} · {file.uploadedByName} · {new Date(file.createdAt).toLocaleString()}
              </div>
              <div className="truncate text-xs text-muted-foreground" title={file.sha256}>
                SHA-256 {file.sha256.slice(0, 16)}…
              </div>
            </div>
            <div className="flex shrink-0 gap-1">
              <Button
                size="sm"
                variant="outline"
                disabled={downloadingId === file.id}
                onClick={() => download(file)}
              >
                <Download className="size-4" />
                Download
              </Button>
              {doc.editable && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={remove.isPending}
                  onClick={() => remove.mutate(file.id)}
                  aria-label={`Remove ${file.filename}`}
                >
                  <Trash2 className="size-4" />
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  )
}