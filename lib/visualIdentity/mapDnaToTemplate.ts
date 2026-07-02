import { BrandDNA } from "@/types/brand-dna"

export interface VisualIdentityContent {
  brandName: string
  aboutUs: string
  mission: string
  vision: string
  values: { label: string; description: string }[]
  slogan: string
  toneWords: string[]
}

export function mapDnaToTemplate(dna: BrandDNA, inferredBrandName?: string): VisualIdentityContent {
  // Extract values: exactly 3. BrandDNA has brandCulture which is { value: string; description: string }[]
  const values = (dna.brandCulture || []).slice(0, 3).map((item) => ({
    label: item.value,
    description: item.description,
  }))

  // Ensure we have exactly 3 values by padding if necessary
  while (values.length < 3) {
    values.push({
      label: `Core Value ${values.length + 1}`,
      description: "Representing our dedication to providing exceptional outcomes.",
    })
  }

  // Tone words: up to 3
  const toneWords = dna.toneAttributes || []

  return {
    brandName: inferredBrandName || "Your Brand",
    aboutUs: dna.brandVoiceText || "We build premium and tailored experiences designed to elevate operations.",
    mission: dna.brandMission || "To provide reliable, state of the art tools that drive impact.",
    vision: dna.brandVision || "A future where every initiative operates at peak efficiency.",
    values,
    slogan: dna.tagline || dna.oneThing || "Forward Together",
    toneWords: toneWords.slice(0, 3),
  }
}
