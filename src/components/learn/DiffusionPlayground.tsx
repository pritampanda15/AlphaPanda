import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Play, Pause, RotateCcw, Shuffle, Sparkles } from 'lucide-react';
import { plddtColor } from '../../lib/aminoAcids';
import { SegmentedControl, StatusPill } from '../ui/ApplePrimitives';

type DemoScenario = 'globular' | 'disordered';

interface Atom3D {
  x: number;
  y: number;
  z: number;
  plddt: number;
  kind: 'helix' | 'sheet' | 'tail';
}

// Deterministic pseudo-random generator so each Seed (#1, #2, #3) is reproducible & smooth
function seededRandom(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * Generates a realistic 3D mini-protein backbone (α-helix + β-hairpin + optional flexible IDR tail)
 * and a Gaussian-like 3D noise cloud for a given seed.
 */
function buildBackboneAndNoise(scenario: DemoScenario, seed: number) {
  const target: Atom3D[] = [];
  const total = 44;

  // 1. Alpha-helix segment (residues 0..17)
  for (let i = 0; i < 18; i++) {
    const theta = i * 1.65;
    target.push({
      x: -78 + i * 5.2,
      y: -26 + Math.sin(theta) * 18,
      z: Math.cos(theta) * 18,
      plddt: 95,
      kind: 'helix',
    });
  }

  // 2. Compact beta-hairpin packing against the helix (residues 18..31)
  for (let i = 0; i < 14; i++) {
    const leg = i < 7 ? i : 13 - i;
    const shiftY = i < 7 ? 20 : 42;
    target.push({
      x: 18 - leg * 12.5,
      y: shiftY + (i % 2 === 0 ? -3 : 3),
      z: -12 + Math.sin(i * 0.5) * 8,
      plddt: 92,
      kind: 'sheet',
    });
  }

  // 3. Final 12 residues: either a second tightly packed helix (globular) OR a seed-dependent disordered tail!
  const tailRand = seededRandom(seed * 997 + 31);
  if (scenario === 'globular') {
    for (let i = 0; i < 12; i++) {
      const theta = i * 1.65 + 0.8;
      target.push({
        x: -66 + i * 7.5,
        y: 12 + Math.cos(theta) * 14,
        z: 24 + Math.sin(theta) * 14,
        plddt: 93,
        kind: 'helix',
      });
    }
  } else {
    // Disordered tail wanders differently on every random seed!
    let tx = -66;
    let ty = 34;
    let tz = 10;
    const driftAngle = (seed - 1) * 1.55 - 0.6;
    for (let i = 0; i < 12; i++) {
      tx += Math.cos(driftAngle + i * 0.35) * 11 + (tailRand() - 0.5) * 10;
      ty += Math.sin(driftAngle + i * 0.42) * 11 + (tailRand() - 0.5) * 10;
      tz += (tailRand() - 0.5) * 18;
      target.push({
        x: tx,
        y: ty,
        z: tz,
        plddt: Math.max(32, 54 - i * 2.1),
        kind: 'tail',
      });
    }
  }

  // Initial pure Gaussian-like 3D noise cloud (step t = 200)
  const rng = seededRandom(seed * 4129 + 17);
  const noise: Array<{ x: number; y: number; z: number }> = [];
  for (let i = 0; i < total; i++) {
    // Box-Muller approximation via sum of 3 uniforms
    const gx = (rng() + rng() + rng() - 1.5) * 155;
    const gy = (rng() + rng() + rng() - 1.5) * 115;
    const gz = (rng() + rng() + rng() - 1.5) * 130;
    noise.push({ x: gx, y: gy, z: gz });
  }

  return { target, noise };
}

function getDiffusionStage(step: number) {
  if (step >= 150) {
    return {
      badge: 'Stage 1 · Random Atomic Cloud',
      title: 'Starting from pure 3D static (Gaussian noise)',
      text: 'AlphaFold 3 and Boltz-2 begin with every atom scattered randomly in space—like snow on an old TV screen. There is no fold yet.',
    };
  }
  if (step >= 85) {
    return {
      badge: 'Stage 2 · Rough Global Shape',
      title: 'Pulling partner regions together',
      text: 'Using clues from evolution and the Pairformer distance map, the neural network gently removes noise so the protein condenses into rough domains.',
    };
  }
  if (step >= 25) {
    return {
      badge: 'Stage 3 · Carving Helices & Sheets',
      title: 'Local chemistry snaps into place',
      text: 'Hydrogen-bonding patterns emerge out of the haze: coiled α-helices and flat β-strands take crisp shape as steric clashes disappear.',
    };
  }
  return {
    badge: 'Stage 4 · Final Atomic Refinement',
    title: 'Locked 3D structure + Self-Grading',
    text: 'Final denoising fine-tunes exact bond lengths. Regions that land in the same spot across random seeds earn high pLDDT (blue); floppy tails stay orange.',
  };
}

export const DiffusionPlayground: React.FC<{ isDark: boolean }> = ({ isDark }) => {
  const [step, setStep] = useState(200); // 200 = 100% noise, 0 = folded
  const [playing, setPlaying] = useState(true);
  const [scenario, setScenario] = useState<DemoScenario>('globular');
  const [seed, setSeed] = useState(1);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rotRef = useRef(0.35);

  const { target, noise } = useMemo(() => buildBackboneAndNoise(scenario, seed), [scenario, seed]);

  // Smooth auto-playback loop when Playing
  useEffect(() => {
    if (!playing) return;
    let rafId = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(50, now - last);
      last = now;
      setStep((prev) => {
        if (prev <= 0) {
          setPlaying(false);
          return 0;
        }
        return Math.max(0, prev - dt * 0.045);
      });
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [playing]);

  // Continuous gentle 3D turntable render on Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let rafId = 0;

    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const W = Math.max(300, rect.width);
      const H = Math.max(240, rect.height);
      if (canvas.width !== Math.floor(W * dpr) || canvas.height !== Math.floor(H * dpr)) {
        canvas.width = Math.floor(W * dpr);
        canvas.height = Math.floor(H * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      if (!reducedMotion) {
        rotRef.current += 0.0055;
      }

      const angleY = rotRef.current;
      const cosY = Math.cos(angleY);
      const sinY = Math.sin(angleY);

      // Non-linear diffusion schedule (more dramatic global convergence early, fine tuning late)
      const alpha = step / 200; // 1 = pure noise, 0 = clean fold
      const noiseWeight = Math.pow(alpha, 1.35);
      const structureWeight = 1 - noiseWeight;

      const cx = W / 2;
      const cy = H / 2 + 4;
      const focal = 420;

      const projected = target.map((pt, i) => {
        const nx = noise[i].x;
        const ny = noise[i].y;
        const nz = noise[i].z;

        const x = pt.x * structureWeight + nx * noiseWeight;
        const y = pt.y * structureWeight + ny * noiseWeight;
        const z = pt.z * structureWeight + nz * noiseWeight;

        // Rotate around Y axis
        const rx = x * cosY - z * sinY;
        const rz = x * sinY + z * cosY;
        const scale = focal / (focal + rz + 130);

        return {
          idx: i,
          sx: cx + rx * scale * 1.15,
          sy: cy + y * scale * 1.15,
          rz,
          scale,
          plddt: pt.plddt,
          kind: pt.kind,
        };
      });

      // Subtle dashed H-bonds emerge once step < 65
      if (step < 65) {
        const hbAlpha = (1 - step / 65) * 0.45;
        ctx.save();
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = isDark
          ? `rgba(100, 210, 255, ${hbAlpha})`
          : `rgba(0, 113, 227, ${hbAlpha})`;
        ctx.lineWidth = 1.2;
        for (let i = 0; i < 14; i++) {
          const p1 = projected[i];
          const p2 = projected[i + 4];
          if (p1 && p2) {
            ctx.beginPath();
            ctx.moveTo(p1.sx, p1.sy);
            ctx.lineTo(p2.sx, p2.sy);
            ctx.stroke();
          }
        }
        ctx.restore();
      }

      // Draw smooth backbone trace (fades in as noise clears!)
      const bondAlpha = Math.max(0.08, 1 - alpha * 0.92);
      ctx.lineWidth = 3.2;
      ctx.lineCap = 'round';
      for (let i = 0; i < projected.length - 1; i++) {
        const a = projected[i];
        const b = projected[i + 1];
        const color = alpha > 0.65 ? (isDark ? '#64748B' : '#94A3B8') : plddtColor(a.plddt);
        ctx.beginPath();
        ctx.moveTo(a.sx, a.sy);
        ctx.lineTo(b.sx, b.sy);
        ctx.strokeStyle = color;
        ctx.globalAlpha = bondAlpha;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // Depth-sorted atomic spheres
      const sorted = [...projected].sort((a, b) => b.rz - a.rz);
      for (const p of sorted) {
        const radius = Math.max(3, (4.8 + (1 - alpha) * 2.4) * p.scale);
        const fill = alpha > 0.7 ? (isDark ? '#94A3B8' : '#64748B') : plddtColor(p.plddt);

        // Soft glow for low-noise folded atoms
        if (alpha < 0.35) {
          ctx.beginPath();
          ctx.arc(p.sx, p.sy, radius * 1.9, 0, Math.PI * 2);
          ctx.fillStyle = fill;
          ctx.globalAlpha = 0.14;
          ctx.fill();
          ctx.globalAlpha = 1;
        }

        ctx.beginPath();
        ctx.arc(p.sx, p.sy, radius, 0, Math.PI * 2);
        ctx.fillStyle = fill;
        ctx.fill();

        // Specular highlight dot (Apple tactile sphere feel)
        ctx.beginPath();
        ctx.arc(p.sx - radius * 0.28, p.sy - radius * 0.28, radius * 0.3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.fill();
      }

      rafId = requestAnimationFrame(draw);
    };

    rafId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafId);
  }, [step, target, noise, isDark]);

  const stage = getDiffusionStage(step);
  const progressPct = Math.round(((200 - step) / 200) * 100);
  const estPlddt =
    scenario === 'globular'
      ? Math.round(28 + (progressPct / 100) * 66)
      : Math.round(28 + (progressPct / 100) * 44);

  const handleTogglePlay = () => {
    if (step <= 1) {
      setStep(200);
      setPlaying(true);
    } else {
      setPlaying((p) => !p);
    }
  };

  const handleNewSeed = () => {
    setSeed((s) => (s % 3) + 1);
    setStep(200);
    setPlaying(true);
  };

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
      {/* Left: Live 3D-Projected Denoising Canvas */}
      <div className="lg:col-span-7">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <SegmentedControl
            layoutId="diffusion-scenario"
            size="xs"
            value={scenario}
            onChange={(val) => {
              setScenario(val);
              setStep(200);
              setPlaying(true);
            }}
            options={[
              { value: 'globular', label: 'Ordered Globular Fold' },
              { value: 'disordered', label: 'Fold + Disordered Tail' },
            ]}
          />

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleNewSeed}
              className="apple-button-secondary inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1 text-[11.5px] font-medium"
              title="Run diffusion from a fresh random noise cloud to see which parts stay consistent"
            >
              <Shuffle className="h-3.5 w-3.5 text-sky-400" />
              Seed #{seed}
            </button>
          </div>
        </div>

        <div className="relative h-[300px] w-full overflow-hidden rounded-2xl border border-[var(--border-hairline)] bg-[#090C14]">
          <canvas ref={canvasRef} className="h-full w-full block" />

          {/* Floating Step & Progress HUD */}
          <div className="pointer-events-none absolute top-3 left-3 flex flex-wrap items-center gap-2">
            <span className="font-mono-code rounded-full bg-black/65 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur-md">
              Diffusion Step t = {Math.round(step)} / 200
            </span>
            <span className="font-mono-code rounded-full bg-black/65 px-2.5 py-1 text-[11px] font-semibold text-sky-300 backdrop-blur-md">
              {progressPct}% Folded
            </span>
          </div>

          <div className="pointer-events-none absolute bottom-3 left-3 flex flex-wrap items-center gap-2.5 rounded-full bg-black/65 px-3 py-1 text-[10.5px] font-medium text-slate-200 backdrop-blur-md">
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-[#0A84FF]" />
              Consistent Core (High pLDDT)
            </span>
            {scenario === 'disordered' && (
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-[#FF6B4A]" />
                Seed-Dependent Tail (Low pLDDT)
              </span>
            )}
          </div>
        </div>

        {/* Interactive Scrub Bar + Play Controls */}
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleTogglePlay}
            className="apple-button-primary inline-flex cursor-pointer items-center gap-1.5 rounded-full px-4 py-1.5 text-[12px] font-semibold"
          >
            {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            {playing ? 'Pause' : step <= 1 ? 'Replay Diffusion' : 'Play'}
          </button>

          <button
            type="button"
            onClick={() => {
              setPlaying(false);
              setStep(200);
            }}
            className="apple-button-secondary inline-flex cursor-pointer items-center gap-1 rounded-full px-3 py-1.5 text-[12px] font-medium"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset Noise
          </button>

          <div className="flex flex-1 items-center gap-2.5">
            <span className="text-[11px] font-medium text-[var(--text-tertiary)]">100% Noise</span>
            <input
              type="range"
              min={0}
              max={200}
              value={200 - step}
              onChange={(e) => {
                setPlaying(false);
                setStep(200 - parseFloat(e.target.value));
              }}
              aria-label="Scrub diffusion denoising progress"
              className="flex-1 accent-sky-500"
            />
            <span className="text-[11px] font-semibold text-emerald-500">Folded 3D</span>
          </div>
        </div>
      </div>

      {/* Right: Plain-English Live Narration Card */}
      <div className="flex flex-col justify-between gap-3 lg:col-span-5">
        <div className="apple-glass-subtle flex-1 rounded-2xl p-4 sm:p-5">
          <StatusPill tone={step < 25 ? 'emerald' : 'blue'}>
            <Sparkles className="h-3 w-3" />
            {stage.badge}
          </StatusPill>

          <h3 className="mt-3 text-[18px] font-bold tracking-tight text-[var(--text-primary)]">
            {stage.title}
          </h3>
          <p className="mt-2 text-[13.5px] leading-relaxed text-[var(--text-secondary)]">
            {stage.text}
          </p>

          <div className="mt-4 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-elevated-solid)] p-3.5 text-[12.5px] leading-relaxed text-[var(--text-secondary)]">
            <strong className="text-[var(--text-primary)]">Try clicking Seed #{seed} above:</strong>{' '}
            {scenario === 'globular' ? (
              <span>
                Even though each seed starts from a completely different random cloud, the{' '}
                <strong className="text-sky-400">globular core always collapses to the exact same fold</strong>.
                That repeatability is why AlphaFold awards it <strong>pLDDT &gt; 90</strong>.
              </span>
            ) : (
              <span>
                Watch the <strong className="text-orange-400">orange tail</strong>! Across Seed #1, #2, and #3,
                the blue core stays locked while the disordered tail lands in a different loose shape every time—that’s
                why AlphaFold marks it <strong>low pLDDT (&lt;50)</strong>.
              </span>
            )}
          </div>
        </div>

        {/* Live Plain-English Score Meter */}
        <div className="apple-glass-subtle flex items-center justify-between rounded-2xl px-4 py-3">
          <div>
            <div className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-[var(--text-tertiary)]">
              Simulated Mean Confidence
            </div>
            <div className="text-[12px] text-[var(--text-secondary)]">
              {scenario === 'globular'
                ? 'Compact globular domain'
                : 'Core locked · Tail intrinsically disordered'}
            </div>
          </div>
          <div className="font-mono-code text-[22px] font-bold" style={{ color: plddtColor(estPlddt) }}>
            {estPlddt} <span className="text-[11px] font-medium text-[var(--text-tertiary)]">pLDDT</span>
          </div>
        </div>
      </div>
    </div>
  );
};
