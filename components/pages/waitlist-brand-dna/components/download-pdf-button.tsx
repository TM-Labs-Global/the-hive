"use client"

import React from "react"
import { Download } from "lucide-react"

export function DownloadPdfButton() {
  const handleDownload = () => {
    if (typeof window !== "undefined") {
      window.print()
    }
  }

  return (
    <button
      onClick={handleDownload}
      className="flex items-center gap-2 text-xs font-black uppercase tracking-wider bg-zinc-950 hover:bg-zinc-850 text-white px-4 py-2 rounded-xl transition-all cursor-pointer shadow-sm hover:scale-[1.02] active:scale-[0.98]"
    >
      <Download size={14} /> Export PDF
    </button>
  )
}
