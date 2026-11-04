'use client';

import { useEffect, useMemo, useState } from 'react';

/** "Orbi": the little planet-with-a-ring from the logo, with a face. */
export function Orbi({ size = 96, float = false, happy = true }: { size?: number; float?: boolean; happy?: boolean }) {
  return (
    <svg className={float ? 'orbi-float' : undefined} width={size} height={size} viewBox="0 0 120 120" fill="none" aria-hidden="true">
      <defs>
        <radialGradient id="orbi-g" cx="35%" cy="30%" r="80%">
          <stop offset="0" stopColor="#3B4F8A" />
          <stop offset="1" stopColor="#0F1A2E" />
        </radialGradient>
      </defs>
      <ellipse cx="60" cy="62" rx="54" ry="17" transform="rotate(-20 60 62)" stroke="#8FB0FF" strokeWidth="5" opacity=".55" />
      <circle cx="60" cy="60" r="34" fill="url(#orbi-g)" />
      <ellipse cx="60" cy="62" rx="54" ry="17" transform="rotate(-20 60 62)" stroke="#2E5BFF" strokeWidth="5" strokeDasharray="95 400" strokeDashoffset="-150" strokeLinecap="round" />
      <circle cx="49" cy="55" r="4.2" fill="#fff" /><circle cx="71" cy="55" r="4.2" fill="#fff" />
      <circle cx="50" cy="56" r="1.8" fill="#0F1A2E" /><circle cx="72" cy="56" r="1.8" fill="#0F1A2E" />
      {happy ? <path d="M50 69c4 6 16 6 20 0" stroke="#fff" strokeWidth="3" strokeLinecap="round" /> : <path d="M52 72h16" stroke="#fff" strokeWidth="3" strokeLinecap="round" />}
      <circle cx="42" cy="66" r="3.5" fill="#FF7AA8" opacity=".6" /><circle cx="78" cy="66" r="3.5" fill="#FF7AA8" opacity=".6" />
      <path d="M104 22l2.4 5.6 5.6 2.4-5.6 2.4-2.4 5.6-2.4-5.6-5.6-2.4 5.6-2.4z" fill="#FFD166" />
      <path d="M16 30l1.6 3.8 3.8 1.6-3.8 1.6L16 40.8l-1.6-3.8-3.8-1.6 3.8-1.6z" fill="#8FB0FF" />
    </svg>
  );
}

const COLORS = ['#2E5BFF', '#7C4DFF', '#FF5C8A', '#FFB020', '#12B76A', '#38BDF8'];

/** One-shot confetti burst. Mount it (or flip `fire`) to play. */
export function Confetti({ fire, count = 28 }: { fire: boolean; count?: number }) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (!fire) return;
    setOn(true);
    const t = setTimeout(() => setOn(false), 1800);
    return () => clearTimeout(t);
  }, [fire]);
  const bits = useMemo(
    () => Array.from({ length: count }, (_, i) => {
      const a = (i / count) * Math.PI * 2 + Math.random() * 0.5;
      const d = 90 + Math.random() * 110;
      return { x: Math.cos(a) * d, y: Math.sin(a) * d - 40, r: Math.random() * 540 - 270, c: COLORS[i % COLORS.length], w: 6 + Math.random() * 6, delay: Math.random() * 120 };
    }),
    [count]
  );
  if (!on) return null;
  return (
    <div className="confetti" aria-hidden="true">
      {bits.map((b, i) => (
        <i key={i} style={{ background: b.c, width: b.w, height: b.w * 0.5, animationDelay: `${b.delay}ms`, ['--x' as string]: `${b.x}px`, ['--y' as string]: `${b.y}px`, ['--r' as string]: `${b.r}deg` }} />
      ))}
    </div>
  );
}
