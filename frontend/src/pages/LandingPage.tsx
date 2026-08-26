import React from 'react';

export const LandingPage: React.FC = () => {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#080810] flex flex-col">
      {/* Subtle cinematic background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute left-1/2 top-[38%] h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#7C3AED]/[0.07] blur-[120px]" />
        <div className="absolute right-[-180px] top-[12%] h-[360px] w-[360px] rounded-full bg-[#A855F7]/[0.04] blur-[110px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(8,8,16,0.35)_55%,#080810_100%)]" />
      </div>

      {/* Header — same structure, slightly refined */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-5 sm:py-6 flex items-center justify-between">
        <img
          src="/DEXi.png"
          alt="Dex"
          className="h-11 w-11 sm:h-12 sm:w-12 object-contain transition-transform duration-300 hover:scale-105"
        />

        <div className="flex items-center gap-3 sm:gap-5">
          <button className="rounded-lg px-3 py-2 text-sm font-semibold text-[#A855F7] transition-colors hover:bg-white/[0.04] hover:text-[#C084FC] cursor-pointer">
            Login
          </button>
          <button className="rounded-xl bg-[#7C3AED] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_30px_rgba(124,58,237,0.18)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#6D28D9] hover:shadow-[0_10px_34px_rgba(124,58,237,0.28)] active:translate-y-0 cursor-pointer">
            Sign Up
          </button>
        </div>
      </header>

      {/* Hero — same content and purpose, improved visual hierarchy */}
      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="mb-7 flex items-center gap-2 rounded-full border border-white/[0.07] bg-white/[0.025] px-3.5 py-1.5 text-[11px] font-medium tracking-[0.16em] text-[#94A3B8] uppercase backdrop-blur-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-[#A855F7] shadow-[0_0_10px_rgba(168,85,247,0.7)]" />
          Your entertainment identity
        </div>

        <h1 className="max-w-4xl text-4xl font-display font-extrabold leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-7xl">
          Welcome to your{' '}
          <span className="bg-gradient-to-r from-[#A855F7] via-[#C084FC] to-[#2DD4BF] bg-clip-text text-transparent">
            Memories
          </span>
        </h1>

        <p className="mt-6 max-w-xl text-sm leading-6 text-[#64748B] sm:text-base">
          Your watches, your taste, your story — all in one place.
        </p>
      </main>

      {/* Footer — preserved, with cleaner spacing */}
      <footer className="relative z-10 w-full border-t border-white/[0.05] px-6 py-5 sm:py-6">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 text-xs font-mono text-[#64748B] sm:flex-row">
          <span>© 2026 Dex. All rights reserved.</span>
          <div className="flex items-center gap-4 sm:gap-5">
            <button className="transition-colors hover:text-[#94A3B8] cursor-pointer">Privacy Policy</button>
            <button className="transition-colors hover:text-[#94A3B8] cursor-pointer">Terms of Service</button>
            <button className="transition-colors hover:text-[#94A3B8] cursor-pointer">Contact</button>
          </div>
        </div>
      </footer>
    </div>
  );
};
