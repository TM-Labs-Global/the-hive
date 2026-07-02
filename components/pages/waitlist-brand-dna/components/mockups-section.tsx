"use client"

import * as React from "react"
import { Layout, ChevronRight, Image as ImageIcon, Loader2, AlertCircle, RefreshCw } from "lucide-react"
import { BusinessCards } from "@/components/mockups/BusinessCard/BusinessCards"
import { AppIcon } from "@/components/mockups/AppIcon/AppIcon"
import { SocialPosts } from "@/components/mockups/SocialPost/SocialPosts"

interface MockupsSectionProps {
  waitlistId: number
  logoUrl: string | null
  brandName: string
  brandColor: string
  fontPair: {
    headingName: string
    bodyName: string
  }
  tagline: string
  email: string
}

interface MockupStatus {
  templateId: string
  category: string
  status: "pending" | "generating" | "ready" | "failed" | "fallback"
  resultUrl: string | null
  errorMessage: string | null
}

export function MockupsSection({
  waitlistId,
  logoUrl,
  brandName,
  brandColor,
  fontPair,
  tagline,
  email,
}: MockupsSectionProps) {
  const [mockups, setMockups] = React.useState<MockupStatus[]>([])
  const [isPolling, setIsPolling] = React.useState(true)
  const [retryCount, setRetryCount] = React.useState(0)

  // Fetch mockup generation status
  const fetchStatus = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/brand-dna/${waitlistId}/mockups`)
      if (!res.ok) throw new Error("Failed to fetch mockups status")
      const json = await res.json()
      if (json.success && json.mockups) {
        setMockups(json.mockups)
        
        // Stop polling if all mockups are finished (ready, fallback, or failed)
        const activeJob = json.mockups.some(
          (m: MockupStatus) => m.status === "pending" || m.status === "generating"
        )
        setIsPolling(activeJob)
      }
    } catch (err) {
      console.error("Error polling mockups:", err)
    }
  }, [waitlistId])

  // Trigger poll on mount and when polling is active
  React.useEffect(() => {
    fetchStatus()

    if (!isPolling) return

    const intervalId = setInterval(fetchStatus, 3000)
    return () => clearInterval(intervalId)
  }, [isPolling, fetchStatus, retryCount])

  // Map backend template records to UI merch roles
  // Mappings:
  // apparel -> apparel (recolored tee), toteBag (tote canvas)
  // physical -> keychain (keychain tag), doorHanger (wooden hanger tag)
  // environment -> billboard (urban signage)
  const getMockupByRole = (role: "apparel" | "toteBag" | "keychain" | "billboard" | "doorHanger") => {
    const list = mockups.filter((m) => {
      if (role === "apparel" || role === "toteBag") return m.category === "apparel"
      if (role === "keychain" || role === "doorHanger") return m.category === "physical"
      return m.category === "environment" // billboard
    })

    if (role === "apparel" || role === "keychain" || role === "billboard") {
      return list[0] // Pick first for the primary role
    } else {
      return list[1] || list[0] // Pick second (or fallback to first) for secondary role
    }
  }

  const renderMockupCard = (
    role: "apparel" | "toteBag" | "keychain" | "billboard" | "doorHanger",
    title: string,
    subtitle: string,
    isSpanTwo = false
  ) => {
    const mockup = getMockupByRole(role)

    // Skeletons / States
    const isPending = !mockup || mockup.status === "pending"
    const isGenerating = mockup?.status === "generating"
    const isFailed = mockup?.status === "failed"
    const isSuccess = mockup?.status === "ready" || mockup?.status === "fallback"
    const imageUrl = mockup?.resultUrl

    return (
      <div 
        className={`bg-white border border-zinc-200/80 rounded-3xl overflow-hidden shadow-sm flex flex-col h-[320px] transition-all duration-300 hover:shadow-md ${
          isSpanTwo ? "sm:col-span-2" : ""
        }`}
      >
        <div className="flex-1 bg-zinc-50 relative flex items-center justify-center overflow-hidden">
          {isSuccess && imageUrl ? (
            <img 
              src={imageUrl} 
              alt={title} 
              className="w-full h-full object-cover animate-fade-in transition-opacity duration-700" 
            />
          ) : isFailed ? (
            <div className="flex flex-col items-center text-red-400 gap-2 px-4 text-center">
              <AlertCircle size={28} />
              <span className="text-[10px] font-bold uppercase tracking-wide">Generation Failed</span>
              <p className="text-[10px] text-zinc-400 leading-normal max-w-[200px]">
                {mockup?.errorMessage || "API error. Click guideline restart to retry."}
              </p>
            </div>
          ) : (
            // Shimmering skeleton & worker indicator
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-50/50">
              <div className="absolute inset-0 bg-gradient-to-r from-zinc-50 via-zinc-100/70 to-zinc-50 bg-[length:200%_100%] animate-shimmer" />
              <div className="relative z-10 flex flex-col items-center gap-3">
                <div className="p-3 bg-white rounded-xl shadow-sm border border-zinc-100 flex items-center justify-center">
                  <Loader2 size={22} className="text-brand animate-spin" />
                </div>
                <div className="text-center space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 block">
                    {isGenerating ? "Inpainting Mark..." : "Queuing Inpainter..."}
                  </span>
                  <span className="text-[9px] text-zinc-400 block font-medium">
                    {isGenerating ? "Baking depth, fabric & shadows" : "Awaiting GPU worker"}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="p-4 border-t border-zinc-100 flex items-center justify-between bg-white z-10">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-zinc-800">{title}</span>
            <span className="text-[9px] text-zinc-400 font-medium">{subtitle}</span>
          </div>
          <span 
            className={`text-[9px] uppercase font-black tracking-widest px-2 py-0.5 rounded-full ${
              isSuccess 
                ? mockup?.status === "fallback" 
                  ? "text-amber-600 bg-amber-50" 
                  : "text-brand bg-brand/5" 
                : "text-zinc-400 bg-zinc-100"
            }`}
          >
            {isSuccess 
              ? mockup?.status === "fallback" 
                ? "Fallback" 
                : "Ready" 
              : isGenerating 
                ? "Baking" 
                : "Queued"}
          </span>
        </div>
      </div>
    )
  }

  const triggerRetry = async () => {
    setIsPolling(true)
    setRetryCount((c) => c + 1)
    await fetch(`/api/brand-dna/${waitlistId}/mockups`, { method: "POST" })
  }

  return (
    <section className="space-y-8">
      {/* Global CSS inject for shimmer animation */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .animate-shimmer {
          animation: shimmer 1.8s infinite linear;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.98); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in {
          animation: fadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}} />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-zinc-500">
          <Layout size={18} />
          <span className="text-xs font-black uppercase tracking-widest">5.0 Digital Mockups & Collaterals</span>
        </div>
        {!isPolling && mockups.some((m) => m.status === "failed") && (
          <button
            onClick={triggerRetry}
            className="text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-brand flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw size={12} /> Retry Failed
          </button>
        )}
      </div>

      {/* Business Cards & Mobile App Icon */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <h4 className="font-brand-heading text-sm font-bold text-zinc-700 flex items-center gap-2">
            <ChevronRight size={14} className="text-brand" /> Business Stationary Systems
          </h4>
          <BusinessCards
            logoUrl={logoUrl}
            brandName={brandName}
            brandColor={brandColor}
            fontPair={{ heading: fontPair.headingName, body: fontPair.bodyName }}
            tagline={tagline}
            email={email}
          />
        </div>

        <div className="space-y-4 flex flex-col items-center">
          <h4 className="font-brand-heading text-sm font-bold text-zinc-700 self-start flex items-center gap-2">
            <ChevronRight size={14} className="text-brand" /> Application Glyph
          </h4>
          <div className="bg-white border border-zinc-200/80 shadow-sm rounded-3xl w-full h-[222px] flex items-center justify-center">
            <AppIcon logoUrl={logoUrl} brandName={brandName} brandColor={brandColor} />
          </div>
        </div>
      </div>

      {/* Social Posts Showcase */}
      <div className="space-y-4">
        <h4 className="font-brand-heading text-sm font-bold text-zinc-700 flex items-center gap-2">
          <ChevronRight size={14} className="text-brand" /> Social Templates
        </h4>
        <SocialPosts logoUrl={logoUrl} brandName={brandName} brandColor={brandColor} tagline={tagline} />
      </div>

      {/* Merch Compositions */}
      <div className="space-y-4">
        <h4 className="font-brand-heading text-sm font-bold text-zinc-700 flex items-center gap-2">
          <ChevronRight size={14} className="text-brand" /> Merch, Apparel, & Physical Environments
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {renderMockupCard("apparel", "Custom Recolored Tee", "Generative Apparel Composition")}
          {renderMockupCard("toteBag", "Composited Tote Canvas", "Heavyweight Organic Cotton Bag")}
          {renderMockupCard("keychain", "Keychain Tag", "Curated Acrylic/Metal Key Tag")}
          {renderMockupCard("billboard", "Out of Home (OOH) Urban Signage", "High-exposure Large Scale Urban Billboard", true)}
          {renderMockupCard("doorHanger", "Wooden Hanger Tag", "Curated Wood-Etched Room Hanger")}
        </div>
      </div>
    </section>
  )
}
