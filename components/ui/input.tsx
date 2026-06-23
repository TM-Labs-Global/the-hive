import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-10 w-full min-w-0 rounded-md border border-[#D4D4D4] bg-white px-3 py-2 text-base transition-colors outline-none placeholder:text-[#A3A3A3] focus-visible:border-brand focus-visible:ring-1 focus-visible:ring-brand/20 disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Input }
