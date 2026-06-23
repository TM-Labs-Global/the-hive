import { Extractor } from "./types"
import { WebsiteExtractor } from "./website-extractor"
import { ManualExtractor } from "./manual-extractor"
import { InputType } from "@prisma/client"

export function resolveExtractor(inputType: InputType): Extractor {
  switch (inputType) {
    case InputType.WEBSITE:
      return new WebsiteExtractor()
    case InputType.MANUAL:
      return new ManualExtractor()
    default:
      throw new Error(`Unsupported input type: ${inputType}`)
  }
}
