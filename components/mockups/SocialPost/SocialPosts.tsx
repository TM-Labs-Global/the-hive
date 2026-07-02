"use client"

import * as React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface MockupProps {
  logoUrl: string | null
  brandName: string
  brandColor: string
  tagline?: string
  imageryUrls?: string[]
}

export function SocialPosts({ logoUrl, brandName, brandColor, tagline, imageryUrls }: MockupProps) {
  const [activeTab, setActiveTab] = React.useState<number>(0)
  const valImage = imageryUrls && imageryUrls.length > 0 ? imageryUrls[0] : null
  const secondImage = imageryUrls && imageryUrls.length > 1 ? imageryUrls[1] : null

  const templates = [
    { name: "Trending Topic", desc: "Minimal color-blocked text card optimized for high engagement quotes" },
    { name: "Team Introduction", desc: "Split image & text frame for highlighting human stories" },
    { name: "About Us Narrative", desc: "Diagonal geometric brand accent overlay displaying vision" },
  ]

  return (
    <div className="space-y-6 w-full text-left">
      {/* Tabs */}
      <div className="flex flex-wrap gap-2 p-1 bg-zinc-200/50 rounded-xl border border-zinc-200/60 max-w-fit">
        {templates.map((t, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => setActiveTab(idx)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
              activeTab === idx
                ? "bg-white text-zinc-950 shadow-sm"
                : "text-zinc-500 hover:text-zinc-800"
            )}
          >
            {t.name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
        {/* Render selected post side */}
        <div className="flex justify-center">
          <div className="w-full max-w-[400px]">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-2">1:1 Feed Post Template</span>
            
            {activeTab === 0 && (
              /* Variant 1: Trending Topic */
              <Card className="border border-zinc-200/80 bg-zinc-950 aspect-square flex flex-col justify-between p-8 text-white relative overflow-hidden shadow-md select-none rounded-[1.5rem]">
                <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full blur-3xl opacity-30" style={{ backgroundColor: brandColor }} />
                
                <div className="flex items-center gap-2 relative z-10">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo" className="w-6 h-6 object-contain brightness-0 invert" />
                  ) : (
                    <div className="w-6 h-6 rounded-md bg-white/20 flex items-center justify-center font-bold text-[10px]">{brandName.charAt(0)}</div>
                  )}
                  <span className="font-bold text-xs">{brandName}</span>
                </div>

                <div className="space-y-3 relative z-10 my-auto">
                  <h4 className="font-brand-heading text-2xl font-bold leading-tight">
                    "{tagline || "We build the tools to move faster."}"
                  </h4>
                  <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: brandColor }}>
                    #NextGenBrand
                  </p>
                </div>

                <div className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest relative z-10 flex justify-between border-t border-zinc-800/80 pt-4">
                  <span>INTRODUCING OUR VISION</span>
                  <span className="font-mono">01/03</span>
                </div>
              </Card>
            )}

            {activeTab === 1 && (
              /* Variant 2: Team Introduction */
              <Card className="border border-zinc-200/80 bg-white aspect-square grid grid-cols-2 shadow-md overflow-hidden select-none rounded-[1.5rem]">
                <div className="relative h-full w-full bg-zinc-100">
                  {valImage ? (
                    <img src={valImage} alt="Values image" className="w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 opacity-20" style={{ backgroundColor: brandColor }} />
                  )}
                  <div className="absolute inset-0 bg-black/25" />
                  <div className="absolute bottom-4 left-4 text-white">
                    <span className="text-[8px] font-black uppercase tracking-widest block opacity-70">Design Team</span>
                    <span className="text-xs font-bold">Jane Doe</span>
                  </div>
                </div>
                
                <div className="p-6 flex flex-col justify-between h-full bg-zinc-50">
                  <div className="flex items-center gap-1.5">
                    {logoUrl && <img src={logoUrl} alt="Logo" className="w-5 h-5 object-contain" />}
                    <span className="font-bold text-[9px] text-zinc-700">{brandName}</span>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs text-zinc-600 font-medium leading-relaxed italic">
                      "Creativity is in our DNA. We build standard templates for excellence."
                    </p>
                  </div>

                  <span className="text-[8px] text-zinc-400 font-black uppercase tracking-widest block border-t border-zinc-200 pt-3">
                    02/03 Team Spotlight
                  </span>
                </div>
              </Card>
            )}

            {activeTab === 2 && (
              /* Variant 3: About Us Narrative */
              <Card className="border border-zinc-200/80 bg-white aspect-square flex flex-col justify-between p-8 text-zinc-900 relative overflow-hidden shadow-md select-none rounded-[1.5rem]">
                {/* Diagonal brand accent background */}
                <svg className="absolute inset-0 w-full h-full opacity-10 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                  <polygon points="0,0 400,0 250,400 0,400" fill={brandColor} />
                </svg>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {logoUrl && <img src={logoUrl} alt="Logo" className="w-5 h-5 object-contain" />}
                    <span className="font-bold text-xs">{brandName}</span>
                  </div>
                  <span className="text-[8px] font-mono text-zinc-400 bg-zinc-100 border border-zinc-200 px-2 py-0.5 rounded">ABOUT US</span>
                </div>

                <div className="my-auto space-y-4">
                  <div className="w-8 h-1 rounded-full" style={{ backgroundColor: brandColor }} />
                  <h4 className="font-brand-heading text-2xl font-bold tracking-tight text-zinc-900 leading-tight">
                    Shaping the Future, Together.
                  </h4>
                  <p className="text-zinc-500 text-xs leading-relaxed font-medium">
                    We combine strategy, design, and execution to validate ideas and deliver impactful results for our clients.
                  </p>
                </div>

                <div className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest flex justify-between border-t border-zinc-150 pt-4">
                  <span>BRAND PRINCIPLES</span>
                  <span className="font-mono">03/03</span>
                </div>
              </Card>
            )}
          </div>
        </div>

        {/* DETAILS PANEL */}
        <div className="flex flex-col justify-center space-y-4">
          <h3 className="font-brand-heading text-xl font-bold tracking-tight text-zinc-900">
            Brand Post Composition
          </h3>
          <p className="text-sm text-zinc-500 leading-relaxed font-medium">
            This layout highlights how your visual elements automatically adapt to different content formats. Toggling the options showcases how fonts, colors, and logo variants interact dynamically.
          </p>
          <div className="bg-zinc-100/80 border border-zinc-200 rounded-2xl p-5 space-y-2">
            <span className="text-[9px] font-black uppercase text-zinc-400 block tracking-widest">Composition Details</span>
            <div className="grid grid-cols-2 gap-4 text-xs font-medium">
              <div>
                <span className="text-zinc-400 block mb-0.5">Template Selected</span>
                <span className="text-zinc-800 font-bold">{templates[activeTab].name}</span>
              </div>
              <div>
                <span className="text-zinc-400 block mb-0.5">Font Used</span>
                <span className="text-zinc-800 font-bold">Display Variable</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
