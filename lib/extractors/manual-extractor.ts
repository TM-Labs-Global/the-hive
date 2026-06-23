import { Extractor, ExtractorResult } from "./types"
import { InputType } from "@prisma/client"

export class ManualExtractor implements Extractor {
  canHandle(input: string): boolean {
    return typeof input === "string" && input.trim().length > 0
  }

  async extract(input: string): Promise<ExtractorResult> {
    const text = input.trim()
    if (text.length < 10) {
      throw new Error("Brand description must be at least 10 characters.")
    }

    return {
      rawText: text,
      sourceType: InputType.MANUAL,
      sourceUrl: null,
    }
  }
}
