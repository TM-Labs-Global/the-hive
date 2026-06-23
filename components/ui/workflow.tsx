import * as React from "react"
import { cn } from "@/lib/utils"

interface WorkflowStepProps {
  number: number
  label: string
  sublabel?: string
  status?: "done" | "active" | "todo"
}

export function Workflow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-0 overflow-x-auto py-4">
      {children}
    </div>
  )
}

export function WorkflowStep({ number, label, sublabel, status = "todo" }: WorkflowStepProps) {
  return (
    <div className={cn(
      "relative flex min-w-[90px] flex-1 flex-col items-center gap-2",
      "after:absolute after:top-[15px] after:left-[calc(50%+16px)] after:right-[calc(-50%+16px)] after:h-[2px] after:bg-border after:content-[''] last:after:hidden",
      (status === "active" || status === "done") && "after:bg-brand"
    )}>
      <div className={cn(
        "relative z-10 flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full border-2 border-border bg-muted text-[0.75rem] font-bold text-muted-foreground transition-all",
        status === "active" && "border-brand bg-brand text-white shadow-brand",
        status === "done" && "border-success bg-success text-white"
      )}>
        {status === "done" ? "✓" : number}
      </div>
      <div className="flex flex-col items-center">
        <span className="text-center text-[0.625rem] font-semibold text-muted-foreground leading-tight">{label}</span>
        {sublabel && <span className="text-center text-[0.5625rem] text-tertiary">{sublabel}</span>}
      </div>
    </div>
  )
}
