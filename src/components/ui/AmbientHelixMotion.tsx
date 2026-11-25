import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface AmbientHelixMotionProps {
  isDark: boolean;
  accentHue?: 'blue' | 'indigo' | 'emerald';
}

/**
 * Subtle, Apple-keynote inspired kinetic alpha-helix wave canvas + luminous radial aura.
 * Lightweight 60fps requestAnimationFrame canvas that pauses smoothly under reduced motion.
 */
export const AmbientHelixMotion: React.FC<AmbientHelixMotionProps> = ({
  isDark,
  accentHue = 'blue',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let rafId = 0;
    let width = 0;
    let height = 0;
    let pointerX = 0.5;
    let pointerY = 0.35;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = Math.min(window.innerHeight, 620);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const onPointerMove = (e: PointerEvent) => {
      pointerX = e.clientX / Math.max(1, window.innerWidth);
      pointerY = e.clientY / Math.max(1, window.innerHeight);
    };

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', onPointerMove, { passive: true });

    const palette =
      accentHue === 'indigo'
        ? { a: [94, 92, 230], b: [191, 90, 242] }
        : accentHue === 'emerald'
          ? { a: [48, 209, 88], b: [100, 210, 255] }
          : { a: [10, 132, 255], b: [94, 92, 230] };

    const drawFrame = (timeMs: number) => {
      const t = reducedMotion ? 0 : timeMs * 0.00055;
      ctx.clearRect(0, 0, width, height);

      const centerY = height * (0.34 + (pointerY - 0.5) * 0.04);
      const amp = Math.min(68, height * 0.13);
      const step = 28;
      const count = Math.ceil(width / step) + 2;

      const strand1: Array<{ x: number; y: number; depth: number }> = [];
      const strand2: Array<{ x: number; y: number; depth: number }> = [];

      for (let i = 0; i < count; i++) {
        const x = i * step - step;
        const phase = i * 0.24 - t + (pointerX - 0.5) * 0.7;
        const y1 = centerY + Math.sin(phase) * amp;
        const y2 = centerY + Math.sin(phase + Math.PI) * amp;
        const depth1 = (Math.cos(phase) + 1) * 0.5;
        const depth2 = (Math.cos(phase + Math.PI) + 1) * 0.5;
        strand1.push({ x, y: y1, depth: depth1 });
        strand2.push({ x, y: y2, depth: depth2 });
      }

      // Draw subtle H-bond rungs between helix strands
      const baseAlpha = isDark ? 0.14 : 0.09;
      for (let i = 0; i < count; i += 2) {
        const p1 = strand1[i];
        const p2 = strand2[i];
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.strokeStyle = `rgba(${palette.a[0]}, ${palette.a[1]}, ${palette.a[2]}, ${baseAlpha * 0.55})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Draw smooth ribbon curves
      const drawRibbon = (pts: typeof strand1, rgb: number[]) => {
        ctx.beginPath();
        pts.forEach((p, idx) => {
          if (idx === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        });
        ctx.strokeStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${isDark ? 0.22 : 0.16})`;
        ctx.lineWidth = 1.8;
        ctx.stroke();

        // Residue nodes along backbone
        for (let i = 0; i < pts.length; i += 2) {
          const p = pts[i];
          const r = 1.5 + p.depth * 2.1;
          ctx.beginPath();
          ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${(isDark ? 0.28 : 0.22) * (0.4 + p.depth * 0.6)})`;
          ctx.fill();
        }
      };

      drawRibbon(strand1, palette.a);
      drawRibbon(strand2, palette.b);

      if (!reducedMotion) {
        rafId = requestAnimationFrame(drawFrame);
      }
    };

    rafId = requestAnimationFrame(drawFrame);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointerMove);
    };
  }, [isDark, accentHue]);

  const glowColors =
    accentHue === 'indigo'
      ? ['rgba(94, 92, 230, 0.16)', 'rgba(191, 90, 242, 0.12)']
      : accentHue === 'emerald'
        ? ['rgba(48, 209, 88, 0.14)', 'rgba(100, 210, 255, 0.12)']
        : ['rgba(10, 132, 255, 0.16)', 'rgba(94, 92, 230, 0.13)'];

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      {/* Apple-style luminous ambient mesh orbs */}
      <motion.div
        key={`orb-a-${accentHue}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: isDark ? 1 : 0.7 }}
        transition={{ duration: 1.1 }}
        className="animate-ambient absolute -top-44 left-1/4 h-[520px] w-[520px] rounded-full blur-[120px]"
        style={{ background: `radial-gradient(circle, ${glowColors[0]} 0%, transparent 70%)` }}
      />
      <motion.div
        key={`orb-b-${accentHue}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: isDark ? 0.9 : 0.55 }}
        transition={{ duration: 1.1 }}
        className="animate-ambient absolute -top-24 right-1/6 h-[460px] w-[460px] rounded-full blur-[120px]"
        style={{
          animationDelay: '-6s',
          background: `radial-gradient(circle, ${glowColors[1]} 0%, transparent 70%)`,
        }}
      />
      <canvas
        ref={canvasRef}
        className="absolute inset-x-0 top-0 opacity-75"
        style={{
          maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.28) 65%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.28) 65%, transparent 100%)',
        }}
      />
    </div>
  );
};
