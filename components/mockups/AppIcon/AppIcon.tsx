import * as React from "react"

interface MockupProps {
  logoUrl: string | null
  brandName: string
  brandColor: string
}

export function AppIcon({ logoUrl, brandName, brandColor }: MockupProps) {
  return (
    <div className="flex flex-col items-center justify-center p-4">
      <div 
        className="w-24 h-24 rounded-[1.75rem] flex items-center justify-center shadow-lg relative overflow-hidden"
        style={{ backgroundColor: brandColor }}
      >
        {logoUrl ? (
          <img src={logoUrl} alt="App Icon" className="w-[60%] h-[60%] object-contain brightness-0 invert" />
        ) : (
          <span className="text-white text-3xl font-black">{brandName.charAt(0)}</span>
        )}
      </div>
      <span className="mt-3 text-xs font-bold text-zinc-500 uppercase tracking-wider">Mobile App Icon</span>
    </div>
  )
}
