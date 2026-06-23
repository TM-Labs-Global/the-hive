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
    if (signup.sourceInput && signup.inputType === "WEBSITE") {
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

    const filename = `${brandName.toLowerCase()}-brand-dna.md`
    const filePath = path.join(process.cwd(), "public", "generated-dna", `${id}.md`)

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ success: false, error: "Physical file does not exist on disk." }, { status: 404 })
    }

    const fileBuffer = fs.readFileSync(filePath)
    
    return new Response(fileBuffer, {
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
