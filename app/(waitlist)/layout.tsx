import * as React from "react"

export default function WaitlistLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className="dark min-h-screen bg-[#0D0D0D] text-white selection:bg-brand/30 font-sans flex flex-col">
      {/* Header */}
      <header className="border-b border-white/5 bg-black/20 backdrop-blur-xl">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src="/brand-logos/hive-logo.png" 
              alt="The Hive Logo" 
              className="w-8 h-8 object-contain" 
            />
            <span className="font-display text-2xl font-bold tracking-tighter">
              The <span className="text-brand">Hive</span>
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold text-brand uppercase tracking-wider">
              Waitlist MVP
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col justify-center items-center py-12">
        {children}
      </main>

      {/* Footer */}
      <footer className="py-8 border-t border-white/5 text-center text-white/20 text-xs">
        <p>The Hive © 2026. All rights reserved. Built for creators by the Hive team.</p>
      </footer>
    </div>
  )
}
