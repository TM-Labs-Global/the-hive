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
      const cleanText = cleanHtml(html)

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

function cleanHtml(html: string): string {
  // Remove script and style tags and their contents
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
  
  // Remove HTML comments
  text = text.replace(/<!--[\s\S]*?-->/g, "")
  
  // Replace block elements with newlines to preserve spacing
  text = text.replace(/<\/(p|div|h1|h2|h3|h4|h5|h6|li|tr)>/gi, "\n")
  
  // Strip all other HTML tags
  text = text.replace(/<[^>]+>/g, " ")
  
  // Decode common HTML entities
  text = text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    
  // Collapse whitespace
  text = text.replace(/[ \t]+/g, " ")
  text = text.replace(/\n\s*\n/g, "\n\n")
  
  return text.trim()
}
