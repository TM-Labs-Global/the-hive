import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex h-auto w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-2.5 py-1 text-[0.6875rem] font-semibold tracking-wider whitespace-nowrap transition-all uppercase",
  {
    variants: {
      variant: {
        default: "bg-muted text-muted-foreground border-border",
        brand: "bg-brand text-white",
        dark: "bg-surface-dark text-white",
        module: "bg-transparent text-brand p-0 lowercase normal-case tracking-normal font-bold",
        success: "bg-[#f0fdf4] text-[#16a34a] border-[#bbf7d0]",
        warning: "bg-[#fffbeb] text-[#d97706] border-[#fde68a]",
        danger: "bg-[#fef2f2] text-[#dc2626] border-[#fecaca]",
        // Stage variants
        draft: "bg-gray-100 text-gray-500",
        review: "bg-amber-100 text-amber-600",
        pending: "bg-brand-bg text-brand",
        approved: "bg-emerald-50 text-emerald-600",
        scheduled: "bg-blue-50 text-blue-600",
        published: "bg-emerald-50 text-emerald-700 border-emerald-200",
        held: "bg-gray-50 text-gray-500 border-gray-200",
        flagged: "bg-red-50 text-red-600",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
