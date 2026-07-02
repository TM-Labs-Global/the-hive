import { put } from "@vercel/blob"
import fs from "fs"
import path from "path"

export async function uploadAsset(
  buffer: Buffer,
  filename: string,
  waitlistId: number
): Promise<string> {
  const token = process.env.BLOB_READ_WRITE_TOKEN
  
  if (token && token !== "dummy_token") {
    try {
      console.log(`Uploading ${filename} to Vercel Blob...`)
      const blob = await put(`generated-guidelines/${waitlistId}/${filename}`, buffer, {
        access: "public",
        token,
      })
      return blob.url
    } catch (error) {
      console.error("Vercel Blob upload failed, falling back to local storage:", error)
    }
  }

  // Local storage fallback
  try {
    console.log(`Saving ${filename} locally...`)
    const targetDir = path.join(process.cwd(), "public", "generated-guidelines", String(waitlistId))
    fs.mkdirSync(targetDir, { recursive: true })
    const targetPath = path.join(targetDir, filename)
    fs.writeFileSync(targetPath, buffer)
    return `/generated-guidelines/${waitlistId}/${filename}`
  } catch (error) {
    console.error("Local file save failed:", error)
    throw new Error("Failed to store generated asset.")
  }
}
