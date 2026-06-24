import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/client"
import { resolveExtractor } from "@/lib/extractors/resolve-extractor"
import { generateBrandDNA } from "@/lib/llm/deepseek-client"
import { renderBrandDNAMarkdown } from "@/lib/render/brand-dna-markdown"
import fs from "fs"
import path from "path"

export async function POST(req: NextRequest) {
  let signupId: number | null = null

  try {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is not configured in the environment variables.")
    }

    const { id } = await req.json()
    if (!id) {
      return NextResponse.json({ success: false, error: "Signup ID is required." }, { status: 400 })
    }
    signupId = Number(id)

    // 1. Fetch waitlist record
    const dbSignup = await prisma.waitlistSignup.findUnique({
      where: { id: signupId },
    })
    if (!dbSignup) {
      return NextResponse.json({ success: false, error: "Waitlist signup record not found." }, { status: 404 })
    }

    const signup = {
      id: dbSignup.id,
      email: dbSignup.email,
      sourceInput: dbSignup.sourceInput || "",
      inputType: dbSignup.inputType as "WEBSITE" | "MANUAL" | "QUESTIONNAIRE"
    }

    let extractedText = ""

    if (signup.inputType === "QUESTIONNAIRE") {
      // Build LLM input context from questionnaire answers
      const answers = dbSignup.answersJson as Record<string, any> || {}
      let textParts = []

      textParts.push("--- BRAND DISCOVERY WORKBOOK RESPONSES ---")
      for (const [key, value] of Object.entries(answers)) {
        textParts.push(`[QUESTION: ${key}]`)
        textParts.push(typeof value === "object" ? JSON.stringify(value) : String(value))
        textParts.push("")
      }

      if (dbSignup.rawExtractedText) {
        textParts.push("--- BACKGROUND WEBSITE SCRAPED CONTENT ---")
        textParts.push(dbSignup.rawExtractedText)
      }

      extractedText = textParts.join("\n")

      // Update to GENERATING directly
      await prisma.waitlistSignup.update({
        where: { id: signupId },
        data: { status: "GENERATING" },
      })
    } else {
      // 2. Run scraping/extraction
      await prisma.waitlistSignup.update({
        where: { id: signupId },
        data: { status: "EXTRACTING" },
      })

      const inputData = signup.sourceInput || ""
      const extractor = resolveExtractor(signup.inputType as "WEBSITE" | "MANUAL")
      
      try {
        const result = await extractor.extract(inputData)
        extractedText = result.rawText
      } catch (scrapingError: any) {
        console.warn("Extraction failed, flagging for user fallback:", scrapingError)
        await prisma.waitlistSignup.update({
          where: { id: signupId },
          data: {
            status: "FAILED",
            errorMessage: scrapingError.message || "Extraction failed",
          },
        })

        return NextResponse.json({
          success: false,
          error: scrapingError.message || "Scraping failed.",
          code: "FALLBACK_TO_MANUAL"
        }, { status: 422 })
      }

      // Update to GENERATING and save rawExtractedText
      await prisma.waitlistSignup.update({
        where: { id: signupId },
        data: {
          status: "GENERATING",
          rawExtractedText: extractedText,
        },
      })
    }

    const dna = await generateBrandDNA(extractedText)

    // Derive a clean brand name
    let brandName = "Your Brand"
    if (signup.inputType === "QUESTIONNAIRE") {
      const answers = dbSignup.answersJson as Record<string, any> || {}
      if (answers.businessName) {
        brandName = answers.businessName
      } else if (signup.sourceInput && signup.sourceInput.includes(".")) {
        try {
          const url = new URL(signup.sourceInput.startsWith("http") ? signup.sourceInput : `https://${signup.sourceInput}`)
          const parts = url.hostname.replace("www.", "").split(".")
          brandName = parts[0].charAt(0).toUpperCase() + parts[0].slice(1)
        } catch {}
      }
    } else if (signup.sourceInput && signup.inputType === "WEBSITE") {
      try {
        const url = new URL(signup.sourceInput.startsWith("http") ? signup.sourceInput : `https://${signup.sourceInput}`)
        const parts = url.hostname.replace("www.", "").split(".")
        brandName = parts[0].charAt(0).toUpperCase() + parts[0].slice(1)
      } catch {}
    } else {
      const parts = signup.email.split("@")
      if (parts.length > 1) {
        const company = parts[1].split(".")[0]
        brandName = company.charAt(0).toUpperCase() + company.slice(1)
      }
    }

    // 4. Render Markdown & Write to public folder
    const markdownContent = renderBrandDNAMarkdown(dna, brandName)
    
    const dir = path.join(process.cwd(), "public", "generated-dna")
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    const filePath = path.join(dir, `${signupId}.md`)
    fs.writeFileSync(filePath, markdownContent, "utf-8")
    const fileUrl = `/generated-dna/${signupId}.md`

    // 5. Update DB record to DONE
    await prisma.waitlistSignup.update({
      where: { id: signupId },
      data: {
        status: "DONE",
        dnaJson: dna as any,
        mdFileUrl: fileUrl,
        completedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      data: dna,
      fileUrl: fileUrl,
      brandName: brandName,
      faviconUrl: dbSignup?.faviconUrl || null,
    })
  } catch (error: any) {
    console.error("Generate API error:", error)
    
    if (signupId) {
      try {
        await prisma.waitlistSignup.update({
          where: { id: signupId },
          data: {
            status: "FAILED",
            errorMessage: error.message || "Failed during Brand DNA generation.",
          },
        })
      } catch (dbError) {
        console.error("Failed to update status to FAILED in DB:", dbError)
      }
    }

    return NextResponse.json(
      { success: false, error: error.message || "Generation pipeline failed." },
      { status: 500 }
    )
  }
}
