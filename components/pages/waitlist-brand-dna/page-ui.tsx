"use client"

import * as React from "react"
import { InputStep, InputData } from "./components/input-step"
import { QuestionnaireStep } from "./components/questionnaire-step"
import { GeneratingStep } from "./components/generating-step"
import { ResultStep } from "./components/result-step"
import { BrandDNA } from "@/types/brand-dna"
import { toast } from "sonner"

export default function WaitlistBrandDNAPage() {
  const [step, setStep] = React.useState<1 | 2 | 3 | 4>(1)
  const [isLoading, setIsLoading] = React.useState(false)
  const [dna, setDna] = React.useState<BrandDNA | null>(null)
  const [signupId, setSignupId] = React.useState<number | null>(null)
  const [brandName, setBrandName] = React.useState<string>("")
  const [faviconUrl, setFaviconUrl] = React.useState<string | null>(null)

  // Questionnaire states
  const [email, setEmail] = React.useState("")
  const [sourceInput, setSourceInput] = React.useState("")
  const [prefilledContext, setPrefilledContext] = React.useState<{
    rawScrapedText?: string
    inferredBrandName?: string
    inferredDescription?: string
    prefilledAnswers?: Record<string, any>
  }>({})

  // Handle step 1 submission (warm-up intake)
  const handleIntakeSubmit = async (data: InputData) => {
    setIsLoading(true)
    setEmail(data.email)
    setSourceInput(data.sourceInput)

    try {
      // 1. Register signup in DB as a QUESTIONNAIRE flow initially
      const waitlistRes = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: data.email,
          sourceInput: data.sourceInput,
          inputType: "QUESTIONNAIRE",
        }),
      })

      if (!waitlistRes.ok) {
        const errorJson = await waitlistRes.json()
        throw new Error(errorJson.error || "Failed to submit waitlist signup.")
      }

      const { id } = await waitlistRes.json()
      setSignupId(id)

      // 2. Perform scraping & pre-fill extraction synchronously
      const scrapeRes = await fetch("/api/brand-dna/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inputType: data.inputType,
          sourceInput: data.sourceInput,
          signupId: id
        }),
      })

      if (!scrapeRes.ok) {
        const errorJson = await scrapeRes.json()
        throw new Error(errorJson.error || "Extraction failed.")
      }

      const scrapeResult = await scrapeRes.json()

      // Set the full pre-populated context
      setPrefilledContext({
        rawScrapedText: scrapeResult.rawText,
        inferredBrandName: scrapeResult.prefilledAnswers?.businessName || "",
        inferredDescription: scrapeResult.prefilledAnswers?.foundingProblem || "",
        prefilledAnswers: scrapeResult.prefilledAnswers
      })

      // Move to step 2 (Interactive discovery workbook questionnaire)
      setStep(2)
    } catch (err: any) {
      console.error(err)
      toast.error("Intake Error", {
        description: err.message || "Something went wrong during registration. Please try again.",
        duration: 4000,
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Handle step 2 submission (Discovery Questionnaire complete)
  const handleQuestionnaireSubmit = async (answers: Record<string, any>) => {
    if (!signupId) return

    setIsLoading(true)
    setStep(3) // Move to generating loading loader step

    try {
      // 1. Update the waitlist signup with answersJson
      const updateRes = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: signupId,
          email,
          sourceInput,
          inputType: "QUESTIONNAIRE",
          answersJson: answers
        }),
      })

      if (!updateRes.ok) {
        const errJson = await updateRes.json()
        throw new Error(errJson.error || "Failed to save discovery questionnaire answers.")
      }

      // 2. Trigger strategy generation
      const generateRes = await fetch("/api/brand-dna/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: signupId }),
      })

      if (!generateRes.ok) {
        const errJson = await generateRes.json()
        throw new Error(errJson.error || "Failed to generate Brand Strategy.")
      }

      const result = await generateRes.json()
      setDna(result.data)
      setBrandName(result.brandName || "Your Brand")
      setFaviconUrl(result.faviconUrl || null)
      setStep(4) // Move to results strategy view
    } catch (err: any) {
      console.error(err)
      toast.error("Generation Error", {
        description: err.message || "Something went wrong. Please try again.",
        duration: 4000,
      })
      setStep(2) // Fallback back to questionnaire step
    } finally {
      setIsLoading(false)
    }
  }

  const handleRestart = () => {
    setDna(null)
    setSignupId(null)
    setBrandName("")
    setFaviconUrl(null)
    setEmail("")
    setSourceInput("")
    setPrefilledContext({})
    setStep(1)
  }

  return (
    <div className="w-full max-w-4xl mx-auto py-12 px-6 flex flex-col items-center justify-center min-h-[calc(100vh-140px)]">
      {step === 1 && (
        <div className="w-full text-foreground [--foreground:#131313] [--muted-foreground:#6B6B6B] [--border:#E8E8E8] [--muted:#F4F4F4] [--card:#ffffff] [--card-foreground:#131313] [--background:#f9f9f9]">
          <InputStep
            onSubmit={handleIntakeSubmit}
            isLoading={isLoading}
          />
        </div>
      )}
      {step === 2 && (
        <div className="w-full text-foreground [--foreground:#131313] [--muted-foreground:#6B6B6B] [--border:#E8E8E8] [--muted:#F4F4F4] [--card:#ffffff] [--card-foreground:#131313] [--background:#f9f9f9]">
          <QuestionnaireStep
            onSubmit={handleQuestionnaireSubmit}
            isLoading={isLoading}
            prefilledContext={prefilledContext}
          />
        </div>
      )}
      {step === 3 && (
        <div className="w-full text-foreground [--foreground:#131313] [--muted-foreground:#6B6B6B] [--border:#E8E8E8] [--muted:#F4F4F4] [--card:#ffffff] [--card-foreground:#131313] [--background:#f9f9f9]">
          <GeneratingStep />
        </div>
      )}
      {step === 4 && dna && signupId && (
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

