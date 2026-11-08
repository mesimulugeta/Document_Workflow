import { cn } from "@/lib/utils"
import { initials } from "@/lib/format"

export function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground ring-1 ring-primary/10",
        className,
      )}
    >
      {initials(name)}
    </span>
  )
}