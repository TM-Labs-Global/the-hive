import * as React from "react"
import { cn } from "@/lib/utils"
import { Badge } from "./badge"

interface RoleCardProps extends React.ComponentProps<"div"> {
  title: string
  icon: React.ReactNode
  badgeText: string
  badgeVariant?: "brand" | "dark" | "default"
  variant?: "dark" | "gray" | "client"
  children: React.ReactNode
}

export function RoleCard({ 
  title, 
  icon, 
  badgeText, 
  badgeVariant = "brand",
  variant = "gray", 
  children, 
  className, 
  ...props 
}: RoleCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-[1.25rem] p-6 transition-all",
        variant === "dark" && "bg-surface-dark border-2 border-brand text-white",
        variant === "gray" && "bg-muted border border-border",
        variant === "client" && "bg-brand-bg border border-brand/15",
        className
      )}
      {...props}
    >
      <div className={cn(
        "flex h-11 w-11 items-center justify-center rounded-md text-[1.1rem]",
        variant === "dark" && "bg-surface-dark-2 text-white",
        variant === "gray" && "bg-black/5 text-muted-foreground",
        variant === "client" && "bg-brand/10 text-brand"
      )}>
        {icon}
      </div>
      
      <Badge variant={badgeVariant} className="w-fit">{badgeText}</Badge>
      
      <h3 className="font-display text-xl font-bold leading-tight">
        {title}
      </h3>
      
      <div className="flex flex-col gap-3">
        {children}
      </div>
    </div>
  )
}

export function RoleBullet({ variant = "success", children }: { variant?: "success" | "danger" | "brand", children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 text-[0.8125rem] leading-relaxed">
      <div className={cn(
        "mt-[0.3em] h-2 w-2 shrink-0 rounded-full",
        variant === "success" && "bg-success",
        variant === "danger" && "bg-destructive",
        variant === "brand" && "bg-brand"
      )} />
      <span>{children}</span>
    </div>
  )
}
