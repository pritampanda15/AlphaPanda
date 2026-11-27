import React from 'react';
import { motion } from 'framer-motion';

export const APPLE_SPRING = {
  type: 'spring' as const,
  stiffness: 390,
  damping: 34,
  mass: 0.82,
};

export const APPLE_EASE = [0.22, 1, 0.36, 1] as const;

export const AlphaPandaLogo: React.FC<{ size?: number }> = ({ size = 34 }) => (
  <motion.svg
    width={size}
    height={size}
    viewBox="0 0 64 64"
    fill="none"
    whileHover={{ scale: 1.06, rotate: -2 }}
    transition={APPLE_SPRING}
    className="shrink-0 drop-shadow-[0_4px_12px_rgba(10,132,255,0.28)]"
  >
    <defs>
      <linearGradient id="apGrad" x1="6" y1="4" x2="58" y2="60" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#64D2FF" />
        <stop offset="55%" stopColor="#0A84FF" />
        <stop offset="100%" stopColor="#0066CC" />
      </linearGradient>
    </defs>
    <rect x="4" y="4" width="56" height="56" rx="16" fill="#0B0F1A" />
    <rect x="4.75" y="4.75" width="54.5" height="54.5" rx="15.25" stroke="rgba(255,255,255,0.24)" strokeWidth="1.5" />
    <circle cx="20" cy="20" r="6" fill="#F5F7FB" />
    <circle cx="44" cy="20" r="6" fill="#F5F7FB" />
    <circle cx="32" cy="35" r="16" fill="#F5F7FB" />
    <ellipse cx="25.5" cy="33.5" rx="4.5" ry="5.5" transform="rotate(-14 25.5 33.5)" fill="#0B0F1A" />
    <ellipse cx="38.5" cy="33.5" rx="4.5" ry="5.5" transform="rotate(14 38.5 33.5)" fill="#0B0F1A" />
    <circle cx="26.5" cy="32.5" r="1.6" fill="url(#apGrad)" />
    <circle cx="37.5" cy="32.5" r="1.6" fill="url(#apGrad)" />
    <path d="M27 42.5C29.5 45 34.5 45 37 42.5" stroke="url(#apGrad)" strokeWidth="2.8" strokeLinecap="round" />
  </motion.svg>
);

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

/**
 * Liquid Glass Card with zero-rerender pointer-tracking specular sheen
 * and crisp physical top-edge highlight.
 */
export const GlassCard: React.FC<GlassCardProps> = ({ children, className = '', delay = 0 }) => {
  const handlePointerMove = (e: React.PointerEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--mx', `${e.clientX - rect.left}px`);
    e.currentTarget.style.setProperty('--my', `${e.clientY - rect.top}px`);
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.44, delay, ease: APPLE_EASE }}
      onPointerMove={handlePointerMove}
      className={`apple-glass rounded-[24px] ${className}`}
    >
      {children}
    </motion.section>
  );
};

interface MetricRingProps {
  label: string;
  valueText: string;
  sublabel: string;
  progress: number; // 0..1
  color: string;
}

export const MetricRing: React.FC<MetricRingProps> = ({
  label,
  valueText,
  sublabel,
  progress,
  color,
}) => {
  const clamped = Math.max(0.03, Math.min(1, progress));
  const r = 23;
  const circ = 2 * Math.PI * r;
  return (
    <div className="apple-glass-subtle flex items-center gap-3.5 rounded-2xl px-3.5 py-3 transition-colors hover:border-[var(--border-strong)]">
      <div className="relative h-14 w-14 shrink-0">
        <svg viewBox="0 0 56 56" className="h-full w-full -rotate-90">
          <circle
            cx="28"
            cy="28"
            r={r}
            fill="none"
            stroke="currentColor"
            className="text-black/8 dark:text-white/10"
            strokeWidth="5"
          />
          <motion.circle
            cx="28"
            cy="28"
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={circ}
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: circ * (1 - clamped) }}
            transition={{ duration: 0.85, ease: APPLE_EASE }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="tabular-nums-strict text-[12px] font-bold tracking-tight text-[var(--text-primary)]">
            {valueText}
          </span>
        </div>
      </div>
      <div className="min-w-0">
        <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-tertiary)]">
          {label}
        </div>
        <div className="mt-0.5 truncate text-[12.5px] font-medium text-[var(--text-secondary)]">
          {sublabel}
        </div>
      </div>
    </div>
  );
};

interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  layoutId,
  size = 'sm',
}: {
  options: Array<SegmentedOption<T>>;
  value: T;
  onChange: (val: T) => void;
  layoutId: string;
  size?: 'xs' | 'sm' | 'md';
}) {
  const pad =
    size === 'xs'
      ? 'px-2.5 py-1 text-[11.5px]'
      : size === 'md'
        ? 'px-4 py-2 text-[13px]'
        : 'px-3 py-1.5 text-[12px]';

  return (
    <div className="inline-flex items-center rounded-full border border-[var(--border-hairline)] bg-[var(--bg-well)] p-1 shadow-[inset_0_1px_2px_rgba(0,0,0,0.16)] backdrop-blur-xl">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`relative z-10 inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full font-medium transition-colors ${pad} ${
              active
                ? 'text-[var(--text-primary)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                transition={APPLE_SPRING}
                className="absolute inset-0 -z-10 rounded-full bg-[var(--bg-elevated-solid)] shadow-[0_2px_10px_-2px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.28)] ring-1 ring-[var(--border-hairline)]"
              />
            )}
            {opt.icon}
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export const StatusPill: React.FC<{
  tone: 'emerald' | 'amber' | 'rose' | 'blue' | 'slate';
  children: React.ReactNode;
  className?: string;
}> = ({ tone, children, className = '' }) => {
  const styles: Record<string, string> = {
    emerald: 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 ring-emerald-500/25',
    amber: 'bg-amber-500/14 text-amber-700 dark:text-amber-300 ring-amber-500/25',
    rose: 'bg-rose-500/14 text-rose-700 dark:text-rose-300 ring-rose-500/25',
    blue: 'bg-sky-500/14 text-sky-700 dark:text-sky-300 ring-sky-500/28',
    slate: 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] ring-[var(--border-hairline)]',
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold backdrop-blur-md ring-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] ${styles[tone]} ${className}`}
    >
      {children}
    </span>
  );
};
