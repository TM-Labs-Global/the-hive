import OpenAI from "openai"
import { BrandDNA } from "@/types/brand-dna"
import { BRAND_DNA_SYSTEM_PROMPT } from "./brand-dna-prompt"
import { BRAND_DNA_PREFILL_SYSTEM_PROMPT } from "./brand-dna-prefill-prompt"
import { safeJsonParse } from "./json-parser"

const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY || "dummy_key_for_compilation",
  baseURL: "https://api.deepseek.com",
})

export async function generatePrefillData(rawText: string): Promise<Record<string, any>> {
  if (!process.env.DEEPSEEK_API_KEY) {
    throw new Error("DEEPSEEK_API_KEY is not configured in the environment variables.")
  }

  const completion = await deepseek.chat.completions.create({
    model: "deepseek-chat",
    messages: [
      { role: "system", content: BRAND_DNA_PREFILL_SYSTEM_PROMPT },
      { role: "user", content: rawText },
    ],
    response_format: { type: "json_object" },
  })

  const content = completion.choices[0].message.content
  if (!content) {
    throw new Error("Empty response received from DeepSeek API.")
  }

  return safeJsonParse<Record<string, any>>(content)
}

export async function generateBrandDNA(rawText: string): Promise<BrandDNA> {
  if (!process.env.DEEPSEEK_API_KEY) {
    throw new Error("DEEPSEEK_API_KEY is not configured in the environment variables.")
  }

  const completion = await deepseek.chat.completions.create({
    model: "deepseek-chat",
    messages: [
      { role: "system", content: BRAND_DNA_SYSTEM_PROMPT },
      { role: "user", content: rawText },
    ],
    response_format: { type: "json_object" },
  })

  const content = completion.choices[0].message.content
  if (!content) {
    throw new Error("Empty response received from DeepSeek API.")
  }

  const parsed = safeJsonParse<BrandDNA>(content)
  
  // Validate shape
  const requiredKeys: (keyof BrandDNA)[] = [
    "findings",
    "competitors",
    "aspirationalNeighbours",
    "differentiators",
    "targetSegments",
    "customerJourney",
    "brandOutlook",
    "strategicSteps",
    "oneThing",
    "brandPurpose",
    "brandPromise",
    "brandVision",
    "brandMission",
    "positioningStatement",
    "brandArchetype",
    "taglineOptions",
    "brandPersonality",
    "brandVoice",
    "brandCulture",
    "tagline",
    "brandVoiceText",
    "toneAttributes",
    "visualDirection",
    "doNotSay"
  ]

  for (const key of requiredKeys) {
    if (!(key in parsed)) {
      throw new Error(`Invalid response structure: missing key "${key}"`)
    }
  }

  return parsed as BrandDNA
}
