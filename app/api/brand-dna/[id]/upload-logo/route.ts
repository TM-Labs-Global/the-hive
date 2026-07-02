import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/client"
import { uploadAsset } from "@/lib/storage/client"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const waitlistId = Number(id)

    if (isNaN(waitlistId)) {
      return NextResponse.json({ success: false, error: "Invalid waitlist ID" }, { status: 400 })
    }

    const formData = await req.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ success: false, error: "No file uploaded" }, { status: 400 })
    }

    // Read file buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload to Vercel Blob storage
    const fileName = `custom_logo_${Date.now()}.png`
    const logoUrl = await uploadAsset(buffer, fileName, waitlistId)

    // Update BrandVisualIdentity.logoUrl in database
    await prisma.brandVisualIdentity.upsert({
      where: { waitlistId },
      create: {
        waitlistId,
        logoUrl,
        status: "NOT_STARTED"
      },
      update: {
        logoUrl
      }
    })

    return NextResponse.json({ success: true, logoUrl })
  } catch (error: any) {
    console.error("Custom logo upload error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
