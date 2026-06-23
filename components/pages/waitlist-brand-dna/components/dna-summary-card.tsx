import * as React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BrandDNA } from "@/types/brand-dna"
import { Sparkles, ShieldAlert, Target, Heart, Eye } from "lucide-react"

export function DNASummaryCard({ 
  dna, 
  brandName, 
  faviconUrl 
}: { 
  dna: BrandDNA
  brandName?: string
  faviconUrl?: string | null
}) {
  return (
    <div className="space-y-6 max-w-4xl mx-auto text-left">
      {/* Header tagline card */}
      <Card className="border-none bg-white p-8 rounded-3xl shadow-sm">
        <CardContent className="p-0">
          {/* Brand Essence Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6 border-b border-muted pb-4">
            <div className="flex items-center gap-3">
              {faviconUrl && (
                <img
                  src={faviconUrl}
                  alt={`${brandName || "Brand"} Favicon`}
                  className="w-10 h-10 rounded-xl object-contain bg-muted p-1.5 border border-border"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = "none"
                  }}
                />
              )}
              <h1 className="font-display text-2xl font-black tracking-tight text-foreground">
                {brandName || "Your Brand"}
              </h1>
            </div>
            <Badge className="bg-brand/10 text-brand border-none text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg">
              Brand Essence
            </Badge>
          </div>

          <h2 className="font-display text-xl md:text-2xl font-black tracking-tight text-foreground mb-4 italic">
             "{dna.tagline}"
          </h2>
          <p className="text-muted-foreground text-sm md:text-base leading-relaxed max-w-3xl">
             {dna.brandVoice}
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* target audience */}
        <Card className="border-none bg-white p-6 rounded-3xl shadow-sm">
          <CardContent className="p-0">
            <div className="flex items-center gap-2 mb-4 text-brand">
              <Target size={18} />
              <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Target Audience</h3>
            </div>
            <p className="text-sm text-foreground leading-relaxed">
              {dna.targetAudience}
            </p>
          </CardContent>
        </Card>

        {/* core values */}
        <Card className="border-none bg-white p-6 rounded-3xl shadow-sm">
          <CardContent className="p-0">
            <div className="flex items-center gap-2 mb-4 text-brand">
              <Heart size={18} />
              <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Core Values</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {dna.coreValues.map((val) => (
                <Badge key={val} className="bg-muted text-foreground hover:bg-muted font-bold text-xs py-1.5 px-3 rounded-xl border-none">
                  {val}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* tone attributes */}
        <Card className="border-none bg-white p-6 rounded-3xl shadow-sm">
          <CardContent className="p-0">
            <div className="flex items-center gap-2 mb-4 text-brand">
              <Sparkles size={18} />
              <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Tone Attributes</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {dna.toneAttributes.map((attr) => (
                <Badge key={attr} className="bg-brand/10 text-brand hover:bg-brand/20 font-black text-xs py-1.5 px-3 rounded-xl border-none">
                  {attr}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* visual direction */}
        <Card className="border-none bg-white p-6 rounded-3xl shadow-sm">
          <CardContent className="p-0">
            <div className="flex items-center gap-2 mb-4 text-brand">
              <Eye size={18} />
              <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Visual Identity Direction</h3>
            </div>
            <p className="text-sm text-foreground leading-relaxed">
              {dna.visualDirection}
            </p>
          </CardContent>
        </Card>

        {/* guardrails / doNotSay */}
        <Card className="border-none bg-white p-6 rounded-3xl shadow-sm md:col-span-2">
          <CardContent className="p-0">
            <div className="flex items-center gap-2 mb-4 text-red-500">
              <ShieldAlert size={18} />
              <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Editorial Guardrails (What to Avoid)</h3>
            </div>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {dna.doNotSay.map((topic) => (
                <li key={topic} className="text-sm text-muted-foreground flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />
                  <span>{topic}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
