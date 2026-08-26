import React from 'react';

const features = [
  { title: 'Track what you watch', text: 'Keep your movies and series, ratings, favorites, and watchlist in one place.' },
  { title: 'Discover your taste', text: 'Dex learns from your viewing history to reveal the patterns behind what you love.' },
  { title: 'Get recommendations', text: 'Find your next watch through recommendations shaped around your actual taste.' },
  { title: 'Build your identity', text: 'Turn years of watching into a profile that reflects your taste, habits, favorites, and evolution.' },
];

export const LandingPage: React.FC = () => {
  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-[#080810] text-white">
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
        <svg className="absolute -left-[20%] -top-[8%] h-[116%] w-[140%]" viewBox="0 0 1200 700" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
          <path d="M-700 590C-250 120 120 40 560 190C1000 340 1370 570 2050 150" stroke="#7C3AED" strokeWidth="1.2" strokeLinecap="round" opacity="0.19"><animateTransform attributeName="transform" type="translate" values="-220 90;220 -90;-220 90" dur="12s" repeatCount="indefinite" /></path>
          <path d="M-750 210C-280 650 160 650 610 360C1050 75 1450 120 2050 520" stroke="#A855F7" strokeWidth="0.9" strokeLinecap="round" opacity="0.17"><animateTransform attributeName="transform" type="translate" values="220 -110;-220 110;220 -110" dur="16s" repeatCount="indefinite" /></path>
          <path d="M-500 850C-100 420 300 280 700 450C1080 610 1450 420 1900 -20" stroke="#2DD4BF" strokeWidth="0.7" strokeLinecap="round" opacity="0.14"><animateTransform attributeName="transform" type="translate" values="-160 120;160 -120;-160 120" dur="20s" repeatCount="indefinite" /></path>
        </svg>
      </div>

      <style>{`@media (prefers-reduced-motion: reduce) { svg animateTransform { display: none; } }`}</style>

      <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-5 sm:py-6">
        <img src="/DEXi.png" alt="Dex" className="h-14 w-14 object-contain sm:h-12 sm:w-22" />
        <div className="flex items-center gap-3 sm:gap-5">
          <a href="/sign-up" className="rounded-lg px-3 py-2 text-sm font-semibold text-[#A855F7] transition-colors hover:text-[#C084FC]">Login</a>
          <a href="/sign-up" className="rounded-xl bg-[#7C3AED] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#6D28D9]">Sign Up</a>
        </div>
      </header>

      <main className="relative z-10">
        <section className="flex min-h-[calc(100vh-92px)] flex-col items-center justify-center px-6 text-center">
          <h1 className="max-w-4xl text-4xl font-display font-extrabold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">Welcome to your <span className="bg-gradient-to-r from-[#A855F7] via-[#C084FC] to-[#2DD4BF] bg-clip-text text-transparent">Memories</span></h1>
          <p className="mt-6 max-w-3xl text-xl font-medium tracking-wide text-[#94A3B8] sm:text-2xl lg:text-3xl">Explore yourself through what you watch.</p>
          <a href="/sign-up" className="mt-9 rounded-xl bg-[#7C3AED] px-7 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#6D28D9]">Start exploring</a>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-24 sm:py-32"><div className="max-w-2xl"><p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#A855F7]">What is Dex?</p><h2 className="text-3xl font-bold tracking-tight sm:text-5xl">More than a watchlist.</h2><p className="mt-5 text-base leading-7 text-[#94A3B8] sm:text-lg">Dex turns your watch history into an evolving picture of your entertainment taste. The more you watch, the more Dex understands what you like, what you avoid, and what you might discover next.</p></div></section>
        <section className="border-y border-white/[0.06] bg-white/[0.015] px-6 py-24 sm:py-28"><div className="mx-auto max-w-6xl"><div className="mb-12 max-w-xl"><p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#A855F7]">How Dex works</p><h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Watch. Learn. Discover.</h2></div><div className="grid gap-px overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.07] sm:grid-cols-2">{features.map((feature, index) => <article key={feature.title} className="bg-[#0B0B14] p-7 sm:p-9"><span className="text-xs font-mono text-[#64748B]">0{index + 1}</span><h3 className="mt-5 text-xl font-semibold">{feature.title}</h3><p className="mt-3 max-w-md text-sm leading-6 text-[#94A3B8]">{feature.text}</p></article>)}</div></div></section>
        <section className="mx-auto max-w-6xl px-6 py-24 text-center sm:py-32"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#A855F7]">Your taste, over time</p><h2 className="mx-auto mt-4 max-w-3xl text-3xl font-bold tracking-tight sm:text-5xl">Every watch tells Dex a little more about you.</h2><p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-[#94A3B8] sm:text-lg">Build your history, understand your patterns, discover new favorites, and watch your entertainment identity evolve.</p><a href="/sign-up" className="mt-8 inline-block rounded-xl bg-[#7C3AED] px-7 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#6D28D9]">Create your Dex</a></section>
      </main>

      <footer className="relative z-10 w-full border-t border-white/[0.05] px-6 py-5 sm:py-6"><div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 text-xs font-mono text-[#64748B] sm:flex-row"><span>© 2026 Dex. All rights reserved.</span><div className="flex items-center gap-4 sm:gap-5"><a href="/privacy-policy" className="transition-colors hover:text-[#94A3B8]">Privacy Policy</a><a href="/terms-of-service" className="transition-colors hover:text-[#94A3B8]">Terms of Service</a><a href="mailto:systemrecord07@gmail.com" className="transition-colors hover:text-[#94A3B8]">Contact</a></div></div></footer>
    </div>
  );
};
