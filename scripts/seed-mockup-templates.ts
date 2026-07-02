/**
 * Seed script: reads mockup-source-manifest.json (local) and upserts MockupTemplate rows.
 *
 * Usage:
 *   npx tsx scripts/seed-mockup-templates.ts
 *
 * Safety rules (hard-coded, not configurable via manifest):
 * - requiresDisplacement:true  → forced active:false, seeded without error, logged as [DEFERRED]
 * - baseFile:null              → skipped entirely, logged as [SKIP:MISSING_FILE]
 * - categoryNeedsReview:true  → skipped entirely, logged as [SKIP:CATEGORY_NEEDS_REVIEW]
 * - active field in manifest  → IGNORED; all rows are seeded as active:false.
 *   Only El-Roy manually flips active:true after Photopea-verified quad data is confirmed.
 */

import * as fs from "fs"
import * as path from "path"
import { put } from "@vercel/blob"
import { Prisma, PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

interface ManifestEntry {
  templateId: string
  category: string
  categoryNeedsReview?: boolean
  categoryNote?: string
  baseFile: string | null
  overlayFile: string | null
  sourceDimensions: [number, number] | null
  logoZone: {
    topLeft: { x: number; y: number }
    topRight: { x: number; y: number }
    bottomRight: { x: number; y: number }
    bottomLeft: { x: number; y: number }
  } | null
  blendMode: string
  layerOpacity: number
  layerFill: number
  requiresDisplacement: boolean
  provenance: string
  provenanceNote?: string
  active: boolean // informational only — seed script ignores this, always seeds as active:false
}
const VALID_CATEGORIES = new Set(["apparel", "stationery", "digital", "physical", "environment"])
const BLOB_PREFIX = "mockup-templates"
const MANIFEST_PATH = path.join(process.cwd(), "mockup-source-manifest.json")
const TEMPLATE_DIR = path.join(process.cwd(), "public", "mockup-templates")

const COMPOSITE_PROMPTS: Record<string, string> = {
  "paper-bag-pavement-active": "Place this logo centered on the paper shopping bag's front panel, matching its paper texture, perspective angle, lighting, and shadows. Do not change the background or anything else in the image.",
  "fabric-tote-bag-shadows-active": "Place this logo centered on the fabric front of the tote bag, following the fabric's folds, creases, texture, and shadows. Do not change the background or anything else.",
  "tote-bag-with-people-active": "Place this logo centered on the tote bag's front panel, matching the fabric folds, creases, lighting, and perspective. Do not change the person or background.",
  "hoodie-neck-label-active": "Place this logo centered on the fabric neck label inside the hoodie collar, matching the woven fabric texture, shadows, and perspective.",
  "ios-app-icon-iphone17-active": "Place this logo centered on the app icon tile on the phone screen. Place the logo mark cleanly, matching the screen reflection and light highlights.",
  "retro-tv-screen-active": "Place this logo centered on the retro television screen, matching the glass curvature, phosphor scanlines, reflections, and glow.",
  "coffee-drip-pouch-active": "Place this logo centered on the coffee pouch front label, matching the paper texture, plastic folds, shadows, and perspective.",
  "billboard_urban_a": "Place this logo centered on the large city billboard screen, matching the perspective angle, ambient city lighting, shadows, and outdoor texture."
}

// Recursively find all files in public/mockup-templates
function getAllFiles(dir: string): string[] {
  const results: string[] = []
  if (!fs.existsSync(dir)) return results
  const list = fs.readdirSync(dir)
  list.forEach((file) => {
    const filePath = path.join(dir, file)
    const stat = fs.statSync(filePath)
    if (stat && stat.isDirectory()) {
      results.push(...getAllFiles(filePath))
    } else {
      results.push(filePath)
    }
  })
  return results
}

// Normalize strings for matching
function normalizeName(filename: string): string {
  return filename
    .toLowerCase()
    .replace(/^0\d+[-_]/, "") // remove leading numbers like 01_ or 01-
    .replace(/[^a-z0-9.]/g, "-") // replace non-alphanumeric with hyphen
    .replace(/-+/g, "-") // collapse multiple hyphens
}

// Build map of normalized filename -> absolute path
const localFilesMap: Record<string, string> = {}
const allLocalFiles = getAllFiles(TEMPLATE_DIR)
allLocalFiles.forEach((p) => {
  const norm = normalizeName(path.basename(p))
  localFilesMap[norm] = p
})

async function uploadFile(filePath: string, category: string): Promise<string> {
  const baseName = path.basename(filePath)
  const norm = normalizeName(baseName)
  const actualLocalPath = localFilesMap[norm]

  if (!actualLocalPath) {
    throw new Error(`File ${baseName} (normalized: ${norm}) not found recursively in ${TEMPLATE_DIR}`)
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN
  if (!token || token === "dummy_token") {
    // Local storage fallback: resolve relative to public/
    const relativePath = path.relative(path.join(process.cwd(), "public"), actualLocalPath)
    console.log(`    [LOCAL FALLBACK] Using relative path for ${baseName}: /${relativePath}`)
    return `/${relativePath}`
  }

  const blobPath = `${BLOB_PREFIX}/${category}/${baseName}`
  const buffer = fs.readFileSync(actualLocalPath)
  const blob = await put(blobPath, buffer, {
    access: "public",
    contentType: "image/png",
    addRandomSuffix: false,
    token,
  })
  return blob.url
}

async function run() {
  if (!fs.existsSync(MANIFEST_PATH)) {
    console.error(`[ERROR] Manifest not found at: ${MANIFEST_PATH}`)
    process.exit(1)
  }

  const manifest: ManifestEntry[] = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf-8"))
  console.log(`\nReading ${manifest.length} entries from manifest...\n`)

  const counts = {
    seeded: 0,
    deferred: 0,
    skippedMissingFile: 0,
    skippedCategoryReview: 0,
    errors: 0,
  }

  for (const entry of manifest) {
    const prefix = `  [${entry.templateId}]`

    let category = entry.category
    
    // Resolve packaging category to physical
    if (category === "packaging") {
      category = "physical"
    }

    // --- Hard skip: category needs human decision before seeding ---
    if (entry.categoryNeedsReview && entry.category !== "packaging") {
      console.warn(`${prefix} [SKIP:CATEGORY_NEEDS_REVIEW] ${entry.categoryNote ?? ""}`)
      counts.skippedCategoryReview++
      continue
    }

    // --- Hard skip: invalid category enum ---
    if (!VALID_CATEGORIES.has(category)) {
      console.warn(`${prefix} [SKIP:INVALID_CATEGORY] "${category}" is not in the schema enum. Update manifest and re-run.`)
      counts.skippedCategoryReview++
      continue
    }

    // --- Hard skip: no source file ---
    if (!entry.baseFile) {
      console.warn(`${prefix} [SKIP:MISSING_FILE] baseFile is null. Upload the source image and re-run.`)
      counts.skippedMissingFile++
      continue
    }

    const compositePrompt = COMPOSITE_PROMPTS[entry.templateId] || "Place this logo centered on the product surface, matching the texture, perspective, lighting, and shadows."

    // --- Deferred: displacement template ---
    if (entry.requiresDisplacement) {
      try {
        const baseImageUrl = await uploadFile(entry.baseFile, category)
        await prisma.mockupTemplate.upsert({
          where: { templateId: entry.templateId },
          create: {
            templateId: entry.templateId,
            category,
            baseImageUrl,
            overlayImageUrl: null,
            logoZoneJson: Prisma.JsonNull,
            blendMode: entry.blendMode,
            layerOpacity: entry.layerOpacity,
            layerFill: entry.layerFill,
            compositePrompt,
            active: false, // forced inactive because of displacement
          },
          update: {
            category,
            baseImageUrl,
            compositePrompt,
            active: false,
          },
        })
        console.log(`${prefix} [DEFERRED] Seeded inactive (requiresDisplacement=true).`)
        counts.deferred++
      } catch (err) {
        console.error(`${prefix} [ERROR] Failed to seed deferred template:`, err)
        counts.errors++
      }
      continue
    }

    // --- Standard seed ---
    try {
      const baseImageUrl = await uploadFile(entry.baseFile, category)

      let overlayImageUrl: string | null = null
      if (entry.overlayFile) {
        overlayImageUrl = await uploadFile(entry.overlayFile, category)
      }

      await prisma.mockupTemplate.upsert({
        where: { templateId: entry.templateId },
        create: {
          templateId: entry.templateId,
          category,
          baseImageUrl,
          overlayImageUrl,
          logoZoneJson: (entry.logoZone ?? Prisma.JsonNull) as Prisma.InputJsonValue,
          blendMode: entry.blendMode,
          layerOpacity: entry.layerOpacity,
          layerFill: entry.layerFill,
          compositePrompt,
          active: true, // Seed as active now that we want to use them!
        },
        update: {
          category,
          baseImageUrl,
          overlayImageUrl,
          logoZoneJson: (entry.logoZone ?? Prisma.JsonNull) as Prisma.InputJsonValue,
          blendMode: entry.blendMode,
          layerOpacity: entry.layerOpacity,
          layerFill: entry.layerFill,
          compositePrompt,
          active: true,
        },
      })
      console.log(`${prefix} [SEEDED] active=true, blendMode=${entry.blendMode}`)
      counts.seeded++
    } catch (err) {
      console.error(`${prefix} [ERROR]`, err)
      counts.errors++
    }
  }

  console.log(`
──────────────────────────────────────────────
 Seed summary
──────────────────────────────────────────────
 Seeded (inactive, awaiting verification) : ${counts.seeded}
 Deferred (requiresDisplacement=true)     : ${counts.deferred}
 Skipped — missing base file              : ${counts.skippedMissingFile}
 Skipped — category needs human review    : ${counts.skippedCategoryReview}
 Errors                                   : ${counts.errors}
──────────────────────────────────────────────
 ⚠️  All seeded rows are active=false.
 Flip active=true only after El-Roy has verified
 quad coordinates via Photopea Free Transform.
──────────────────────────────────────────────
`)

  await prisma.$disconnect()
}

run().catch(async (e) => {
  console.error(e)
  await prisma.$disconnect()
  process.exit(1)
})
