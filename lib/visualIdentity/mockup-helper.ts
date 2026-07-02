import crypto from "crypto"

/**
 * Computes a short version identifier for a logo URL to prevent unique key index overflow in PostgreSQL.
 * (PostgreSQL index row maximum size is 8191 bytes, so raw base64 data URIs will crash the index if used directly).
 */
export function getLogoVersion(logoUrl: string): string {
  if (!logoUrl) return "default"
  
  // If it's a base64 data URI, hash it to keep the unique key index small (64 chars)
  if (logoUrl.startsWith("data:")) {
    return crypto.createHash("sha256").update(logoUrl).digest("hex")
  }
  
  // If it's a long URL, hash it to be safe
  if (logoUrl.length > 100) {
    return crypto.createHash("sha256").update(logoUrl).digest("hex")
  }
  
  return logoUrl
}
