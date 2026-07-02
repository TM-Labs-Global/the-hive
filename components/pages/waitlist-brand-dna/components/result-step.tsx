"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { DNASummaryCard } from "./dna-summary-card"
import { BrandDNA } from "@/types/brand-dna"
import { Download, Calendar, RefreshCw, Sparkles, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { DesignWizard } from "./design-wizard"

interface ResultStepProps {
  dna: BrandDNA
  id: number
  brandName: string
  faviconUrl: string | null
  onRestart: () => void
}

export function ResultStep({ dna, id, brandName, faviconUrl, onRestart }: ResultStepProps) {
  const downloadUrl = `/api/brand-dna/download?id=${id}`
  const [showWizard, setShowWizard] = React.useState(false)
  const router = useRouter()

  const handleGenerateVisualIdentity = () => {
    setShowWizard(true)
  }

  if (showWizard) {
    return (
      <div className="w-full">
        <DesignWizard
          waitlistId={id}
          brandName={brandName}
          tagline={dna.tagline || ""}
          onBackToDna={() => setShowWizard(false)}
        />
      </div>
    )
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-12 text-center relative z-10">
      {/* Premium background glow effect */}
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-brand/10 blur-[120px] rounded-full -z-10 pointer-events-none animate-pulse-slow" />

      <div className="space-y-4">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold text-brand uppercase tracking-wider">
          Generation Complete
        </span>
        
        <h2 className="text-4xl md:text-5xl font-black tracking-tight text-white font-display leading-tight">
          Your Brand DNA is <span className="text-brand">Ready</span>!
        </h2>

        <p className="text-zinc-400 text-sm md:text-base max-w-2xl mx-auto font-medium leading-relaxed">
          We've distilled your brand voice, values, and guidelines. Book a free strategy session with our marketing team to discuss how to scale your brand and run campaigns, or download your offline guidelines below.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          <Button
            onClick={handleGenerateVisualIdentity}
            className="bg-brand hover:bg-brand-hover text-white font-black h-12 px-8 rounded-xl shadow-lg shadow-brand/20 flex items-center gap-2 transition-all active:scale-98"
          >
            <Sparkles size={18} /> Generate your Visual Identity →
          </Button>

          <Button
            asChild
            className="h-12 px-8 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white font-bold flex items-center gap-2 transition-all active:scale-98"
          >
            <a href={downloadUrl} download>
              <Download size={18} /> Download Brand DNA (.md)
            </a>
          </Button>

          <Button
            asChild
            className="h-12 px-8 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white font-bold flex items-center gap-2 transition-all active:scale-98"
          >
            <a 
              href="https://bookings.cloud.microsoft/bookwithme/user/62ff918dad854e428465442e81d4dece%40takeoutmedia.xyz?anonymous&ismsaljsauthenabled=true" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              <Calendar size={18} /> Book a Strategy Session
            </a>
          </Button>
        </div>
      </div>

      <div className="w-full text-left [--foreground:#131313] [--muted-foreground:#6B6B6B] [--border:#E8E8E8] [--muted:#F4F4F4] [--card:#ffffff] [--card-foreground:#131313] [--background:#f9f9f9]">
        <DNASummaryCard dna={dna} brandName={brandName} faviconUrl={faviconUrl} />
      </div>

      <div className="flex justify-center pt-8 border-t border-white/5">
        <button
          onClick={onRestart}
          className="text-xs font-bold text-zinc-500 hover:text-brand transition-colors flex items-center gap-2"
        >
          <RefreshCw size={14} /> Scan another brand website or text description
        </button>
      </div>
    </div>
  )
}
