import * as React from "react"
import { cn } from "@/lib/utils"

interface AlertItemProps extends React.ComponentProps<"div"> {
  title: string
  description: string
  icon?: React.ReactNode
}

export function AlertItem({ title, description, icon, className, ...props }: AlertItemProps) {
  return (
    <div
      className={cn(
        "flex items-start gap-4 p-4 rounded-lg border border-border bg-card transition-all hover:bg-muted/50",
        className
      )}
      {...props}
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand text-xs">
        {icon}
      </div>
      <div className="flex flex-col gap-1">
        <h4 className="text-sm font-bold leading-none">{title}</h4>
        <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </div>
  )
}
