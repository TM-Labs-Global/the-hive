import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/client"
import OpenAI from "openai"
import { generateLogoMark, generateValuesImage } from "@/lib/llm/openai-client"
import { uploadAsset } from "@/lib/storage/client"
import { sendCompletionEmail } from "@/lib/email/client"
import sharp from "sharp"
import { compositeMockup } from "@/lib/visualIdentity/mockup-compositor"
import { safeJsonParse } from "@/lib/llm/json-parser"

export const maxDuration = 60 // Allow up to 60 seconds on Vercel Pro

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
    return hex // Meets contrast
  }

  // Mid-tone color: darken it to meet contrast against white
  const darkened = rgb.map(x => Math.max(0, Math.round(x * 0.5))) as [number, number, number]
  return rgbToHex(...darkened)
}

// Convert Hex to HSL for Saturation validation
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

// Archetype style presets for visual grounding
const ARCHETYPE_VISUALS: Record<string, { setting: string; lighting: string; style: string }> = {
  agro_earth: {
    setting: "organic rustic outdoor setting or greenhouse",
    lighting: "warm golden hour natural sunlight",
    style: "earthy, natural, and raw editorial look"
  },
  corporate_trust: {
    setting: "architectural corporate pavilion, design library, or tech workspace",
    lighting: "cool overcast diffused daylight",
    style: "polished, structure-focused, and highly professional mood"
  },
  bold_consumer: {
    setting: "vibrant modern pop-up studio or energetic urban background",
    lighting: "high-contrast graphic studio lighting with bold colors",
    style: "energetic, punchy, and highly expressive aesthetic"
  },
  premium_luxury: {
    setting: "opulent minimalist interior with dark marble or velvet textures",
    lighting: "moody low-key chiaroscuro lighting with selective warm highlights",
    style: "refined, premium, and sophisticated luxury mood"
  },
  tech_minimal: {
    setting: "stark minimalist architectural space or clean tech workspace",
    lighting: "clean soft white studio light",
    style: "minimalist, futuristic, and high-fidelity tech design"
  }
}

// Map common business keywords to concrete visual subject anchors
function getBusinessCategoryAndSubject(businessName: string, offerings: string, oneThing: string): { category: string; subject: string } {
  const combined = `${businessName} ${offerings} ${oneThing}`.toLowerCase()
  
  const categories = [
    {
      keywords: ["coffee", "cafe", "barista", "espresso", "roastery", "brew", "roasters"],
      category: "specialty coffee brand",
      subject: "A barista's hands pouring milk into an espresso cup, showing latte art, steam rising"
    },
    {
      keywords: ["food", "restaurant", "dining", "bakery", "kitchen", "chef", "baking", "sweet", "cake", "sauce", "biscuit", "meal"],
      category: "culinary establishment",
      subject: "A beautifully plated modern culinary dish being served on a rustic stone table with fresh ingredients around"
    },
    {
      keywords: ["saas", "software", "tech", "platform", "app", "digital", "code", "ai", "artificial intelligence", "cloud", "security", "developer"],
      category: "modern software technology firm",
      subject: "A clean modern office workspace with a minimalist laptop displaying code or charts, soft desk light"
    },
    {
      keywords: ["finance", "fintech", "banking", "money", "invest", "payment", "wealth", "crypto", "tax", "accounting"],
      category: "digital financial services company",
      subject: "A sleek modern desk featuring a smartphone showing secure financial transaction confirmation, elegant metallic highlights"
    },
    {
      keywords: ["agency", "consulting", "marketing", "advisors", "services", "design", "creative", "studio"],
      category: "boutique creative agency",
      subject: "A stylish designer's desk with notebooks, color swatches, and a high-end designer pen under studio lighting"
    },
    {
      keywords: ["fashion", "clothing", "apparel", "wear", "garment", "boutique", "textile", "tailor", "jewelry"],
      category: "premium apparel brand",
      subject: "A close-up shot of high-quality textile fabrics, organic cotton stitching, hanging on a minimalist rack"
    },
    {
      keywords: ["health", "wellness", "fitness", "yoga", "gym", "medical", "clinic", "therapy", "skincare", "beauty", "cosmetic"],
      category: "holistic wellness brand",
      subject: "A serene studio corner with a rolled-up yoga mat, a green plant, and natural morning sunlight casting soft shadows"
    }
  ]

  for (const item of categories) {
    if (item.keywords.some(kw => combined.includes(kw))) {
      return { category: item.category, subject: item.subject }
    }
  }

  return {
    category: "contemporary brand",
    subject: "A modern design workspace featuring clean journals, blueprints, and a pen under soft daylight"
  }
}

export async function POST(req: NextRequest) {
  try {
    const { waitlistId } = await req.json()

    if (!waitlistId) {
      return NextResponse.json({ success: false, error: "Waitlist ID is required." }, { status: 400 })
    }

    const dbSignup = await prisma.waitlistSignup.findUnique({
      where: { id: Number(waitlistId) },
      include: { visualIdentity: true },
    })

    if (!dbSignup) {
      return NextResponse.json({ success: false, error: "Waitlist signup not found." }, { status: 404 })
    }

    // Set status to GENERATING
    await prisma.brandVisualIdentity.update({
      where: { waitlistId: dbSignup.id },
      data: { status: "GENERATING" },
    })

    const dna = dbSignup.dnaJson as any
    if (!dna) {
      throw new Error("No Brand DNA found for waitlist signup.")
    }

    const answers = (dbSignup.answersJson as any) || {}

    // Initialize DeepSeek
    const deepseek = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY || "dummy_key_for_compilation",
      baseURL: "https://api.deepseek.com",
    })

    // 1. Archetype Classification
    console.log("Classifying brand archetype cluster...")
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
    
    let archetypeCluster = archetypeResponse.choices[0].message.content?.trim() || "tech_minimal"
    // Normalize response to ensure it maps to one of our clusters
    const validClusters = ["agro_earth", "corporate_trust", "bold_consumer", "premium_luxury", "tech_minimal"]
    if (!validClusters.includes(archetypeCluster)) {
      archetypeCluster = "tech_minimal"
    }
    console.log("Classified cluster:", archetypeCluster)

    // 2. Brand Color Generation
    console.log("Generating brand color...")
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

    let brandColorHex = "#18181b"
    try {
      const parsedColor = safeJsonParse<any>(colorResponse.choices[0].message.content?.trim() || "{}")
      let hex = parsedColor.hex || "#18181b"
      if (!hex.startsWith("#")) {
        hex = "#" + hex
      }
      
      const hsl = hexToHsl(hex)
      console.log(`DeepSeek generated color: ${hex} (H: ${hsl.h}°, S: ${hsl.s}%, L: ${hsl.l}%)`)

      if (hsl.s < 15 && archetypeCluster !== "tech_minimal") {
        console.warn(`WARNING: Generated color ${hex} is desaturated (S: ${hsl.s}% < 15%) for non-minimalist archetype "${archetypeCluster}". Triggering fallback color.`)
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
    } catch (e) {
      console.error("Failed to parse color generation response as JSON, falling back to regex extraction:", e)
      const rawText = colorResponse.choices[0].message.content || ""
      const match = rawText.match(/#[0-9a-fA-F]{6}/)
      brandColorHex = match ? match[0] : "#18181b"
    }

    brandColorHex = adjustColorForContrast(brandColorHex)
    console.log(`Final contrast-adjusted color: ${brandColorHex}`)

    // 3. Typography pairing JSON
    const TYPE_PAIRS: Record<string, { heading: string; body: string }> = {
      agro_earth: { heading: "DM Serif Display", body: "DM Sans" },
      corporate_trust: { heading: "Plus Jakarta Sans", body: "Inter" },
      bold_consumer: { heading: "Bricolage Grotesque", body: "DM Sans" },
      premium_luxury: { heading: "Fraunces", body: "Inter" },
      tech_minimal: { heading: "Space Grotesk", body: "Inter" },
    }
    const typographyJson = TYPE_PAIRS[archetypeCluster] || TYPE_PAIRS.tech_minimal

    // 4 & 5. Generate Logo and Values images in parallel
    console.log("Generating logo and values images in parallel...")
    
    // Prepare values data
    const valuesList = (dna.brandCulture || []).slice(0, 3)
    
    // Construct grounded values prompts
    const valueTasks = [0, 1, 2].map((i) => {
      const val = valuesList[i]
      const valLabel = val ? val.value : `Value ${i + 1}`
      const valDesc = val ? val.description : "Our dedication to quality."
      
      const bizInfo = getBusinessCategoryAndSubject(
        answers.businessName || "",
        answers.coreOfferings || "",
        dna.oneThing || ""
      )
      const visualContext = ARCHETYPE_VISUALS[archetypeCluster] || ARCHETYPE_VISUALS.tech_minimal
      const photoPrompt = `${bizInfo.subject} — representing "${valLabel}" in the context of a ${bizInfo.category}, set in a ${visualContext.setting}, ${visualContext.lighting}, editorial photography, ${visualContext.style}`
      
      return { valLabel, prompt: photoPrompt }
    })

    // Construct logo prompt
    const brandNoun = dna.oneThing || brandColorHex
    const logoPrompt = `A simple, flat, geometric vector icon representing "${brandNoun}". Minimalist style, single accent color ${brandColorHex} on a white background, bold clean shapes, centered composition, modern app icon glyph.`

    // Execute logo + 3 values images generation in parallel!
    const [logoBufferResult, value1Buffer, value2Buffer, value3Buffer] = await Promise.all([
      generateLogoMark(logoPrompt, brandColorHex, dbSignup.email.split("@")[0]).catch(e => {
        console.error("Logo generation failed in Promise.all:", e)
        return null
      }),
      generateValuesImage(valueTasks[0].prompt, valueTasks[0].valLabel, brandColorHex, 0).catch(e => {
        console.error("Value 1 image generation failed in Promise.all:", e)
        return null
      }),
      generateValuesImage(valueTasks[1].prompt, valueTasks[1].valLabel, brandColorHex, 1).catch(e => {
        console.error("Value 2 image generation failed in Promise.all:", e)
        return null
      }),
      generateValuesImage(valueTasks[2].prompt, valueTasks[2].valLabel, brandColorHex, 2).catch(e => {
        console.error("Value 3 image generation failed in Promise.all:", e)
        return null
      })
    ])

    let logoUrl = ""
    let logoOnDarkUrl = ""
    let logoMonoUrl = ""
    
    if (logoBufferResult) {
      try {
        // Upload Primary Logo (now a transparent PNG after chroma-key removal)
        logoUrl = await uploadAsset(logoBufferResult, "logo.png", dbSignup.id)

        // Post-process: On Dark — composite transparent mark onto a black fill.
        // (We no longer use .negate() because it inverted the white background pixels too,
        //  not just the logo mark. Compositing over black gives a clean white-mark-on-dark result.)
        const onDarkBuffer = await sharp({
          create: { width: 512, height: 512, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 255 } }
        })
          .composite([{ input: logoBufferResult, blend: "over" }])
          .png()
          .toBuffer()
        logoOnDarkUrl = await uploadAsset(onDarkBuffer, "logo_ondark.png", dbSignup.id)

        // Post-process: Monochrome — grayscale works correctly on transparent PNG,
        // only desaturating the mark pixels while preserving transparent areas.
        const monoBuffer = await sharp(logoBufferResult)
          .grayscale()
          .png()
          .toBuffer()
        logoMonoUrl = await uploadAsset(monoBuffer, "logo_mono.png", dbSignup.id)
      } catch (logoError) {
        console.error("Logo processing/upload failed:", logoError)
      }
    }

    const imageryUrls: string[] = []
    const valueBuffers = [value1Buffer, value2Buffer, value3Buffer]
    for (let i = 0; i < 3; i++) {
      const buffer = valueBuffers[i]
      if (buffer) {
        try {
          const uploadedUrl = await uploadAsset(buffer, `value_${i + 1}.png`, dbSignup.id)
          imageryUrls.push(uploadedUrl)
        } catch (valImgError) {
          console.error(`Values image ${i} upload failed:`, valImgError)
        }
      }
    }

    // Generate Mockups: Create pending GeneratedMockup records for asynchronous processing
    const templates = await prisma.mockupTemplate.findMany({ where: { active: true } })
    
    const pickTemplate = (category: string) => {
      const candidates = templates.filter(t => t.category === category)
      if (candidates.length === 0) return null
      return candidates[dbSignup.id % candidates.length]
    }

    const apparelTemplate = pickTemplate("apparel")
    const toteTemplate = pickTemplate("apparel")
    const keychainTemplate = pickTemplate("physical")
    const billboardTemplate = pickTemplate("environment")
    const hangerTemplate = pickTemplate("physical")

    if (logoUrl) {
      console.log("Initializing GeneratedMockup pending records...")
      const mockupsToCreate = [
        { template: apparelTemplate },
        { template: toteTemplate },
        { template: keychainTemplate },
        { template: billboardTemplate },
        { template: hangerTemplate }
      ]

      for (const item of mockupsToCreate) {
        if (item.template) {
          await prisma.generatedMockup.upsert({
            where: {
              waitlistId_templateId_logoVersion: {
                waitlistId: dbSignup.id,
                templateId: item.template.templateId,
                logoVersion: logoUrl
              }
            },
            create: {
              waitlistId: dbSignup.id,
              templateId: item.template.templateId,
              logoVersion: logoUrl,
              status: "pending"
            },
            update: {
              status: "pending",
              resultUrl: null,
              errorMessage: null
            }
          })
        }
      }
    }

    const mockupUrls = {
      logoOnDark: logoOnDarkUrl,
      logoMono: logoMonoUrl,
      apparel: null,
      toteBag: null,
      keychain: null,
      billboard: null,
      doorHanger: null
    }

    // 6. Save results to Database
    await prisma.brandVisualIdentity.update({
      where: { waitlistId: dbSignup.id },
      data: {
        status: "COMPLETE",
        archetypeCluster,
        brandColorHex,
        typographyJson: typographyJson as any,
        logoUrl,
        imageryUrls,
        mockupUrls: mockupUrls as any,
      },
    })

    // 7. Dispatch Completion Email via Resend
    try {
      const brandName = (dbSignup.answersJson as any)?.businessName || "Your Brand"
      await sendCompletionEmail(dbSignup.email, dbSignup.id, brandName, brandColorHex)
    } catch (emailError) {
      console.error("Guidelines completion notification email failed to send:", emailError)
    }

    return NextResponse.json({ success: true, status: "COMPLETE" })
  } catch (error: any) {
    console.error("Background Process Visual Identity pipeline failed:", error)
    
    try {
      const body = await req.json().catch(() => ({}))
      if (body.waitlistId) {
        await prisma.brandVisualIdentity.update({
          where: { waitlistId: Number(body.waitlistId) },
          data: {
            status: "FAILED",
            failureReason: error.message || "Failed during pipeline generation."
          }
        })
      }
    } catch (dbErr) {
      console.error("Failed to mark visual identity as FAILED in DB:", dbErr)
    }

    return NextResponse.json({ success: false, error: error.message || "Generation pipeline failed." }, { status: 500 })
  }
}
