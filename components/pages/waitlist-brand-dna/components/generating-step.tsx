"use client"

import * as React from "react"
import { Card } from "@/components/ui/card"
import { motion, AnimatePresence } from "framer-motion"

const STAGES = [
  "Reading and fetching brand details...",
  "Extracting voice and positioning attributes...",
  "Writing your structured Brand DNA profile...",
  "Finalizing visual guidelines and guardrails..."
]

export function GeneratingStep() {
  const [stageIndex, setStageIndex] = React.useState(0)

  React.useEffect(() => {
    const interval = setInterval(() => {
      setStageIndex((prev) => (prev < STAGES.length - 1 ? prev + 1 : prev))
    }, 4000)

    return () => clearInterval(interval)
  }, [])

  return (
    <Card className="bg-white rounded-[2rem] p-12 shadow-2xl shadow-black/5 border-none w-full max-w-xl mx-auto flex flex-col items-center justify-center min-h-[350px] text-center">
      <div className="relative mb-8">
        <div className="h-20 w-20 rounded-full border-4 border-brand/10 border-t-brand animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-10 w-10 bg-brand/10 text-brand rounded-full flex items-center justify-center font-bold text-sm">
            AI
          </div>
        </div>
      </div>

      <h3 className="font-display text-xl font-black mb-3 text-foreground">
        Generating Your Brand DNA
      </h3>
      
      <div className="h-8 overflow-hidden flex items-center justify-center relative w-full px-4">
        <AnimatePresence mode="wait">
          <motion.p
            key={stageIndex}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4 }}
            className="text-muted-foreground text-sm font-medium absolute"
          >
            {STAGES[stageIndex]}
          </motion.p>
        </AnimatePresence>
      </div>

      <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black mt-8">
        Please do not close this window.
      </p>
    </Card>
  )
}
