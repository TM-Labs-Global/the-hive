import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/client"
import { InputType } from "@prisma/client"

function checkIsLikelyBusinessEmail(email: string): boolean {
  const parts = email.trim().toLowerCase().split("@")
  if (parts.length < 2) return false
  const domain = parts[1]
  const consumerDomains = new Set([
    "gmail.com",
    "yahoo.com",
    "hotmail.com",
    "outlook.com",
    "icloud.com",
    "proton.me",
    "aol.com",
    "zoho.com",
    "yandex.com",
    "protonmail.com",
    "live.com",
    "gmx.com",
    "mail.com"
  ])
  return !consumerDomains.has(domain)
}

function extractDomain(input: string): string | null {
  try {
    let cleanInput = input.trim()
    if (!/^https?:\/\//i.test(cleanInput)) {
      cleanInput = "https://" + cleanInput
    }
    const url = new URL(cleanInput)
    return url.hostname.replace("www.", "")
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  try {
    const { id, email, sourceInput, inputType, answersJson } = await req.json()

    if (!email || !email.includes("@")) {
      return NextResponse.json({ success: false, error: "A valid email address is required." }, { status: 400 })
    }

    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is not configured in the environment variables.")
    }

    let type: InputType = InputType.MANUAL
    if (inputType === "WEBSITE") {
      type = InputType.WEBSITE
    } else if (inputType === "QUESTIONNAIRE") {
      type = InputType.QUESTIONNAIRE
    }

    let faviconUrl: string | null = null
    // If website or questionnaire has a website sourceInput, try to get favicon
    if (sourceInput && (type === InputType.WEBSITE || type === InputType.QUESTIONNAIRE)) {
      const domain = extractDomain(sourceInput)
      if (domain) {
        faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`
      }
    }

    const isLikelyBusinessEmail = checkIsLikelyBusinessEmail(email)

    let signup
    if (id) {
      signup = await prisma.waitlistSignup.update({
        where: { id: Number(id) },
        data: {
          answersJson: answersJson || null,
        },
      })
    } else {
      signup = await prisma.waitlistSignup.create({
        data: {
          email: email.trim(),
          sourceInput: sourceInput ? sourceInput.trim() : null,
          inputType: type,
          status: "PENDING",
          isLikelyBusinessEmail,
          faviconUrl,
          answersJson: answersJson || null,
        },
      })
    }

    return NextResponse.json({ success: true, id: signup.id })
  } catch (error: any) {
    console.error("Waitlist API error:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Failed to register waitlist signup." },
      { status: 500 }
    )
  }
}
