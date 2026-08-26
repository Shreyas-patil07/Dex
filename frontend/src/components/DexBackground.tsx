import React, { useEffect, useRef } from 'react';

const motions = [
  { from: [-220, 90], to: [220, -90], duration: 12000, delay: 0 },
  { from: [220, -110], to: [-220, 110], duration: 16000, delay: -3500 },
  { from: [-160, 120], to: [160, -120], duration: 20000, delay: -7000 },
] as const;

export const DexBackground: React.FC = () => {
  const lineRefs = [useRef<SVGPathElement>(null), useRef<SVGPathElement>(null), useRef<SVGPathElement>(null)];

  useEffect(() => {
    let frame = 0;
    const start = performance.now();

    const animate = (now: number) => {
      const elapsed = now - start;
      lineRefs.forEach((ref, index) => {
        const line = ref.current;
        const motion = motions[index];
        if (!line) return;
        const progress = ((elapsed + motion.delay) % motion.duration + motion.duration) % motion.duration / motion.duration;
        const eased = progress < 0.5
          ? 2 * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 2) / 2;
        const x = motion.from[0] + (motion.to[0] - motion.from[0]) * eased;
        const y = motion.from[1] + (motion.to[1] - motion.from[1]) * eased;
        line.style.transform = `translate(${x}px, ${y}px)`;
      });
      frame = requestAnimationFrame(animate);
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-[1] overflow-hidden" aria-hidden="true">
      <svg className="absolute -left-[20%] -top-[8%] h-[116%] w-[140%]" viewBox="0 0 1200 700" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
        <path ref={lineRefs[0]} className="dex-line" d="M-700 590C-250 120 120 40 560 190C1000 340 1370 570 2050 150" stroke="#7C3AED" strokeWidth="1.2" strokeLinecap="round" opacity="0.19" />
        <path ref={lineRefs[1]} className="dex-line" d="M-750 210C-280 650 160 650 610 360C1050 75 1450 120 2050 520" stroke="#A855F7" strokeWidth="0.9" strokeLinecap="round" opacity="0.17" />
        <path ref={lineRefs[2]} className="dex-line" d="M-500 850C-100 420 300 280 700 450C1080 610 1450 420 1900 -20" stroke="#2DD4BF" strokeWidth="0.7" strokeLinecap="round" opacity="0.14" />
      </svg>
    </div>
  );
};
