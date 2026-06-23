import * as React from "react"
import { cn } from "@/lib/utils"
import { cva, type VariantProps } from "class-variance-authority"

const calloutVariants = cva(
  "p-5 rounded-[10px] border-l-4 text-base leading-relaxed",
  {
    variants: {
      variant: {
        brand: "bg-brand-bg border-brand text-foreground",
        success: "bg-[#f0fdf4] border-[#22C55E] text-[#16a34a]",
        dark: "bg-surface-dark border-brand text-white/85",
      },
    },
    defaultVariants: {
      variant: "brand",
    },
  }
)

interface CalloutProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof calloutVariants> {
  label?: string
}

export function Callout({
  label,
  children,
  variant,
  className,
  ...props
}: CalloutProps) {
  return (
    <div className={cn(calloutVariants({ variant }), className)} {...props}>
      {label && (
        <strong className={cn(
          "mr-1.5 font-bold",
          variant === "brand" && "text-brand",
          variant === "success" && "text-[#16a34a]",
          variant === "dark" && "text-brand"
        )}>
          {label}
        </strong>
      )}
      {children}
    </div>
  )
}
