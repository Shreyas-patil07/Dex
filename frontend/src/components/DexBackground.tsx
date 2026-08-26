import React from 'react';

export const DexBackground: React.FC = () => (
  <div className="pointer-events-none fixed inset-0 z-[1] overflow-hidden" aria-hidden="true">
    <svg className="absolute -left-[20%] -top-[8%] h-[116%] w-[140%]" viewBox="0 0 1200 700" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
      <path className="dex-line dex-line-1" d="M-700 590C-250 120 120 40 560 190C1000 340 1370 570 2050 150" stroke="#7C3AED" strokeWidth="1.2" strokeLinecap="round" opacity="0.19" />
      <path className="dex-line dex-line-2" d="M-750 210C-280 650 160 650 610 360C1050 75 1450 120 2050 520" stroke="#A855F7" strokeWidth="0.9" strokeLinecap="round" opacity="0.17" />
      <path className="dex-line dex-line-3" d="M-500 850C-100 420 300 280 700 450C1080 610 1450 420 1900 -20" stroke="#2DD4BF" strokeWidth="0.7" strokeLinecap="round" opacity="0.14" />
    </svg>
  </div>
);
