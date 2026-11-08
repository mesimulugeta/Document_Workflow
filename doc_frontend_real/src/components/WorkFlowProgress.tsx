import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import type { DocumentStatus } from "@/types"

type Tone = "normal" | "warn" | "good" | "bad"

interface Progress {
  current: number
  labels: string[]
  tone: Tone
  closed: boolean
}

const TONES: Record<Tone, { bg: string; border: string; text: string; ring: string }> = {
  normal: { bg: "bg-primary", border: "border-primary", text: "text-primary", ring: "ring-primary/15" },
  warn: { bg: "bg-orange-500", border: "border-orange-500", text: "text-orange-600", ring: "ring-orange-500/15" },
  good: { bg: "bg-green-600", border: "border-green-600", text: "text-green-700", ring: "ring-green-600/15" },
  bad: { bg: "bg-red-600", border: "border-red-600", text: "text-red-600", ring: "ring-red-600/15" },
}

function progressFor(status: DocumentStatus): Progress | null {
  const labels = ["Draft", "Submitted", "Under review", "Decision"]
  switch (status) {
    case "DRAFT":
      return { current: 0, labels, tone: "normal", closed: false }
    case "SUBMITTED":
      return { current: 1, labels, tone: "normal", closed: false }
    case "UNDER_REVIEW":
      return { current: 2, labels, tone: "normal", closed: false }
    case "CHANGES_REQUESTED":
      return { current: 2, labels: ["Draft", "Submitted", "Changes requested", "Decision"], tone: "warn", closed: false }
    case "APPROVED":
      return { current: 3, labels: ["Draft", "Submitted", "Under review", "Approved"], tone: "good", closed: true }
    case "REJECTED":
      return { current: 3, labels: ["Draft", "Submitted", "Under review", "Rejected"], tone: "bad", closed: true }
    default:
      return null // withdrawn
  }
}

export function WorkflowProgress({ status }: { status: DocumentStatus }) {
  const progress = progressFor(status)

  if (!progress) {
    return <p className="text-sm text-muted-foreground">This document was withdrawn by its owner.</p>
  }

  const tone = TONES[progress.tone]

  return (
    <ol className="flex items-start">
      {progress.labels.map((label, i) => {
        const done = i < progress.current || (i === progress.current && progress.closed)
        const active = i === progress.current && !progress.closed
        return (
          <li key={label} className="relative flex flex-1 flex-col items-center gap-2 text-center">
            {i > 0 && (
              <span
                className={cn(
                  "absolute left-[-50%] top-4 h-0.5 w-full -translate-y-1/2",
                  i <= progress.current ? tone.bg : "bg-border",
                )}
              />
            )}
            <span
              className={cn(
                "relative z-10 flex size-8 items-center justify-center rounded-full border-2 text-xs font-semibold",
                done && `${tone.bg} border-transparent text-white`,
                active && `${tone.border} ${tone.text} bg-card ring-4 ${tone.ring}`,
                !done && !active && "border-border bg-card text-muted-foreground",
              )}
            >
              {done ? <Check className="size-4" /> : i + 1}
            </span>
            <span className={cn("text-xs font-medium", done || active ? "text-foreground" : "text-muted-foreground")}>
              {label}
            </span>
          </li>
        )
      })}
    </ol>
  )
}