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
  let rgb = hexToRgb(hex)
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

    const signup = await prisma.waitlistSignup.findUnique({
      where: { id: waitlistId }
    })

    if (!signup || !signup.dnaJson) {
      return NextResponse.json({ success: false, error: "Brand DNA not generated yet." }, { status: 404 })
    }

    const dna = signup.dnaJson as any
    const brandName = (signup.answersJson as any)?.businessName || "Your Brand"

    // 1. Initialize BrandVisualIdentity if it doesn't exist
    let vi = await prisma.brandVisualIdentity.findUnique({
      where: { waitlistId }
    })

    if (!vi) {
      vi = await prisma.brandVisualIdentity.create({
        data: {
          waitlistId,
          status: "NOT_STARTED"
        }
      })
    }

    // 2. Classify Archetype
    let archetypeCluster = vi.archetypeCluster
    const deepseek = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY || "dummy_key_for_compilation",
      baseURL: "https://api.deepseek.com",
    })

    if (!archetypeCluster) {
      console.log("[LOGO OPTIONS] Classifying brand archetype cluster...")
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
      if (!validClusters.includes(archetypeCluster)) {
        archetypeCluster = "tech_minimal"
      }
      
      await prisma.brandVisualIdentity.update({
        where: { waitlistId },
        data: { archetypeCluster }
      })
    }

    // 3. Generate suggested primary color
    let brandColorHex = vi.brandColorHex || "#18181b"
    if (!brandColorHex) {
      console.log("[LOGO OPTIONS] Generating suggested brand color...")
      const colorPrompt = `You are a Professional Brand Designer. Given the archetype cluster "${archetypeCluster}" and these personality traits: "${dna.brandPersonality?.map((p: any) => p.trait).join(", ") || ""}", generate exactly one primary brand color matching these guidelines.
Constraints for archetype clusters:
- agro_earth: Earthy tones (terracotta, olive, warm gold). Hue must be between 20-45 degrees, saturation >= 30%.
- corporate_trust: Professional tones (deep blues, teals, slate). Hue must be between 195-230 degrees, saturation >= 25%.
- bold_consumer: High-energy tones (vibrant red, orange, bright purple). Hue must be between 0-20 or 280-320 degrees, saturation >= 50%.
- premium_luxury: Sophisticated tones (champagne, dark emerald, rich plum). Hue must be between 35-50 (gold), 140-160 (emerald), or 280-300 (plum) degrees, saturation >= 25%.
- tech_minimal: Modern tones (cool desaturated blue-gray). Hue must be between 200-220 degrees, saturation 10-25%.

You must return a JSON object with this exact structure:
{
  "hex": "#HEXCODE",
  "hue": 210,
  "saturation": 45,
  "lightness": 50
}
Do not include any other markdown, wrapper, or text.`

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
            agro_earth: "#8B5A2B",
            corporate_trust: "#0F4C81",
            bold_consumer: "#EE9B00",
            premium_luxury: "#D4AF37",
            tech_minimal: "#2B3A4A"
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

    // Suggested fonts
    const TYPE_PAIRS: Record<string, { heading: string; body: string }> = {
      agro_earth: { heading: "DM Serif Display", body: "DM Sans" },
      corporate_trust: { heading: "Plus Jakarta Sans", body: "Inter" },
      bold_consumer: { heading: "Bricolage Grotesque", body: "DM Sans" },
      premium_luxury: { heading: "Fraunces", body: "Inter" },
      tech_minimal: { heading: "Space Grotesk", body: "Inter" },
    }
    const typographyJson = TYPE_PAIRS[archetypeCluster] || TYPE_PAIRS.tech_minimal

    // 4. Generate 3 logo options in parallel if not already generated
    let logoOptions = vi.logoOptions as string[] | null
    if (!logoOptions || logoOptions.length < 3) {
      console.log("[LOGO OPTIONS] Generating 3 logo variations in parallel...")
      
      const brandNoun = dna.oneThing || brandColorHex
      const stylePrompts = [
        `A simple, flat, geometric vector icon representing "${brandNoun}". Minimalist style, single accent color ${brandColorHex} on a white background, bold clean shapes, centered composition, modern app icon glyph.`,
        `A modern badge-style monogram logo icon incorporating the initials of "${brandName}". Modern minimalist vector design, accent color ${brandColorHex} on a white background, no text, clean geometric lines.`,
        `An abstract, organic symbol representing "${brandNoun}". Sleek modern fluid styling, flat vector icon format, single solid color ${brandColorHex} on a white background, pure graphic emblem.`
      ]

      const [buf1, buf2, buf3] = await Promise.all([
        generateLogoMark(stylePrompts[0], brandColorHex, brandName).catch(() => null),
        generateLogoMark(stylePrompts[1], brandColorHex, brandName).catch(() => null),
        generateLogoMark(stylePrompts[2], brandColorHex, brandName).catch(() => null)
      ])

      const urls: string[] = []
      if (buf1) urls.push(await uploadAsset(buf1, "logo_opt_1.png", waitlistId))
      if (buf2) urls.push(await uploadAsset(buf2, "logo_opt_2.png", waitlistId))
      if (buf3) urls.push(await uploadAsset(buf3, "logo_opt_3.png", waitlistId))

      // Fallbacks if generation fails
      while (urls.length < 3) {
        urls.push(urls[0] || "/mockup-templates/digital/ios-app-icon-iphone-17-pro-mockup-on-gradient-background-v6-front-view.png")
      }

      logoOptions = urls
      await prisma.brandVisualIdentity.update({
        where: { waitlistId },
        data: { logoOptions: logoOptions as any }
      })
    }

    return NextResponse.json({
      success: true,
      logoOptions,
      suggestedColor: brandColorHex,
      suggestedFonts: typographyJson,
      archetype: archetypeCluster
    })
  } catch (error: any) {
    console.error("GET/POST Logo Options Error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
