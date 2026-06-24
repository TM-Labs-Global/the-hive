import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/client"
import { WebsiteExtractor } from "@/lib/extractors/website-extractor"

export async function POST(req: NextRequest) {
  try {
    const { url, signupId } = await req.json()

    if (!url) {
      return NextResponse.json({ success: false, error: "URL is required" }, { status: 400 })
    }

    const extractor = new WebsiteExtractor()
    const result = await extractor.extract(url)

    if (signupId) {
      await prisma.waitlistSignup.update({
        where: { id: Number(signupId) },
        data: {
          rawExtractedText: result.rawText,
        },
      })
    }

    return NextResponse.json({
      success: true,
      rawText: result.rawText,
    })
  } catch (error: any) {
    console.warn("Silent warm-up scrape failed:", error)
    return NextResponse.json({
      success: false,
      error: error.message || "Scrape failed",
    }, { status: 500 })
  }
}
