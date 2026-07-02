"use client"

import * as React from "react"
import { Sparkles, Loader2, Upload, Check, ArrowRight, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
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
  { name: "Bold & Expressive (Consumer)", heading: "Bricolage Grotesque", body: "DM Sans" },
]

// Derive a 4-colour palette from a single primary hex
function derivePalette(hex: string) {
  const c = hex.replace("#", "")
  const r = parseInt(c.substring(0, 2), 16)
  const g = parseInt(c.substring(2, 4), 16)
  const b = parseInt(c.substring(4, 6), 16)
  const toHex = (v: number) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, "0")
  const lighten = (v: number, amt: number) => Math.min(255, Math.round(v + (255 - v) * amt))
  const darken = (v: number, amt: number) => Math.max(0, Math.round(v * (1 - amt)))
  return {
    primary: hex,
    secondary: `#${toHex(lighten(r, 0.3))}${toHex(lighten(g, 0.3))}${toHex(lighten(b, 0.3))}`,
    accent: `#${toHex(darken(r, 0.15))}${toHex(darken(g, 0.15))}${toHex(darken(b, 0.15))}`,
    background: "#18181b",
  }
}

interface DesignWizardProps {
  waitlistId: number
  brandName?: string
  tagline?: string
  onBackToDna: () => void
}

export function DesignWizard({
  waitlistId,
  brandName = "Your Brand",
  tagline = "",
  onBackToDna,
}: DesignWizardProps) {
  const router = useRouter()
  const [wizardStep, setWizardStep] = React.useState<"logo" | "styles">("logo")
  const [isLoading, setIsLoading] = React.useState(true)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  // Options from API
  const [logoOptions, setLogoOptions] = React.useState<string[]>([])

  // User selections
  const [selectedLogo, setSelectedLogo] = React.useState<string>("")
  const [customColor, setCustomColor] = React.useState("#18181b")
  const [selectedFontPair, setSelectedFontPair] = React.useState<FontPair>({
    name: "Sleek & Clean (Modern)",
    heading: "Space Grotesk",
    body: "Inter",
  })

  const palette = React.useMemo(() => derivePalette(customColor), [customColor])
  const [pollTimedOut, setPollTimedOut] = React.useState(false)

  // Load logo options & presets
  React.useEffect(() => {
    let pollInterval: ReturnType<typeof setInterval> | null = null

    const initOptions = async () => {
      try {
        const res = await fetch(`/api/brand-dna/${waitlistId}/logo-options`, { method: "POST" })
        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}))
          throw new Error(errJson.error || "Failed to initialize brand styling.")
        }
        const json = await res.json()

        if (json.suggestedColor) {
          setCustomColor(json.suggestedColor)
        }
        if (json.suggestedFonts) {
          const matched = PRESET_FONT_PAIRS.find((p) => p.heading === json.suggestedFonts?.heading)
          if (matched) setSelectedFontPair(matched)
        }

        if (json.status === "ready" && json.logoOptions?.length >= 3) {
          setLogoOptions(json.logoOptions)
          setSelectedLogo(json.logoOptions[0])
          setIsLoading(false)
          return
        }

        setIsLoading(false)
        let elapsed = 0
        pollInterval = setInterval(async () => {
          elapsed += 4
          // Give up after 90 seconds and show retry UI
          if (elapsed >= 90) {
            if (pollInterval) clearInterval(pollInterval)
            setPollTimedOut(true)
            return
          }
          try {
            const pollRes = await fetch(`/api/brand-dna/${waitlistId}/logo-options`)
            if (!pollRes.ok) return
            const pollJson = await pollRes.json()
            if (pollJson.status === "ready" && pollJson.logoOptions?.length >= 3) {
              setLogoOptions(pollJson.logoOptions)
              setSelectedLogo(pollJson.logoOptions[0])
              setPollTimedOut(false)
              if (pollInterval) clearInterval(pollInterval)
            }
          } catch {
            // continue polling
          }
        }, 4000)
      } catch (err: any) {
        console.error(err)
        toast.error("Initialization Failed", {
          description: err.message || "Could not connect to brand styling service.",
        })
        setIsLoading(false)
      }
    }

    initOptions()
    return () => {
      if (pollInterval) clearInterval(pollInterval)
    }
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
      const res = await fetch(`/api/brand-dna/${waitlistId}/upload-logo`, { method: "POST", body: formData })
      if (!res.ok) throw new Error("Upload failed")
      const json = await res.json()
      if (json.url) {
        setSelectedLogo(json.url)
        toast.success("Logo uploaded successfully")
      }
    } catch (err: any) {
      toast.error("Upload Error", { description: err.message || "Failed to upload custom logo file." })
    } finally {
      setIsUploading(false)
    }
  }

  const handleFinalSubmit = async () => {
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/brand-dna/${waitlistId}/visual-identity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          logoUrl: selectedLogo,
          brandColorHex: customColor,
          typographyJson: { heading: selectedFontPair.heading, body: selectedFontPair.body },
        }),
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || "Failed to enqueue visual identity pipeline.")
      }
      router.push(`/waitlist/${waitlistId}/visual-identity`)
    } catch (error: any) {
      toast.error("Generation Error", {
        description: error.message || "Failed to trigger visual identity generator.",
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
          <h3 className="text-lg font-black text-white">Analyzing Your Brand</h3>
          <p className="text-sm text-zinc-400 max-w-sm leading-normal">
            Classifying archetype and generating your colour palette...
          </p>
        </div>
      </div>
    )
  }

  const SWATCH_META: { key: keyof ReturnType<typeof derivePalette>; label: string }[] = [
    { key: "primary", label: "Primary" },
    { key: "secondary", label: "Secondary" },
    { key: "accent", label: "Accent" },
    { key: "background", label: "Background" },
  ]

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 text-left relative z-10">
      {/* Step Header */}
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
        /* ─── STEP 1: Logo Selection ─────────────────────── */
        <div className="space-y-6">
          <p className="text-sm text-zinc-400 leading-relaxed max-w-2xl">
            Select one of the three custom vector marks generated specifically for your brand archetype, or
            upload your own PNG/SVG logo mark.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {logoOptions.length === 0 ? (
              pollTimedOut ? (
                // Timed out — show retry state across all 3 cards
                [0, 1, 2].map((idx) => (
                  <div
                    key={idx}
                    className="relative aspect-square rounded-[2rem] bg-white/5 border-2 border-red-500/20 flex flex-col items-center justify-center gap-3 p-8"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-400 text-xl">✗</div>
                    <span className="text-[9px] text-red-400 font-bold uppercase tracking-widest text-center">Generation failed</span>
                  </div>
                ))
              ) : (
                // Skeleton cards while logos generate
                [0, 1, 2].map((idx) => (
                  <div
                    key={idx}
                    className="relative aspect-square rounded-[2rem] bg-white/5 border-2 border-white/5 flex flex-col items-center justify-center gap-3 p-8 animate-pulse"
                  >
                    <div className="w-20 h-20 rounded-2xl bg-white/10" />
                    <div className="h-2 w-16 rounded bg-white/10" />
                    <div className="absolute bottom-4 left-4 flex items-center gap-1.5">
                      <Loader2 size={10} className="text-zinc-500 animate-spin" />
                      <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">
                        Generating...
                      </span>
                    </div>
                  </div>
                ))
              )
            ) : (
              logoOptions.map((logo, idx) => (
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
                    className="w-40 h-40 object-contain group-hover:scale-105 transition-transform duration-300"
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
              ))
            )}
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

          {/* Retry banner on timeout */}
          {pollTimedOut && (
            <div className="flex items-center justify-between gap-4 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
              <div>
                <p className="text-sm font-bold text-red-400">Logo generation timed out</p>
                <p className="text-xs text-zinc-400 mt-0.5">You can retry, or upload your own logo mark above.</p>
              </div>
              <Button
                onClick={async () => {
                  setPollTimedOut(false)
                  // Clear DB logoOptions and re-trigger generation
                  await fetch(`/api/brand-dna/${waitlistId}/logo-options`, { method: "POST" })
                  let elapsed = 0
                  const iv = setInterval(async () => {
                    elapsed += 4
                    if (elapsed >= 90) { clearInterval(iv); setPollTimedOut(true); return }
                    const r = await fetch(`/api/brand-dna/${waitlistId}/logo-options`).catch(() => null)
                    if (!r?.ok) return
                    const j = await r.json()
                    if (j.status === "ready" && j.logoOptions?.length >= 3) {
                      setLogoOptions(j.logoOptions)
                      setSelectedLogo(j.logoOptions[0])
                      setPollTimedOut(false)
                      clearInterval(iv)
                    }
                  }, 4000)
                }}
                className="bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 font-bold h-9 px-5 rounded-xl text-sm flex-shrink-0"
              >
                Retry Generation
              </Button>
            </div>
          )}

          {/* Hint while loading */}
          {logoOptions.length === 0 && !pollTimedOut && (
            <p className="text-[11px] text-zinc-600 text-center">
              Logo generation takes ~60s. You can upload your own while waiting.
            </p>
          )}

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
        /* ─── STEP 2: Colour & Typography (Vibiz-style) ─────────── */
        <div className="space-y-10">

          {/* Live brand name / tagline preview */}
          <div className="text-center space-y-1 pb-2">
            <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">
              Tweak colours and fonts — logo comes next
            </p>
            <h3
              className="text-3xl font-black text-white"
              style={{ fontFamily: `'${selectedFontPair.heading}', serif` }}
            >
              {brandName}
            </h3>
            {tagline && (
              <p
                className="text-sm text-zinc-400"
                style={{ fontFamily: `'${selectedFontPair.body}', sans-serif` }}
              >
                {tagline}
              </p>
            )}
          </div>

          {/* ── Colour swatches ───────────────────────────────── */}
          <div className="space-y-4">
            <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold text-center">
              Palette — click primary to tweak
            </p>

            {/* Swatches row */}
            <div className="flex items-end justify-center gap-6">
              {SWATCH_META.map(({ key, label }) => (
                <div key={key} className="flex flex-col items-center gap-2">
                  <div className="relative group">
                    {/* Invisible colour input sits on top of primary only */}
                    {key === "primary" && (
                      <input
                        type="color"
                        value={customColor}
                        onChange={(e) => setCustomColor(e.target.value)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                    )}
                    <div
                      className={`w-16 h-16 rounded-2xl shadow-md transition-all duration-200 ${
                        key === "primary"
                          ? "ring-2 ring-white/40 ring-offset-2 ring-offset-zinc-900 group-hover:scale-110 cursor-pointer"
                          : "opacity-80"
                      }`}
                      style={{ backgroundColor: palette[key] }}
                    />
                    {key === "primary" && (
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-zinc-800 border border-white/20 rounded-full flex items-center justify-center pointer-events-none">
                        <span className="text-[7px] text-white font-black">✏</span>
                      </div>
                    )}
                  </div>
                  <span className="text-[9px] uppercase font-bold tracking-widest text-zinc-500">{label}</span>
                </div>
              ))}
            </div>

            {/* Hex input */}
            <div className="flex items-center justify-center gap-3 pt-1">
              <div
                className="w-4 h-4 rounded-full flex-shrink-0 border border-white/10"
                style={{ backgroundColor: customColor }}
              />
              <input
                type="text"
                value={customColor.toUpperCase()}
                onChange={(e) => {
                  const v = e.target.value.startsWith("#") ? e.target.value : "#" + e.target.value
                  if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) setCustomColor(v)
                }}
                maxLength={7}
                className="bg-transparent border-b border-white/20 text-sm font-mono font-bold text-white outline-none w-24 uppercase text-center pb-0.5"
                placeholder="#HEXCODE"
              />
              <span className="text-[10px] text-zinc-600">primary hex</span>
            </div>
          </div>

          {/* ── Typography Aa Cards ───────────────────────────── */}
          <div className="space-y-3">
            <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold">Typography</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {PRESET_FONT_PAIRS.map((pair, idx) => {
                const isSelected = selectedFontPair.name === pair.name
                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedFontPair(pair)}
                    className={`relative rounded-2xl border-2 p-4 cursor-pointer transition-all duration-200 flex flex-col items-start gap-2 ${
                      isSelected
                        ? "border-brand bg-brand/5 shadow-lg shadow-brand/10"
                        : "border-white/8 bg-white/5 hover:border-white/20 hover:bg-white/8"
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-2.5 right-2.5 w-4 h-4 bg-brand text-white rounded-full flex items-center justify-center">
                        <Check size={9} className="stroke-[3]" />
                      </div>
                    )}
                    {/* Aa preview in actual fonts */}
                    <div className="flex items-end gap-1.5 leading-none">
                      <span
                        className="text-3xl font-bold text-white leading-none"
                        style={{ fontFamily: `'${pair.heading}', serif` }}
                      >
                        Aa
                      </span>
                      <span
                        className="text-lg text-zinc-400 leading-none mb-0.5"
                        style={{ fontFamily: `'${pair.body}', sans-serif` }}
                      >
                        Aa
                      </span>
                    </div>
                    {/* Font names */}
                    <div className="space-y-0.5 w-full">
                      <p className="text-[9px] font-bold text-zinc-300 leading-tight truncate">{pair.heading}</p>
                      <p className="text-[9px] text-zinc-500 leading-tight truncate">{pair.body}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-white/5">
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
