import * as React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BrandDNA } from "@/types/brand-dna"
import { 
  Sparkles, 
  ShieldAlert, 
  Target, 
  Heart, 
  Eye, 
  Compass, 
  Briefcase, 
  TrendingUp, 
  Users, 
  Network,
  Scale,
  Award
} from "lucide-react"
import { cn } from "@/lib/utils"

export function DNASummaryCard({ 
  dna, 
  brandName, 
  faviconUrl 
}: { 
  dna: BrandDNA
  brandName?: string
  faviconUrl?: string | null
}) {
  const [activeTab, setActiveTab] = React.useState<"business" | "brand">("business")

  return (
    <div className="space-y-8 max-w-4xl mx-auto text-left relative z-10">
      {/* Brand Header Card */}
      <Card className="border-none bg-white p-8 rounded-3xl shadow-sm">
        <CardContent className="p-0">
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
              <div>
                <h1 className="font-display text-2xl font-black tracking-tight text-foreground">
                  {brandName || "Your Brand"}
                </h1>
                <p className="text-xs text-muted-foreground font-semibold">
                  Sovereign Brand Strategy Document
                </p>
              </div>
            </div>
            
            {/* Primary / Secondary Chapter Toggle */}
            <div className="flex bg-muted/60 p-1 rounded-xl border border-border">
              <button
                type="button"
                onClick={() => setActiveTab("business")}
                className={cn(
                  "px-4 py-2 rounded-lg text-xs font-black transition-all",
                  activeTab === "business" ? "bg-white text-brand shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                1. Business Strategy
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("brand")}
                className={cn(
                  "px-4 py-2 rounded-lg text-xs font-black transition-all",
                  activeTab === "brand" ? "bg-white text-brand shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                2. Brand Strategy
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 text-brand">
              <Compass size={18} />
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">The One Thing</span>
            </div>
            <h2 className="font-display text-2xl md:text-3xl font-black tracking-tight text-foreground italic">
              "{dna.tagline}"
            </h2>
            <p className="text-muted-foreground text-sm md:text-base leading-relaxed max-w-3xl">
              <span className="font-black text-foreground">Core Idea: {dna.oneThing}.</span> {dna.brandVoiceText}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Chapter View Switcher */}
      {activeTab === "business" ? (
        <div className="space-y-8 animate-fade-in">
          {/* Section 1: Findings & USPs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-none bg-white p-6 rounded-3xl shadow-sm">
              <CardContent className="p-0 space-y-4">
                <div className="flex items-center gap-2 text-brand">
                  <TrendingUp size={18} />
                  <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Ecosystem Findings</h3>
                </div>
                <ul className="space-y-2">
                  {dna.findings.map((finding, idx) => (
                    <li key={idx} className="text-sm text-foreground flex items-start gap-2 leading-relaxed">
                      <span className="h-1.5 w-1.5 rounded-full bg-brand shrink-0 mt-2" />
                      <span>{finding}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="border-none bg-white p-6 rounded-3xl shadow-sm">
              <CardContent className="p-0 space-y-4">
                <div className="flex items-center gap-2 text-brand">
                  <Award size={18} />
                  <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Core Differentiators</h3>
                </div>
                <div className="space-y-4">
                  {dna.differentiators.map((diff, idx) => (
                    <div key={idx} className="space-y-1">
                      <h4 className="text-sm font-black text-foreground">{diff.title}</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">{diff.description}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Section 2: Competitor Matrix */}
          <Card className="border-none bg-white p-6 rounded-3xl shadow-sm overflow-hidden">
            <CardContent className="p-0 space-y-4">
              <div className="flex items-center gap-2 text-brand">
                <Scale size={18} />
                <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Competitor Positioning</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-muted">
                      <th className="pb-3 font-black text-xs text-muted-foreground uppercase">Competitor</th>
                      <th className="pb-3 font-black text-xs text-muted-foreground uppercase">Geographic Coverage</th>
                      <th className="pb-3 font-black text-xs text-muted-foreground uppercase">Offering</th>
                      <th className="pb-3 font-black text-xs text-muted-foreground uppercase">Their Edge</th>
                      <th className="pb-3 font-black text-xs text-muted-foreground uppercase">Our Differentiation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dna.competitors.map((comp, idx) => (
                      <tr key={idx} className="border-b border-muted/50 last:border-none">
                        <td className="py-3.5 font-bold text-foreground pr-2">{comp.name}</td>
                        <td className="py-3.5 text-xs text-muted-foreground pr-2">{comp.coverage}</td>
                        <td className="py-3.5 text-xs text-muted-foreground pr-2">{comp.serviceAnalysis}</td>
                        <td className="py-3.5 text-xs text-muted-foreground pr-2">{comp.edge}</td>
                        <td className="py-3.5 text-xs font-semibold text-brand">{comp.differentiation}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Section 3: Target Audience & Segments */}
          <Card className="border-none bg-white p-6 rounded-3xl shadow-sm">
            <CardContent className="p-0 space-y-4">
              <div className="flex items-center gap-2 text-brand">
                <Users size={18} />
                <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Target Market Segments</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                {dna.targetSegments.map((seg, idx) => (
                  <div key={idx} className="border border-muted p-5 rounded-2xl space-y-3 bg-muted/10">
                    <div className="flex items-center justify-between">
                      <h4 className="font-display text-sm font-black text-foreground">{seg.segment}</h4>
                      <Badge className="bg-brand/15 text-brand border-none text-[8px] font-black uppercase tracking-widest px-2 py-0.5">
                        Segment {idx + 1}
                      </Badge>
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-xs text-foreground font-semibold"><span className="text-muted-foreground uppercase text-[9px] block">Who they are:</span> {seg.whoTheyAre}</p>
                      <p className="text-xs text-muted-foreground"><span className="text-muted-foreground uppercase text-[9px] block">Entry Point:</span> {seg.howTheyComeIn}</p>
                      <p className="text-xs text-brand font-medium"><span className="text-muted-foreground uppercase text-[9px] block">Our Value:</span> {seg.whatWeOffer}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Section 4: Customer Journeys */}
          <Card className="border-none bg-white p-6 rounded-3xl shadow-sm">
            <CardContent className="p-0 space-y-4">
              <div className="flex items-center gap-2 text-brand">
                <Network size={18} />
                <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Proposed Customer Journeys</h3>
              </div>
              <div className="space-y-6 pt-2">
                {dna.customerJourney.map((journey, idx) => (
                  <div key={idx} className="space-y-3 border-b border-muted/50 last:border-none pb-4 last:pb-0">
                    <h4 className="font-display text-sm font-black text-foreground">{journey.segment} Journey</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-muted/10 p-3 rounded-xl border border-muted/40 space-y-1">
                        <span className="text-[9px] font-black uppercase text-brand">1. Awareness</span>
                        <p className="text-[11px] text-muted-foreground leading-snug">{journey.stages.awareness.join(", ")}</p>
                      </div>
                      <div className="bg-muted/10 p-3 rounded-xl border border-muted/40 space-y-1">
                        <span className="text-[9px] font-black uppercase text-brand">2. Consideration</span>
                        <p className="text-[11px] text-muted-foreground leading-snug">{journey.stages.consideration.join(", ")}</p>
                      </div>
                      <div className="bg-muted/10 p-3 rounded-xl border border-muted/40 space-y-1">
                        <span className="text-[9px] font-black uppercase text-brand">3. Conversion</span>
                        <p className="text-[11px] text-muted-foreground leading-snug">{journey.stages.conversion.join(", ")}</p>
                      </div>
                      <div className="bg-muted/10 p-3 rounded-xl border border-muted/40 space-y-1">
                        <span className="text-[9px] font-black uppercase text-brand">4. Retention</span>
                        <p className="text-[11px] text-muted-foreground leading-snug">{journey.stages.retention.join(", ")}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Section 5: Future Milestones */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-none bg-white p-6 rounded-3xl shadow-sm">
              <CardContent className="p-0 space-y-4">
                <div className="flex items-center gap-2 text-brand">
                  <TrendingUp size={18} />
                  <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Brand Outlook (5-10 Years)</h3>
                </div>
                <ul className="space-y-2">
                  {dna.brandOutlook.map((o, idx) => (
                    <li key={idx} className="text-sm text-foreground flex items-start gap-2 leading-relaxed">
                      <span className="h-1.5 w-1.5 rounded-full bg-brand shrink-0 mt-2" />
                      <span>{o}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="border-none bg-white p-6 rounded-3xl shadow-sm">
              <CardContent className="p-0 space-y-4">
                <div className="flex items-center gap-2 text-brand">
                  <Compass size={18} />
                  <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Strategic Steps</h3>
                </div>
                <ul className="space-y-2">
                  {dna.strategicSteps.map((s, idx) => (
                    <li key={idx} className="text-sm text-foreground flex items-start gap-2 leading-relaxed">
                      <span className="h-1.5 w-1.5 rounded-full bg-brand shrink-0 mt-2" />
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <div className="space-y-8 animate-fade-in">
          {/* Section A: Core Foundation */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-none bg-white p-6 rounded-3xl shadow-sm">
              <CardContent className="p-0 space-y-4">
                <div className="flex items-center gap-2 text-brand">
                  <Heart size={18} />
                  <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Brand Purpose & Vision</h3>
                </div>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <span className="text-[9px] font-black uppercase text-muted-foreground">Purpose</span>
                    <p className="text-sm text-foreground leading-relaxed">{dna.brandPurpose}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] font-black uppercase text-muted-foreground">Vision</span>
                    <p className="text-sm text-foreground leading-relaxed">{dna.brandVision}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] font-black uppercase text-muted-foreground">Mission</span>
                    <p className="text-sm text-foreground leading-relaxed">{dna.brandMission}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none bg-white p-6 rounded-3xl shadow-sm">
              <CardContent className="p-0 space-y-4">
                <div className="flex items-center gap-2 text-brand">
                  <Target size={18} />
                  <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Promise & Positioning</h3>
                </div>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <span className="text-[9px] font-black uppercase text-muted-foreground">Positioning Statement</span>
                    <p className="text-xs text-foreground font-semibold bg-muted/30 border border-muted p-3.5 rounded-xl leading-relaxed">
                      {dna.positioningStatement}
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-black uppercase text-muted-foreground">Audience Promises</span>
                    <p className="text-xs text-muted-foreground"><span className="font-bold text-foreground">Customers:</span> {dna.brandPromise.msmes}</p>
                    <p className="text-xs text-muted-foreground"><span className="font-bold text-foreground">Intermediaries:</span> {dna.brandPromise.intermediaries}</p>
                    <p className="text-xs text-muted-foreground"><span className="font-bold text-foreground">Backers:</span> {dna.brandPromise.investors}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Section B: Archetype Framework */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-none bg-white p-6 rounded-3xl shadow-sm border border-brand/5">
              <CardContent className="p-0 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-brand">
                    <Sparkles size={18} />
                    <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Primary Archetype</h3>
                  </div>
                  <Badge className="bg-brand text-white border-none font-mono font-black text-xs px-2.5 py-1 rounded-lg">
                    {dna.brandArchetype.primary.name} ({dna.brandArchetype.primary.percentage}%)
                  </Badge>
                </div>
                <div className="space-y-3">
                  <p className="text-xs text-foreground leading-relaxed">{dna.brandArchetype.primary.overview}</p>
                  <div className="grid grid-cols-2 gap-3 text-xs border-t border-muted/50 pt-3">
                    <div>
                      <span className="text-[9px] font-black uppercase text-muted-foreground block">Desire</span>
                      <span className="font-medium text-foreground">{dna.brandArchetype.primary.coreDesire}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-black uppercase text-muted-foreground block">Philosophy</span>
                      <span className="font-medium text-foreground">{dna.brandArchetype.primary.philosophy}</span>
                    </div>
                  </div>
                  <div className="border-t border-muted/50 pt-3">
                    <span className="text-[9px] font-black uppercase text-muted-foreground block mb-1.5">Traits & Action Behaviour</span>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {dna.brandArchetype.primary.traits.map((t) => (
                        <Badge key={t} className="bg-muted text-foreground border-none font-bold text-[10px] py-1 px-2.5 rounded-lg">
                          {t}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-normal">{dna.brandArchetype.primary.behaviour}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none bg-white p-6 rounded-3xl shadow-sm">
              <CardContent className="p-0 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-brand">
                    <Sparkles size={18} />
                    <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Supporting Archetype</h3>
                  </div>
                  <Badge className="bg-muted text-foreground border-none font-mono font-black text-xs px-2.5 py-1 rounded-lg">
                    {dna.brandArchetype.secondary.name} ({dna.brandArchetype.secondary.percentage}%)
                  </Badge>
                </div>
                <div className="space-y-3">
                  <p className="text-xs text-foreground leading-relaxed">{dna.brandArchetype.secondary.overview}</p>
                  <div className="grid grid-cols-2 gap-3 text-xs border-t border-muted/50 pt-3">
                    <div>
                      <span className="text-[9px] font-black uppercase text-muted-foreground block block">Desire</span>
                      <span className="font-medium text-foreground">{dna.brandArchetype.secondary.coreDesire}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-black uppercase text-muted-foreground block">Philosophy</span>
                      <span className="font-medium text-foreground">{dna.brandArchetype.secondary.philosophy}</span>
                    </div>
                  </div>
                  <div className="border-t border-muted/50 pt-3">
                    <span className="text-[9px] font-black uppercase text-muted-foreground block mb-1.5">Traits & Action Behaviour</span>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {dna.brandArchetype.secondary.traits.map((t) => (
                        <Badge key={t} className="bg-muted text-foreground border-none font-bold text-[10px] py-1 px-2.5 rounded-lg">
                          {t}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-normal">{dna.brandArchetype.secondary.behaviour}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Section C: Personality, Voice & Culture */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-none bg-white p-5 rounded-3xl shadow-sm">
              <CardContent className="p-0 space-y-4">
                <div className="flex items-center gap-2 text-brand">
                  <Sparkles size={16} />
                  <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Personality</h3>
                </div>
                <div className="space-y-3">
                  {dna.brandPersonality.map((p, idx) => (
                    <div key={idx} className="space-y-0.5">
                      <span className="text-xs font-black text-foreground">{p.trait}</span>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">{p.description}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-none bg-white p-5 rounded-3xl shadow-sm">
              <CardContent className="p-0 space-y-4">
                <div className="flex items-center gap-2 text-brand">
                  <Compass size={16} />
                  <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Voice & Tone</h3>
                </div>
                <div className="space-y-3">
                  {dna.brandVoice.map((v, idx) => (
                    <div key={idx} className="space-y-0.5">
                      <span className="text-xs font-black text-foreground">{v.attribute}</span>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">{v.description}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-none bg-white p-5 rounded-3xl shadow-sm">
              <CardContent className="p-0 space-y-4">
                <div className="flex items-center gap-2 text-brand">
                  <Heart size={16} />
                  <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Internal Culture</h3>
                </div>
                <div className="space-y-3">
                  {dna.brandCulture.map((c, idx) => (
                    <div key={idx} className="space-y-0.5">
                      <span className="text-xs font-black text-foreground">{c.value}</span>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">{c.description}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Section D: Tagline Options & Visuals */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-none bg-white p-6 rounded-3xl shadow-sm">
              <CardContent className="p-0 space-y-4">
                <div className="flex items-center gap-2 text-brand">
                  <Compass size={18} />
                  <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Tagline Options</h3>
                </div>
                <div className="space-y-4">
                  {dna.taglineOptions.map((t, idx) => (
                    <div key={idx} className="space-y-1 border-b border-muted pb-3 last:border-none last:pb-0">
                      <span className="text-xs font-black text-brand">"{t.tagline}"</span>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">{t.rationale}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-none bg-white p-6 rounded-3xl shadow-sm">
              <CardContent className="p-0 space-y-4">
                <div className="flex items-center gap-2 text-brand">
                  <Eye size={18} />
                  <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Visual Identity Guidelines</h3>
                </div>
                <p className="text-xs text-foreground leading-relaxed bg-muted/20 border border-muted p-4 rounded-2xl">
                  {dna.visualDirection}
                </p>

                <div className="border-t border-muted pt-4 space-y-2">
                  <div className="flex items-center gap-2 text-red-500">
                    <ShieldAlert size={16} />
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Editorial Guardrails (What to Avoid)</span>
                  </div>
                  <ul className="grid grid-cols-1 gap-1">
                    {dna.doNotSay.map((topic) => (
                      <li key={topic} className="text-xs text-muted-foreground flex items-center gap-2 font-medium">
                        <div className="h-1 w-1 rounded-full bg-red-500 shrink-0" />
                        <span>{topic}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}

