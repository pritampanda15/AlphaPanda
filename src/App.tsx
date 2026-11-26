import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Box,
  AlignLeft,
  ShieldCheck,
  GraduationCap,
  Moon,
  Sun,
  Command,
  Share2,
  Check,
  BookMarked,
} from 'lucide-react';
import { AmbientHelixMotion } from './components/ui/AmbientHelixMotion';
import {
  AlphaPandaLogo,
  APPLE_EASE,
  APPLE_SPRING,
} from './components/ui/ApplePrimitives';
import { CommandPalette } from './components/ui/CommandPalette';
import { CiteModal } from './components/ui/CiteModal';
import { ConfidenceExplorer } from './components/explorer/ConfidenceExplorer';
import { MSAPublisher } from './components/msa/MSAPublisher';
import { VariantTriageStudio } from './components/triage/VariantTriageStudio';
import { HowItWorksStudio } from './components/learn/HowItWorksStudio';

type ModuleId = 'explorer' | 'msa' | 'triage' | 'learn';

const MODULES: Array<{
  id: ModuleId;
  shortLabel: string;
  title: string;
  tagline: string;
  accentHue: 'blue' | 'indigo' | 'emerald';
  icon: React.ReactNode;
}> = [
  {
    id: 'explorer',
    shortLabel: 'Confidence & Interface',
    title: 'AlphaFold3 · ColabFold · Boltz-2 Explorer',
    tagline:
      'Synchronized 3D globular complex viewport, clickable PAE heatmap, segmented confidence breakdown, automated pDockQ / ipTM scoring, and one-click publication figure export.',
    accentHue: 'blue',
    icon: <Box className="h-3.5 w-3.5" />,
  },
  {
    id: 'msa',
    shortLabel: 'MSA Publisher',
    title: 'Modern MSA & Sequence Conservation Publisher',
    tagline:
      'Crisp vector-grade alignments with editable secondary-structure cartoons, WebLogo information tracks, motif highlighting, mutation pins, and Illustrator-ready SVG export.',
    accentHue: 'indigo',
    icon: <AlignLeft className="h-3.5 w-3.5" />,
  },
  {
    id: 'triage',
    shortLabel: 'Variant Triage',
    title: 'Variant & Mutation Structural Triage Cards',
    tagline:
      'Enter any UniProt ID and mutation list for instant buried/exposed 3D context, interactive 3D spotlight, biophysical shift scoring, active-site proximity, and ClinVar / gnomAD links.',
    accentHue: 'emerald',
    icon: <ShieldCheck className="h-3.5 w-3.5" />,
  },
  {
    id: 'learn',
    shortLabel: 'How It Works',
    title: 'How Diffusion & AlphaFold Work — Simply Explained',
    tagline:
      'Interactive noise-to-fold diffusion simulator, plain-English 4-step walkthrough of MSA, Pairformer, and all-atom diffusion, plus a quick prediction troubleshooter.',
    accentHue: 'blue',
    icon: <GraduationCap className="h-3.5 w-3.5" />,
  },
];

function readInitialDeepLink() {
  if (typeof window === 'undefined') {
    return { tab: 'explorer' as ModuleId, preset: null, liveId: null, msa: null, triage: null };
  }
  const params = new URLSearchParams(window.location.search);
  const rawTab = params.get('tab');
  const tab: ModuleId =
    rawTab === 'msa' || rawTab === 'triage' || rawTab === 'explorer' || rawTab === 'learn'
      ? rawTab
      : 'explorer';
  const preset = params.get('preset');
  const liveId = params.get('id');
  const msa = params.get('msa');
  const uniprot = params.get('uniprot');
  const muts = params.get('muts');
  const triage = uniprot ? { uniprotId: uniprot, mutations: muts || 'R175H, Y220C' } : null;
  return { tab, preset, liveId, msa, triage };
}

export default function App() {
  const initial = useRef(readInitialDeepLink()).current;

  const [activeTab, setActiveTab] = useState<ModuleId>(initial.tab);
  const [isDark, setIsDark] = useState(true);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [citeOpen, setCiteOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const [requestedStructPreset, setRequestedStructPreset] = useState<string | null>(initial.preset);
  const [requestedLiveId, setRequestedLiveId] = useState<string | null>(initial.liveId);
  const [requestedTriagePreset, setRequestedTriagePreset] = useState<{
    uniprotId: string;
    mutations: string;
  } | null>(initial.triage);

  // Track current view state for shareable URL query sync
  const deepStateRef = useRef<{
    explorerPreset?: string;
    explorerLiveId?: string;
    msaPreset?: string;
    triageUniprot?: string;
    triageMuts?: string;
  }>({
    explorerPreset: initial.preset || 'kras-raf1-complex',
    explorerLiveId: initial.liveId || undefined,
    msaPreset: initial.msa || 'lrp4-propeller',
    triageUniprot: initial.triage?.uniprotId || 'P04637',
    triageMuts: initial.triage?.mutations || 'R175H, Y220C, R248Q, R273H, R337H',
  });

  const syncUrl = useCallback((tab: ModuleId) => {
    const params = new URLSearchParams();
    params.set('tab', tab);
    if (tab === 'explorer') {
      if (deepStateRef.current.explorerLiveId) {
        params.set('id', deepStateRef.current.explorerLiveId);
      } else if (deepStateRef.current.explorerPreset) {
        params.set('preset', deepStateRef.current.explorerPreset);
      }
    } else if (tab === 'msa' && deepStateRef.current.msaPreset) {
      params.set('msa', deepStateRef.current.msaPreset);
    } else if (tab === 'triage' && deepStateRef.current.triageUniprot) {
      params.set('uniprot', deepStateRef.current.triageUniprot);
      if (deepStateRef.current.triageMuts) {
        params.set('muts', deepStateRef.current.triageMuts.replace(/\s+/g, ''));
      }
    }
    const nextUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, '', nextUrl);
  }, []);

  useEffect(() => {
    syncUrl(activeTab);
  }, [activeTab, syncUrl]);

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) root.classList.add('dark');
    else root.classList.remove('dark');
  }, [isDark]);

  // Global ⌘K / Ctrl+K Spotlight launcher
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const handleCopyShareLink = async () => {
    syncUrl(activeTab);
    await navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 1800);
  };

  const activeModule = MODULES.find((m) => m.id === activeTab) ?? MODULES[0];

  return (
    <div className="relative min-h-screen text-[var(--text-primary)]">
      <AmbientHelixMotion isDark={isDark} accentHue={activeModule.accentHue} />

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        isDark={isDark}
        onToggleTheme={() => setIsDark((d) => !d)}
        onOpenCite={() => setCiteOpen(true)}
        onSwitchTab={setActiveTab}
        onLoadStructurePreset={(id) => {
          setRequestedLiveId(null);
          setRequestedStructPreset(id);
        }}
        onLoadTriagePreset={(uniprotId, mutations) =>
          setRequestedTriagePreset({ uniprotId, mutations })
        }
      />

      <CiteModal open={citeOpen} onClose={() => setCiteOpen(false)} />

      {/* Sticky Apple Frosted-Glass Navigation Bar */}
      <header className="sticky top-0 z-40 border-b border-[var(--border-hairline)] bg-[var(--bg-elevated)] backdrop-blur-2xl">
        <div className="mx-auto flex max-w-[1380px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          {/* Brand Identity */}
          <div className="flex items-center gap-3">
            <AlphaPandaLogo size={34} />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[16px] font-bold tracking-[-0.03em] text-[var(--text-primary)]">
                  AlphaPanda
                </span>
                <span className="rounded-full bg-[var(--bg-subtle)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-secondary)] ring-1 ring-[var(--border-hairline)]">
                  Studio
                </span>
              </div>
              <div className="hidden text-[11px] text-[var(--text-tertiary)] sm:block">
                Structural Biology &amp; AI Folding Workstation
              </div>
            </div>
          </div>

          {/* macOS-Style Spring Segmented Module Switcher */}
          <nav
            aria-label="AlphaPanda Modules"
            className="order-3 flex w-full items-center justify-center sm:order-2 sm:w-auto"
          >
            <div className="inline-flex w-full items-center justify-between rounded-full border border-[var(--border-hairline)] bg-[var(--bg-subtle)] p-1 sm:w-auto">
              {MODULES.map((mod) => {
                const active = mod.id === activeTab;
                return (
                  <button
                    key={mod.id}
                    type="button"
                    onClick={() => setActiveTab(mod.id)}
                    className={`relative z-10 inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[12.5px] font-medium transition-colors sm:flex-none ${
                      active
                        ? 'text-[var(--text-primary)]'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="alphapanda-main-nav"
                        transition={APPLE_SPRING}
                        className="absolute inset-0 -z-10 rounded-full bg-[var(--bg-elevated-solid)] shadow-sm ring-1 ring-[var(--border-hairline)]"
                      />
                    )}
                    {mod.icon}
                    <span>{mod.shortLabel}</span>
                  </button>
                );
              })}
            </div>
          </nav>

          {/* Right Controls: Share Deep Link + Cite + Spotlight ⌘K + Theme Toggle */}
          <div className="order-2 flex items-center gap-1.5 sm:order-3">
            <button
              type="button"
              onClick={handleCopyShareLink}
              className="apple-button-secondary inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-[11.5px] font-medium text-[var(--text-secondary)]"
              title="Copy shareable link to this exact view"
            >
              {copiedLink ? (
                <Check className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <Share2 className="h-3.5 w-3.5 text-sky-500" />
              )}
              <span className="hidden md:inline">{copiedLink ? 'Copied' : 'Share'}</span>
            </button>

            <button
              type="button"
              onClick={() => setCiteOpen(true)}
              className="apple-button-secondary hidden cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-[11.5px] font-medium text-[var(--text-secondary)] md:inline-flex"
              title="Cite AlphaPanda Studio (BibTeX & Methods)"
            >
              <BookMarked className="h-3.5 w-3.5 text-indigo-400" />
              <span>Cite</span>
            </button>

            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="apple-button-secondary hidden cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-[11.5px] font-medium text-[var(--text-secondary)] xl:inline-flex"
              title="Open Spotlight Quick Switcher (⌘K)"
            >
              <Command className="h-3.5 w-3.5 text-sky-500" />
              <kbd className="font-mono-code rounded bg-black/8 px-1.5 py-0.5 text-[10px] text-[var(--text-tertiary)] dark:bg-white/10">
                ⌘K
              </kbd>
            </button>

            <button
              type="button"
              onClick={() => setIsDark((d) => !d)}
              aria-label="Toggle dark and light studio appearance"
              className="apple-button-secondary inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full"
            >
              {isDark ? <Sun className="h-4 w-4 text-amber-300" /> : <Moon className="h-4 w-4 text-slate-700" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="mx-auto max-w-[1380px] px-4 pt-6 pb-16 sm:px-6">
        {/* Compact Apple Keynote Hero Strip */}
        <div className="mb-6 flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <motion.div
            key={`hero-${activeModule.id}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: APPLE_EASE }}
          >
            <h1 className="text-[28px] font-bold tracking-[-0.035em] text-[var(--text-primary)] sm:text-[34px]">
              {activeModule.title}
            </h1>
            <p className="mt-1 max-w-3xl text-[14px] leading-relaxed text-[var(--text-secondary)]">
              {activeModule.tagline}
            </p>
          </motion.div>
        </div>

        {/* Animated Module Viewport */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10, scale: 0.995 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.995 }}
            transition={{ duration: 0.28, ease: APPLE_EASE }}
          >
            {activeTab === 'explorer' && (
              <ConfidenceExplorer
                isDark={isDark}
                requestedPresetId={requestedStructPreset}
                requestedLiveId={requestedLiveId}
                onPresetHandled={() => {
                  setRequestedStructPreset(null);
                  setRequestedLiveId(null);
                }}
                onStateChange={({ preset, liveId }) => {
                  deepStateRef.current.explorerPreset = preset;
                  deepStateRef.current.explorerLiveId = liveId;
                  syncUrl('explorer');
                }}
                onOpenHowItWorks={() => setActiveTab('learn')}
              />
            )}
            {activeTab === 'msa' && (
              <MSAPublisher
                isDark={isDark}
                initialPresetId={initial.msa}
                onPresetChange={(presetId) => {
                  deepStateRef.current.msaPreset = presetId;
                  syncUrl('msa');
                }}
              />
            )}
            {activeTab === 'triage' && (
              <VariantTriageStudio
                isDark={isDark}
                requestedPreset={requestedTriagePreset}
                onPresetHandled={() => setRequestedTriagePreset(null)}
                onStateChange={({ uniprotId, mutations }) => {
                  deepStateRef.current.triageUniprot = uniprotId;
                  deepStateRef.current.triageMuts = mutations;
                  syncUrl('triage');
                }}
              />
            )}
            {activeTab === 'learn' && (
              <HowItWorksStudio
                isDark={isDark}
                onJumpToExample={(presetId) => {
                  setRequestedLiveId(null);
                  setRequestedStructPreset(presetId);
                  setActiveTab('explorer');
                }}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Minimal Apple Studio Footer */}
      <footer className="border-t border-[var(--border-hairline)] py-6 text-center text-[12px] text-[var(--text-tertiary)]">
        <div className="mx-auto flex max-w-[1380px] flex-col items-center justify-between gap-2 px-4 sm:flex-row sm:px-6">
          <span>
            <strong className="font-semibold text-[var(--text-secondary)]">AlphaPanda Studio</strong> ·
            Academic &amp; Non-Commercial Research Use Only · Not for Clinical Diagnosis
          </span>
          <span className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setCiteOpen(true)}
              className="cursor-pointer font-semibold text-sky-500 hover:underline"
            >
              Cite &amp; Methods
            </button>
            <span>·</span>
            <span>100% Client-Side · Press ⌘K for Spotlight</span>
          </span>
        </div>
      </footer>
    </div>
  );
}
