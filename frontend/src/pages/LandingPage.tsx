import React from 'react';

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen w-full flex flex-col bg-[#080810]">

      {/* Header */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <img
          src="/DEXi.png"
          alt="Dex"
          className="w-12 h-12 object-contain"
        />
        <div className="flex items-center gap-4">
          <button className="text-sm font-semibold text-[#A855F7] hover:text-[#C084FC] transition-colors cursor-pointer">
            Login
          </button>
          <button className="px-5 py-2 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-sm font-semibold transition-all cursor-pointer">
            Sign Up
          </button>
        </div>
      </header>

      {/* Middle */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-6">
        <h1 className="text-4xl sm:text-6xl font-display font-extrabold text-white tracking-tight leading-tight">
          Welcome to your{' '}
          <span className="bg-gradient-to-r from-[#A855F7] via-[#C084FC] to-[#2DD4BF] bg-clip-text text-transparent">
            Memories
          </span>
        </h1>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-white/5 py-6 px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono text-[#64748B]">
          <span>© 2026 Dex. All rights reserved.</span>
          <div className="flex items-center gap-5">
            <button className="hover:text-[#94A3B8] transition-colors cursor-pointer">Privacy Policy</button>
            <button className="hover:text-[#94A3B8] transition-colors cursor-pointer">Terms of Service</button>
            <button className="hover:text-[#94A3B8] transition-colors cursor-pointer">Contact</button>
          </div>
        </div>
      </footer>

    </div>
  );
};
