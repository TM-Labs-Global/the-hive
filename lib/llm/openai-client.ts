import OpenAI from "openai"
import sharp from "sharp"

const getAiClient = () => {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey || apiKey === "dummy_key_for_compilation") {
    return null
  }
  return new OpenAI({ apiKey })
}

/**
 * Removes near-white pixels (R > 240, G > 240, B > 240) by setting their alpha to 0,
 * producing a clean transparent PNG from a model-generated logo on a white background.
 */
async function removeWhiteBackground(buffer: Buffer): Promise<Buffer> {
  const { data, info } = await sharp(buffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const pixels = new Uint8ClampedArray(data.buffer)
  const { width, height, channels } = info // channels === 4 (RGBA)

  for (let i = 0; i < width * height; i++) {
    const offset = i * channels
    const r = pixels[offset]
    const g = pixels[offset + 1]
    const b = pixels[offset + 2]
    // Near-white threshold — catches pure white, off-white, and light grey backgrounds
    if (r > 240 && g > 240 && b > 240) {
      pixels[offset + 3] = 0 // Transparent
    }
  }

  return sharp(Buffer.from(pixels.buffer), {
    raw: { width, height, channels },
  })
    .png()
    .toBuffer()
}

export async function generateLogoMark(prompt: string, brandColor: string, brandName: string): Promise<Buffer> {
  const openai = getAiClient()
  if (!openai) {
    console.warn("OPENAI_API_KEY is not configured. Generating placeholder logo.")
    return generatePlaceholderLogo(brandName, brandColor)
  }

  try {
    console.log("Attempting logo generation via gpt-image-2...")
    // A0.1 — Guarantee a solid pure-white background so the chroma-key step is reliable
    const enhancedPrompt = prompt
      + ", flat vector graphic style, no text, no watermarks, no photorealistic details, no drop shadows, clean minimalist vector icon"
      + ", flat solid pure white background, no gradients in background, no background texture, no vignette"
    const response = await openai.images.generate({
      model: "gpt-image-2",
      prompt: enhancedPrompt,
      n: 1,
      size: "1024x1024",
    })

    const data = response.data?.[0]
    let buffer: Buffer

    if (data?.b64_json) {
      console.log("Using base64 image data from OpenAI response...")
      buffer = Buffer.from(data.b64_json, "base64")
    } else if (data?.url) {
      console.log(`Downloading generated logo from URL: ${data.url}`)
      const res = await fetch(data.url)
      if (!res.ok) {
        throw new Error(`Failed to download image from OpenAI URL (HTTP ${res.status})`)
      }
      const arrayBuffer = await res.arrayBuffer()
      buffer = Buffer.from(arrayBuffer)
    } else {
      throw new Error("No image data (b64_json or url) returned from OpenAI API")
    }

    // Resize to standard 512x512, then A0.2 — remove white background to produce transparent PNG
    const resized = await sharp(buffer).resize(512, 512).png().toBuffer()
    const transparent = await removeWhiteBackground(resized)
    console.log("Logo background removed — canonical transparent PNG ready.")
    return transparent
  } catch (error) {
    console.error("Failed to generate logo via OpenAI (gpt-image-2), falling back to placeholder:", error)
    return generatePlaceholderLogo(brandName, brandColor)
  }
}


export async function generateValuesImage(prompt: string, valueLabel: string, brandColor: string, index: number): Promise<Buffer> {
  const openai = getAiClient()
  if (!openai) {
    console.warn("OPENAI_API_KEY is not configured. Generating placeholder value image.")
    return generatePlaceholderValueImage(valueLabel, brandColor, index)
  }

  try {
    console.log(`Attempting value image ${index} generation via gpt-image-2...`)
    const enhancedPrompt = prompt + ", no visible text or watermarks, no generic corporate office backgrounds, natural editorial photography only"
    const response = await openai.images.generate({
      model: "gpt-image-2",
      prompt: enhancedPrompt,
      n: 1,
      size: "1024x1024",
    })

    const data = response.data?.[0]
    let buffer: Buffer

    if (data?.b64_json) {
      console.log("Using base64 image data from OpenAI response...")
      buffer = Buffer.from(data.b64_json, "base64")
    } else if (data?.url) {
      console.log(`Downloading generated values image from URL: ${data.url}`)
      const res = await fetch(data.url)
      if (!res.ok) {
        throw new Error(`Failed to download image from OpenAI URL (HTTP ${res.status})`)
      }
      const arrayBuffer = await res.arrayBuffer()
      buffer = Buffer.from(arrayBuffer)
    } else {
      throw new Error("No image data (b64_json or url) returned from OpenAI API")
    }

    return sharp(buffer).resize(800, 600, { fit: "cover" }).toBuffer()
  } catch (error) {
    console.error(`Failed to generate values image ${index} via OpenAI (gpt-image-2), falling back:`, error)
    return generatePlaceholderValueImage(valueLabel, brandColor, index)
  }
}

export async function generatePlaceholderLogo(brandName: string, brandColor: string): Promise<Buffer> {
  const initials = brandName
    .split(" ")
    .map((w) => w.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase()
  const svg = `
    <svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="transparent"/>
      <rect x="64" y="64" width="384" height="384" rx="96" fill="${brandColor}"/>
      <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-weight="900" font-size="144" fill="#ffffff">${initials}</text>
    </svg>
  `
  return sharp(Buffer.from(svg)).png().toBuffer()
}

export async function generatePlaceholderValueImage(valueLabel: string, brandColor: string, index: number): Promise<Buffer> {
  const gradients = [
    ["#1f1c2c", "#928dab"],
    ["#2c3e50", "#000000"],
    ["#0f2027", "#203a43", "#2c5364"]
  ]
  const grad = gradients[index % gradients.length]
  const svg = `
    <svg width="800" height="600" viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad-${index}" x1="0%" y1="0%" x2="100%" y2="100%">
          ${grad.map((color, idx) => `<stop offset="${(idx / (grad.length - 1)) * 100}%" stop-color="${color}"/>`).join("\n")}
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#grad-${index})"/>
      <circle cx="400" cy="300" r="150" fill="${brandColor}" opacity="0.45" />
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-weight="bold" font-size="48" fill="#ffffff" opacity="0.9">${valueLabel.toUpperCase()}</text>
    </svg>
  `
  return sharp(Buffer.from(svg)).png().toBuffer()
}
