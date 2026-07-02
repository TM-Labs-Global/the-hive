"use client"

import * as React from "react"
import { Card, CardContent } from "@/components/ui/card"
import QRCode from "qrcode"
import { cn } from "@/lib/utils"

interface MockupProps {
  logoUrl: string | null
  brandName: string
  brandColor: string
  fontPair: { heading: string; body: string }
  tagline?: string
  email?: string
}

export function BusinessCards({ logoUrl, brandName, brandColor, fontPair, tagline, email }: MockupProps) {
  const [qrCodeUrl, setQrCodeUrl] = React.useState<string>("")
  const [selectedVariant, setSelectedVariant] = React.useState<number>(0)

  React.useEffect(() => {
    const pageUrl = typeof window !== "undefined" ? window.location.href : "https://takeoutmedia.xyz"
    QRCode.toDataURL(pageUrl, {
      margin: 1,
      width: 150,
      color: {
        dark: "#18181b",
        light: "#ffffff",
      },
    })
      .then(setQrCodeUrl)
      .catch((err) => console.error("QR Code generation error:", err))
  }, [])

  const getDerivedWebsite = () => {
    if (email && email.includes("@")) {
      const domain = email.split("@")[1]
      const commonProviders = ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "icloud.com", "aol.com"]
      if (!commonProviders.includes(domain.toLowerCase())) {
        return `www.${domain}`
      }
    }
    return "www.example.com"
  }
  const website = getDerivedWebsite()

  const variants = [
    { name: "Logo Left, Info Right", desc: "Clean corporate layout with asymmetric balance" },
    { name: "Wave Abstract", desc: "Modern tech aesthetic with fluid background accents" },
    { name: "Color Block Bottom", desc: "Bold consumer layout utilizing a solid color block band" },
    { name: "Minimal luxury", desc: "Spacious minimalist alignment for high-end boutique brands" },
    { name: "Vertical Separator", desc: "Split grid divided by a crisp structural brand-colored line" },
  ]

  return (
    <div className="space-y-6 w-full">
      {/* Variant Selector Tabs */}
      <div className="flex flex-wrap gap-2 p-1 bg-zinc-200/50 rounded-xl border border-zinc-200/60 max-w-fit">
        {variants.map((v, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => setSelectedVariant(idx)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
              selectedVariant === idx
                ? "bg-white text-zinc-950 shadow-sm"
                : "text-zinc-500 hover:text-zinc-800"
            )}
          >
            {v.name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
        {/* FRONT SIDE */}
        <div className="space-y-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Card Front</span>
          <div className="relative aspect-[3.5/2] w-full rounded-2xl border border-zinc-200/80 bg-white shadow-md overflow-hidden p-8 flex flex-col justify-between select-none">
            {/* Background elements per variant */}
            {selectedVariant === 1 && (
              <svg className="absolute inset-0 w-full h-full opacity-10 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                <path d="M 0,100 C 150,200 350,0 500,100 L 500,300 L 0,300 Z" fill={brandColor} />
              </svg>
            )}

            <div className="flex items-start justify-between w-full">
              <div className="flex items-center gap-2">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="w-8 h-8 object-contain" />
                ) : (
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-black text-xs" style={{ backgroundColor: brandColor }}>
                    {brandName.charAt(0)}
                  </div>
                )}
                <span className="font-bold text-sm text-zinc-800 tracking-tight">{brandName}</span>
              </div>
              <span className="text-[8px] font-black uppercase tracking-widest text-zinc-400 font-mono">EST. {new Date().getFullYear()}</span>
            </div>

            <div className="space-y-1">
              <h5 className="font-brand-heading text-lg font-bold text-zinc-900 leading-none">
                {tagline || "Forward Together"}
              </h5>
              <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest">Brand Guideline Card</p>
            </div>
            
            {/* Color block band for variant 2 */}
            {selectedVariant === 2 && (
              <div className="absolute bottom-0 left-0 right-0 h-3" style={{ backgroundColor: brandColor }} />
            )}
          </div>
        </div>

        {/* BACK SIDE */}
        <div className="space-y-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Card Back</span>
          <div className="relative aspect-[3.5/2] w-full rounded-2xl border border-zinc-200/80 bg-zinc-950 text-white shadow-md overflow-hidden p-8 flex flex-col justify-between select-none">
            
            {/* Variant 3 (Minimal Light Back) override */}
            {selectedVariant === 3 ? (
              <div className="absolute inset-0 bg-white p-8 flex flex-col justify-between text-zinc-900">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-brand-heading text-sm font-bold text-zinc-800 leading-none">Jane Doe</h4>
                    <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest mt-1">Founder & CEO</p>
                  </div>
                  {qrCodeUrl && (
                    <img src={qrCodeUrl} alt="QR Code" className="w-12 h-12 object-contain border border-zinc-100 rounded-lg p-0.5" />
                  )}
                </div>
                <div className="flex justify-between items-end text-[9px] text-zinc-500 font-medium">
                  <div className="space-y-0.5 font-sans">
                    <p className="lowercase">{email || "hello@example.com"}</p>
                    <p>+1 (234) 567-890</p>
                  </div>
                  <div className="text-right space-y-0.5 font-sans">
                    <p>123 Brand Street</p>
                    <p className="font-black lowercase" style={{ color: brandColor }}>{website}</p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-brand-heading text-sm font-bold text-zinc-100 leading-none">Jane Doe</h4>
                    <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest mt-1">Founder & CEO</p>
                  </div>
                  
                  {/* Vertical Line Separator (variant 4) */}
                  {selectedVariant === 4 && (
                    <div className="absolute top-8 bottom-8 left-1/2 w-0.5 bg-zinc-800" style={{ backgroundColor: `${brandColor}40` }} />
                  )}

                  {qrCodeUrl && (
                    <img 
                      src={qrCodeUrl} 
                      alt="QR Code" 
                      className="w-12 h-12 object-contain bg-white rounded-lg p-0.5 border border-zinc-800/80" 
                    />
                  )}
                </div>

                <div className="flex justify-between items-end text-[9px] text-zinc-400 font-medium">
                  <div className="space-y-0.5 font-sans">
                    <p className="lowercase">{email || "hello@example.com"}</p>
                    <p>+1 (234) 567-890</p>
                  </div>
                  <div className="text-right space-y-0.5 font-sans">
                    <p>123 Brand Street</p>
                    <p className="font-black text-white lowercase">{website}</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      <p className="text-[10px] text-zinc-400 italic text-left">{variants[selectedVariant].desc}</p>
    </div>
  )
}
