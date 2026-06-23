import * as React from "react"
import { cn } from "@/lib/utils"

interface BulletListProps extends React.ComponentProps<"ul"> {
  items: string[]
  bulletColor?: string
}

export function BulletList({ items, bulletColor, className, ...props }: BulletListProps) {
  return (
    <ul className={cn("space-y-3", className)} {...props}>
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-3 text-sm leading-relaxed">
          <span 
            className="mt-[0.6em] h-1.5 w-1.5 shrink-0 rounded-full" 
            style={{ backgroundColor: bulletColor || "var(--brand)" }} 
          />
          <span className="text-muted-foreground">{item}</span>
        </li>
      ))}
    </ul>
  )
}

interface SectionHeaderProps extends React.ComponentProps<"header"> {
  number: string
  title: string
}

export function SectionHeader({ number, title, className, ...props }: SectionHeaderProps) {
  return (
    <header 
      className={cn("mb-10 flex items-baseline gap-4 border-b border-border pb-6", className)} 
      {...props}
    >
      <span className="font-display text-sm font-black tracking-[0.2em] text-brand uppercase">
        {number}
      </span>
      <h2 className="font-display text-4xl font-bold tracking-tight text-foreground">
        {title}
      </h2>
    </header>
  )
}
