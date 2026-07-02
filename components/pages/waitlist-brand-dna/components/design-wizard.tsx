"use client"

import * as React from "react"
import { Sparkles, Loader2, Upload, Check, Palette, ArrowRight, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface FontPair {
  name: string
  heading: string
  body: string
}

const PRESET_FONT_PAIRS: FontPair[] = [
  { name: "Editorial & Grounded (Earthy)", heading: "DM Serif Display", body: "DM Sans" },
  { name: "Sleek & Clean (Modern)", heading: "Space Grotesk", body: "Inter" },
  { name: "Opulent & Sophisticated (Luxury)", heading: "Fraunces", body: "Inter" },
  { name: "Professional & Trustworthy (Corporate)", heading: "Plus Jakarta Sans", body: "Inter" },
  { name: "Bold & Expressive (Consumer)", heading: "Bricolage Grotesque", body: "DM Sans" }
]

interface DesignWizardProps {
  waitlistId: number
  onBackToDna: () => void
}

export function DesignWizard({ waitlistId, onBackToDna }: DesignWizardProps) {
  const router = useRouter()
  const [wizardStep, setWizardStep] = React.useState<"logo" | "styles">("logo")
  const [isLoading, setIsLoading] = React.useState(true)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  // Options from API
  const [logoOptions, setLogoOptions] = React.useState<string[]>([])
  const [suggestedColor, setSuggestedColor] = React.useState("#18181b")
  const [suggestedFonts, setSuggestedFonts] = React.useState({ heading: "Space Grotesk", body: "Inter" })

  // User selections
  const [selectedLogo, setSelectedLogo] = React.useState<string>("")
  const [customColor, setCustomColor] = React.useState("#18181b")
  const [selectedFontPair, setSelectedFontPair] = React.useState<FontPair>({
    name: "Sleek & Clean (Modern)",
    heading: "Space Grotesk",
    body: "Inter"
  })

  // Load logo options & presets
  React.useEffect(() => {
    const initOptions = async () => {
      try {
        const res = await fetch(`/api/brand-dna/${waitlistId}/logo-options`, {
          method: "POST"
        })
        if (!res.ok) throw new Error("Failed to load logo variations.")
        const json = await res.json()
        if (json.success) {
          setLogoOptions(json.logoOptions || [])
          setSuggestedColor(json.suggestedColor || "#18181b")
          setCustomColor(json.suggestedColor || "#18181b")
          setSuggestedFonts(json.suggestedFonts || { heading: "Space Grotesk", body: "Inter" })
          
          // Match default selected font pair if any matches
          const matched = PRESET_FONT_PAIRS.find(p => p.heading === json.suggestedFonts?.heading)
          if (matched) setSelectedFontPair(matched)
          
          // Select first logo option by default
          if (json.logoOptions && json.logoOptions.length > 0) {
            setSelectedLogo(json.logoOptions[0])
          }
        }
      } catch (err: any) {
        console.error(err)
        toast.error("Initialization Failed", {
          description: err.message || "Could not generate logo variations. Retrying...",
        })
      } finally {
        setIsLoading(false)
      }
    }

    initOptions()
  }, [waitlistId])

  // Custom Logo Upload
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = React.useState(false)

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    const formData = new FormData()
    formData.append("file", file)

    try {
      const res = await fetch(`/api/brand-dna/${waitlistId}/upload-logo`, {
        method: "POST",
        body: formData
      })
      if (!res.ok) throw new Error("Logo upload failed.")
      const json = await res.json()
      if (json.success && json.logoUrl) {
        // Add to options and select it
        setLogoOptions(prev => [json.logoUrl, ...prev])
        setSelectedLogo(json.logoUrl)
        toast.success("Logo Uploaded", {
          description: "Your custom logo has been saved and selected."
        })
      }
    } catch (err: any) {
      console.error(err)
      toast.error("Upload Error", {
        description: err.message || "Failed to upload custom logo file."
      })
    } finally {
      setIsUploading(false)
    }
  }

  // Trigger Final Generation
  const handleFinalSubmit = async () => {
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/brand-dna/${waitlistId}/visual-identity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          logoUrl: selectedLogo,
          brandColorHex: customColor,
          typographyJson: {
            heading: selectedFontPair.heading,
            body: selectedFontPair.body
          }
        })
      })

      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || "Failed to enqueue visual identity pipeline.")
      }

      router.push(`/waitlist/${waitlistId}/visual-identity`)
    } catch (error: any) {
      console.error(error)
      toast.error("Generation Error", {
        description: error.message || "Failed to trigger visual identity generator."
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="w-full py-20 flex flex-col items-center justify-center space-y-4">
        <div className="relative">
          <div className="w-20 h-20 rounded-2xl bg-brand/5 flex items-center justify-center text-brand animate-pulse">
            <Sparkles size={36} />
          </div>
          <div className="absolute -bottom-1 -right-1 bg-white p-1 rounded-lg shadow-sm">
            <Loader2 size={16} className="text-brand animate-spin" />
          </div>
        </div>
        <div className="text-center space-y-1">
          <h3 className="text-lg font-black text-white">Generating Logo Options</h3>
          <p className="text-sm text-zinc-400 max-w-sm leading-normal">
            Our AI engine is preparing three unique visual mark directions for your brand...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 text-left relative z-10">
      {/* Step Indicators */}
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider text-brand">
            Step {wizardStep === "logo" ? "1 of 2" : "2 of 2"}
          </span>
          <h2 className="text-2xl font-black text-white tracking-tight">
            {wizardStep === "logo" ? "Choose Your Brand Mark" : "Customize Brand Styling"}
          </h2>
        </div>
        <button
          onClick={onBackToDna}
          className="text-xs font-medium text-zinc-500 hover:text-white transition-colors"
        >
          ← Back to DNA Book
        </button>
      </div>

      {wizardStep === "logo" ? (
        <div className="space-y-6">
          <p className="text-sm text-zinc-400 leading-relaxed max-w-2xl">
            Select one of the three custom vector marks generated specifically for your brand archetype, or upload your own PNG/SVG logo mark. Whichever option you choose will be warped onto apparel, packages, and stationery.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {logoOptions.map((logo, idx) => (
              <div
                key={idx}
                onClick={() => setSelectedLogo(logo)}
                className={`relative aspect-square rounded-[2rem] bg-white border-2 cursor-pointer transition-all duration-300 overflow-hidden flex items-center justify-center group p-8 ${
                  selectedLogo === logo
                    ? "border-brand shadow-lg shadow-brand/10 scale-[1.02]"
                    : "border-zinc-100 hover:border-zinc-300 hover:scale-[1.01]"
                }`}
              >
                <img
                  src={logo}
                  alt={`Logo Option ${idx + 1}`}
                  className="w-40 h-40 object-contain filter group-hover:scale-105 transition-transform duration-300"
                />
                
                {selectedLogo === logo && (
                  <div className="absolute top-4 right-4 bg-brand text-white p-1.5 rounded-full shadow-md">
                    <Check size={14} className="stroke-[3]" />
                  </div>
                )}
                
                <span className="absolute bottom-4 left-4 text-[9px] uppercase font-black tracking-widest text-zinc-400 bg-zinc-50 px-2 py-0.5 rounded">
                  Option {idx + 1}
                </span>
              </div>
            ))}
          </div>

          {/* Upload Area */}
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-white/10 hover:border-white/20 bg-white/5 rounded-3xl p-8 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleLogoUpload}
              accept="image/png, image/svg+xml"
              className="hidden"
            />
            {isUploading ? (
              <Loader2 size={24} className="text-brand animate-spin" />
            ) : (
              <Upload size={24} className="text-zinc-500" />
            )}
            <span className="text-sm font-bold text-white">Upload custom logo mark</span>
            <span className="text-xs text-zinc-400">Supports transparent PNG or SVG</span>
          </div>

          <div className="flex justify-end pt-4">
            <Button
              onClick={() => setWizardStep("styles")}
              disabled={!selectedLogo}
              className="bg-brand hover:bg-brand-hover text-white font-black h-12 px-8 rounded-xl shadow-lg shadow-brand/20 flex items-center gap-2"
            >
              Continue to Styling <ArrowRight size={16} />
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            
            {/* Color Palette Selector */}
            <div className="space-y-4">
              <h3 className="text-sm font-black uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                <Palette size={16} className="text-brand" /> 1. Brand Accent Color
              </h3>
              <p className="text-xs text-zinc-400 leading-normal">
                We've suggested a primary brand color matching your archetype, contrast-adjusted for WCAG 2.1 accessibility. Use the color picker to customize.
              </p>

              <div className="flex items-center gap-6 p-6 bg-white/5 border border-white/10 rounded-3xl">
                <div className="relative">
                  <input
                    type="color"
                    value={customColor}
                    onChange={(e) => setCustomColor(e.target.value)}
                    className="w-16 h-16 rounded-2xl border-none cursor-pointer p-0 bg-transparent overflow-hidden"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-zinc-500 block font-bold">Selected Accent</span>
                  <input
                    type="text"
                    value={customColor.toUpperCase()}
                    onChange={(e) => setCustomColor(e.target.value)}
                    className="bg-transparent border-b border-white/20 font-black text-xl text-white outline-none w-28 uppercase"
                  />
                </div>
              </div>
            </div>

            {/* Typography Selector */}
            <div className="space-y-4">
              <h3 className="text-sm font-black uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                📂 2. Curated Typography Pairings
              </h3>
              <p className="text-xs text-zinc-400 leading-normal">
                Select a font system to set the editorial tone. Headings use large bold display types while body blocks prioritize readability.
              </p>

              <div className="space-y-3">
                {PRESET_FONT_PAIRS.map((pair, idx) => {
                  const isSelected = selectedFontPair.name === pair.name
                  return (
                    <div
                      key={idx}
                      onClick={() => setSelectedFontPair(pair)}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                        isSelected
                          ? "bg-white/10 border-brand"
                          : "bg-white/5 border-white/5 hover:border-white/15"
                      }`}
                    >
                      <div className="space-y-1">
                        <span className="text-xs font-bold text-white block">{pair.name}</span>
                        <span className="text-[10px] text-zinc-400 font-medium">
                          {pair.heading} / {pair.body}
                        </span>
                      </div>
                      {isSelected && (
                        <div className="w-5 h-5 bg-brand text-white rounded-full flex items-center justify-center shadow">
                          <Check size={12} className="stroke-[3]" />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

          </div>

          <div className="flex items-center justify-between pt-6 border-t border-white/5">
            <Button
              onClick={() => setWizardStep("logo")}
              className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold h-12 px-6 rounded-xl flex items-center gap-2 border border-white/5"
            >
              <ArrowLeft size={16} /> Back to Logo
            </Button>

            <Button
              onClick={handleFinalSubmit}
              disabled={isSubmitting}
              className="bg-brand hover:bg-brand-hover text-white font-black h-12 px-8 rounded-xl shadow-lg shadow-brand/20 flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" /> Enqueuing Pipeline...
                </>
              ) : (
                <>
                  <Sparkles size={18} /> Generate My Brand Identity <ArrowRight size={16} />
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
