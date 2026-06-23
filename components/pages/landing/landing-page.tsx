"use client"

import * as React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { 
  Sparkles, 
  Target, 
  Heart, 
  MessageSquare, 
  Eye, 
  ShieldAlert, 
  ArrowRight,
  TrendingUp,
  Cpu,
  Users
} from "lucide-react"

const clientLogos = [
  { name: "Getly", src: "/brand-logos/getly.png" },
  { name: "Ingene Studios", src: "/brand-logos/ingene.png" },
  { name: "NIS 2026", src: "/brand-logos/nis-2026-logo-v2-whitenis-2026.png" },
  { name: "Design Teem", src: "/brand-logos/design-teem.png" },
  { name: "Takeout Media", src: "/brand-logos/takeout-media.png" },
  { name: "TM Africa", src: "/brand-logos/tm-africa.png" },
  { name: "TM Global", src: "/brand-logos/tm-global.png" },
  { name: "Cosgrove", src: "/brand-logos/cosgrove.png" },
  { name: "Taj Bank", src: "/brand-logos/taj-bank.png" },
  { name: "Digital Native Africa", src: "/brand-logos/digital-native-africa.png" },
]

export default function LandingPage() {
  return (
    <div className="w-full max-w-5xl mx-auto py-12 px-6 flex flex-col items-center">
      {/* Hero Section */}
      <section className="text-center max-w-4xl mx-auto mb-20 flex flex-col items-center">
        <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-bold text-brand uppercase tracking-wider mb-6 animate-fade-in">
          Brand DNA · Free Preview
        </span>
        
        <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tight text-white leading-tight font-display text-balance">
          <span className="block mb-2">The Tools to Move Faster.</span>
          <span className="text-brand block">The Team to Go Further.</span>
        </h1>
        
        <p className="text-muted-foreground text-lg md:text-xl mb-10 leading-relaxed font-sans max-w-2xl mx-auto">
          Import your brand assets in one click via URL or a quick description, and expect a Brand DNA that keeps your voice, visuals, and identity consistent everywhere you show up.
        </p>

        <div className="flex flex-col items-center gap-3">
          <Link href="/brand-dna" passHref>
            <Button className="h-16 px-8 bg-brand hover:bg-brand-hover text-white font-black rounded-2xl shadow-brand shadow-lg text-lg flex items-center gap-2 transition-all active:scale-98">
              Generate Your Brand DNA
              <ArrowRight size={20} />
            </Button>
          </Link>
          <span className="text-xs text-muted-foreground font-medium">
            Free. Takes under a minute. No credit card required.
          </span>
        </div>
      </section>

      {/* Client Logobar / Marquee */}
      <section className="w-full mb-28 overflow-hidden">
        <p className="text-[10px] uppercase tracking-[0.25em] text-zinc-500 font-bold mb-8 text-center">
          Trusted by Sharks
        </p>
        <div className="relative w-full overflow-hidden mask-marquee">
          <div className="animate-marquee flex items-center">
            {/* First set */}
            {clientLogos.map((logo, idx) => (
              <div key={`logo-1-${idx}`} className="flex items-center justify-center px-8 sm:px-12 h-12 w-44 sm:w-52 shrink-0">
                <img
                  src={logo.src}
                  alt={logo.name}
                  className="max-h-6 sm:max-h-7 max-w-full object-contain opacity-40 hover:opacity-85 transition-opacity duration-300 filter brightness-0 invert"
                />
              </div>
            ))}
            {/* Duplicate set for seamless scrolling */}
            {clientLogos.map((logo, idx) => (
              <div key={`logo-2-${idx}`} className="flex items-center justify-center px-8 sm:px-12 h-12 w-44 sm:w-52 shrink-0">
                <img
                  src={logo.src}
                  alt={logo.name}
                  className="max-h-6 sm:max-h-7 max-w-full object-contain opacity-40 hover:opacity-85 transition-opacity duration-300 filter brightness-0 invert"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What You'll Get (Output Preview Section) */}
      <section className="w-full mb-28 text-center">
        <div className="max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-black mb-4 tracking-tight text-white font-display">
            Here's what's inside your Brand DNA
          </h2>
          <p className="text-muted-foreground text-base leading-relaxed">
            One scan. A complete profile of how your brand sounds, who it speaks to, and what it stands for.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
          {/* Brand Essence */}
          <div className="bg-surface-dark-2 border border-white/5 rounded-[1.75rem] p-8 hover:border-brand/20 transition-all duration-300">
            <div className="w-12 h-12 bg-brand/10 border border-brand/20 rounded-xl flex items-center justify-center text-brand mb-6">
              <Sparkles size={24} />
            </div>
            <h3 className="text-lg font-bold text-white mb-2 font-display">Brand Essence</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              A clear, confident statement of who you are.
            </p>
          </div>

          {/* Target Audience */}
          <div className="bg-surface-dark-2 border border-white/5 rounded-[1.75rem] p-8 hover:border-brand/20 transition-all duration-300">
            <div className="w-12 h-12 bg-brand/10 border border-brand/20 rounded-xl flex items-center justify-center text-brand mb-6">
              <Target size={24} />
            </div>
            <h3 className="text-lg font-bold text-white mb-2 font-display">Target Audience</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Who you're really speaking to.
            </p>
          </div>

          {/* Core Values */}
          <div className="bg-surface-dark-2 border border-white/5 rounded-[1.75rem] p-8 hover:border-brand/20 transition-all duration-300">
            <div className="w-12 h-12 bg-brand/10 border border-brand/20 rounded-xl flex items-center justify-center text-brand mb-6">
              <Heart size={24} />
            </div>
            <h3 className="text-lg font-bold text-white mb-2 font-display">Core Values</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              What your brand stands for, distilled.
            </p>
          </div>

          {/* Tone Attributes */}
          <div className="bg-surface-dark-2 border border-white/5 rounded-[1.75rem] p-8 hover:border-brand/20 transition-all duration-300">
            <div className="w-12 h-12 bg-brand/10 border border-brand/20 rounded-xl flex items-center justify-center text-brand mb-6">
              <MessageSquare size={24} />
            </div>
            <h3 className="text-lg font-bold text-white mb-2 font-display">Tone Attributes</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              The personality behind every word you write.
            </p>
          </div>

          {/* Visual Direction */}
          <div className="bg-surface-dark-2 border border-white/5 rounded-[1.75rem] p-8 hover:border-brand/20 transition-all duration-300">
            <div className="w-12 h-12 bg-brand/10 border border-brand/20 rounded-xl flex items-center justify-center text-brand mb-6">
              <Eye size={24} />
            </div>
            <h3 className="text-lg font-bold text-white mb-2 font-display">Visual Direction</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              The look and feel that should carry across your brand.
            </p>
          </div>

          {/* Editorial Guardrails */}
          <div className="bg-surface-dark-2 border border-white/5 rounded-[1.75rem] p-8 hover:border-brand/20 transition-all duration-300">
            <div className="w-12 h-12 bg-brand/10 border border-brand/20 rounded-xl flex items-center justify-center text-brand mb-6">
              <ShieldAlert size={24} />
            </div>
            <h3 className="text-lg font-bold text-white mb-2 font-display">Editorial Guardrails</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              What to avoid, so your voice stays consistent.
            </p>
          </div>
        </div>
      </section>

      {/* What's Coming (Roadmap Section) */}
      <section className="w-full mb-28 border-t border-white/5 pt-20">
        <div className="max-w-2xl mx-auto mb-16 text-center">
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold text-brand uppercase tracking-wider mb-4">
            Roadmap
          </span>
          <h2 className="text-3xl md:text-4xl font-black mb-4 tracking-tight text-white font-display">
            This is just the beginning.
          </h2>
          <p className="text-muted-foreground text-base leading-relaxed">
            Brand DNA is the first piece of The Hive — a full platform built to take you from idea to live campaign, without switching tools or losing your team.
          </p>
        </div>

        {/* Roadmap Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {/* Multi-Channel Ads */}
          <div className="bg-surface-dark/40 border border-white/5 rounded-[1.75rem] p-8 relative overflow-hidden opacity-60">
            <span className="absolute top-4 right-4 bg-white/5 border border-white/10 text-[9px] font-extrabold uppercase px-2.5 py-1 rounded-full text-muted-foreground tracking-wider">
              Coming Soon
            </span>
            <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-muted-foreground mb-6">
              <TrendingUp size={20} />
            </div>
            <h3 className="text-lg font-bold text-white mb-3 font-display">Run Multi-Channel Ads</h3>
            <p className="text-muted-foreground text-xs leading-relaxed">
              Reach the right audience across Meta, Google, and LinkedIn with AI-assisted campaign execution. No more managing multiple platforms.
            </p>
          </div>

          {/* AI Creative Studio */}
          <div className="bg-surface-dark/40 border border-white/5 rounded-[1.75rem] p-8 relative overflow-hidden opacity-60">
            <span className="absolute top-4 right-4 bg-white/5 border border-white/10 text-[9px] font-extrabold uppercase px-2.5 py-1 rounded-full text-muted-foreground tracking-wider">
              Coming Soon
            </span>
            <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-muted-foreground mb-6">
              <Cpu size={20} />
            </div>
            <h3 className="text-lg font-bold text-white mb-3 font-display">AI Creative Studio</h3>
            <p className="text-muted-foreground text-xs leading-relaxed">
              Turn simple prompts into briefs, copy, designs, content, and campaigns — ready to launch.
            </p>
          </div>

          {/* Takeout Media On-Demand */}
          <div className="bg-surface-dark/40 border border-white/5 rounded-[1.75rem] p-8 relative overflow-hidden opacity-60">
            <span className="absolute top-4 right-4 bg-white/5 border border-white/10 text-[9px] font-extrabold uppercase px-2.5 py-1 rounded-full text-muted-foreground tracking-wider">
              Coming Soon
            </span>
            <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-muted-foreground mb-6">
              <Users size={20} />
            </div>
            <h3 className="text-lg font-bold text-white mb-3 font-display">Takeout Media On-Demand</h3>
            <p className="text-muted-foreground text-xs leading-relaxed">
              Some things need an expert's touch. Work directly with an experienced creative team on campaigns, custom productions, and bespoke strategy.
            </p>
          </div>
        </div>

        {/* Supporting Paragraph */}
        <div className="max-w-3xl mx-auto text-center border border-white/5 bg-surface-dark-2/50 rounded-[2rem] p-8 md:p-12">
          <p className="text-muted-foreground text-sm md:text-base leading-relaxed">
            Good marketing takes people. Great marketing takes the right people and the right tools. The Hive pairs experienced creatives with AI systems built for speed, scale, and execution — so you can create campaigns, reach the right audience, and grow your brand with a team invested in your success.
          </p>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="w-full text-center border-t border-white/5 pt-20 pb-12 flex flex-col items-center">
        <h2 className="text-4xl md:text-5xl font-black mb-4 tracking-tight text-white font-display">
          Your next campaign starts here.
        </h2>
        <p className="text-muted-foreground text-base max-w-xl mx-auto mb-10 leading-relaxed">
          Build a brand your audience can't forget. Start with your free Brand DNA — the first step in moving faster and going further with The Hive.
        </p>

        <Link href="/brand-dna" passHref>
          <Button className="h-16 px-8 bg-brand hover:bg-brand-hover text-white font-black rounded-2xl shadow-brand shadow-lg text-lg flex items-center gap-2 transition-all active:scale-98">
            Get Started Today
            <ArrowRight size={20} />
          </Button>
        </Link>
      </section>
    </div>
  )
}
