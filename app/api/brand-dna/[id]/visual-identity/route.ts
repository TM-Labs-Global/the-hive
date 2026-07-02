import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/client"

async function queryWithRetry<T>(queryFn: () => Promise<T>, retries = 1): Promise<T> {
  try {
    return await queryFn()
  } catch (error) {
    if (retries > 0) {
      console.warn(`Prisma query failed, retrying once after 500ms... Error:`, error)
      await new Promise(resolve => setTimeout(resolve, 500))
      return await queryFn()
    }
    throw error
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

    const visualIdentity = await queryWithRetry(() =>
      prisma.brandVisualIdentity.findUnique({
        where: { waitlistId },
      })
    )

    if (!visualIdentity) {
      return NextResponse.json({ success: true, status: "NOT_STARTED" })
    }

    return NextResponse.json({
      success: true,
      status: visualIdentity.status,
      failureReason: visualIdentity.failureReason,
    })
  } catch (error: any) {
    console.error("GET Visual Identity Status Error:", error)
    return NextResponse.json({ success: false, error: error.message || "Failed to retrieve status" }, { status: 500 })
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

    // Rate-limit: reject if visual identity already exists
    const existing = await prisma.brandVisualIdentity.findUnique({
      where: { waitlistId },
    })

    if (existing) {
      return NextResponse.json({ 
        success: false, 
        error: "Visual identity generation has already been initiated for this brand." 
      }, { status: 409 })
    }

    // Fetch waitlist signup first to verify it exists
    const signup = await prisma.waitlistSignup.findUnique({
      where: { id: waitlistId },
    })

    if (!signup || signup.status !== "DONE") {
      return NextResponse.json({ 
        success: false, 
        error: "Waitlist signup record not found or Brand DNA is not completed." 
      }, { status: 400 })
    }

    // Create the visual identity record in PENDING / QUEUED status
    await prisma.brandVisualIdentity.create({
      data: {
        waitlistId,
        status: "QUEUED",
      },
    })

    // Upstash QStash Trigger
    const qstashToken = process.env.QSTASH_TOKEN
    
    // Dynamically resolve app base URL from request headers to prevent ECONNREFUSED on Vercel
    const host = req.headers.get("host")
    const protocol = host?.includes("localhost") ? "http" : "https"
    const appUrl = host ? `${protocol}://${host}` : (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000")

    if (qstashToken && qstashToken !== "dummy_token") {
      try {
        console.log(`Publishing QStash message for waitlistId: ${waitlistId}`)
        const { Client } = await import("@upstash/qstash")
        const qstash = new Client({ token: qstashToken })
        
        await qstash.publishJSON({
          url: `${appUrl}/api/brand-dna/process-guideline`,
          body: { waitlistId },
        })
        
        return NextResponse.json({ success: true, status: "QUEUED" }, { status: 202 })
      } catch (qstashError: any) {
        console.error("QStash publishing failed, falling back to sync execution:", qstashError)
      }
    }

    // Local / Dev Fallback: Trigger process worker asynchronously (non-blocking)
    console.log(`Development: Triggering visual identity generation for waitlistId: ${waitlistId}`)
    
    // We execute a background fetch to the process guideline API
    fetch(`${appUrl}/api/brand-dna/process-guideline`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ waitlistId }),
    }).catch(err => console.error("Dev local trigger background error:", err))

    return NextResponse.json({ success: true, status: "QUEUED" }, { status: 202 })
  } catch (error: any) {
    console.error("POST Visual Identity Trigger Error:", error)
    return NextResponse.json({ success: false, error: error.message || "Failed to trigger generation" }, { status: 500 })
  }
}
