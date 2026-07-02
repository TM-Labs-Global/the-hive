import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/client"
import OpenAI from "openai"
import { generateLogoMark, generateValuesImage, generatePlaceholderLogo } from "@/lib/llm/openai-client"
import { uploadAsset } from "@/lib/storage/client"
import { sendCompletionEmail } from "@/lib/email/client"
import sharp from "sharp"

export const maxDuration = 60 // Allow up to 60 seconds on Vercel Pro

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

    // --- INCREMENTAL PIPELINE STEP RUNNER ---
    // If the visual identity is in a queued or generating state, we process exactly ONE task
    // and return the updated status. This acts as a reliable distributed task runner triggered by client polling!
    if (visualIdentity.status === "QUEUED") {
      try {
        console.log(`[PIPELINE STEP 1] Initializing style configs & logo generation for waitlistId: ${waitlistId}`)
        
        const dbSignup = await prisma.waitlistSignup.findUnique({
          where: { id: waitlistId }
        })
        if (!dbSignup || !dbSignup.dnaJson) {
          throw new Error("No Brand DNA found for waitlist signup.")
        }
        
        const dna = dbSignup.dnaJson as any
        const answers = (dbSignup.answersJson as any) || {}
        
        // 1. Classify Archetype (fast DeepSeek call)
        let archetypeCluster = visualIdentity.archetypeCluster
        if (!archetypeCluster) {
          const deepseek = new OpenAI({
            apiKey: process.env.DEEPSEEK_API_KEY || "dummy_key_for_compilation",
            baseURL: "https://api.deepseek.com",
          })
          
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
        }

        // 2. Select Brand Color
        let brandColorHex = visualIdentity.brandColorHex || ""
        if (!brandColorHex) {
          const deepseek = new OpenAI({
            apiKey: process.env.DEEPSEEK_API_KEY || "dummy_key_for_compilation",
            baseURL: "https://api.deepseek.com",
          })
          
          const colorPrompt = `You are a Professional Brand Designer. Given the archetype cluster "${archetypeCluster}" and these personality traits: "${dna.brandPersonality?.map((p: any) => p.trait).join(", ") || ""}", generate exactly one primary brand color matching these guidelines. Return JSON: { "hex": "#HEXCODE" }.`
          
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
        }

        // 3. Typography pairing
        const TYPE_PAIRS: Record<string, { heading: string; body: string }> = {
          agro_earth: { heading: "DM Serif Display", body: "DM Sans" },
          corporate_trust: { heading: "Plus Jakarta Sans", body: "Inter" },
          bold_consumer: { heading: "Bricolage Grotesque", body: "DM Sans" },
          premium_luxury: { heading: "Fraunces", body: "Inter" },
          tech_minimal: { heading: "Space Grotesk", body: "Inter" },
        }
        const typographyJson = visualIdentity.typographyJson || TYPE_PAIRS[archetypeCluster] || TYPE_PAIRS.tech_minimal

        // 4. Logo Url resolution (generate fallback if not custom uploaded)
        let logoUrl = visualIdentity.logoUrl
        if (!logoUrl) {
          console.log(`[PIPELINE STEP 1] Generating default primary logo mark...`)
          const brandNoun = dna.oneThing || brandColorHex
          const logoPrompt = `A simple, flat, geometric vector icon representing "${brandNoun}". Minimalist style, single accent color ${brandColorHex} on a white background, bold clean shapes, centered composition, modern app icon glyph.`
          const genLogoBuffer = await generateLogoMark(logoPrompt, brandColorHex, dbSignup.email.split("@")[0])
          logoUrl = await uploadAsset(genLogoBuffer, "logo.png", dbSignup.id)
        }

        // Save progress and transition to GENERATING
        const updatedVI = await prisma.brandVisualIdentity.update({
          where: { waitlistId },
          data: {
            status: "GENERATING",
            archetypeCluster,
            brandColorHex,
            typographyJson: typographyJson as any,
            logoUrl
          }
        })

        return NextResponse.json({
          success: true,
          status: "GENERATING",
          progress: 0.2 // 20% complete
        })
      } catch (err: any) {
        console.error(`[PIPELINE STEP 1 ERROR]:`, err)
        await prisma.brandVisualIdentity.update({
          where: { waitlistId },
          data: { status: "FAILED", failureReason: err.message || "Failed initializing configs." }
        })
        return NextResponse.json({ success: true, status: "FAILED", failureReason: err.message })
      }
    }

    if (visualIdentity.status === "GENERATING") {
      const dbSignup = await prisma.waitlistSignup.findUnique({
        where: { id: waitlistId }
      })
      if (!dbSignup || !dbSignup.dnaJson) {
        throw new Error("No Brand DNA found for waitlist signup.")
      }
      
      const dna = dbSignup.dnaJson as any
      const answers = (dbSignup.answersJson as any) || {}
      const archetypeCluster = visualIdentity.archetypeCluster || "tech_minimal"
      const brandColorHex = visualIdentity.brandColorHex || "#18181b"
      
      const valuesList = (dna.brandCulture || []).slice(0, 3)
      const currentImagery = (visualIdentity.imageryUrls || []) as string[]

      // --- steps 2-4: Generate value images one by one ---
      if (currentImagery.length < 3) {
        const stepIndex = currentImagery.length
        try {
          console.log(`[PIPELINE STEP ${stepIndex + 2}] Generating Value Image ${stepIndex + 1} of 3 for waitlistId: ${waitlistId}`)
          
          const val = valuesList[stepIndex]
          const valLabel = val ? val.value : `Value ${stepIndex + 1}`
          const bizInfo = getBusinessCategoryAndSubject(
            answers.businessName || "",
            answers.coreOfferings || "",
            dna.oneThing || ""
          )
          const visualContext = ARCHETYPE_VISUALS[archetypeCluster] || ARCHETYPE_VISUALS.tech_minimal
          const photoPrompt = `${bizInfo.subject} — representing "${valLabel}" in the context of a ${bizInfo.category}, set in a ${visualContext.setting}, ${visualContext.lighting}, editorial photography, ${visualContext.style}`
          
          // Generate value image
          const valueBuffer = await generateValuesImage(photoPrompt, valLabel, brandColorHex, stepIndex)
          const uploadedUrl = await uploadAsset(valueBuffer, `value_${stepIndex + 1}.png`, waitlistId)
          
          const newImagery = [...currentImagery, uploadedUrl]
          await prisma.brandVisualIdentity.update({
            where: { waitlistId },
            data: { imageryUrls: newImagery }
          })

          return NextResponse.json({
            success: true,
            status: "GENERATING",
            progress: 0.2 + (0.2 * (stepIndex + 1)) // 40%, 60%, 80%
          })
        } catch (err: any) {
          console.error(`[PIPELINE STEP ${stepIndex + 2} ERROR]:`, err)
          await prisma.brandVisualIdentity.update({
            where: { waitlistId },
            data: { status: "FAILED", failureReason: err.message || `Failed value image ${stepIndex + 1} generation.` }
          })
          return NextResponse.json({ success: true, status: "FAILED", failureReason: err.message })
        }
      }

      // --- step 5: Final logo post-processing & Mockups creation ---
      if (currentImagery.length === 3) {
        try {
          console.log(`[PIPELINE STEP 5] Performing final logo processing and mockup queueing for waitlistId: ${waitlistId}`)
          
          let logoUrl = visualIdentity.logoUrl
          let logoBufferResult: Buffer | null = null

          const host = req.headers.get("host")
          const protocol = host?.includes("localhost") ? "http" : "https"
          const appUrl = host ? `${protocol}://${host}` : (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000")

          if (logoUrl) {
            try {
              const fullLogoUrl = logoUrl.startsWith("http") ? logoUrl : `${appUrl}${logoUrl}`
              const res = await fetch(fullLogoUrl)
              if (res.ok) {
                logoBufferResult = Buffer.from(await res.arrayBuffer())
              }
            } catch (err) {
              console.error("[PIPELINE STEP 5] Failed downloading logo buffer:", err)
            }
          }

          // If no logo buffer, generate a fast fallback
          if (!logoBufferResult) {
            console.log("[PIPELINE STEP 5] Generating fallback logo buffer...")
            logoBufferResult = await generatePlaceholderLogo(answers.businessName || "Brand", brandColorHex)
          }

          let logoOnDarkUrl = ""
          let logoMonoUrl = ""

          // Create onDark and monochrome variations
          try {
            const onDarkBuffer = await sharp({
              create: { width: 512, height: 512, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 255 } }
            })
              .composite([{ input: logoBufferResult, blend: "over" }])
              .png()
              .toBuffer()
            logoOnDarkUrl = await uploadAsset(onDarkBuffer, "logo_ondark.png", waitlistId)

            const monoBuffer = await sharp(logoBufferResult)
              .grayscale()
              .png()
              .toBuffer()
            logoMonoUrl = await uploadAsset(monoBuffer, "logo_mono.png", waitlistId)
          } catch (logoErr) {
            console.warn("[sharp] logo post-processing failed, using fallback URLs:", logoErr)
            logoOnDarkUrl = logoUrl || ""
            logoMonoUrl = logoUrl || ""
          }

          // Queue GeneratedMockup tasks
          const templates = await prisma.mockupTemplate.findMany({ where: { active: true } })
          const pickTemplate = (category: string) => {
            const candidates = templates.filter(t => t.category === category)
            if (candidates.length === 0) return null
            return candidates[waitlistId % candidates.length]
          }

          const apparelTemplate = pickTemplate("apparel")
          const toteTemplate = pickTemplate("apparel")
          const keychainTemplate = pickTemplate("physical")
          const billboardTemplate = pickTemplate("environment")
          const hangerTemplate = pickTemplate("physical")

          const mockupsToCreate = [
            { template: apparelTemplate },
            { template: toteTemplate },
            { template: keychainTemplate },
            { template: billboardTemplate },
            { template: hangerTemplate }
          ]

          if (logoUrl) {
            for (const item of mockupsToCreate) {
              if (item.template) {
                await prisma.generatedMockup.upsert({
                  where: {
                    waitlistId_templateId_logoVersion: {
                      waitlistId,
                      templateId: item.template.templateId,
                      logoVersion: logoUrl
                    }
                  },
                  create: {
                    waitlistId,
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

          // Save complete and transition to COMPLETE
          await prisma.brandVisualIdentity.update({
            where: { waitlistId },
            data: {
              status: "COMPLETE",
              mockupUrls: mockupUrls as any
            }
          })

          // Asynchronously dispatch completion email (non-blocking)
          try {
            const brandName = answers.businessName || "Your Brand"
            await sendCompletionEmail(dbSignup.email, waitlistId, brandName, brandColorHex)
          } catch (emailError) {
            console.error("Completion email failed:", emailError)
          }

          return NextResponse.json({
            success: true,
            status: "COMPLETE",
            progress: 1.0 // 100% complete
          })
        } catch (err: any) {
          console.error(`[PIPELINE STEP 5 ERROR]:`, err)
          await prisma.brandVisualIdentity.update({
            where: { waitlistId },
            data: { status: "FAILED", failureReason: err.message || "Failed post-processing / mockup initialization." }
          })
          return NextResponse.json({ success: true, status: "FAILED", failureReason: err.message })
        }
      }
    }

    // Default status response
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

    const body = await req.json().catch(() => ({}))
    const { logoUrl, brandColorHex, typographyJson } = body

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

    // Create or update the visual identity record in QUEUED status with chosen custom configurations
    // This resets the pipeline state (clears old imageryUrls so the step-by-step runner can re-process)
    await prisma.brandVisualIdentity.upsert({
      where: { waitlistId },
      create: {
        waitlistId,
        status: "QUEUED",
        logoUrl,
        brandColorHex,
        typographyJson: typographyJson || null,
        imageryUrls: []
      },
      update: {
        status: "QUEUED",
        logoUrl,
        brandColorHex,
        typographyJson: typographyJson || null,
        imageryUrls: []
      },
    })

    return NextResponse.json({ success: true, status: "QUEUED" }, { status: 202 })
  } catch (error: any) {
    console.error("POST Visual Identity Trigger Error:", error)
    return NextResponse.json({ success: false, error: error.message || "Failed to trigger generation" }, { status: 500 })
  }
}
