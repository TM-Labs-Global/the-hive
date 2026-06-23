"use client"

import * as React from "react"
import { InputStep, InputData } from "./components/input-step"
import { GeneratingStep } from "./components/generating-step"
import { ResultStep } from "./components/result-step"
import { BrandDNA } from "@/types/brand-dna"
import { toast } from "sonner"

export default function WaitlistBrandDNAPage() {
  const [step, setStep] = React.useState<1 | 2 | 3>(1)
  const [isLoading, setIsLoading] = React.useState(false)
  const [dna, setDna] = React.useState<BrandDNA | null>(null)
  const [signupId, setSignupId] = React.useState<number | null>(null)
  const [brandName, setBrandName] = React.useState<string>("")
  const [faviconUrl, setFaviconUrl] = React.useState<string | null>(null)

  // Fallback support states
  const [tab, setTab] = React.useState<"website" | "manual">("website")
  const [email, setEmail] = React.useState("")
  const [manualText, setManualText] = React.useState("")
  const [scanError, setScanError] = React.useState<string | null>(null)
 
  const handleSubmit = async (data: InputData) => {
    setIsLoading(true)
    setScanError(null)
    
    // Track values for fallback prefill
    setEmail(data.email)
    if (data.inputType === "MANUAL") {
      setManualText(data.sourceInput)
    }
 
    try {
      // 1. Register signup in DB
      const waitlistRes = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
 
      if (!waitlistRes.ok) {
        const errorJson = await waitlistRes.json()
        throw new Error(errorJson.error || "Failed to submit waitlist signup.")
      }
 
      const { id } = await waitlistRes.json()
      setSignupId(id)
 
      // Move to loading screen
      setStep(2)
 
      // 2. Generate DNA
      const generateRes = await fetch("/api/brand-dna/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          email: data.email,
          sourceInput: data.sourceInput,
          inputType: data.inputType
        }),
      })
 
      if (!generateRes.ok) {
        const errJson = await generateRes.json()
 
        // Handle URL failover fallback
        if (generateRes.status === 422 && errJson.code === "FALLBACK_TO_MANUAL") {
          setScanError(errJson.error || "We couldn't extract enough text from your site.")
          setTab("manual")
          setStep(1)
          setIsLoading(false)
          return
        }
 
        throw new Error(errJson.error || "Failed to generate Brand DNA.")
      }
 
      const result = await generateRes.json()
      setDna(result.data)
      setBrandName(result.brandName || "Your Brand")
      setFaviconUrl(result.faviconUrl || null)
      setStep(3)
    } catch (err: any) {
      console.error(err)
      toast.error("Generation Error", {
        description: err.message || "Something went wrong. Please try again.",
        duration: 4000,
      })
      setStep(1)
    } finally {
      setIsLoading(false)
    }
  }
 
  const handleRestart = () => {
    setDna(null)
    setSignupId(null)
    setBrandName("")
    setFaviconUrl(null)
    setStep(1)
    setTab("website")
    setManualText("")
    setScanError(null)
  }
 
  return (
    <div className="w-full max-w-4xl mx-auto py-12 px-6 flex flex-col items-center justify-center min-h-[calc(100vh-140px)]">
      {step === 1 && (
        <div className="w-full text-foreground [--foreground:#131313] [--muted-foreground:#6B6B6B] [--border:#E8E8E8] [--muted:#F4F4F4] [--card:#ffffff] [--card-foreground:#131313] [--background:#f9f9f9]">
          <InputStep
            onSubmit={handleSubmit}
            isLoading={isLoading}
            initialTab={tab}
            initialText={manualText}
            initialEmail={email}
            scanError={scanError}
            onClearScanError={() => setScanError(null)}
          />
        </div>
      )}
      {step === 2 && (
        <div className="w-full text-foreground [--foreground:#131313] [--muted-foreground:#6B6B6B] [--border:#E8E8E8] [--muted:#F4F4F4] [--card:#ffffff] [--card-foreground:#131313] [--background:#f9f9f9]">
          <GeneratingStep />
        </div>
      )}
      {step === 3 && dna && signupId && (
        <ResultStep
          dna={dna}
          id={signupId}
          brandName={brandName}
          faviconUrl={faviconUrl}
          onRestart={handleRestart}
        />
      )}
    </div>
  )
}
