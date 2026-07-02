"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Sparkles, Loader2, AlertCircle } from "lucide-react"

export function VisualIdentityPolling({ waitlistId, initialStatus }: { waitlistId: number; initialStatus: string }) {
  const router = useRouter()
  const [status, setStatus] = React.useState(initialStatus)
  const [error, setError] = React.useState<string | null>(null)
  const [labelIdx, setLabelIdx] = React.useState(0)

  const loadingLabels = [
    "Sketching your custom brand mark...",
    "Harmonizing color palettes against contrast ratios...",
    "Selecting high-fidelity font pairings...",
    "Curating editorial value imagery...",
    "Assembling digital stationery and apparel mockups...",
    "Preparing your brand book..."
  ]

  React.useEffect(() => {
    if (status === "COMPLETE" || status === "FAILED") {
      return
    }

    let delay = 2000 // Start at 2s
    let timeoutId: NodeJS.Timeout

    const poll = async () => {
      try {
        const res = await fetch(`/api/brand-dna/${waitlistId}/visual-identity`)
        if (!res.ok) throw new Error("Failed to check generation status")
        const json = await res.json()
        if (json.success && json.status) {
          setStatus(json.status)
          if (json.status === "COMPLETE") {
            // Asynchronously trigger mockup generation (non-blocking)
            fetch(`/api/brand-dna/${waitlistId}/mockups`, { method: "POST" }).catch(console.error)
            router.refresh()
            return
          } else if (json.status === "FAILED") {
            setError(json.failureReason || "Pipeline failed during generation.")
            return
          }
        }
      } catch (err: any) {
        console.error(err)
      }

      delay = Math.min(delay * 2, 10000) // double up to 10s max
      timeoutId = setTimeout(poll, delay)
    }

    timeoutId = setTimeout(poll, delay)

    return () => clearTimeout(timeoutId)
  }, [status, waitlistId, router])

  React.useEffect(() => {
    if (status === "COMPLETE" || status === "FAILED") return
    const labelInterval = setInterval(() => {
      setLabelIdx((prev) => (prev + 1) % loadingLabels.length)
    }, 4000)
    return () => clearInterval(labelInterval)
  }, [status])

  return (
    <div className="w-full max-w-md mx-auto text-center py-16 px-4">
      <Card className="bg-white rounded-[2rem] p-8 md:p-12 shadow-2xl border-none">
        <CardContent className="p-0 flex flex-col items-center space-y-6">
          {status === "FAILED" ? (
            <>
              <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center text-red-500">
                <AlertCircle size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Generation Failed</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                {error || "We encountered an unexpected error while generating your visual identity. Please try again."}
              </p>
            </>
          ) : (
            <>
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl bg-brand/5 flex items-center justify-center text-brand animate-pulse">
                  <Sparkles size={36} />
                </div>
                <div className="absolute -bottom-1 -right-1 bg-white p-1 rounded-lg shadow-sm">
                  <Loader2 size={16} className="text-brand animate-spin" />
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black text-gray-900">Crafting Visual Identity</h3>
                <p className="text-xs text-brand font-black uppercase tracking-widest">
                  Status: {status}
                </p>
              </div>
              <p className="text-sm text-gray-500 font-medium min-h-[40px] px-2">
                {loadingLabels[labelIdx]}
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
