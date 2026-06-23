import { JSDOM } from "jsdom"
import { Readability } from "@mozilla/readability"
import { Extractor, ExtractorResult } from "./types"
import { InputType } from "@prisma/client"

export class WebsiteExtractor implements Extractor {
  canHandle(input: string): boolean {
    try {
      const url = new URL(input.startsWith("http") ? input : `https://${input}`)
      return url.protocol === "http:" || url.protocol === "https:"
    } catch {
      return false
    }
  }

  async extract(input: string): Promise<ExtractorResult> {
    let urlString = input.trim()
    if (!/^https?:\/\//i.test(urlString)) {
      urlString = "https://" + urlString
    }

    try {
      const response = await fetch(urlString, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch website (HTTP ${response.status})`)
      }

      const html = await response.text()
      const dom = new JSDOM(html, { url: urlString })
      const doc = dom.window.document

      // Extract readability content
      const reader = new Readability(doc)
      const article = reader.parse()

      if (!article || !article.textContent) {
        // Fallback to custom paragraph / text aggregation if Readability fails
        const textElements = Array.from(doc.querySelectorAll("p, h1, h2, h3, h4, li"))
          .map((el) => el.textContent?.trim() ?? "")
          .filter((t) => t.length > 0)

        const joined = textElements.join("\n")
        if (joined.length < 100) {
          throw new Error("Unable to extract sufficient text content from this website.")
        }

        return {
          rawText: joined,
          sourceType: InputType.WEBSITE,
          sourceUrl: urlString,
        }
      }

      const cleanText = `${article.title ?? ""}\n\n${article.textContent.trim()}`
      if (cleanText.replace(/\s+/g, "").length < 100) {
        throw new Error("Extracted website content is too short to generate Brand DNA.")
      }

      return {
        rawText: cleanText,
        sourceType: InputType.WEBSITE,
        sourceUrl: urlString,
      }
    } catch (error: any) {
      console.error("Website extraction error:", error)
      throw new Error(error.message || "Failed to parse website content. Please ensure it is a valid, public URL.")
    }
  }
}
