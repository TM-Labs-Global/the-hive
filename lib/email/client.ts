import { Resend } from "resend"

export async function sendCompletionEmail(email: string, waitlistId: number, brandName: string, brandColor: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY
  const fromEmail = process.env.RESEND_FROM_EMAIL || "The Hive <hello@takeoutmedia.xyz>"
  const guidelinesUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/waitlist/${waitlistId}/visual-identity`

  const subject = `Your ${brandName} Visual Brand Identity is Ready!`
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e4e4e7; border-radius: 16px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <span style="font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.1em; color: ${brandColor};">THE HIVE</span>
        <h1 style="font-size: 24px; font-weight: 800; margin-top: 8px; margin-bottom: 8px; color: #09090b;">Your Brand Book is Ready</h1>
        <p style="font-size: 14px; color: #71717a;">We have compiled your custom colors, typography pairings, logos, and mockups.</p>
      </div>
      
      <div style="background-color: #f4f4f5; padding: 20px; border-radius: 12px; margin-bottom: 24px; text-align: center;">
        <span style="font-size: 14px; font-weight: bold; color: #18181b; display: block; margin-bottom: 4px;">${brandName} Visual Identity</span>
        <span style="font-size: 11px; color: #71717a; text-transform: uppercase;">Ready to view online</span>
      </div>

      <div style="text-align: center; margin-bottom: 32px;">
        <a 
          href="${guidelinesUrl}" 
          style="display: inline-block; background-color: ${brandColor}; color: #ffffff; padding: 12px 24px; font-weight: bold; border-radius: 8px; text-decoration: none; font-size: 14px;"
        >
          View Brand Guidelines
        </a>
      </div>

      <hr style="border: 0; border-top: 1px solid #e4e4e7; margin-bottom: 20px;" />
      <div style="text-align: center; font-size: 11px; color: #a1a1aa;">
        © ${new Date().getFullYear()} The Hive. All rights reserved.
      </div>
    </div>
  `

  if (apiKey && apiKey !== "dummy_key") {
    try {
      console.log(`Sending brand completion email to ${email} via Resend...`)
      const resend = new Resend(apiKey)
      const data = await resend.emails.send({
        from: fromEmail,
        to: email,
        subject,
        html,
        text: `Hello! Your visual identity guidelines for ${brandName} are ready. View them here: ${guidelinesUrl}`,
      })
      console.log("Resend send success:", data)
      return true
    } catch (error) {
      console.error("Resend sending failed:", error)
    }
  }

  // Fallback console logging in development
  console.log("=== DEVELOPMENT EMAIL LOG ===")
  console.log(`To: ${email}`)
  console.log(`From: ${fromEmail}`)
  console.log(`Subject: ${subject}`)
  console.log(`Link: ${guidelinesUrl}`)
  console.log("=============================")
  return true
}
