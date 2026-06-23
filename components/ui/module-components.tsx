import * as React from "react"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "./card"

interface ModuleCardProps extends React.ComponentProps<"div"> {
  id: string
  title: string
  description: string
}

export function ModuleCard({ id, title, description, className, ...props }: ModuleCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-lg border border-border bg-card p-6 transition-all hover:border-brand/20 hover:shadow-md",
        className
      )}
      {...props}
    >
      <span className="text-[0.6875rem] font-bold tracking-wider text-brand uppercase">
        {id}
      </span>
      <h3 className="font-display text-lg font-bold leading-tight">
        {title}
      </h3>
      <p className="text-sm text-muted-foreground leading-relaxed">
        {description}
      </p>
    </div>
  )
}

interface ModulePanelProps extends React.ComponentProps<"div"> {
  id: string
  title: string
  children: React.ReactNode
}

export function ModulePanel({ id, title, children, className, ...props }: ModulePanelProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-border bg-card",
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-4 bg-surface-dark px-6 py-4">
        <span className="text-[0.6875rem] font-bold tracking-wider text-brand uppercase whitespace-nowrap">
          {id}
        </span>
        <h3 className="font-display text-lg font-bold text-white">
          {title}
        </h3>
      </div>
      <div className="p-6 text-sm text-muted-foreground leading-relaxed">
        {children}
      </div>
    </div>
  )
}
