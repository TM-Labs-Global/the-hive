import sharp from "sharp"

// Quad-based logo zone — four pixel-coordinate corners relative to the base image's actual dimensions.
// Set by Photopea Free Transform readout during template authoring.
interface QuadLogoZone {
  topLeft: { x: number; y: number }
  topRight: { x: number; y: number }
  bottomRight: { x: number; y: number }
  bottomLeft: { x: number; y: number }
}

// Shape the Prisma MockupTemplate record that we receive from the DB.
// Only the fields the compositor actually uses are listed here.
interface CompositorTemplate {
  templateId: string
  category: string
  baseImageUrl: string
  overlayImageUrl?: string | null
  logoZoneJson: any // QuadLogoZone | null
  blendMode: string
  layerOpacity: number
  layerFill: number
  requiresDisplacement: boolean
  active: boolean
}

// Map the pipeline's blend mode strings → sharp composite blend option.
// sharp supports: over, multiply, screen, overlay, darken, lighten, colour-dodge,
//                 colour-burn, hard-light, soft-light, difference, exclusion, add.
// linear-burn is not natively supported; multiply is the closest available.
function resolveBlendMode(blendMode: string): string {
  const map: Record<string, string> = {
    "normal": "over",
    "multiply": "multiply",
    "screen": "screen",
    "overlay": "overlay",
    "linear-burn": "multiply", // closest available in sharp
    "darken": "darken",
    "lighten": "lighten",
    "hard-light": "hard-light",
    "soft-light": "soft-light",
    "difference": "difference",
  }
  return map[blendMode] ?? "over"
}

async function fetchAsBuffer(url: string): Promise<Buffer> {
  if (url.startsWith("/")) {
    // Local dev path — read from public/
    const fs = await import("fs")
    const path = await import("path")
    return fs.readFileSync(path.join(process.cwd(), "public", url))
  }
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Failed to fetch image from URL: ${url} (HTTP ${res.status})`)
  }
  const arrayBuffer = await res.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

export async function compositeMockup(
  template: CompositorTemplate,
  logoUrl: string,
  brandColorHex: string
): Promise<Buffer> {
  // Gate: skip inactive templates and deferred displacement-map templates.
  if (!template.active || template.requiresDisplacement) {
    throw new Error(
      `Template "${template.templateId}" is not compositable: active=${template.active}, requiresDisplacement=${template.requiresDisplacement}`
    )
  }

  // Gate: skip templates with no logo zone (should only be displacement ones, but be safe).
  if (!template.logoZoneJson) {
    throw new Error(`Template "${template.templateId}" has no logoZoneJson — cannot composite.`)
  }

  const baseBuffer = await fetchAsBuffer(template.baseImageUrl)
  const rawLogoBuffer = await fetchAsBuffer(logoUrl)

  const base = sharp(baseBuffer)
  const meta = await base.metadata()
  const baseWidth = meta.width!
  const baseHeight = meta.height!

  // --- Logo sizing from quad bounding box or old percentage format ---
  let left: number
  let top: number
  let boxWidth: number
  let boxHeight: number

  const zone = template.logoZoneJson as any
  if (zone && typeof zone === "object" && "xPct" in zone) {
    // Old format: percentage-based positioning
    boxWidth = Math.round(baseWidth * (zone.widthPct / 100))
    const logoMeta = await sharp(rawLogoBuffer).metadata()
    const aspect = (logoMeta.height || 1) / (logoMeta.width || 1)
    boxHeight = Math.round(boxWidth * aspect)
    left = Math.round(baseWidth * (zone.xPct / 100))
    top = Math.round(baseHeight * (zone.yPct / 100))
  } else {
    // New format: 4-corner perspective quad (pixel coordinates)
    const qZone = zone as QuadLogoZone
    const xs = [qZone.topLeft.x, qZone.topRight.x, qZone.bottomRight.x, qZone.bottomLeft.x]
    const ys = [qZone.topLeft.y, qZone.topRight.y, qZone.bottomRight.y, qZone.bottomLeft.y]
    left = Math.round(Math.min(...xs))
    top = Math.round(Math.min(...ys))
    boxWidth = Math.round(Math.max(...xs) - Math.min(...xs))
    boxHeight = Math.round(Math.max(...ys) - Math.min(...ys))
  }

  // --- Apply layerOpacity and layerFill as a combined alpha multiplier ---
  // Photopea's effective alpha = Opacity * (Fill / 100) for blended layers.
  // For non-multiply modes, opacity alone is sufficient; Fill affects the layer pre-blend.
  // We apply the combined factor as a flat alpha multiplier on the logo buffer.
  const effectiveAlpha = Math.round((template.layerOpacity / 100) * (template.layerFill / 100) * 255)

  let logoResized = await sharp(rawLogoBuffer)
    .resize(boxWidth, boxHeight, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer()

  // Apply alpha if less than full opacity
  if (effectiveAlpha < 255) {
    logoResized = await sharp(logoResized)
      .ensureAlpha()
      .composite([{
        input: Buffer.from([255, 255, 255, effectiveAlpha]),
        raw: { width: 1, height: 1, channels: 4 },
        tile: true,
        blend: "dest-in",
      }])
      .png()
      .toBuffer()
  }

  const blendMode = resolveBlendMode(template.blendMode)

  // --- Composite logo onto base ---
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const compositeOps: any[] = [
    {
      input: logoResized,
      left,
      top,
      blend: resolveBlendMode(template.blendMode),
    }
  ]

  // --- Overlay layer (shadow/reflection) composited ABOVE the logo at full opacity ---
  if (template.overlayImageUrl) {
    try {
      const overlayBuffer = await fetchAsBuffer(template.overlayImageUrl)
      const resizedOverlay = await sharp(overlayBuffer)
        .resize(baseWidth, baseHeight, { fit: "fill" })
        .png()
        .toBuffer()
      compositeOps.push({
        input: resizedOverlay,
        blend: "over",
      })
    } catch (overlayErr) {
      console.warn(`Overlay fetch failed for template "${template.templateId}", skipping:`, overlayErr)
    }
  }

  return base
    .composite(compositeOps)
    .png()
    .toBuffer()
}
