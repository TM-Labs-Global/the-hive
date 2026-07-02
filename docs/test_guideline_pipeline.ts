import { PrismaClient } from "@prisma/client"
import OpenAI from "openai"
import { generateLogoMark, generateValuesImage } from "../lib/llm/openai-client"
import { uploadAsset } from "../lib/storage/client"
import { compositeMockup } from "../lib/visualIdentity/mockup-compositor"

const prisma = new PrismaClient()

async function testPipeline() {
  console.log("=== STARTING BRAND GUIDELINE GENERATOR PIPELINE TEST ===")

  // 1. Find or create a dummy waitlist record
  let signup = await prisma.waitlistSignup.findFirst({
    where: { status: "DONE" },
    orderBy: { id: "desc" }
  })

  if (!signup) {
    console.log("No completed waitlist signups found. Creating a dummy WaitlistSignup...")
    signup = await prisma.waitlistSignup.create({
      data: {
        email: "test-brand@example.com",
        sourceInput: "https://example.com",
        inputType: "WEBSITE",
        status: "DONE",
        dnaJson: {
          oneThing: "Innovation",
          tagline: "Empowering Next-Gen Builders",
          brandVoiceText: "We write in a clear, authoritative, and direct voice.",
          brandMission: "To deliver elite tech products that redefine industries.",
          brandVision: "A decentralized, high-performance digital ecosystem.",
          toneAttributes: ["Determined", "Bold", "Commanding"],
          brandCulture: [
            { value: "Excellence", description: "Doing things right the first time." },
            { value: "Disruption", description: "Challenging legacy paradigms." },
            { value: "Empowerment", description: "Equipping developers with modern tools." }
          ],
          doNotSay: ["traditional methods", "legacy solutions"]
        } as any,
      }
    })
  }

  console.log(`Using WaitlistSignup ID: ${signup.id} for email ${signup.email}`)

  // Clean up any existing visual identity for this waitlist ID
  await prisma.brandVisualIdentity.deleteMany({
    where: { waitlistId: signup.id }
  })

  // Create visual identity record
  const vi = await prisma.brandVisualIdentity.create({
    data: {
      waitlistId: signup.id,
      status: "GENERATING"
    }
  })

  const dna = signup.dnaJson as any
  const brandColorHex = "#2E7D32" // Pre-selected test color
  const archetypeCluster = "tech_minimal"

  console.log("1. Generating logo...")
  const logoBuffer = await generateLogoMark(
    "A simple flat geometric icon mark for tech minimal brand.", 
    brandColorHex, 
    "TestBrand"
  )
  const logoUrl = await uploadAsset(logoBuffer, "logo.png", signup.id)
  console.log("Logo generated and saved:", logoUrl)

  console.log("2. Generating values images...")
  const imageryUrls: string[] = []
  const valuesList = dna.brandCulture || []
  for (let i = 0; i < 3; i++) {
    const valLabel = valuesList[i]?.value || `Value ${i + 1}`
    const valImgBuffer = await generateValuesImage("Abstract geometry", valLabel, brandColorHex, i)
    const uploadedUrl = await uploadAsset(valImgBuffer, `value_${i + 1}.png`, signup.id)
    imageryUrls.push(uploadedUrl)
  }
  console.log("Values images uploaded:", imageryUrls)

  console.log("3. Compositing Mockups...")
  const templates = await prisma.mockupTemplate.findMany({ where: { active: true } })
  const pickTemplate = (category: string) => {
    const candidates = templates.filter(t => t.category === category)
    if (candidates.length === 0) return null
    return candidates[signup!.id % candidates.length]
  }

  let apparelUrl = null
  let toteBagUrl = null
  let keychainUrl = null
  let billboardUrl = null
  let doorHangerUrl = null

  if (templates.length > 0) {
    const apparelTemplate = pickTemplate("apparel")
    if (apparelTemplate) {
      const buffer = await compositeMockup(apparelTemplate as any, logoUrl, brandColorHex)
      apparelUrl = await uploadAsset(buffer, "mockup_apparel.png", signup.id)
      console.log("Apparel mockup composited:", apparelUrl)
    }

    // Offset waitlistId to get different template if available
    const toteTemplate = templates.filter(t => t.category === "apparel")[(signup.id + 1) % templates.filter(t => t.category === "apparel").length] || apparelTemplate
    if (toteTemplate) {
      const buffer = await compositeMockup(toteTemplate as any, logoUrl, brandColorHex)
      toteBagUrl = await uploadAsset(buffer, "mockup_totebag.png", signup.id)
      console.log("Tote bag mockup composited:", toteBagUrl)
    }

    const keychainTemplate = pickTemplate("physical")
    if (keychainTemplate) {
      const buffer = await compositeMockup(keychainTemplate as any, logoUrl, brandColorHex)
      keychainUrl = await uploadAsset(buffer, "mockup_keychain.png", signup.id)
      console.log("Keychain mockup composited:", keychainUrl)
    }

    const billboardTemplate = pickTemplate("environment")
    if (billboardTemplate) {
      const buffer = await compositeMockup(billboardTemplate as any, logoUrl, brandColorHex)
      billboardUrl = await uploadAsset(buffer, "mockup_billboard.png", signup.id)
      console.log("Billboard mockup composited:", billboardUrl)
    }

    const hangerTemplate = templates.filter(t => t.category === "physical")[(signup.id + 1) % templates.filter(t => t.category === "physical").length] || keychainTemplate
    if (hangerTemplate) {
      const buffer = await compositeMockup(hangerTemplate as any, logoUrl, brandColorHex)
      doorHangerUrl = await uploadAsset(buffer, "mockup_doorhanger.png", signup.id)
      console.log("Door hanger mockup composited:", doorHangerUrl)
    }
  } else {
    console.log("No templates found in database to composite mockups.")
  }

  // Update visual identity to COMPLETE
  const updatedVi = await prisma.brandVisualIdentity.update({
    where: { waitlistId: signup.id },
    data: {
      status: "COMPLETE",
      archetypeCluster,
      brandColorHex,
      typographyJson: { heading: "Space Grotesk", body: "Inter" } as any,
      logoUrl,
      imageryUrls,
      mockupUrls: {
        logoOnDark: logoUrl, // Placeholder
        logoMono: logoUrl, // Placeholder
        apparel: apparelUrl,
        toteBag: toteBagUrl,
        keychain: keychainUrl,
        billboard: billboardUrl,
        doorHanger: doorHangerUrl
      } as any
    }
  })

  console.log("=== PIPELINE TEST COMPLETED SUCCESSFULLY! ===")
  console.log("Result Record:", updatedVi)
}

testPipeline()
  .catch(err => {
    console.error("Test execution failed:", err)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
