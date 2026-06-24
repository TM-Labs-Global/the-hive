import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/client"
import fs from "fs"
import path from "path"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const idParam = searchParams.get("id")

    if (!idParam) {
      return NextResponse.json({ success: false, error: "ID query parameter is required." }, { status: 400 })
    }

    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is not configured in the environment variables.")
    }

    const id = Number(idParam)
    const signup = await prisma.waitlistSignup.findUnique({
      where: { id },
    })

    if (!signup || signup.status !== "DONE") {
      return NextResponse.json({ success: false, error: "File not found or not generated yet." }, { status: 404 })
    }

    // Derive a clean brand name for the download filename
    let brandName = "brand"
    if (signup.inputType === "QUESTIONNAIRE") {
      const answers = signup.answersJson as Record<string, any> || {}
      if (answers.businessName) {
        brandName = answers.businessName.toLowerCase().replace(/[^a-z0-9_-]/g, "")
      } else if (signup.sourceInput && signup.sourceInput.includes(".")) {
        try {
          const url = new URL(signup.sourceInput.startsWith("http") ? signup.sourceInput : `https://${signup.sourceInput}`)
          brandName = url.hostname.replace("www.", "").split(".")[0]
        } catch {}
      }
    } else if (signup.sourceInput && signup.inputType === "WEBSITE") {
      try {
        const url = new URL(signup.sourceInput.startsWith("http") ? signup.sourceInput : `https://${signup.sourceInput}`)
        brandName = url.hostname.replace("www.", "").split(".")[0]
      } catch {}
    } else {
      const parts = signup.email.split("@")
      if (parts.length > 1) {
        brandName = parts[1].split(".")[0]
      }
    }

    const filename = `${brandName.toLowerCase()}-brand-strategy.md`
    
    // First try database-backed markdown content
    let markdown = signup.rawMarkdown
    
    // Fallback to checking local file on disk for backwards compatibility in development/existing records
    if (!markdown) {
      const filePath = path.join(process.cwd(), "public", "generated-dna", `${id}.md`)
      if (fs.existsSync(filePath)) {
        markdown = fs.readFileSync(filePath, "utf-8")
      }
    }

    if (!markdown) {
      return NextResponse.json({ success: false, error: "Strategy content does not exist." }, { status: 404 })
    }

    return new Response(Buffer.from(markdown, "utf-8"), {
      headers: {
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Type": "text/markdown; charset=utf-8",
      },
    })
  } catch (error: any) {
    console.error("Download API error:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Failed to download file." },
      { status: 500 }
    )
  }
}
