import React from 'react';
import { motion } from 'framer-motion';

export const APPLE_SPRING = {
  type: 'spring' as const,
  stiffness: 390,
  damping: 34,
  mass: 0.82,
};

export const APPLE_EASE = [0.22, 1, 0.36, 1] as const;

export const AlphaPandaLogo: React.FC<{ size?: number }> = ({ size = 36 }) => (
  <motion.svg
    width={size}
    height={size}
    viewBox="0 0 128 128"
    fill="none"
    whileHover={{ scale: 1.06, rotate: -2 }}
    transition={APPLE_SPRING}
    className="shrink-0 drop-shadow-[0_6px_14px_rgba(10,132,255,0.22)]"
  >
    <defs>
      <linearGradient id="ap-shell" x1="16" y1="8" x2="112" y2="120" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#13203A" />
        <stop offset="48%" stopColor="#0A1122" />
        <stop offset="100%" stopColor="#050811" />
      </linearGradient>
      <linearGradient id="ap-rim" x1="64" y1="4" x2="64" y2="124" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.34" />
        <stop offset="40%" stopColor="#64D2FF" stopOpacity="0.15" />
        <stop offset="100%" stopColor="#0A84FF" stopOpacity="0.06" />
      </linearGradient>
      <radialGradient id="ap-aura" cx="64" cy="36" r="64" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#0A84FF" stopOpacity="0.32" />
        <stop offset="100%" stopColor="#0A84FF" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="ap-pearl" x1="64" y1="28" x2="64" y2="104" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="100%" stopColor="#E4EEFA" />
      </linearGradient>
      <linearGradient id="ap-ribbon" x1="26" y1="30" x2="102" y2="104" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#64D2FF" />
        <stop offset="52%" stopColor="#0A84FF" />
        <stop offset="100%" stopColor="#0055CC" />
      </linearGradient>
    </defs>

    <rect x="6" y="6" width="116" height="116" rx="30" fill="url(#ap-shell)" />
    <rect x="6" y="6" width="116" height="116" rx="30" fill="url(#ap-aura)" />
    <rect x="7" y="7" width="114" height="114" rx="29" stroke="url(#ap-rim)" strokeWidth="2" />
    <path d="M24 74 C 24 38, 104 38, 104 74" stroke="url(#ap-ribbon)" strokeWidth="2.2" strokeOpacity="0.32" strokeLinecap="round" />
    <circle cx="38" cy="39" r="12.5" fill="#0B1325" stroke="url(#ap-ribbon)" strokeWidth="2.8" />
    <circle cx="90" cy="39" r="12.5" fill="#0B1325" stroke="url(#ap-ribbon)" strokeWidth="2.8" />
    <circle cx="38" cy="39" r="5" fill="url(#ap-ribbon)" fillOpacity="0.35" />
    <circle cx="90" cy="39" r="5" fill="url(#ap-ribbon)" fillOpacity="0.35" />
    <path d="M64 35 C 86.5 35, 99 51, 99 70.5 C 99 90.5, 84 102, 64 102 C 44 102, 29 90.5, 29 70.5 C 29 51, 41.5 35, 64 35 Z" fill="url(#ap-pearl)" />
    <ellipse cx="48.5" cy="66.5" rx="9.5" ry="12" transform="rotate(-16 48.5 66.5)" fill="#0A1122" />
    <ellipse cx="79.5" cy="66.5" rx="9.5" ry="12" transform="rotate(16 79.5 66.5)" fill="#0A1122" />
    <circle cx="50.5" cy="64" r="3.4" fill="url(#ap-ribbon)" />
    <circle cx="77.5" cy="64" r="3.4" fill="url(#ap-ribbon)" />
    <circle cx="51.6" cy="62.8" r="1.2" fill="#FFFFFF" />
    <circle cx="78.6" cy="62.8" r="1.2" fill="#FFFFFF" />
    <path d="M59.2 77.2 C 59.2 75.5, 68.8 75.5, 68.8 77.2 C 68.8 79.5, 65.8 82.2, 64 82.2 C 62.2 82.2, 59.2 79.5, 59.2 77.2 Z" fill="#0A1122" />
    <path d="M46 89.5 C 51 95.5, 58.5 95.5, 64 89.5 C 69.5 83.5, 77 83.5, 82 89.5" stroke="url(#ap-ribbon)" strokeWidth="4.6" strokeLinecap="round" fill="none" />
    <circle cx="46" cy="89.5" r="2.6" fill="#64D2FF" />
    <circle cx="82" cy="89.5" r="2.6" fill="#0A84FF" />
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
