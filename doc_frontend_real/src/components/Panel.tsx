import type { ComponentProps } from "react"
import { cn } from "@/lib/utils"

export function Panel({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("rounded-2xl border bg-card text-card-foreground shadow-sm", className)} {...props} />
}