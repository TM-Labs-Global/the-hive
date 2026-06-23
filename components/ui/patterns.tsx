import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "./button"

interface HeroProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  eyebrow?: string
  title: React.ReactNode
  description?: string
  primaryAction?: { label: string; onClick?: () => void }
  secondaryAction?: { label: string; onClick?: () => void }
}

export function Hero({
  eyebrow,
  title,
  description,
  primaryAction,
  secondaryAction,
  className,
  ...props
}: HeroProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl bg-surface-dark p-8 md:p-12 lg:p-16",
        className
      )}
      {...props}
    >
      {eyebrow && (
        <div className="mb-6 flex items-center">
          <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[0.625rem] font-bold uppercase tracking-[0.14em] text-white/70">
            {eyebrow}
          </span>
        </div>
      )}
      <h1 className="font-display text-4xl font-extrabold leading-[1.05] tracking-tighter text-white sm:text-5xl md:text-6xl lg:text-[5.5rem]">
        {title}
      </h1>
      {description && (
        <p className="mt-6 max-w-[50ch] text-lg leading-relaxed text-white/60">
          {description}
        </p>
      )}
      <div className="mt-10 flex flex-wrap gap-4">
        {primaryAction && (
          <Button size="lg" onClick={primaryAction.onClick}>
            {primaryAction.label}
          </Button>
        )}
        {secondaryAction && (
          <Button
            variant="ghost-dark"
            size="lg"
            onClick={secondaryAction.onClick}
          >
            {secondaryAction.label}
          </Button>
        )}
      </div>
    </div>
  )
}

import { toast } from "sonner"

interface SidebarNavProps extends React.HTMLAttributes<HTMLElement> {
  logo?: React.ReactNode
  footer?: React.ReactNode
  sections: {
    label?: string
    items: {
      label: string
      icon?: React.ReactNode
      href: string
      active?: boolean
      count?: number
      comingSoon?: boolean
    }[]
  }[]
}

export function SidebarNav({ logo, sections, footer, className, ...props }: SidebarNavProps) {
  return (
    <aside
      className={cn(
        "flex h-full w-full max-w-[260px] flex-col bg-surface-dark py-6",
        className
      )}
      {...props}
    >
      {logo && (
        <div className="mb-4 border-b border-white/5 px-5 pb-4 text-lg font-extrabold text-white">
          {logo}
        </div>
      )}
      <div className="flex-1 space-y-6 overflow-y-auto">
        {sections.map((section, i) => (
          <div key={i}>
            {section.label && (
              <div className="mb-2 px-5 text-[0.6rem] font-bold uppercase tracking-[0.14em] text-white/25">
                {section.label}
              </div>
            )}
            <nav className="space-y-0.5 px-2">
              {section.items.map((item, j) => {
                const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
                  if (item.comingSoon) {
                    e.preventDefault()
                    toast.info(`${item.label} is coming soon!`, {
                      description: "We are currently building this feature. Stay tuned!",
                      duration: 3500,
                    })
                  }
                }

                return (
                  <a
                    key={j}
                    href={item.comingSoon ? "#" : item.href}
                    onClick={handleClick}
                    className={cn(
                      "group flex items-center gap-3 rounded-lg px-3 py-2 text-[0.8125rem] font-medium transition-colors",
                      item.active
                        ? "bg-brand/10 text-brand"
                        : "text-white/55 hover:bg-white/5 hover:text-white/85",
                      item.comingSoon && "opacity-50 cursor-not-allowed hover:bg-transparent hover:text-white/55"
                    )}
                  >
                    {item.icon && (
                      <span className={cn(
                        "flex-shrink-0 transition-colors",
                        item.active ? "text-brand" : "text-white/40 group-hover:text-white/70",
                        item.comingSoon && "group-hover:text-white/40"
                      )}>
                        {item.icon}
                      </span>
                    )}
                    {item.label}
                    {item.comingSoon && (
                      <span className="ml-auto rounded bg-white/10 px-1.5 py-0.5 text-[0.6rem] font-bold text-white/40 uppercase tracking-wider">
                        Soon
                      </span>
                    )}
                    {item.count !== undefined && !item.comingSoon && (
                      <span className="ml-auto rounded-full bg-brand px-1.5 py-0.5 text-[0.6rem] font-bold text-white">
                        {item.count}
                      </span>
                    )}
                  </a>
                )
              })}
            </nav>
          </div>
        ))}
      </div>
      {footer && (
        <div className="mt-auto pt-6 border-t border-white/5">
           {footer}
        </div>
      )}
    </aside>
  )
}
