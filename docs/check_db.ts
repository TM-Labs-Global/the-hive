import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  const signups = await prisma.waitlistSignup.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
  })

  console.log("LAST 5 SIGNUPS:")
  for (const s of signups) {
    console.log(`ID: ${s.id}, Email: ${s.email}, Status: ${s.status}`)
    console.log(`Error Message: ${s.errorMessage}`)
    console.log(`Input Type: ${s.inputType}`)
    console.log(`Answers JSON: ${s.answersJson ? JSON.stringify(s.answersJson).slice(0, 100) : "null"}`)
    console.log("-----------------------------------")
  }
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect())
