import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, Box, AlignLeft, ShieldCheck, Moon, Sun, CornerDownLeft, BookMarked } from 'lucide-react';
import { STATIC_GLOBULAR_PRESETS } from '../../lib/structureParser';
import { TRIAGE_PRESET_QUERIES } from '../../lib/variantTriage';
import { APPLE_SPRING } from './ApplePrimitives';

export interface CommandAction {
  id: string;
  group: 'Modules' | 'Globular 3D Structures' | 'Variant Triage Presets' | 'Studio';
  label: string;
  sublabel: string;
  icon: React.ReactNode;
  run: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
  onOpenCite: () => void;
  onSwitchTab: (tab: 'explorer' | 'msa' | 'triage') => void;
  onLoadStructurePreset: (presetId: string) => void;
  onLoadTriagePreset: (uniprotId: string, mutations: string) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  open,
  onClose,
  isDark,
  onToggleTheme,
  onOpenCite,
  onSwitchTab,
  onLoadStructurePreset,
  onLoadTriagePreset,
}) => {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  const actions = useMemo<CommandAction[]>(() => {
    const list: CommandAction[] = [
      {
        id: 'nav-explorer',
        group: 'Modules',
        label: 'Confidence & Interface Explorer',
        sublabel: 'Synchronized 3D viewer, PAE heatmap, pLDDT & pDockQ',
        icon: <Box className="h-4 w-4 text-sky-400" />,
        run: () => onSwitchTab('explorer'),
      },
      {
        id: 'nav-msa',
        group: 'Modules',
        label: 'MSA & Sequence Conservation Publisher',
        sublabel: 'Secondary structure, WebLogo, motif search & SVG export',
        icon: <AlignLeft className="h-4 w-4 text-indigo-400" />,
        run: () => onSwitchTab('msa'),
      },
      {
        id: 'nav-triage',
        group: 'Modules',
        label: 'Variant / Mutation Triage Cards',
        sublabel: 'UniProt + AlphaFold 3D RSA, Grantham, ClinVar & gnomAD',
        icon: <ShieldCheck className="h-4 w-4 text-emerald-400" />,
        run: () => onSwitchTab('triage'),
      },
      ...STATIC_GLOBULAR_PRESETS.map((p) => ({
        id: `struct-${p.id}`,
        group: 'Globular 3D Structures' as const,
        label: p.shortName,
        sublabel: `${p.badge} · ${p.subtitle}`,
        icon: <Box className="h-4 w-4 text-sky-400" />,
        run: () => {
          onSwitchTab('explorer');
          onLoadStructurePreset(p.id);
        },
      })),
      ...TRIAGE_PRESET_QUERIES.map((q) => ({
        id: `triage-${q.uniprotId}`,
        group: 'Variant Triage Presets' as const,
        label: `${q.label} (${q.uniprotId})`,
        sublabel: q.mutations,
        icon: <ShieldCheck className="h-4 w-4 text-emerald-400" />,
        run: () => {
          onSwitchTab('triage');
          onLoadTriagePreset(q.uniprotId, q.mutations);
        },
      })),
      {
        id: 'open-cite',
        group: 'Studio',
        label: 'Cite AlphaPanda Studio (BibTeX & Methods)',
        sublabel: 'Copy academic citation or publication Methods paragraph',
        icon: <BookMarked className="h-4 w-4 text-sky-400" />,
        run: () => onOpenCite(),
      },
      {
        id: 'toggle-theme',
        group: 'Studio',
        label: isDark ? 'Switch to Apple Light Studio' : 'Switch to Apple Dark Studio',
        sublabel: 'Toggle frosted-glass luminance appearance',
        icon: isDark ? <Sun className="h-4 w-4 text-amber-300" /> : <Moon className="h-4 w-4 text-slate-600" />,
        run: () => onToggleTheme(),
      },
    ];
    return list;
  }, [isDark, onLoadStructurePreset, onLoadTriagePreset, onOpenCite, onSwitchTab, onToggleTheme]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return actions;
    return actions.filter(
      (a) =>
        a.label.toLowerCase().includes(q) ||
        a.sublabel.toLowerCase().includes(q) ||
        a.group.toLowerCase().includes(q)
    );
  }, [actions, query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => Math.min(filtered.length - 1, i + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => Math.max(0, i - 1));
      } else if (e.key === 'Enter' && filtered[activeIndex]) {
        e.preventDefault();
        filtered[activeIndex].run();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, filtered, activeIndex, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 px-4 pt-[13vh] backdrop-blur-md"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={APPLE_SPRING}
            onClick={(e) => e.stopPropagation()}
            className="apple-glass w-full max-w-[580px] overflow-hidden rounded-[22px] shadow-2xl"
          >
            <div className="flex items-center gap-3 border-b border-[var(--border-hairline)] px-4 py-3.5">
              <Search className="h-4.5 w-4.5 text-[var(--text-tertiary)]" />
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Jump to KRAS G12D, LRP4, PD-1, MSA Publisher, Variant Triage…"
                className="w-full bg-transparent text-[14.5px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none"
              />
              <kbd className="font-mono-code rounded-md border border-[var(--border-hairline)] bg-[var(--bg-subtle)] px-1.5 py-0.5 text-[10px] text-[var(--text-tertiary)]">
                ESC
              </kbd>
            </div>

            <div className="max-h-[360px] overflow-y-auto p-2">
              {filtered.map((item, idx) => {
                const selected = idx === activeIndex;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => {
                      item.run();
                      onClose();
                    }}
                    className={`flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                      selected ? 'bg-sky-500/14' : 'hover:bg-[var(--bg-subtle)]'
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--bg-subtle)] ring-1 ring-[var(--border-hairline)]">
                        {item.icon}
                      </span>
                      <div className="min-w-0">
                        <div className="truncate text-[13px] font-semibold text-[var(--text-primary)]">
                          {item.label}
                        </div>
                        <div className="truncate text-[11.5px] text-[var(--text-tertiary)]">
                          {item.sublabel}
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="rounded-full bg-[var(--bg-subtle)] px-2 py-0.5 text-[10px] font-medium text-[var(--text-tertiary)]">
                        {item.group}
                      </span>
                      {selected && <CornerDownLeft className="h-3.5 w-3.5 text-sky-400" />}
                    </div>
                  </button>
                );
              })}

              {filtered.length === 0 && (
                <div className="py-10 text-center text-[13px] text-[var(--text-tertiary)]">
                  No matching AlphaPanda action for "{query}"
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
