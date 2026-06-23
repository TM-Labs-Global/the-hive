import * as React from "react"
import { cn } from "@/lib/utils"

interface StatCardProps extends React.ComponentProps<"div"> {
  value: string
  label: string
}

export function StatCard({ value, label, className, ...props }: StatCardProps) {
  return (
    <div
      className={cn(
        "bg-muted rounded-lg p-6 flex flex-col gap-3",
        className
      )}
      {...props}
    >
      <div className="font-display text-5xl font-extrabold leading-none tracking-tight text-brand">
        {value}
      </div>
      <div className="text-[0.8125rem] text-muted-foreground leading-relaxed">
        {label}
      </div>
    </div>
  )
}
