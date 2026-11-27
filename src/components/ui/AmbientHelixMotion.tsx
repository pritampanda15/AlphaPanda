import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface AmbientHelixMotionProps {
  isDark: boolean;
}

/**
 * Single cohesive Arctic Sapphire volumetric caustic light-field + kinetic molecular ribbon.
 * Stays visually calm and consistent across all modules so frosted glass cards refract unified tone.
 */
export const AmbientHelixMotion: React.FC<AmbientHelixMotionProps> = ({ isDark }) => {
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
      height = Math.min(window.innerHeight, 680);
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

    // Unified Arctic Sapphire + Ice Blue monochrome strands
    const strandA = [10, 132, 255];
    const strandB = [100, 210, 255];

    const drawFrame = (timeMs: number) => {
      const t = reducedMotion ? 0 : timeMs * 0.00045;
      ctx.clearRect(0, 0, width, height);

      const centerY = height * (0.32 + (pointerY - 0.5) * 0.03);
      const amp = Math.min(68, height * 0.125);
      const step = 30;
      const count = Math.ceil(width / step) + 2;

      const pts1: Array<{ x: number; y: number; depth: number }> = [];
      const pts2: Array<{ x: number; y: number; depth: number }> = [];

      for (let i = 0; i < count; i++) {
        const x = i * step - step;
        const phase = i * 0.22 - t + (pointerX - 0.5) * 0.5;
        pts1.push({
          x,
          y: centerY + Math.sin(phase) * amp,
          depth: (Math.cos(phase) + 1) * 0.5,
        });
        pts2.push({
          x,
          y: centerY + Math.sin(phase + Math.PI) * amp,
          depth: (Math.cos(phase + Math.PI) + 1) * 0.5,
        });
      }

      const baseAlpha = isDark ? 0.14 : 0.08;
      for (let i = 0; i < count; i += 2) {
        ctx.beginPath();
        ctx.moveTo(pts1[i].x, pts1[i].y);
        ctx.lineTo(pts2[i].x, pts2[i].y);
        ctx.strokeStyle = `rgba(${strandA[0]}, ${strandA[1]}, ${strandA[2]}, ${baseAlpha * 0.48})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      const drawRibbon = (pts: typeof pts1, rgb: number[]) => {
        ctx.beginPath();
        pts.forEach((p, idx) => {
          if (idx === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        });
        ctx.strokeStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${isDark ? 0.2 : 0.13})`;
        ctx.lineWidth = 1.6;
        ctx.stroke();

        for (let i = 0; i < pts.length; i += 2) {
          const p = pts[i];
          const r = 1.3 + p.depth * 2;
          ctx.beginPath();
          ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${(isDark ? 0.28 : 0.18) * (0.4 + p.depth * 0.6)})`;
          ctx.fill();
        }
      };

      drawRibbon(pts1, strandA);
      drawRibbon(pts2, strandB);

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
  }, [isDark]);

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      {/* Subtle architectural dot-grid for optical glass depth */}
      <div
        className="absolute inset-0 opacity-[0.32] dark:opacity-[0.2]"
        style={{
          backgroundImage: isDark
            ? 'radial-gradient(rgba(255,255,255,0.08) 1px, transparent 1px)'
            : 'radial-gradient(rgba(15,23,42,0.07) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          maskImage: 'radial-gradient(ellipse 80% 60% at 50% 0%, black 20%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 60% at 50% 0%, black 20%, transparent 100%)',
        }}
      />

      {/* Unified Arctic Sapphire volumetric caustic fields */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isDark ? 1 : 0.68 }}
        transition={{ duration: 0.9 }}
        className="animate-ambient absolute -top-48 left-[14%] h-[580px] w-[580px] rounded-full blur-[135px]"
        style={{ background: 'radial-gradient(circle, rgba(10, 132, 255, 0.22) 0%, transparent 68%)' }}
      />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isDark ? 0.9 : 0.55 }}
        transition={{ duration: 0.9 }}
        className="animate-ambient absolute -top-24 right-[10%] h-[520px] w-[520px] rounded-full blur-[135px]"
        style={{
          animationDelay: '-7s',
          background: 'radial-gradient(circle, rgba(56, 189, 248, 0.16) 0%, transparent 68%)',
        }}
      />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isDark ? 0.7 : 0.42 }}
        transition={{ duration: 1.1 }}
        className="animate-ambient absolute top-[48%] left-[42%] h-[460px] w-[460px] rounded-full blur-[145px]"
        style={{
          animationDelay: '-13s',
          background: 'radial-gradient(circle, rgba(14, 116, 194, 0.14) 0%, transparent 70%)',
        }}
      />

      <canvas
        ref={canvasRef}
        className="absolute inset-x-0 top-0 opacity-75"
        style={{
          maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.22) 65%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.22) 65%, transparent 100%)',
        }}
      />

      <div className="glass-grain absolute inset-0 opacity-55 dark:opacity-40" />
    </div>
  );
};
