import { Metadata } from "next"
import localFont from "next/font/local"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner"

// Define Bricolage Grotesque locally
const fontDisplay = localFont({
  src: [
    {
      path: "../public/fonts/bricolage-grotesque/BricolageGrotesque-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/bricolage-grotesque/BricolageGrotesque-Medium.ttf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../public/fonts/bricolage-grotesque/BricolageGrotesque-SemiBold.ttf",
      weight: "600",
      style: "normal",
    },
    {
      path: "../public/fonts/bricolage-grotesque/BricolageGrotesque-Bold.ttf",
      weight: "700",
      style: "normal",
    },
    {
      path: "../public/fonts/bricolage-grotesque/BricolageGrotesque-ExtraBold.ttf",
      weight: "800",
      style: "normal",
    },
  ],
  variable: "--font-display",
  display: "swap",
})

// Define DM Sans locally
const fontSans = localFont({
  src: [
    {
      path: "../public/fonts/dm-sans/DMSans-Light.ttf",
      weight: "300",
      style: "normal",
    },
    {
      path: "../public/fonts/dm-sans/DMSans-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/dm-sans/DMSans-Medium.ttf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../public/fonts/dm-sans/DMSans-SemiBold.ttf",
      weight: "600",
      style: "normal",
    },
    {
      path: "../public/fonts/dm-sans/DMSans-Bold.ttf",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-sans",
  display: "swap",
})

// Define DM Mono locally
const fontMono = localFont({
  src: [
    {
      path: "../public/fonts/dm-mono/DMMono-Light.ttf",
      weight: "300",
      style: "normal",
    },
    {
      path: "../public/fonts/dm-mono/DMMono-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/dm-mono/DMMono-Medium.ttf",
      weight: "500",
      style: "normal",
    },
  ],
  variable: "--font-mono",
  display: "swap",
})

export const metadata: Metadata = {
  title: "The Hive",
  description: "The Tools to Move Faster. The Team to Go Further.",
  icons: {
    icon: "/brand-logos/hive-logo.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "antialiased",
        fontDisplay.variable,
        fontSans.variable,
        fontMono.variable,
        "font-sans"
      )}
    >
      <body suppressHydrationWarning>
        <ThemeProvider>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
