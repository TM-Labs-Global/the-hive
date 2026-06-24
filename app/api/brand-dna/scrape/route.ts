import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/client"
import { WebsiteExtractor } from "@/lib/extractors/website-extractor"
import { generatePrefillData } from "@/lib/llm/deepseek-client"

export const maxDuration = 60 // Allow up to 60 seconds on Vercel Pro

export async function POST(req: NextRequest) {
  try {
    const { inputType, sourceInput, signupId } = await req.json()

    if (!sourceInput) {
      return NextResponse.json({ success: false, error: "Source input is required." }, { status: 400 })
    }

    let rawText = ""
    if (inputType === "WEBSITE") {
      const extractor = new WebsiteExtractor()
      const result = await extractor.extract(sourceInput)
      rawText = result.rawText
    } else {
      rawText = sourceInput
    }

    // Call LLM to extract prefill workbook answers
    let prefilledAnswers: Record<string, any> = {}
    try {
      prefilledAnswers = await generatePrefillData(rawText)
    } catch (llmError) {
      console.warn("LLM pre-fill extraction failed, falling back to empty prefill:", llmError)
    }

    // If prefill succeeded, make sure businessName is populated (at least fallback to inferred brand name)
    if (!prefilledAnswers.businessName && inputType === "WEBSITE") {
      try {
        const url = new URL(sourceInput.startsWith("http") ? sourceInput : `https://${sourceInput}`)
        const parts = url.hostname.replace("www.", "").split(".")
        prefilledAnswers.businessName = parts[0].charAt(0).toUpperCase() + parts[0].slice(1)
      } catch {}
    }

    if (signupId) {
      await prisma.waitlistSignup.update({
        where: { id: Number(signupId) },
        data: {
          rawExtractedText: rawText,
          answersJson: prefilledAnswers,
        },
      })
    }

    return NextResponse.json({
      success: true,
      rawText: rawText,
      prefilledAnswers: prefilledAnswers,
    })
  } catch (error: any) {
    console.error("Intake extraction failed:", error)
    return NextResponse.json({
      success: false,
      error: error.message || "Extraction failed.",
    }, { status: 500 })
  }
}
