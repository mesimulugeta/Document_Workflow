import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import { FilePlus } from "lucide-react"
import { toast } from "sonner"
import { api, ApiError } from "@/lib/api"
import { INPUT } from "@/lib/styles"
import { Panel } from "@/components/Panel"
import { Button } from "@/components/ui/button"

const STEPS = [
  { title: "Write it", text: "Give your document a clear title and a short description." },
  { title: "Attach files", text: "Add PDFs, images or Office files on the next screen." },
  { title: "Submit", text: "Send it to a reviewer and follow every step in the history." },
]

export function NewDocumentPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const create = useMutation({
    mutationFn: () => api.createDocument({ title, description: description || undefined }),
    onSuccess: (doc) => {
      queryClient.invalidateQueries({ queryKey: ["documents"] })
      queryClient.invalidateQueries({ queryKey: ["stats"] })
      toast.success("Draft created")
      navigate(`/documents/${doc.id}`)
    },
    onError: (err) => {
      if (err instanceof ApiError && err.fieldErrors) {
        setFieldErrors(err.fieldErrors)
      } else {
        toast.error(err instanceof Error ? err.message : "Something went wrong")
      }
    },
  })

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-4">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
          <FilePlus className="size-7" />
        </span>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">New document</h1>
          <p className="mt-1 text-sm text-muted-foreground">Create a draft first. You can attach files before submitting.</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel className="p-6 lg:col-span-2">
          <form
            className="space-y-5"
            onSubmit={(e) => {
              e.preventDefault()
              setFieldErrors({})
              create.mutate()
            }}
          >
            <div className="space-y-1.5">
              <label htmlFor="title" className="text-sm font-medium">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                id="title"
                className={INPUT}
                placeholder="For example, Vendor contract review"
                value={title}
                maxLength={200}
                onChange={(e) => setTitle(e.target.value)}
              />
              {fieldErrors.title && <p className="text-sm text-red-600">{fieldErrors.title}</p>}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="description" className="text-sm font-medium">
                Description
              </label>
              <textarea
                id="description"
                className={INPUT}
                rows={6}
                placeholder="What is this document about? (optional)"
                maxLength={2000}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              {fieldErrors.description && <p className="text-sm text-red-600">{fieldErrors.description}</p>}
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => navigate("/documents")}>
                Cancel
              </Button>
              <Button type="submit" disabled={create.isPending}>
                {create.isPending ? "Saving…" : "Create draft"}
              </Button>
            </div>
          </form>
        </Panel>

        <Panel className="h-fit space-y-4 p-6">
          <h2 className="font-semibold">How it works</h2>
          <ol className="space-y-4">
            {STEPS.map((step, i) => (
              <li key={step.title} className="flex gap-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
                  {i + 1}
                </span>
                <div>
                  <div className="text-sm font-medium">{step.title}</div>
                  <p className="text-xs text-muted-foreground">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </Panel>
      </div>
    </div>
  )
}