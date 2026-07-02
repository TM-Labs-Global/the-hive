import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/client"
import OpenAI from "openai"
import { generateLogoMark } from "@/lib/llm/openai-client"
import { uploadAsset } from "@/lib/storage/client"

// WCAG Contrast Utilities
function getLuminance(r: number, g: number, b: number): number {
  const a = [r, g, b].map((v) => {
    v /= 255
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  })
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722
}

function getContrastRatio(rgb1: [number, number, number], rgb2: [number, number, number]): number {
  const l1 = getLuminance(...rgb1) + 0.05
  const l2 = getLuminance(...rgb2) + 0.05
  return l1 > l2 ? l1 / l2 : l2 / l1
}

const hexToRgb = (hex: string): [number, number, number] => {
  const c = hex.replace("#", "")
  const r = parseInt(c.substring(0, 2), 16)
  const g = parseInt(c.substring(2, 4), 16)
  const b = parseInt(c.substring(4, 6), 16)
  return isNaN(r) || isNaN(g) || isNaN(b) ? [24, 24, 27] : [r, g, b]
}

const rgbToHex = (r: number, g: number, b: number): string => {
  return "#" + [r, g, b].map(x => {
    const hex = x.toString(16)
    return hex.length === 1 ? "0" + hex : hex
  }).join("")
}

function adjustColorForContrast(hex: string): string {
  const rgb = hexToRgb(hex)
  const whiteContrast = getContrastRatio(rgb, [255, 255, 255])
  const blackContrast = getContrastRatio(rgb, [0, 0, 0])

  if (whiteContrast >= 4.5 || blackContrast >= 4.5) {
    return hex
  }

  const darkened = rgb.map(x => Math.max(0, Math.round(x * 0.5))) as [number, number, number]
  return rgbToHex(...darkened)
}

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  let [r, g, b] = hexToRgb(hex)
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break
      case g: h = (b - r) / d + 2; break
      case b: h = (r - g) / d + 4; break
    }
    h /= 6
  }
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  }
}

const TYPE_PAIRS: Record<string, { heading: string; body: string }> = {
  agro_earth: { heading: "DM Serif Display", body: "DM Sans" },
  corporate_trust: { heading: "Plus Jakarta Sans", body: "Inter" },
  bold_consumer: { heading: "Bricolage Grotesque", body: "DM Sans" },
  premium_luxury: { heading: "Fraunces", body: "Inter" },
  tech_minimal: { heading: "Space Grotesk", body: "Inter" },
}

async function classifyAndColor(
  waitlistId: number,
  dna: any,
  vi: any
): Promise<{ archetypeCluster: string; brandColorHex: string }> {
  const deepseek = new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY || "dummy_key_for_compilation",
    baseURL: "https://api.deepseek.com",
  })

  // Archetype Classification
  let archetypeCluster = vi.archetypeCluster
  if (!archetypeCluster) {
    console.log("[LOGO OPTIONS] Classifying archetype...")
    const archetypeResponse = await deepseek.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content: "Classify this brand into exactly one archetype cluster from this list: agro_earth, corporate_trust, bold_consumer, premium_luxury, tech_minimal. Respond with only the cluster key, nothing else."
        },
        {
          role: "user",
          content: `Findings: ${dna.findings?.join(", ") || ""}\nOne Thing: ${dna.oneThing || ""}\nTagline: ${dna.tagline || ""}\nPersonality: ${dna.brandPersonality?.map((p: any) => p.trait).join(", ") || ""}\nVoice: ${dna.brandVoiceText || ""}`
        }
      ]
    })

    archetypeCluster = archetypeResponse.choices[0].message.content?.trim() || "tech_minimal"
    const validClusters = ["agro_earth", "corporate_trust", "bold_consumer", "premium_luxury", "tech_minimal"]
    if (!validClusters.includes(archetypeCluster)) archetypeCluster = "tech_minimal"

    await prisma.brandVisualIdentity.update({
      where: { waitlistId },
      data: { archetypeCluster }
    })
  }

  // Brand Color
  let brandColorHex = vi.brandColorHex || ""
  if (!brandColorHex) {
    console.log("[LOGO OPTIONS] Generating brand color...")
    const colorPrompt = `You are a Professional Brand Designer. Given the archetype cluster "${archetypeCluster}" and personality traits: "${dna.brandPersonality?.map((p: any) => p.trait).join(", ") || ""}", return a JSON object with this exact structure: { "hex": "#HEXCODE" }. Only return the JSON object, nothing else.`

    const colorResponse = await deepseek.chat.completions.create({
      model: "deepseek-chat",
      messages: [{ role: "user", content: colorPrompt }],
      response_format: { type: "json_object" }
    })

    try {
      const parsed = JSON.parse(colorResponse.choices[0].message.content?.trim() || "{}")
      let hex = parsed.hex || "#18181b"
      if (!hex.startsWith("#")) hex = "#" + hex

      const hsl = hexToHsl(hex)
      if (hsl.s < 15 && archetypeCluster !== "tech_minimal") {
        const fallbacks: Record<string, string> = {
          agro_earth: "#8B5A2B", corporate_trust: "#0F4C81",
          bold_consumer: "#EE9B00", premium_luxury: "#D4AF37", tech_minimal: "#2B3A4A"
        }
        brandColorHex = fallbacks[archetypeCluster] || "#18181b"
      } else {
        brandColorHex = hex
      }
    } catch {
      const rawText = colorResponse.choices[0].message.content || ""
      const match = rawText.match(/#[0-9a-fA-F]{6}/)
      brandColorHex = match ? match[0] : "#18181b"
    }

    brandColorHex = adjustColorForContrast(brandColorHex)
    await prisma.brandVisualIdentity.update({
      where: { waitlistId },
      data: { brandColorHex }
    })
  }

  return { archetypeCluster, brandColorHex }
}

async function generateLogoOptions(
  waitlistId: number,
  brandColorHex: string,
  brandName: string,
  dna: any
): Promise<void> {
  console.log("[LOGO OPTIONS] Generating 3 logo variations in background...")
  const brandNoun = dna.oneThing || "brand"
  const stylePrompts = [
    `A simple, flat, geometric vector icon representing "${brandNoun}". Minimalist style, single accent color ${brandColorHex} on a white background, bold clean shapes, centered composition, modern app icon glyph.`,
    `A modern badge-style monogram logo icon incorporating the initials of "${brandName}". Modern minimalist vector design, accent color ${brandColorHex} on a white background, no text, clean geometric lines.`,
    `An abstract, organic symbol representing "${brandNoun}". Sleek modern fluid styling, flat vector icon format, single solid color ${brandColorHex} on a white background, pure graphic emblem.`
  ]

  const [buf1, buf2, buf3] = await Promise.all([
    generateLogoMark(stylePrompts[0], brandColorHex, brandName).catch(e => { console.error("Logo opt 1 failed:", e); return null }),
    generateLogoMark(stylePrompts[1], brandColorHex, brandName).catch(e => { console.error("Logo opt 2 failed:", e); return null }),
    generateLogoMark(stylePrompts[2], brandColorHex, brandName).catch(e => { console.error("Logo opt 3 failed:", e); return null }),
  ])

  const urls: string[] = []
  if (buf1) urls.push(await uploadAsset(buf1, "logo_opt_1.png", waitlistId))
  if (buf2) urls.push(await uploadAsset(buf2, "logo_opt_2.png", waitlistId))
  if (buf3) urls.push(await uploadAsset(buf3, "logo_opt_3.png", waitlistId))

  // Ensure we always have 3 entries (repeat first if some failed)
  while (urls.length < 3) {
    urls.push(urls[0] || "")
  }

  await prisma.brandVisualIdentity.update({
    where: { waitlistId },
    data: { logoOptions: urls as any }
  })
  console.log("[LOGO OPTIONS] Done generating logo options:", urls)
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const waitlistId = Number(id)

  if (isNaN(waitlistId)) {
    return NextResponse.json({ success: false, error: "Invalid waitlist ID" }, { status: 400 })
  }

  // --- Worker mode: called via self-fetch to run logo generation in the background ---
  const { searchParams } = new URL(req.url)
  if (searchParams.get("worker") === "true") {
    try {
      const body = await req.json().catch(() => ({}))
      const { brandColorHex, brandName, dna } = body

      if (!brandColorHex || !dna) {
        return NextResponse.json({ success: false, error: "Missing worker params" }, { status: 400 })
      }

      await generateLogoOptions(waitlistId, brandColorHex, brandName || "Brand", dna)
      console.log(`[LOGO OPTIONS WORKER] Completed for waitlistId: ${waitlistId}`)
      return NextResponse.json({ success: true })
    } catch (error: any) {
      console.error("[LOGO OPTIONS WORKER] Error:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
  }

  // --- Normal mode: classify archetype/color, trigger background logo generation ---
  try {
    const signup = await prisma.waitlistSignup.findUnique({ where: { id: waitlistId } })

    if (!signup || !signup.dnaJson) {
      return NextResponse.json({ success: false, error: "Brand DNA not generated yet." }, { status: 404 })
    }

    const dna = signup.dnaJson as any
    const brandName = (signup.answersJson as any)?.businessName || signup.email.split("@")[0] || "Your Brand"

    // Upsert BrandVisualIdentity to ensure it exists
    let vi = await prisma.brandVisualIdentity.upsert({
      where: { waitlistId },
      create: { waitlistId, status: "NOT_STARTED" },
      update: {}
    })

    // Phase 1: Classify archetype and pick color (fast — ~2-8s DeepSeek call)
    const { archetypeCluster, brandColorHex } = await classifyAndColor(waitlistId, dna, vi)

    // Re-fetch vi to get fresh data after updates
    vi = await prisma.brandVisualIdentity.findUnique({ where: { waitlistId } }) || vi

    const logoOptions = vi.logoOptions as string[] | null

    // Check if logo options are already generated and valid
    const hasValidLogoOptions = logoOptions && logoOptions.length >= 3 && logoOptions[0] !== ""

    if (hasValidLogoOptions) {
      return NextResponse.json({
        success: true,
        status: "ready",
        logoOptions,
        suggestedColor: brandColorHex,
        suggestedFonts: TYPE_PAIRS[archetypeCluster] || TYPE_PAIRS.tech_minimal,
        archetype: archetypeCluster
      })
    }

    // Phase 2: Logo options not ready — trigger background generation (non-blocking)
    const host = req.headers.get("host")
    const protocol = host?.includes("localhost") ? "http" : "https"
    const appUrl = host ? `${protocol}://${host}` : (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000")

    fetch(`${appUrl}/api/brand-dna/${waitlistId}/logo-options?worker=true`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ brandColorHex, brandName, dna })
    }).catch(err => console.error("[LOGO OPTIONS] Background worker trigger failed:", err))

    // Return immediately so UI can show styles and poll for logos
    return NextResponse.json({
      success: true,
      status: "generating",
      logoOptions: [],
      suggestedColor: brandColorHex,
      suggestedFonts: TYPE_PAIRS[archetypeCluster] || TYPE_PAIRS.tech_minimal,
      archetype: archetypeCluster
    })
  } catch (error: any) {
    console.error("[LOGO OPTIONS] Error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

// Background worker: called via self-fetch to run logo generation without blocking the main request
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { searchParams } = new URL(req.url)
  const isWorker = searchParams.get("worker") === "true"

  if (!isWorker) {
    // Normal GET: return current logo options status
    const { id } = await params
    const waitlistId = Number(id)
    if (isNaN(waitlistId)) {
      return NextResponse.json({ success: false, error: "Invalid ID" }, { status: 400 })
    }

    const vi = await prisma.brandVisualIdentity.findUnique({ where: { waitlistId } })
    const logoOptions = vi?.logoOptions as string[] | null
    const hasOptions = logoOptions && logoOptions.length >= 3 && logoOptions[0] !== ""

    return NextResponse.json({
      success: true,
      status: hasOptions ? "ready" : "generating",
      logoOptions: hasOptions ? logoOptions : [],
      suggestedColor: vi?.brandColorHex || "#18181b",
      suggestedFonts: TYPE_PAIRS[vi?.archetypeCluster || "tech_minimal"] || TYPE_PAIRS.tech_minimal,
      archetype: vi?.archetypeCluster || "tech_minimal"
    })
  }

  // Worker mode: generate logos from self-fetch POST body
  try {
    const { id } = await params
    const waitlistId = Number(id)
    const body = await req.json().catch(() => ({}))
    const { brandColorHex, brandName, dna } = body

    if (!brandColorHex || !dna) {
      return NextResponse.json({ success: false, error: "Missing worker params" }, { status: 400 })
    }

    await generateLogoOptions(waitlistId, brandColorHex, brandName || "Brand", dna)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[LOGO OPTIONS WORKER] Error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
