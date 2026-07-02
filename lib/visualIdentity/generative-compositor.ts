import OpenAI, { toFile } from "openai"
import sharp from "sharp"
import { prisma } from "@/lib/db/client"
import { compositeMockup } from "./mockup-compositor"

const getAiClient = () => {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey || apiKey === "dummy_key_for_compilation") {
    return null
  }
  return new OpenAI({ apiKey })
}

interface PaddingInfo {
  left: number
  top: number
  originalWidth: number
  originalHeight: number
  maxDim: number
}

interface PaddedResult {
  buffer: Buffer
  padding: PaddingInfo
}

/**
 * Pads a buffer to a square shape with the specified background opacity
 */
async function padToSquare(buffer: Buffer, bgAlpha = 0): Promise<PaddedResult> {
  const meta = await sharp(buffer).metadata()
  const w = meta.width!
  const h = meta.height!
  const maxDim = Math.max(w, h)

  const left = Math.floor((maxDim - w) / 2)
  const top = Math.floor((maxDim - h) / 2)

  const padded = await sharp(buffer)
    .extend({
      top,
      bottom: maxDim - h - top,
      left,
      right: maxDim - w - left,
      background: { r: 0, g: 0, b: 0, alpha: bgAlpha },
    })
    .png()
    .toBuffer()

  return {
    buffer: padded,
    padding: { left, top, originalWidth: w, originalHeight: h, maxDim },
  }
}

async function fetchAsBuffer(url: string): Promise<Buffer> {
  if (url.startsWith("/")) {
    const fs = await import("fs")
    const path = await import("path")
    return fs.readFileSync(path.join(process.cwd(), "public", url))
  }
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Failed to fetch image from URL: ${url} (HTTP ${res.status})`)
  }
  const arrayBuffer = await res.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

/**
 * Generates a high-fidelity generative mockup by using OpenAI images.edit (inpainting).
 * Falls back to the deterministic sharp compositor if OpenAI calls fail.
 */
export async function generateMockupGeneratively(
  waitlistId: number,
  templateId: string,
  logoUrl: string,
  brandColorHex: string
): Promise<Buffer> {
  const openai = getAiClient()
  
  // Find mockup template
  const template = await prisma.mockupTemplate.findUnique({
    where: { templateId },
  })

  if (!template) {
    throw new Error(`Mockup template not found: ${templateId}`)
  }

  // Fallback check if OpenAI is not configured
  if (!openai) {
    console.warn(`[GENERATIVE COMPOSITOR] OpenAI API key not configured. Falling back to sharp compositor for template: ${templateId}`)
    return compositeMockup(template as any, logoUrl, brandColorHex)
  }

  try {
    console.log(`[GENERATIVE COMPOSITOR] Fetching base template assets for: ${templateId}`)
    const baseBuffer = await fetchAsBuffer(template.baseImageUrl)

    const baseMeta = await sharp(baseBuffer).metadata()
    const w = baseMeta.width!
    const h = baseMeta.height!

    // 1. Resolve quad coordinates (handle both new quad and old percentage format)
    let q: {
      topLeft: { x: number; y: number }
      topRight: { x: number; y: number }
      bottomRight: { x: number; y: number }
      bottomLeft: { x: number; y: number }
    }

    const zone = template.logoZoneJson as any
    if (zone && typeof zone === "object" && "xPct" in zone) {
      const left = Math.round(w * (zone.xPct / 100))
      const top = Math.round(h * (zone.yPct / 100))
      const width = Math.round(w * (zone.widthPct / 100))
      const height = width // Square approximation
      q = {
        topLeft: { x: left, y: top },
        topRight: { x: left + width, y: top },
        bottomRight: { x: left + width, y: top + height },
        bottomLeft: { x: left, y: top + height },
      }
    } else if (zone && typeof zone === "object" && "topLeft" in zone) {
      q = zone
    } else {
      throw new Error(`Template "${templateId}" has no valid logoZoneJson configuration.`)
    }

    // 2. Pre-composite logo onto the base image using existing sharp compositor
    console.log(`[GENERATIVE COMPOSITOR] Pre-compositing logo onto base using sharp...`)
    const preCompositeBuffer = await compositeMockup(template as any, logoUrl, brandColorHex)

    // 3. Create SVG cutout mask: transparent (alpha = 0) inside logo zone, opaque black (alpha = 255) elsewhere
    console.log(`[GENERATIVE COMPOSITOR] Generating transparent-hole polygon mask...`)
    const maskSvg = `
      <svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <mask id="hole">
            <rect width="100%" height="100%" fill="white" />
            <polygon points="${q.topLeft.x},${q.topLeft.y} ${q.topRight.x},${q.topRight.y} ${q.bottomRight.x},${q.bottomRight.y} ${q.bottomLeft.x},${q.bottomLeft.y}" fill="black" />
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="black" mask="url(#hole)" />
      </svg>
    `
    const maskBuffer = await sharp(Buffer.from(maskSvg)).png().toBuffer()

    // 4. Pad both pre-composite and mask to square (OpenAI constraint)
    console.log(`[GENERATIVE COMPOSITOR] Padding images to square aspect ratios...`)
    const paddedComposite = await padToSquare(preCompositeBuffer, 0)
    const paddedMask = await padToSquare(maskBuffer, 255) // pad mask with opaque black so padding isn't edited

    // 5. Resize to 1024x1024
    console.log(`[GENERATIVE COMPOSITOR] Resizing to 1024x1024 square...`)
    const finalImage = await sharp(paddedComposite.buffer).resize(1024, 1024).png().toBuffer()
    const finalMask = await sharp(paddedMask.buffer).resize(1024, 1024).png().toBuffer()

    // 6. Call OpenAI Image Edit API
    console.log(`[GENERATIVE COMPOSITOR] Calling OpenAI Images Edit API...`)
    const promptText = template.compositePrompt || "Blend this logo mark onto the product surface realistically."
    const model = process.env.MOCKUP_GENERATION_MODEL || "gpt-image-2"

    const response = await openai.images.edit({
      image: await toFile(finalImage, "image.png", { type: "image/png" }),
      mask: await toFile(finalMask, "mask.png", { type: "image/png" }),
      prompt: promptText,
      n: 1,
      size: "1024x1024",
      model: model,
    })

    const resultUrl = response.data?.[0]?.url
    if (!resultUrl) {
      throw new Error("OpenAI Images Edit API did not return an image URL.")
    }

    console.log(`[GENERATIVE COMPOSITOR] Downloading edited mockup from: ${resultUrl}`)
    const editRes = await fetch(resultUrl)
    if (!editRes.ok) throw new Error(`Failed to download edited image from OpenAI: ${editRes.status}`)
    const editBuffer = Buffer.from(await editRes.arrayBuffer())

    // 7. Crop the 1024x1024 output back to original aspect ratio
    console.log(`[GENERATIVE COMPOSITOR] Cropping web-optimized output back to original aspect ratio...`)
    const scale = 1024 / paddedComposite.padding.maxDim
    const extractLeft = Math.round(paddedComposite.padding.left * scale)
    const extractTop = Math.round(paddedComposite.padding.top * scale)
    const extractWidth = Math.round(paddedComposite.padding.originalWidth * scale)
    const extractHeight = Math.round(paddedComposite.padding.originalHeight * scale)

    const safeWidth = Math.min(extractWidth, 1024 - extractLeft)
    const safeHeight = Math.min(extractHeight, 1024 - extractTop)

    const cropped = await sharp(editBuffer)
      .extract({
        left: extractLeft,
        top: extractTop,
        width: safeWidth,
        height: safeHeight,
      })
      .png()
      .toBuffer()

    console.log(`[GENERATIVE COMPOSITOR] Mockup generation successfully completed.`)
    return cropped
  } catch (error) {
    console.error(`[GENERATIVE COMPOSITOR] Generative mockup generation failed:`, error)
    console.warn(`[GENERATIVE COMPOSITOR] Falling back to sharp compositor for: ${templateId}`)
    return compositeMockup(template as any, logoUrl, brandColorHex)
  }
}
