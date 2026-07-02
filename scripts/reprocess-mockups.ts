import { PrismaClient } from "@prisma/client"
import { compositeMockup } from "../lib/visualIdentity/mockup-compositor"
import { uploadAsset } from "../lib/storage/client"

const prisma = new PrismaClient()

async function main() {
  console.log("=== STARTING RETROACTIVE MOCKUP COMPOSITING ===")

  const visualIdentities = await prisma.brandVisualIdentity.findMany({
    where: { status: "COMPLETE" },
    include: { waitlist: true }
  })

  console.log(`Found ${visualIdentities.length} completed visual identities.`)

  const templates = await prisma.mockupTemplate.findMany({
    where: { active: true }
  })

  console.log(`Found ${templates.length} active mockup templates in database.`)

  const pickTemplate = (category: string, waitlistId: number) => {
    const candidates = templates.filter((t) => t.category === category)
    if (candidates.length === 0) return null
    return candidates[waitlistId % candidates.length]
  }

  for (const vi of visualIdentities) {
    console.log(`\nProcessing Waitlist ID: ${vi.waitlistId} (${vi.waitlist.email})...`)
    const brandColor = vi.brandColorHex || "#18181B"
    const logoUrl = vi.logoUrl

    if (!logoUrl) {
      console.warn(`  [SKIP] No logoUrl found for waitlist ${vi.waitlistId}`)
      continue
    }

    let apparelUrl = null
    let toteBagUrl = null
    let keychainUrl = null
    let billboardUrl = null
    let doorHangerUrl = null

    // 1. Apparel
    const apparelTemplate = pickTemplate("apparel", vi.waitlistId)
    if (apparelTemplate) {
      try {
        console.log(`  Compositing apparel using template: ${apparelTemplate.templateId}...`)
        const buffer = await compositeMockup(apparelTemplate as any, logoUrl, brandColor)
        apparelUrl = await uploadAsset(buffer, "mockup_apparel.png", vi.waitlistId)
      } catch (err) {
        console.error(`  [ERROR] Apparel compositing failed:`, err)
      }
    }

    // 2. Tote Bag
    const toteTemplate = pickTemplate("apparel", vi.waitlistId + 1) // Offset by 1 to get variety
    if (toteTemplate) {
      try {
        console.log(`  Compositing tote bag using template: ${toteTemplate.templateId}...`)
        const buffer = await compositeMockup(toteTemplate as any, logoUrl, brandColor)
        toteBagUrl = await uploadAsset(buffer, "mockup_totebag.png", vi.waitlistId)
      } catch (err) {
        console.error(`  [ERROR] Tote bag compositing failed:`, err)
      }
    }

    // 3. Keychain
    const keychainTemplate = pickTemplate("physical", vi.waitlistId)
    if (keychainTemplate) {
      try {
        console.log(`  Compositing keychain using template: ${keychainTemplate.templateId}...`)
        const buffer = await compositeMockup(keychainTemplate as any, logoUrl, brandColor)
        keychainUrl = await uploadAsset(buffer, "mockup_keychain.png", vi.waitlistId)
      } catch (err) {
        console.error(`  [ERROR] Keychain compositing failed:`, err)
      }
    }

    // 4. Billboard
    const billboardTemplate = pickTemplate("environment", vi.waitlistId)
    if (billboardTemplate) {
      try {
        console.log(`  Compositing billboard using template: ${billboardTemplate.templateId}...`)
        const buffer = await compositeMockup(billboardTemplate as any, logoUrl, brandColor)
        billboardUrl = await uploadAsset(buffer, "mockup_billboard.png", vi.waitlistId)
      } catch (err) {
        console.error(`  [ERROR] Billboard compositing failed:`, err)
      }
    }

    // 5. Door Hanger
    const hangerTemplate = pickTemplate("physical", vi.waitlistId + 1) // Offset by 1 to get variety
    if (hangerTemplate) {
      try {
        console.log(`  Compositing door hanger using template: ${hangerTemplate.templateId}...`)
        const buffer = await compositeMockup(hangerTemplate as any, logoUrl, brandColor)
        doorHangerUrl = await uploadAsset(buffer, "mockup_doorhanger.png", vi.waitlistId)
      } catch (err) {
        console.error(`  [ERROR] Door hanger compositing failed:`, err)
      }
    }

    // Prepare updated mockupUrls JSON
    const currentMockups = (vi.mockupUrls as Record<string, any>) || {}
    const updatedMockups = {
      ...currentMockups,
      apparel: apparelUrl || currentMockups.apparel,
      toteBag: toteBagUrl || currentMockups.toteBag,
      keychain: keychainUrl || currentMockups.keychain,
      billboard: billboardUrl || currentMockups.billboard,
      doorHanger: doorHangerUrl || currentMockups.doorHanger,
    }

    await prisma.brandVisualIdentity.update({
      where: { id: vi.id },
      data: { mockupUrls: updatedMockups as any }
    })

    console.log(`  [SUCCESS] Mockup URLs updated for waitlist ${vi.waitlistId}`)
  }

  console.log("\n=== MOCKUP REPROCESSING COMPLETED SUCCESSFULLY ===")
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
