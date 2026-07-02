import { put } from "@vercel/blob"
import fs from "fs"
import path from "path"

/**
 * Upload a buffer as a named asset.
 *
 * Priority:
 *  1. Vercel Blob (if BLOB_READ_WRITE_TOKEN is set) → returns public HTTPS URL
 *  2. Local filesystem (dev only) → returns relative /generated-guidelines/… URL
 *  3. Base64 data URI → inline in DB, works everywhere with no external deps
 */
export async function uploadAsset(
  buffer: Buffer,
  filename: string,
  waitlistId: number
): Promise<string> {
  const token = process.env.BLOB_READ_WRITE_TOKEN

  // 1. Vercel Blob
  if (token && token !== "dummy_token") {
    try {
      console.log(`Uploading ${filename} to Vercel Blob...`)
      const blob = await put(`generated-guidelines/${waitlistId}/${filename}`, buffer, {
        access: "public",
        token,
      })
      console.log(`Vercel Blob upload success: ${blob.url}`)
      return blob.url
    } catch (error) {
      console.error("Vercel Blob upload failed, trying local storage:", error)
    }
  }

  // 2. Local filesystem (dev / writable containers only)
  if (process.env.NODE_ENV !== "production") {
    try {
      console.log(`Saving ${filename} locally...`)
      const targetDir = path.join(process.cwd(), "public", "generated-guidelines", String(waitlistId))
      fs.mkdirSync(targetDir, { recursive: true })
      const targetPath = path.join(targetDir, filename)
      fs.writeFileSync(targetPath, buffer)
      return `/generated-guidelines/${waitlistId}/${filename}`
    } catch (error) {
      console.error("Local file save failed, falling back to base64 data URI:", error)
    }
  }

  // 3. Base64 data URI — works on Vercel production with no external storage
  const ext = filename.split(".").pop()?.toLowerCase() || "png"
  const mime = ext === "svg" ? "image/svg+xml" : ext === "jpg" || ext === "jpeg" ? "image/jpeg" : "image/png"
  const b64 = buffer.toString("base64")
  console.log(`Storing ${filename} as base64 data URI (${Math.round(b64.length / 1024)}KB)`)
  return `data:${mime};base64,${b64}`
}
