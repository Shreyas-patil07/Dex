import React from 'react';

export const LandingPage: React.FC = () => {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#080810] flex flex-col">
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
        <svg className="absolute -left-[20%] -top-[8%] h-[116%] w-[140%] opacity-[0.19]" viewBox="0 0 1200 700" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path className="dex-orbit dex-orbit-one" d="M-700 590C-250 120 120 40 560 190C1000 340 1370 570 2050 150" stroke="#7C3AED" strokeWidth="1.2" strokeLinecap="round" />
          <path className="dex-orbit dex-orbit-two" d="M-750 210C-280 650 160 650 610 360C1050 75 1450 120 2050 520" stroke="#A855F7" strokeWidth="0.9" strokeLinecap="round" />
          <path className="dex-orbit dex-orbit-three" d="M-500 850C-100 420 300 280 700 450C1080 610 1450 420 1900 -20" stroke="#2DD4BF" strokeWidth="0.7" strokeLinecap="round" />
          <circle className="dex-particle dex-particle-one" cx="260" cy="220" r="2" fill="#A855F7" />
          <circle className="dex-particle dex-particle-two" cx="850" cy="470" r="1.5" fill="#2DD4BF" />
          <circle className="dex-particle dex-particle-three" cx="1020" cy="230" r="1.5" fill="#A855F7" />
        </svg>
      </div>

      <style>{`
        .dex-orbit {
          transform-box: fill-box;
          transform-origin: center;
        }
        .dex-orbit-one { animation: dex-drift-one 22s linear infinite; }
        .dex-orbit-two { animation: dex-drift-two 28s linear infinite; }
        .dex-orbit-three { animation: dex-drift-three 34s linear infinite; }
        .dex-particle-one { animation: dex-pulse 5s ease-in-out infinite; }
        .dex-particle-two { animation: dex-pulse 7s ease-in-out 1s infinite; }
        .dex-particle-three { animation: dex-pulse 6s ease-in-out 2s infinite; }

        @keyframes dex-drift-one {
          0% { transform: translate3d(-120px, 70px, 0) rotate(-2deg); }
          50% { transform: translate3d(80px, -50px, 0) rotate(1deg); }
          100% { transform: translate3d(260px, 40px, 0) rotate(2deg); }
        }
        @keyframes dex-drift-two {
          0% { transform: translate3d(180px, -80px, 0) rotate(1.5deg); }
          50% { transform: translate3d(-70px, 70px, 0) rotate(-1deg); }
          100% { transform: translate3d(-300px, -30px, 0) rotate(-2deg); }
        }
        @keyframes dex-drift-three {
          0% { transform: translate3d(-160px, 100px, 0) rotate(-1deg); }
          50% { transform: translate3d(70px, -70px, 0) rotate(1deg); }
          100% { transform: translate3d(300px, 30px, 0) rotate(1.5deg); }
        }
        @keyframes dex-pulse {
          0%, 100% { opacity: 0.15; transform: scale(0.8); }
          50% { opacity: 0.65; transform: scale(1.35); }
        }
        @media (prefers-reduced-motion: reduce) {
          .dex-orbit, .dex-particle { animation: none; }
        }
      `}</style>

      <header className="relative z-8 w-full max-w-7xl mx-auto px-6 py-5 sm:py-6 flex items-center justify-between">
        <img
          src="/DEXi.png"
          alt="Dex"
          className="h-14 w-14 sm:h-10 sm:w-22 object-contain"
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
        <p className="mt-6 max-w-3xl text-xl font-medium tracking-wide text-[#94A3B8] sm:text-2xl lg:text-3xl">
          Explore yourself through what you watch.
        </p>
      </main>

      <footer className="relative z-10 w-full border-t border-white/[0.05] px-6 py-5 sm:py-6">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 text-xs font-mono text-[#64748B] sm:flex-row">
          <span>© 2026 Dex. All rights reserved.</span>
          <div className="flex items-center gap-4 sm:gap-5">
            <a href="/privacy-policy" className="transition-colors hover:text-[#94A3B8]">Privacy Policy</a>
            <a href="/terms-of-service" className="transition-colors hover:text-[#94A3B8]">Terms of Service</a>
            <a href="mailto:[Legal Contact Email]" className="transition-colors hover:text-[#94A3B8]">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
};
