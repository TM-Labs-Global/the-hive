import { GoogleGenAI } from "@google/genai"
import sharp from "sharp"

const getAiClient = () => {
  const apiKey = process.env.GOOGLE_API_KEY
  if (!apiKey || apiKey === "dummy_key_for_compilation") {
    return null
  }
  return new GoogleGenAI({ apiKey })
}

export async function generateLogoMark(prompt: string, brandColor: string, brandName: string): Promise<Buffer> {
  const ai = getAiClient()
  if (!ai) {
    console.warn("GOOGLE_API_KEY is not configured. Generating placeholder logo.")
    return generatePlaceholderLogo(brandName, brandColor)
  }

  try {
    const response = await ai.models.generateImages({
      model: "imagen-3.0-generate-002",
      prompt,
      config: {
        numberOfImages: 1,
        aspectRatio: "1:1",
        outputMimeType: "image/png",
      },
    })

    const base64 = response.generatedImages?.[0]?.image?.imageBytes
    if (!base64) {
      throw new Error("No image data returned from Imagen")
    }

    return Buffer.from(base64, "base64")
  } catch (error) {
    console.error("Failed to generate logo via Imagen, falling back to placeholder:", error)
    return generatePlaceholderLogo(brandName, brandColor)
  }
}

export async function generateValuesImage(prompt: string, valueLabel: string, brandColor: string, index: number): Promise<Buffer> {
  const ai = getAiClient()
  if (!ai) {
    console.warn("GOOGLE_API_KEY is not configured. Generating placeholder value image.")
    return generatePlaceholderValueImage(valueLabel, brandColor, index)
  }

  try {
    const response = await ai.models.generateImages({
      model: "imagen-3.0-generate-002",
      prompt,
      config: {
        numberOfImages: 1,
        aspectRatio: "4:3",
        outputMimeType: "image/png",
      },
    })

    const base64 = response.generatedImages?.[0]?.image?.imageBytes
    if (!base64) {
      throw new Error("No image data returned from Imagen")
    }

    return Buffer.from(base64, "base64")
  } catch (error) {
    console.error(`Failed to generate values image ${index} via Imagen, falling back:`, error)
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
