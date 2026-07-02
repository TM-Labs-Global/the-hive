import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  console.log("Seeding mockup templates...")

  const templates = [
    {
      templateId: "apparel_tshirt_model_front_a",
      category: "apparel_worn",
      baseImageUrl: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=800",
      tintEnabled: true,
      logoZoneJson: { xPct: 42, yPct: 48, widthPct: 16 }, // Lowered yPct from 35 to 48 to avoid neck/face overlap
      active: true
    },
    {
      templateId: "tote_bag_front_a",
      category: "tote_bag",
      baseImageUrl: "https://images.unsplash.com/photo-1544816155-12df9643f363?q=80&w=800",
      tintEnabled: true,
      logoZoneJson: { xPct: 35, yPct: 45, widthPct: 30 },
      active: true
    },
    {
      templateId: "keychain_front_a",
      category: "keychain",
      baseImageUrl: "https://images.unsplash.com/photo-1582139329536-e7284fece509?q=80&w=800",
      tintEnabled: true,
      logoZoneJson: { xPct: 40, yPct: 40, widthPct: 20 },
      active: true
    },
    {
      templateId: "billboard_urban_a",
      category: "billboard",
      baseImageUrl: "https://images.unsplash.com/photo-1598257006626-48b0c252070d?q=80&w=800", // Fixed dead 404 URL
      tintEnabled: false,
      logoZoneJson: { xPct: 25, yPct: 20, widthPct: 50 },
      active: true
    },
    {
      templateId: "door_hanger_wood_a",
      category: "door_hanger",
      baseImageUrl: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=800",
      tintEnabled: false,
      logoZoneJson: { xPct: 45, yPct: 55, widthPct: 25 },
      active: true
    }
  ]

  for (const t of templates) {
    await prisma.mockupTemplate.upsert({
      where: { templateId: t.templateId },
      update: t,
      create: t,
    })
  }

  console.log("Mockup templates seeded successfully!")
}

main()
  .catch((e) => {
    console.error("Seeding failed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
