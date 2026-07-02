import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/client"
import { generateMockupGeneratively } from "@/lib/visualIdentity/generative-compositor"
import { uploadAsset } from "@/lib/storage/client"

async function runGenerationWorker(waitlistId: number, logoUrl: string, brandColorHex: string) {
  // Find all pending or failed mockups for this logo version
  const pending = await prisma.generatedMockup.findMany({
    where: { 
      waitlistId, 
      logoVersion: logoUrl, 
      status: { in: ["pending", "failed"] } 
    }
  })

  console.log(`[MOCKUP WORKER] Found ${pending.length} mockups to process for waitlistId: ${waitlistId}`)

  for (const item of pending) {
    try {
      // Set status to generating
      await prisma.generatedMockup.update({
        where: { id: item.id },
        data: { status: "generating" }
      })

      console.log(`[MOCKUP WORKER] Processing template ${item.templateId} generatively...`)
      // Generate the mockup image!
      const buffer = await generateMockupGeneratively(waitlistId, item.templateId, logoUrl, brandColorHex)

      // Upload to storage
      const fileName = `mockup_${item.templateId}.png`
      const uploadedUrl = await uploadAsset(buffer, fileName, waitlistId)

      // Update GeneratedMockup status
      await prisma.generatedMockup.update({
        where: { id: item.id },
        data: {
          status: "ready",
          resultUrl: uploadedUrl,
          errorMessage: null
        }
      })

      // Update BrandVisualIdentity.mockupUrls for backward compatibility
      const vi = await prisma.brandVisualIdentity.findUnique({ where: { waitlistId } })
      if (vi) {
        const currentUrls = (vi.mockupUrls as Record<string, any>) || {}
        const template = await prisma.mockupTemplate.findUnique({ where: { templateId: item.templateId } })
        
        if (template) {
          if (template.category === "apparel") {
            if (!currentUrls.apparel) {
              currentUrls.apparel = uploadedUrl
            } else {
              currentUrls.toteBag = uploadedUrl
            }
          } else if (template.category === "physical") {
            if (!currentUrls.keychain) {
              currentUrls.keychain = uploadedUrl
            } else {
              currentUrls.doorHanger = uploadedUrl
            }
          } else if (template.category === "environment") {
            currentUrls.billboard = uploadedUrl
          }
        }

        await prisma.brandVisualIdentity.update({
          where: { waitlistId },
          data: { mockupUrls: currentUrls }
        })
      }
      console.log(`[MOCKUP WORKER] Successfully ready template ${item.templateId}`)
    } catch (err: any) {
      console.error(`[MOCKUP WORKER] Mockup generation failed for template ${item.templateId}:`, err)
      
      // Fallback: mark status as fallback and use sharp compositor directly!
      try {
        const template = await prisma.mockupTemplate.findUnique({ where: { templateId: item.templateId } })
        if (template) {
          console.log(`[MOCKUP WORKER] Invoking sharp fallback compositor for: ${item.templateId}`)
          const { compositeMockup } = await import("@/lib/visualIdentity/mockup-compositor")
          const buffer = await compositeMockup(template as any, logoUrl, brandColorHex)
          
          const fileName = `mockup_${item.templateId}_fallback.png`
          const uploadedUrl = await uploadAsset(buffer, fileName, waitlistId)
          
          await prisma.generatedMockup.update({
            where: { id: item.id },
            data: {
              status: "fallback",
              resultUrl: uploadedUrl,
              errorMessage: err.message || String(err)
            }
          })
          
          // Also save to BrandVisualIdentity.mockupUrls
          const vi = await prisma.brandVisualIdentity.findUnique({ where: { waitlistId } })
          if (vi) {
            const currentUrls = (vi.mockupUrls as Record<string, any>) || {}
            if (template.category === "apparel") {
              if (!currentUrls.apparel) currentUrls.apparel = uploadedUrl
              else currentUrls.toteBag = uploadedUrl
            } else if (template.category === "physical") {
              if (!currentUrls.keychain) currentUrls.keychain = uploadedUrl
              else currentUrls.doorHanger = uploadedUrl
            } else if (template.category === "environment") {
              currentUrls.billboard = uploadedUrl
            }
            await prisma.brandVisualIdentity.update({
              where: { waitlistId },
              data: { mockupUrls: currentUrls }
            })
          }
        }
      } catch (fallbackErr: any) {
        console.error(`[MOCKUP WORKER] Double failure: Fallback compositor also failed for template ${item.templateId}:`, fallbackErr)
        await prisma.generatedMockup.update({
          where: { id: item.id },
          data: {
            status: "failed",
            errorMessage: `OpenAI error: ${err.message || String(err)}. Fallback compositor error: ${fallbackErr.message || String(fallbackErr)}`
          }
        })
      }
    }
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const waitlistId = Number(id)
    if (isNaN(waitlistId)) {
      return NextResponse.json({ success: false, error: "Invalid waitlist ID" }, { status: 400 })
    }

    const vi = await prisma.brandVisualIdentity.findUnique({
      where: { waitlistId }
    })
    if (!vi || !vi.logoUrl) {
      return NextResponse.json({ success: false, error: "Brand visual identity logo not found" }, { status: 404 })
    }

    const mockups = await prisma.generatedMockup.findMany({
      where: { waitlistId, logoVersion: vi.logoUrl }
    })

    const templates = await prisma.mockupTemplate.findMany({
      where: { templateId: { in: mockups.map(m => m.templateId) } }
    })

    const mockupsWithCategory = mockups.map(m => {
      const t = templates.find(temp => temp.templateId === m.templateId)
      return {
        ...m,
        category: t?.category || "physical"
      }
    })

    return NextResponse.json({ success: true, mockups: mockupsWithCategory })
  } catch (error: any) {
    console.error("GET Mockups Status Error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

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

    const vi = await prisma.brandVisualIdentity.findUnique({
      where: { waitlistId }
    })
    if (!vi || !vi.logoUrl) {
      return NextResponse.json({ success: false, error: "Brand visual identity logo not found" }, { status: 404 })
    }

    const isWorker = req.nextUrl.searchParams.get("worker") === "true"

    if (isWorker) {
      console.log(`[MOCKUP WORKER] Starting synchronous execution for waitlistId: ${waitlistId}`)
      await runGenerationWorker(waitlistId, vi.logoUrl, vi.brandColorHex || "#18181b")
      return NextResponse.json({ success: true, message: "Mockups processed successfully." })
    } else {
      // Trigger background worker via fetch
      const host = req.headers.get("host")
      const protocol = host?.includes("localhost") ? "http" : "https"
      const appUrl = host ? `${protocol}://${host}` : (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000")
      
      console.log(`[MOCKUP INITIATOR] Launching background worker fetch for waitlistId: ${waitlistId}`)
      fetch(`${appUrl}/api/brand-dna/${waitlistId}/mockups?worker=true`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      }).catch(err => console.error("[MOCKUP INITIATOR] Worker trigger error:", err))

      return NextResponse.json({ success: true, message: "Mockups generation enqueued successfully." }, { status: 202 })
    }
  } catch (error: any) {
    console.error("POST Mockups Trigger Error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
