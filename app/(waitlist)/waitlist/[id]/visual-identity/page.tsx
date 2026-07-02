import * as React from "react"
import { notFound } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/db/client"
import { mapDnaToTemplate } from "@/lib/visualIdentity/mapDnaToTemplate"
import { VisualIdentityPolling } from "@/components/pages/waitlist-brand-dna/components/visual-identity-polling"
import { BusinessCards } from "@/components/mockups/BusinessCard/BusinessCards"
import { AppIcon } from "@/components/mockups/AppIcon/AppIcon"
import { SocialPosts } from "@/components/mockups/SocialPost/SocialPosts"
import { 
  ArrowLeft, 
  Sparkles, 
  BookOpen, 
  Palette, 
  Type, 
  Image as ImageIcon, 
  Layout, 
  ChevronRight, 
  Download, 
  Info,
  Layers,
  Shield,
  Cpu,
  Users,
  Award,
  Heart,
  Zap,
  Globe,
  Eye,
  Compass,
  HelpCircle
} from "lucide-react"
import { 
  Syne, 
  Space_Grotesk, 
  DM_Serif_Display, 
  Bricolage_Grotesque, 
  Playfair_Display, 
  Inter, 
  Plus_Jakarta_Sans, 
  DM_Sans, 
  Fraunces 
} from "next/font/google"
import { BrandDNA } from "@/types/brand-dna"

import { DownloadPdfButton } from "@/components/pages/waitlist-brand-dna/components/download-pdf-button"

// Initialize Google Fonts statically
const syne = Syne({ subsets: ["latin"], variable: "--font-syne" })
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space-grotesk" })
const dmSerif = DM_Serif_Display({ weight: "400", subsets: ["latin"], variable: "--font-dm-serif" })
const bricolage = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-bricolage" })
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair" })
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta" })
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dmsans" })
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces" })

// Typography pairing combinations mapped by archetype
const ARCHETYPE_FONTS: Record<string, { 
  headingClass: string; 
  bodyClass: string; 
  headingFamily: string; 
  bodyFamily: string;
  headingName: string;
  bodyName: string;
}> = {
  agro_earth: {
    headingClass: dmSerif.className,
    bodyClass: dmSans.className,
    headingFamily: "var(--font-dm-serif), serif",
    bodyFamily: "var(--font-dmsans), sans-serif",
    headingName: "DM Serif Display",
    bodyName: "DM Sans"
  },
  corporate_trust: {
    headingClass: jakarta.className,
    bodyClass: inter.className,
    headingFamily: "var(--font-jakarta), sans-serif",
    bodyFamily: "var(--font-inter), sans-serif",
    headingName: "Plus Jakarta Sans",
    bodyName: "Inter"
  },
  bold_consumer: {
    headingClass: bricolage.className,
    bodyClass: dmSans.className,
    headingFamily: "var(--font-bricolage), sans-serif",
    bodyFamily: "var(--font-dmsans), sans-serif",
    headingName: "Bricolage Grotesque",
    bodyName: "DM Sans"
  },
  premium_luxury: {
    headingClass: fraunces.className,
    bodyClass: inter.className,
    headingFamily: "var(--font-fraunces), serif",
    bodyFamily: "var(--font-inter), sans-serif",
    headingName: "Fraunces",
    bodyName: "Inter"
  },
  tech_minimal: {
    headingClass: spaceGrotesk.className,
    bodyClass: inter.className,
    headingFamily: "var(--font-space-grotesk), monospace",
    bodyFamily: "var(--font-inter), sans-serif",
    headingName: "Space Grotesk",
    bodyName: "Inter"
  }
}

// Helper to match a value label with a relevant Lucide Icon
function getValueIcon(label: string) {
  const clean = label.toLowerCase().trim()
  
  // A dictionary mapping common value keywords to Lucide icons
  const iconGroups = [
    { keywords: ["trust", "honesty", "integrity", "transparency", "shield", "ethics", "security", "safe"], icon: Shield },
    { keywords: ["innovation", "creativity", "disruption", "future", "invent", "technology", "tech", "modern", "design"], icon: Cpu },
    { keywords: ["collaboration", "teamwork", "community", "together", "partnership", "diversity", "inclusion", "social"], icon: Users },
    { keywords: ["excellence", "quality", "standard", "premier", "professional", "premium", "delight", "award", "success"], icon: Award },
    { keywords: ["empowerment", "growth", "elevate", "autonomy", "learning", "enable", "power", "skill"], icon: Sparkles },
    { keywords: ["passion", "care", "empathy", "heart", "respect", "customer", "people", "love"], icon: Heart },
    { keywords: ["efficiency", "speed", "agility", "fast", "execute", "performance", "action", "zap"], icon: Zap },
    { keywords: ["sustainability", "earth", "green", "nature", "eco", "responsibility", "planet"], icon: Globe },
    { keywords: ["vision", "clarity", "focus", "purpose", "mission", "goal", "strategy"], icon: Eye },
    { keywords: ["simplicity", "simple", "minimal", "focus", "essential", "clarity"], icon: Compass }
  ]

  for (const group of iconGroups) {
    if (group.keywords.some(kw => clean.includes(kw))) {
      return group.icon
    }
  }

  return HelpCircle // default fallback
}

export default async function VisualIdentityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const waitlistId = Number(id)

  if (isNaN(waitlistId)) {
    return notFound()
  }

  // Fetch signup including visualIdentity
  const signup = await prisma.waitlistSignup.findUnique({
    where: { id: waitlistId },
    include: { visualIdentity: true }
  })

  if (!signup) {
    return notFound()
  }

  const vi = signup.visualIdentity

  // If guideline is not generated/ready yet, render progress loader
  if (!vi || vi.status !== "COMPLETE") {
    return (
      <div className="w-full bg-[#FAF9F6] min-h-screen text-gray-900 flex items-center justify-center py-12 px-6">
        <VisualIdentityPolling waitlistId={waitlistId} initialStatus={vi?.status || "NOT_STARTED"} />
      </div>
    )
  }

  // Parse DNA JSON and retrieve content mapping
  const dna = signup.dnaJson as any as BrandDNA
  const brandName = signup.answersJson && (signup.answersJson as any).businessName 
    ? (signup.answersJson as any).businessName 
    : (signup.sourceInput && signup.sourceInput.includes(".") 
        ? signup.sourceInput.split(".")[0] 
        : "Your Brand")
  
  const content = mapDnaToTemplate(dna, brandName)

  // Resolve typographic pair using the archetype cluster
  const cluster = vi.archetypeCluster || "tech_minimal"
  const fontPair = ARCHETYPE_FONTS[cluster] || ARCHETYPE_FONTS.tech_minimal

  // Main brand colors
  const brandColor = vi.brandColorHex || "#18181B"
  
  // Safe helper to convert hex to RGB
  const hexToRgbStr = (hex: string) => {
    const c = hex.replace("#", "")
    const r = parseInt(c.substring(0, 2), 16)
    const g = parseInt(c.substring(2, 4), 16)
    const b = parseInt(c.substring(4, 6), 16)
    return isNaN(r) || isNaN(g) || isNaN(b) ? "24, 24, 27" : `${r}, ${g}, ${b}`
  }
  const brandColorRgb = hexToRgbStr(brandColor)

  // Parse mockup URLs
  const mockups = (vi.mockupUrls as Record<string, any>) || {}

  return (
    <div 
      className={`w-full bg-[#FAF9F6] min-h-screen text-gray-900 selection:bg-black/10 transition-colors pb-24 ${fontPair.bodyClass}`}
      style={{
        "--brand-color": brandColor,
        "--brand-color-rgb": brandColorRgb,
        "--font-heading": fontPair.headingFamily,
        "--font-body": fontPair.bodyFamily,
      } as React.CSSProperties}
    >
      {/* Global CSS Inject to support Google Fonts mapping classes and print styling */}
      <style dangerouslySetInnerHTML={{__html: `
        .font-brand-heading { font-family: var(--font-heading) !important; }
        .font-brand-body { font-family: var(--font-body) !important; }

        @media print {
          /* Hide floating header, back button, download triggers */
          header, button, a, .no-print {
            display: none !important;
          }

          /* General body resets for accurate color print rendering */
          body, html {
            background-color: #FAF9F6 !important;
            color: #111827 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          /* Full bleed pages for brand slides */
          main {
            max-width: 100% !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            space-y: 0 !important;
          }

          /* Page break after each primary brand book section */
          section {
            page-break-after: always !important;
            break-after: page !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            margin: 0 !important;
            padding: 4rem 3rem !important;
            min-height: 100vh !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: center !important;
          }

          /* Ensure value background images show up when printing */
          img {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}} />

      {/* Floating Header Navigation */}
      <header className="sticky top-0 z-40 bg-[#FAF9F6]/85 backdrop-blur-md border-b border-zinc-200/80 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link 
            href="/brand-dna" 
            className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-zinc-500 hover:text-zinc-900 transition-colors"
          >
            <ArrowLeft size={14} /> Back to DNA
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-black uppercase tracking-wider bg-zinc-200/60 px-3 py-1 rounded-full text-zinc-700">
              Brand Book MVP
            </span>
            <DownloadPdfButton />
          </div>
        </div>
      </header>

      {/* Core Brand Guidelines Document */}
      <main className="max-w-5xl mx-auto px-6 mt-12 space-y-24">
        
        {/* SECTION 1: COVER PAGE */}
        <section className="bg-zinc-950 text-white rounded-[2.5rem] p-12 md:p-20 relative overflow-hidden flex flex-col justify-between min-h-[500px] shadow-xl">
          {/* Decorative gradients */}
          <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full blur-[100px] opacity-20 pointer-events-none" style={{ backgroundColor: brandColor }} />
          <div className="absolute bottom-0 left-0 w-[300px] h-[300px] rounded-full blur-[120px] opacity-10 pointer-events-none" style={{ backgroundColor: "#ffffff" }} />

          <div className="flex justify-between items-start z-10">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-2">
                Brand Book & Visual System
              </p>
              <h1 className="font-brand-heading text-4xl md:text-6xl font-bold tracking-tight text-white max-w-xl">
                {content.brandName}
              </h1>
            </div>
            {vi.logoUrl && (
              <img 
                src={vi.logoUrl} 
                alt={`${content.brandName} Logo`} 
                className="w-16 h-16 rounded-2xl bg-white/5 p-2.5 border border-white/10 object-contain shadow-inner" 
              />
            )}
          </div>

          <div className="pt-24 z-10">
            <div className="border-t border-white/10 pt-8 flex flex-wrap gap-8 justify-between items-end">
              <div>
                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block mb-1">Archetype Class</span>
                <span className="text-sm font-black capitalize text-zinc-200">{cluster.replace("_", " ")}</span>
              </div>
              <div className="max-w-xs text-right">
                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block mb-1">Primary Tagline</span>
                <p className="text-xs text-zinc-300 italic">"{content.slogan}"</p>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 3.2 — FULL-BLEED BRAND PERSONALITY PAGE */}
        <section className="relative rounded-[2.5rem] overflow-hidden min-h-[420px] flex flex-col justify-end">
          {/* Background: first value imagery if available, else brand-color fill */}
          {vi.imageryUrls?.[0] ? (
            <img
              src={vi.imageryUrls[0]}
              alt="Brand personality"
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0" style={{ backgroundColor: brandColor }} />
          )}
          {/* Dark gradient scrim for legibility */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

          {/* Manifesto overlay */}
          <div className="relative z-10 p-10 md:p-16 max-w-3xl">
            <p className="text-[10px] font-black uppercase tracking-widest text-white/50 mb-4">
              Brand Personality
            </p>
            <h2
              className="font-brand-heading text-4xl md:text-6xl font-bold text-white leading-[1.05] tracking-tight"
              style={{ textShadow: "0 2px 32px rgba(0,0,0,0.5)" }}
            >
              {dna.oneThing || content.slogan}
            </h2>
            {dna.toneAttributes && dna.toneAttributes.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-6">
                {dna.toneAttributes.slice(0, 4).map((word: string) => (
                  <span
                    key={word}
                    className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/30 text-white/80 backdrop-blur-sm"
                  >
                    {word}
                  </span>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* SECTION 3.3 — LOGO SHOWCASE: CHECKERBOARD GRID */}
        <section className="space-y-6">
          <div className="flex items-center gap-2 text-zinc-500">
            <Layers size={18} />
            <span className="text-xs font-black uppercase tracking-widest">1.0 Logo Showcase</span>
          </div>

          {/* 6-cell checkerboard: 3 cols × 2 rows on md+, single col on mobile */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-0 rounded-[2rem] overflow-hidden">

            {/* Cell 1 — Primary on white */}
            <div className="bg-white flex flex-col items-center justify-center gap-3 p-8 h-[220px]">
              {vi.logoUrl ? (
                <img src={vi.logoUrl} alt="Primary logo" className="max-h-[90px] max-w-[140px] object-contain" />
              ) : (
                <div className="w-14 h-14 rounded-full bg-zinc-100 animate-pulse" />
              )}
              <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400">1.1 Primary</span>
            </div>

            {/* Cell 2 — On brand color */}
            <div
              className="flex flex-col items-center justify-center gap-3 p-8 h-[220px]"
              style={{ backgroundColor: brandColor }}
            >
              {vi.logoUrl ? (
                <img
                  src={vi.logoUrl}
                  alt="Logo on brand color"
                  className="max-h-[90px] max-w-[140px] object-contain brightness-0 invert"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-white/20 animate-pulse" />
              )}
              <span className="text-[9px] font-black uppercase tracking-widest text-white/70">1.2 Brand Color</span>
            </div>

            {/* Cell 3 — On dark */}
            <div className="bg-zinc-950 flex flex-col items-center justify-center gap-3 p-8 h-[220px]">
              {mockups.logoOnDark ? (
                <img src={mockups.logoOnDark} alt="On dark logo" className="max-h-[90px] max-w-[140px] object-contain" />
              ) : vi.logoUrl ? (
                <img src={vi.logoUrl} alt="On dark fallback" className="max-h-[90px] max-w-[140px] object-contain brightness-0 invert" />
              ) : (
                <div className="w-14 h-14 rounded-full bg-white/10 animate-pulse" />
              )}
              <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">1.3 On Dark</span>
            </div>

            {/* Cell 4 — Monochrome */}
            <div className="bg-zinc-100 flex flex-col items-center justify-center gap-3 p-8 h-[220px]">
              {mockups.logoMono ? (
                <img src={mockups.logoMono} alt="Mono logo" className="max-h-[90px] max-w-[140px] object-contain" />
              ) : vi.logoUrl ? (
                <img src={vi.logoUrl} alt="Mono fallback" className="max-h-[90px] max-w-[140px] object-contain grayscale" />
              ) : (
                <div className="w-14 h-14 rounded-full bg-zinc-300 animate-pulse" />
              )}
              <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">1.4 Monochrome</span>
            </div>

            {/* Cell 5 — Icon only (fill crop) */}
            <div className="bg-white border-t border-l border-zinc-100 flex flex-col items-center justify-center gap-3 p-8 h-[220px]">
              <div className="w-[90px] h-[90px] rounded-2xl overflow-hidden flex items-center justify-center">
                {vi.logoUrl ? (
                  <img
                    src={vi.logoUrl}
                    alt="Icon crop"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-zinc-100 animate-pulse rounded-2xl" />
                )}
              </div>
              <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400">1.5 Icon</span>
            </div>

            {/* Cell 6 — Reversed (white mark on dark brand color) */}
            <div
              className="flex flex-col items-center justify-center gap-3 p-8 h-[220px]"
              style={{ backgroundColor: `color-mix(in srgb, ${brandColor} 30%, #0a0a0a 70%)` }}
            >
              {vi.logoUrl ? (
                <img
                  src={vi.logoUrl}
                  alt="Reversed logo"
                  className="max-h-[90px] max-w-[140px] object-contain brightness-0 invert opacity-90"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-white/20 animate-pulse" />
              )}
              <span className="text-[9px] font-black uppercase tracking-widest text-white/50">1.6 Reversed</span>
            </div>

          </div>
        </section>

        {/* SECTION 3.4 — COLOR SYSTEM: NARRATIVE + ASYMMETRIC PILLS */}
        <section
          className="rounded-[2.5rem] p-8 md:p-12 grid grid-cols-1 lg:grid-cols-5 gap-10 lg:gap-16"
          style={{ backgroundColor: `rgba(${brandColorRgb}, 0.07)` }}
        >
          {/* Left: narrative copy */}
          <div className="lg:col-span-2 space-y-5 flex flex-col justify-center">
            <div className="flex items-center gap-2">
              <Palette size={16} className="text-zinc-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">2.0 Our Colour System</span>
            </div>
            <h3 className="font-brand-heading text-2xl md:text-3xl font-bold tracking-tight text-zinc-900 leading-tight">
              A palette built for<br />this brand's world.
            </h3>
            <p className="text-sm text-zinc-600 leading-relaxed font-medium">
              {
                // Generate a short rationale from archetype + tone words
                (() => {
                  const toneStr = (dna.toneAttributes || []).slice(0, 2).join(" and ")
                  const clusterLabel = cluster.replace("_", " ")
                  return `The ${clusterLabel} archetype calls for a chromatic identity that feels ${toneStr || "purposeful and distinct"}. This palette anchors every touchpoint — from digital surfaces to physical materials — in a recognisable, emotionally coherent visual language.`
                })()
              }
            </p>
            <p className="text-xs text-zinc-400 font-medium leading-relaxed">
              All colours are chosen to meet WCAG 2.1 contrast requirements at their intended use sizes.
            </p>
          </div>

          {/* Right: asymmetric pill swatches */}
          <div className="lg:col-span-3 flex items-end gap-4">
            {/* Primary swatch — tallest pill */}
            <div className="flex flex-col items-center gap-3 flex-1">
              <div
                className="w-full rounded-full flex items-end justify-center pb-5 relative"
                style={{ backgroundColor: brandColor, height: "220px" }}
              >
                <span
                  className="font-mono text-[10px] font-black px-2 py-0.5 rounded-md"
                  style={{ color: brandColor, backgroundColor: "rgba(255,255,255,0.85)" }}
                >
                  {brandColor.toUpperCase()}
                </span>
              </div>
              <div className="text-center">
                <p className="text-[10px] font-black text-zinc-800 uppercase tracking-widest">Primary</p>
                <p className="text-[9px] text-zinc-400 font-bold mt-0.5">Brand Accent</p>
              </div>
            </div>

            {/* Dark neutral — medium pill */}
            <div className="flex flex-col items-center gap-3" style={{ width: "30%" }}>
              <div
                className="w-full rounded-full flex items-end justify-center pb-4 bg-zinc-900"
                style={{ height: "140px" }}
              >
                <span className="font-mono text-[10px] font-black text-zinc-400 bg-black/30 px-2 py-0.5 rounded-md">#18181B</span>
              </div>
              <div className="text-center">
                <p className="text-[10px] font-black text-zinc-800 uppercase tracking-widest">Dark</p>
                <p className="text-[9px] text-zinc-400 font-bold mt-0.5">Core Text</p>
              </div>
            </div>

            {/* Light neutral — shorter pill */}
            <div className="flex flex-col items-center gap-3" style={{ width: "30%" }}>
              <div
                className="w-full rounded-full border border-zinc-200 flex items-end justify-center pb-4 bg-zinc-100"
                style={{ height: "100px" }}
              >
                <span className="font-mono text-[10px] font-black text-zinc-500 bg-white/80 border border-zinc-200 px-2 py-0.5 rounded-md">#F4F4F5</span>
              </div>
              <div className="text-center">
                <p className="text-[10px] font-black text-zinc-800 uppercase tracking-widest">Light</p>
                <p className="text-[9px] text-zinc-400 font-bold mt-0.5">Surface</p>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 3.5 — TYPOGRAPHY (with Specimen Tile) */}
        <section className="space-y-6">
          <div className="flex items-center gap-2 text-zinc-500">
            <Type size={18} />
            <span className="text-xs font-black uppercase tracking-widest">3.0 Typography System</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Col 1 — Display font specimen */}
            <div className="bg-white rounded-[2rem] border border-zinc-200/80 p-8 shadow-sm space-y-5 flex flex-col">
              <div>
                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block mb-1">Primary Display Type</span>
                <h3 className="font-brand-heading text-2xl font-bold tracking-tight text-zinc-900">
                  {fontPair.headingName}
                </h3>
              </div>
              <div className="font-brand-heading text-zinc-300 text-3xl leading-snug font-bold tracking-tight flex-1">
                Aa Bb Cc<br />Dd Ee Ff Gg<br />Hh Ii Jj Kk<br />0123456789
              </div>
              <div className="border-t border-zinc-100 pt-4">
                <h5 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Heading Usage</h5>
                <h2 className="font-brand-heading text-lg font-black text-zinc-900 leading-tight">
                  Strong presence starts with type.
                </h2>
              </div>
            </div>

            {/* Col 2 — Body font specimen */}
            <div className="bg-white rounded-[2rem] border border-zinc-200/80 p-8 shadow-sm space-y-5 flex flex-col">
              <div>
                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block mb-1">Standard Body Type</span>
                <h3 className="text-2xl font-black text-zinc-900">
                  {fontPair.bodyName}
                </h3>
              </div>
              <div className="text-zinc-300 text-3xl leading-snug font-bold tracking-tight flex-1">
                Aa Bb Cc<br />Dd Ee Ff Gg<br />Hh Ii Jj Kk<br />0123456789
              </div>
              <div className="border-t border-zinc-100 pt-4 space-y-2">
                <h5 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Paragraph Usage</h5>
                <p className="text-zinc-500 text-xs leading-relaxed font-medium">
                  Clean, legible geometry — optimised for reading across web, print, and digital stationery.
                </p>
              </div>
            </div>

            {/* Col 3 — 3.5 Specimen Tile: full alphabet on brand-color block */}
            <div
              className="rounded-[2rem] p-8 flex flex-col justify-between min-h-[340px] relative overflow-hidden"
              style={{ backgroundColor: brandColor }}
            >
              {/* Subtle tonal texture overlay */}
              <div className="absolute inset-0 opacity-5" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='1' fill-rule='evenodd'%3E%3Ccircle cx='1' cy='1' r='1'/%3E%3C/g%3E%3C/svg%3E\")" }} />

              <div className="relative z-10">
                <span className="text-[10px] font-black uppercase tracking-widest text-white/50 block mb-1">3.5 Type Specimen</span>
                <h3 className="font-brand-heading text-2xl font-black text-white leading-tight">
                  {fontPair.headingName}
                </h3>
              </div>

              <div className="relative z-10 mt-4">
                <p className="font-brand-heading text-white/30 text-xs leading-loose tracking-wide font-bold break-words">
                  A B C D E F G H I J K L M N O P Q R S T U V W X Y Z<br />
                  a b c d e f g h i j k l m n o p q r s t u v w x y z<br />
                  0 1 2 3 4 5 6 7 8 9 ! @ # & ( ) — …
                </p>
              </div>

              <div className="relative z-10 mt-auto pt-6 border-t border-white/10">
                <p className="font-brand-heading text-white text-sm font-bold italic">
                  &ldquo;{content.slogan}&rdquo;
                </p>
                <p className="text-white/40 text-[9px] font-black uppercase tracking-widest mt-1">{content.brandName}</p>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 5: ABOUT US & MISSION/VISION */}
        <section className="bg-white rounded-[2.5rem] border border-zinc-200/80 p-8 md:p-12 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-brand">
              <BookOpen size={16} />
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Core Narrative</span>
            </div>
            <h3 className="font-brand-heading text-2xl font-bold tracking-tight text-zinc-900">
              About {content.brandName}
            </h3>
            <p className="text-sm text-zinc-500 leading-relaxed font-medium">
              {content.aboutUs}
            </p>
          </div>

          <div className="space-y-8 flex flex-col justify-center border-t md:border-t-0 md:border-l border-zinc-200/60 pt-8 md:pt-0 md:pl-12">
            <div className="space-y-2">
              <span className="text-[9px] font-black text-brand uppercase tracking-widest block">Brand Vision</span>
              <p className="text-sm text-zinc-800 font-bold leading-relaxed">
                "{content.vision}"
              </p>
            </div>
            <div className="space-y-2">
              <span className="text-[9px] font-black text-brand uppercase tracking-widest block">Brand Mission</span>
              <p className="text-sm text-zinc-500 font-medium leading-relaxed">
                {content.mission}
              </p>
            </div>
          </div>
        </section>

        {/* SECTION 6: CORE VALUES */}
        <section className="space-y-6">
          <div className="flex items-center gap-2 text-zinc-500">
            <Sparkles size={18} />
            <span className="text-xs font-black uppercase tracking-widest">4.0 Core Brand Values</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {content.values.map((val, idx) => {
              const ValueIcon = getValueIcon(val.label)
              return (
                <div 
                  key={idx}
                  className="bg-white border border-zinc-200/80 rounded-[2rem] p-8 shadow-sm flex flex-col justify-between min-h-[320px] group transition-all duration-300 hover:scale-[1.02] hover:shadow-md cursor-default"
                >
                  <div className="space-y-4">
                    {/* Icon container with brand color tint */}
                    <div 
                      className="w-20 h-20 rounded-[1.5rem] flex items-center justify-center transition-all duration-300 group-hover:scale-110"
                      style={{ backgroundColor: `rgba(${brandColorRgb}, 0.1)` }}
                    >
                      <ValueIcon size={38} style={{ color: brandColor }} />
                    </div>
                    
                    <div className="space-y-1">
                      <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block font-mono">
                        Value 0{idx + 1}
                      </span>
                      <h4 className="font-brand-heading text-lg font-bold text-zinc-900">
                        {val.label}
                      </h4>
                    </div>
                  </div>

                  <p className="text-zinc-500 text-xs leading-relaxed font-medium mt-4">
                    {val.description}
                  </p>
                </div>
              )
            })}
          </div>
        </section>

        {/* SECTION 7: EDITORIAL TONE & SLOGAN */}
        <section className="bg-white rounded-[2.5rem] border border-zinc-200/80 p-8 md:p-12 shadow-sm grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="space-y-4">
            <span className="text-[10px] font-black text-brand uppercase tracking-widest">Brand Voice & Slogan</span>
            <h3 className="font-brand-heading text-2xl font-bold tracking-tight text-zinc-900">Editorial Positioning</h3>
            <p className="text-zinc-500 text-sm leading-relaxed font-medium">
              We maintain structural clarity across all external-facing materials, prioritizing authentic, high-impact statements over fluff.
            </p>
          </div>

          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-8 lg:pl-12 border-t lg:border-t-0 lg:border-l border-zinc-200/60 pt-8 lg:pt-0">
            <div className="space-y-4">
              <h5 className="font-brand-heading text-xs font-black uppercase tracking-widest text-zinc-400">Tone Indicators</h5>
              <div className="flex flex-wrap gap-2">
                {content.toneWords.map((word) => (
                  <span 
                    key={word}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold border border-zinc-200 text-zinc-700 bg-zinc-50"
                  >
                    {word}
                  </span>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h5 className="font-brand-heading text-xs font-black uppercase tracking-widest text-zinc-400">Editorial Do Not Say</h5>
              <ul className="text-xs text-zinc-500 font-bold space-y-2">
                {dna.doNotSay && dna.doNotSay.map((phrase, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
                    <span>Avoid "{phrase}"</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* SECTION 8: BRAND MOCKUPS */}
        <section className="space-y-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-zinc-500">
              <Layout size={18} />
              <span className="text-xs font-black uppercase tracking-widest">5.0 Digital Mockups & Collaterals</span>
            </div>
          </div>

          {/* Business Cards & Mobile App Icon */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              <h4 className="font-brand-heading text-sm font-bold text-zinc-700 flex items-center gap-2">
                <ChevronRight size={14} className="text-brand" /> Business Stationary Systems
              </h4>
              <BusinessCards 
                logoUrl={vi.logoUrl} 
                brandName={content.brandName} 
                brandColor={brandColor} 
                fontPair={{ heading: fontPair.headingName, body: fontPair.bodyName }}
                tagline={content.slogan}
                email={signup.email}
              />
            </div>
            
            <div className="space-y-4 flex flex-col items-center">
              <h4 className="font-brand-heading text-sm font-bold text-zinc-700 self-start flex items-center gap-2">
                <ChevronRight size={14} className="text-brand" /> Application Glyph
              </h4>
              <div className="bg-white border border-zinc-200/80 shadow-sm rounded-3xl w-full h-[222px] flex items-center justify-center">
                <AppIcon 
                  logoUrl={vi.logoUrl} 
                  brandName={content.brandName} 
                  brandColor={brandColor} 
                />
              </div>
            </div>
          </div>

          {/* Social Posts Showcase */}
          <div className="space-y-4">
            <h4 className="font-brand-heading text-sm font-bold text-zinc-700 flex items-center gap-2">
              <ChevronRight size={14} className="text-brand" /> Social Templates
            </h4>
            <SocialPosts 
              logoUrl={vi.logoUrl} 
              brandName={content.brandName} 
              brandColor={brandColor} 
              tagline={content.slogan}
            />
          </div>

          {/* Merch Compositions */}
          <div className="space-y-4">
            <h4 className="font-brand-heading text-sm font-bold text-zinc-700 flex items-center gap-2">
              <ChevronRight size={14} className="text-brand" /> Merch, Apparel, & Physical Environments
            </h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Apparel */}
              <div className="bg-white border border-zinc-200/80 rounded-3xl overflow-hidden shadow-sm flex flex-col h-[320px]">
                <div className="flex-1 bg-zinc-100 relative flex items-center justify-center">
                  {mockups.apparel ? (
                    <img src={mockups.apparel} alt="Branded Apparel" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center text-zinc-400 gap-1.5">
                      <ImageIcon size={28} />
                      <span className="text-[10px] font-bold uppercase tracking-wide">Apparel Mockup</span>
                    </div>
                  )}
                </div>
                <div className="p-4 border-t border-zinc-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-700">Custom Recolored Tee</span>
                  <span className="text-[9px] uppercase font-black text-brand tracking-widest">Active</span>
                </div>
              </div>

              {/* Tote Bag */}
              <div className="bg-white border border-zinc-200/80 rounded-3xl overflow-hidden shadow-sm flex flex-col h-[320px]">
                <div className="flex-1 bg-zinc-100 relative flex items-center justify-center">
                  {mockups.toteBag ? (
                    <img src={mockups.toteBag} alt="Branded Tote Bag" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center text-zinc-400 gap-1.5">
                      <ImageIcon size={28} />
                      <span className="text-[10px] font-bold uppercase tracking-wide">Tote Bag Mockup</span>
                    </div>
                  )}
                </div>
                <div className="p-4 border-t border-zinc-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-700">Composited Tote Canvas</span>
                  <span className="text-[9px] uppercase font-black text-brand tracking-widest">Active</span>
                </div>
              </div>

              {/* Keychain */}
              <div className="bg-white border border-zinc-200/80 rounded-3xl overflow-hidden shadow-sm flex flex-col h-[320px]">
                <div className="flex-1 bg-zinc-100 relative flex items-center justify-center">
                  {mockups.keychain ? (
                    <img src={mockups.keychain} alt="Branded Keychain" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center text-zinc-400 gap-1.5">
                      <ImageIcon size={28} />
                      <span className="text-[10px] font-bold uppercase tracking-wide">Keychain Mockup</span>
                    </div>
                  )}
                </div>
                <div className="p-4 border-t border-zinc-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-700">Keychain Tag</span>
                  <span className="text-[9px] uppercase font-black text-brand tracking-widest">Active</span>
                </div>
              </div>

              {/* Urban Billboard */}
              <div className="bg-white border border-zinc-200/80 rounded-3xl overflow-hidden shadow-sm flex flex-col h-[320px] sm:col-span-2">
                <div className="flex-1 bg-zinc-100 relative flex items-center justify-center">
                  {mockups.billboard ? (
                    <img src={mockups.billboard} alt="Urban Billboard" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center text-zinc-400 gap-1.5">
                      <ImageIcon size={28} />
                      <span className="text-[10px] font-bold uppercase tracking-wide">Billboard Mockup</span>
                    </div>
                  )}
                </div>
                <div className="p-4 border-t border-zinc-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-700">Out of Home (OOH) Urban Signage</span>
                  <span className="text-[9px] uppercase font-black text-brand tracking-widest">Active</span>
                </div>
              </div>

              {/* Door Hanger */}
              <div className="bg-white border border-zinc-200/80 rounded-3xl overflow-hidden shadow-sm flex flex-col h-[320px]">
                <div className="flex-1 bg-zinc-100 relative flex items-center justify-center">
                  {mockups.doorHanger ? (
                    <img src={mockups.doorHanger} alt="Wooden Door Hanger" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center text-zinc-400 gap-1.5">
                      <ImageIcon size={28} />
                      <span className="text-[10px] font-bold uppercase tracking-wide">Wood Signage</span>
                    </div>
                  )}
                </div>
                <div className="p-4 border-t border-zinc-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-700">Wooden Hanger Tag</span>
                  <span className="text-[9px] uppercase font-black text-brand tracking-widest">Active</span>
                </div>
              </div>
            </div>
          </div>
        </section>
        
      </main>
    </div>
  )
}
