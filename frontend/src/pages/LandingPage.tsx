import React from 'react';

export const LandingPage: React.FC = () => {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#080810] flex flex-col">
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-5 sm:py-6 flex items-center justify-between">
        <img
          src="/DEXi.png"
          alt="Dex"
          className="h-14 w-14 sm:h-16 sm:w-16 object-contain"
        />

        <div className="flex items-center gap-3 sm:gap-5">
          <button className="rounded-lg px-3 py-2 text-sm font-semibold text-[#A855F7] transition-colors hover:text-[#C084FC] cursor-pointer">
            Login
          </button>
          <button className="rounded-xl bg-[#7C3AED] px-5 py-2.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[#6D28D9] active:bg-[#5B21B6] cursor-pointer">
            Sign Up
          </button>
        </div>
      </header>

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 text-center">
        <h1 className="max-w-4xl text-4xl font-display font-extrabold leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-7xl">
          Welcome to your{' '}
          <span className="bg-gradient-to-r from-[#A855F7] via-[#C084FC] to-[#2DD4BF] bg-clip-text text-transparent">
            Memories
          </span>
        </h1>
      </main>

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
