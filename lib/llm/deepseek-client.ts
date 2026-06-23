import OpenAI from "openai"
import { BrandDNA } from "@/types/brand-dna"
import { BRAND_DNA_SYSTEM_PROMPT } from "./brand-dna-prompt"

const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY || "dummy_key_for_compilation",
  baseURL: "https://api.deepseek.com",
})

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

  const parsed = JSON.parse(content)
  
  // Validate shape
  const requiredKeys: (keyof BrandDNA)[] = [
    "brandVoice",
    "tagline",
    "targetAudience",
    "coreValues",
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
