import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ChevronDown,
  ChevronUp,
  Info,
  Layers,
  Grid2x2,
  Activity,
  ShieldCheck,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import type { StructureDataset } from '../../lib/structureParser';
import { GlassCard, SegmentedControl, APPLE_EASE } from '../ui/ApplePrimitives';

interface MetricsSegmentationPanelProps {
  dataset: StructureDataset;
  onOpenHowItWorks?: () => void;
}

interface ScaleZone {
  label: string;
  widthPct: number;
  color: string;
}

interface ThresholdMetricRowProps {
  name: string;
  valueDisplay: string;
  statusText: string;
  statusTone: 'emerald' | 'amber' | 'rose';
  markerPct: number; // 0..100 position along bar
  zones: ScaleZone[];
  scaleTicks: string[];
  plainExplanation: string;
  formulaNote: string;
}

const ThresholdMetricRow: React.FC<ThresholdMetricRowProps> = ({
  name,
  valueDisplay,
  statusText,
  statusTone,
  markerPct,
  zones,
  scaleTicks,
  plainExplanation,
  formulaNote,
}) => {
  const [showNote, setShowNote] = useState(false);
  const clamped = Math.max(2, Math.min(98, markerPct));
  const toneClass =
    statusTone === 'emerald'
      ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/12'
      : statusTone === 'amber'
        ? 'text-amber-600 dark:text-amber-300 bg-amber-500/14'
        : 'text-rose-600 dark:text-rose-400 bg-rose-500/14';

  return (
    <div className="apple-glass-subtle rounded-2xl p-3.5 transition-colors hover:border-[var(--border-strong)]">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[12.5px] font-bold tracking-tight text-[var(--text-primary)]">
            {name}
          </span>
          <button
            type="button"
            onClick={() => setShowNote((v) => !v)}
            className="inline-flex cursor-pointer items-center justify-center rounded-full p-0.5 text-[var(--text-tertiary)] transition-colors hover:text-sky-500"
            title="Show scientific definition & threshold reference"
            aria-label={`Explain ${name}`}
          >
            <Info className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${toneClass}`}>
            {statusText}
          </span>
          <span className="tabular-nums-strict font-mono-code whitespace-nowrap text-[16px] font-bold text-[var(--text-primary)]">
            {valueDisplay}
          </span>
        </div>
      </div>

      {/* Apple Health-style Segmented Threshold Range Bar */}
      <div className="relative mt-3 mb-1.5">
        <div className="flex h-2 w-full overflow-hidden rounded-full bg-black/8 dark:bg-white/10">
          {zones.map((z) => (
            <div
              key={z.label}
              style={{ width: `${z.widthPct}%`, backgroundColor: z.color }}
              title={z.label}
              className="h-full first:rounded-l-full last:rounded-r-full opacity-85"
            />
          ))}
        </div>
        {/* Animated Live Position Needle */}
        <motion.div
          initial={{ left: '4%' }}
          animate={{ left: `${clamped}%` }}
          transition={{ duration: 0.75, ease: APPLE_EASE }}
          className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[var(--text-primary)] shadow-md dark:border-[#0B0E17]"
        />
      </div>

      {/* Scale Tick Labels */}
      <div className="flex items-center justify-between font-mono-code text-[9.5px] text-[var(--text-tertiary)]">
        {scaleTicks.map((t) => (
          <span key={t}>{t}</span>
        ))}
      </div>

      {/* Plain-English Interpretation */}
      <p className="mt-2 text-[11.5px] leading-relaxed text-[var(--text-secondary)]">
        {plainExplanation}
      </p>

      <AnimatePresence>
        {showNote && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: APPLE_EASE }}
            className="overflow-hidden"
          >
            <div className="mt-2 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-elevated-solid)] px-3 py-2 text-[11px] leading-relaxed text-[var(--text-secondary)]">
              {formulaNote}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

type GuideTab = 'overview' | 'plddt-vs-pae' | 'interface-scores' | 'pitfalls';
type LanguageMode = 'simple' | 'expert';

export const MetricsSegmentationPanel: React.FC<MetricsSegmentationPanelProps> = ({
  dataset,
  onOpenHowItWorks,
}) => {
  const [guideOpen, setGuideOpen] = useState(false);
  const [guideTab, setGuideTab] = useState<GuideTab>('overview');
  const [langMode, setLangMode] = useState<LanguageMode>('simple');
  const isSimple = langMode === 'simple';

  const m = dataset.metrics;
  const totalRes = Math.max(1, dataset.residues.length);

  // Segment 3: Exact per-residue pLDDT distribution breakdown
  const plddtBreakdown = useMemo(() => {
    let veryHigh = 0;
    let confident = 0;
    let low = 0;
    let disordered = 0;
    for (const r of dataset.residues) {
      if (r.plddt >= 90) veryHigh++;
      else if (r.plddt >= 70) confident++;
      else if (r.plddt >= 50) low++;
      else disordered++;
    }
    return {
      veryHigh,
      confident,
      low,
      disordered,
      veryHighPct: Math.round((veryHigh / totalRes) * 100),
      confidentPct: Math.round((confident / totalRes) * 100),
      lowPct: Math.round((low / totalRes) * 100),
      disorderedPct: Math.round((disordered / totalRes) * 100),
    };
  }, [dataset.residues, totalRes]);

  // Compute mean intra-chain PAE vs inter-chain PAE for clear contrast
  const paeBreakdown = useMemo(() => {
    const n = dataset.residues.length;
    if (n === 0) return { intraMean: 0, interMean: 0 };
    const step = Math.max(1, Math.floor(n / 120));
    let intraSum = 0;
    let intraCnt = 0;
    let interSum = 0;
    let interCnt = 0;

    for (let i = 0; i < n; i += step) {
      for (let j = 0; j < n; j += step) {
        if (i === j) continue;
        const val = dataset.pae[i]?.[j] ?? 15;
        if (dataset.residues[i].chain === dataset.residues[j].chain) {
          intraSum += val;
          intraCnt++;
        } else {
          interSum += val;
          interCnt++;
        }
      }
    }
    return {
      intraMean: intraCnt > 0 ? Math.round((intraSum / intraCnt) * 10) / 10 : 0,
      interMean: interCnt > 0 ? Math.round((interSum / interCnt) * 10) / 10 : 0,
    };
  }, [dataset.pae, dataset.residues]);

  // 5-Gate Real vs. Artifact Diagnostic Scorecard
  const diagnosticGates = useMemo(() => {
    if (m.isMonomer) {
      return [
        {
          label: 'Global Fold (pTM ≥ 0.80)',
          value: m.ptm.toFixed(2),
          status: m.ptm >= 0.8 ? 'pass' : m.ptm >= 0.55 ? 'warn' : 'fail',
          tip: 'Above 0.80 indicates a well-defined globular topology.',
        },
        {
          label: 'Local Backbone (Mean pLDDT ≥ 85)',
          value: m.meanComplexPlddt.toFixed(1),
          status: m.meanComplexPlddt >= 85 ? 'pass' : m.meanComplexPlddt >= 70 ? 'warn' : 'fail',
          tip: 'Above 85 indicates high atomic & sidechain reliability.',
        },
        {
          label: 'Rigid Core Alignment (Core PAE ≤ 5 Å)',
          value: `${m.meanInterfacePae.toFixed(1)} Å`,
          status: m.meanInterfacePae <= 5 ? 'pass' : m.meanInterfacePae <= 9 ? 'warn' : 'fail',
          tip: 'Low PAE between long-range contacts confirms packed tertiary fold.',
        },
        {
          label: 'Ordered Fraction (<20% Disordered)',
          value: `${100 - plddtBreakdown.disorderedPct}% ordered`,
          status: plddtBreakdown.disorderedPct < 20 ? 'pass' : plddtBreakdown.disorderedPct < 40 ? 'warn' : 'fail',
          tip: 'Regions with pLDDT <50 are likely intrinsically disordered loops/tails.',
        },
        {
          label: 'Tertiary Core Density (≥40 Core Contacts)',
          value: `${m.contactCount8A} pairs`,
          status: m.contactCount8A >= 40 ? 'pass' : m.contactCount8A >= 15 ? 'warn' : 'fail',
          tip: 'Dense long-range contacts (|Δi|≥12) distinguish globular cores from extended coils.',
        },
      ] as const;
    }

    return [
      {
        label: 'Interface Fold (ipTM ≥ 0.75)',
        value: m.iptm.toFixed(2),
        status: m.iptm >= 0.75 ? 'pass' : m.iptm >= 0.5 ? 'warn' : 'fail',
        tip: 'Primary AlphaFold3 / Boltz-2 gate for confident multimer interfaces.',
      },
      {
        label: 'Docking Quality (pDockQ ≥ 0.45)',
        value: m.pDockQ.toFixed(2),
        status: m.pDockQ >= 0.45 ? 'pass' : m.pDockQ >= 0.23 ? 'warn' : 'fail',
        tip: 'Bryant et al. (2022) calibrated interface score (0.23 acceptable, ≥0.50 high).',
      },
      {
        label: 'Interface PAE (Mean i-PAE ≤ 6.5 Å)',
        value: `${m.meanInterfacePae.toFixed(1)} Å`,
        status: m.meanInterfacePae <= 6.5 ? 'pass' : m.meanInterfacePae <= 11.5 ? 'warn' : 'fail',
        tip: 'Low cross-chain PAE directly at contact residues rules out rigid-body drift.',
      },
      {
        label: 'Contact Sidechains (i-pLDDT ≥ 80)',
        value: m.meanInterfacePlddt.toFixed(1),
        status: m.meanInterfacePlddt >= 80 ? 'pass' : m.meanInterfacePlddt >= 68 ? 'warn' : 'fail',
        tip: 'High local pLDDT at the interface means contact sidechains are well positioned.',
      },
      {
        label: 'Buried Contact Patch (≥15 CB Contacts)',
        value: `${m.contactCount8A} pairs`,
        status: m.contactCount8A >= 15 ? 'pass' : m.contactCount8A >= 6 ? 'warn' : 'fail',
        tip: 'Real protein interfaces typically span 15–80 CB–CB contacts within 8 Å.',
      },
    ] as const;
  }, [m, plddtBreakdown.disorderedPct]);

  const passedGates = diagnosticGates.filter((g) => g.status === 'pass').length;

  return (
    <div className="space-y-4">
      {/* Header Strip with Plain English / Expert Switch + Toggleable Metrics Explainer */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div>
          <h3 className="text-[15px] font-bold tracking-[-0.02em] text-[var(--text-primary)]">
            {isSimple
              ? 'How Confident Is This AI Structure? (Plain English)'
              : 'Confidence Metrics Breakdown & Interpretation'}
          </h3>
          <p className="text-[12px] text-[var(--text-tertiary)]">
            {isSimple
              ? 'Split into 3 plain questions: Overall Fit, Partner Wobble (PAE), and Atom-by-Atom Trust (pLDDT)'
              : 'Segmented into Global Fold, Relative Domain Alignment (PAE), and Local Atomic Accuracy (pLDDT) — click any (i) icon for formulas'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <SegmentedControl
            layoutId="af-lang-mode"
            size="xs"
            value={langMode}
            onChange={setLangMode}
            options={[
              { value: 'simple', label: 'Plain English' },
              { value: 'expert', label: 'Expert' },
            ]}
          />

          <button
            type="button"
            onClick={() => setGuideOpen((v) => !v)}
            className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold transition-all ${
              guideOpen
                ? 'bg-sky-500/15 text-sky-500 ring-1 ring-sky-500/35'
                : 'apple-button-secondary'
            }`}
          >
            <BookOpen className="h-3.5 w-3.5 text-sky-500" />
            <span>{guideOpen ? 'Hide Guide' : 'Quick Guide'}</span>
            {guideOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>

          {onOpenHowItWorks && (
            <button
              type="button"
              onClick={onOpenHowItWorks}
              className="apple-button-secondary inline-flex cursor-pointer items-center gap-1 rounded-full px-3 py-1.5 text-[12px] font-semibold text-sky-500"
            >
              <span>How Diffusion Works</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Expandable Interactive AlphaFold Metrics Guide & Pitfalls Cheat-Sheet */}
      <AnimatePresence>
        {guideOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.28, ease: APPLE_EASE }}
            className="overflow-hidden"
          >
            <GlassCard className="border-sky-500/25 p-4 sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-sky-400" />
                  <span className="text-[14px] font-bold text-[var(--text-primary)]">
                    Quick Field Guide to AlphaFold3 · ColabFold · Boltz-2 Statistics
                  </span>
                </div>
                <SegmentedControl
                  layoutId="af-guide-tabs"
                  size="xs"
                  value={guideTab}
                  onChange={setGuideTab}
                  options={[
                    { value: 'overview', label: 'Big Picture' },
                    { value: 'plddt-vs-pae', label: 'pLDDT vs PAE' },
                    { value: 'interface-scores', label: 'ipTM & pDockQ' },
                    { value: 'pitfalls', label: 'Common Pitfalls' },
                  ]}
                />
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 text-[12.5px] leading-relaxed text-[var(--text-secondary)] md:grid-cols-3">
                {guideTab === 'overview' && (
                  <>
                    <div className="apple-glass-subtle rounded-2xl p-3.5">
                      <div className="font-semibold text-[var(--text-primary)]">1. Is each chain folded right?</div>
                      <p className="mt-1">
                        Look at <strong className="text-sky-400">pLDDT</strong> (0–100) and <strong className="text-sky-400">pTM</strong> (0–1). High pLDDT (≥90) means local helices, sheets, and sidechains are trustworthy — like a crystal structure.
                      </p>
                    </div>
                    <div className="apple-glass-subtle rounded-2xl p-3.5">
                      <div className="font-semibold text-[var(--text-primary)]">2. Are the chains docked right?</div>
                      <p className="mt-1">
                        Never judge a complex by pLDDT alone! Always check <strong className="text-emerald-400">ipTM</strong> (≥0.75), <strong className="text-emerald-400">pDockQ</strong> (≥0.45), and the off-diagonal blocks of the <strong className="text-emerald-400">PAE heatmap</strong> (dark green &lt;6.5 Å).
                      </p>
                    </div>
                    <div className="apple-glass-subtle rounded-2xl p-3.5">
                      <div className="font-semibold text-[var(--text-primary)]">3. Which residues drive binding?</div>
                      <p className="mt-1">
                        Inspect the <strong className="text-violet-400">Interface Contact Table</strong> below. Prioritize salt bridges, H-bonds, and buried hydrophobic pairs with both low i-PAE (&lt;5 Å) and high local pLDDT (&gt;85) for mutagenesis.
                      </p>
                    </div>
                  </>
                )}

                {guideTab === 'plddt-vs-pae' && (
                  <>
                    <div className="apple-glass-subtle rounded-2xl p-3.5">
                      <div className="font-semibold text-[var(--text-primary)]">pLDDT = Local Accuracy (1D)</div>
                      <p className="mt-1">
                        Predicted Local Distance Difference Test (0–100). Measures confidence within a ~15 Å local neighborhood around each residue. Two domains can both have pLDDT 95 while their relative orientation is completely unknown!
                      </p>
                    </div>
                    <div className="apple-glass-subtle rounded-2xl p-3.5">
                      <div className="font-semibold text-[var(--text-primary)]">PAE = Relative Positioning (2D)</div>
                      <p className="mt-1">
                        Predicted Aligned Error (0–31.75 Å). Cell <em>(i, j)</em> is the expected position error of residue <em>j</em> when the structure is aligned on residue <em>i</em>. Dark green off-diagonal squares mean two domains/chains are rigidly locked together.
                      </p>
                    </div>
                    <div className="apple-glass-subtle rounded-2xl p-3.5">
                      <div className="font-semibold text-[var(--text-primary)]">Quick Rule of Thumb</div>
                      <p className="mt-1">
                        <strong>High pLDDT + White/Pale off-diagonal PAE</strong> = well-folded domains connected by a flexible linker or an uncertain docking pose. <strong>High pLDDT + Dark Green PAE</strong> = confident biological interface.
                      </p>
                    </div>
                  </>
                )}

                {guideTab === 'interface-scores' && (
                  <>
                    <div className="apple-glass-subtle rounded-2xl p-3.5">
                      <div className="font-semibold text-[var(--text-primary)]">ipTM (Interface Predicted TM)</div>
                      <p className="mt-1">
                        Evaluates accuracy of inter-chain subunit positioning (0–1). <strong>≥0.80</strong>: very high confidence; <strong>0.60–0.79</strong>: gray zone (inspect PAE &amp; contacts); <strong>&lt;0.60</strong>: likely wrong interface or weak transient binder.
                      </p>
                    </div>
                    <div className="apple-glass-subtle rounded-2xl p-3.5">
                      <div className="font-semibold text-[var(--text-primary)]">pDockQ (Bryant et al. 2022)</div>
                      <p className="mt-1">
                        Logistic calibration combining mean interface pLDDT and log10(interface CB contacts ≤8 Å) to predict DockQ. <strong>&lt;0.23</strong> incorrect, <strong>0.23–0.49</strong> acceptable, <strong>≥0.50</strong> medium-to-high accuracy complex.
                      </p>
                    </div>
                    <div className="apple-glass-subtle rounded-2xl p-3.5">
                      <div className="font-semibold text-[var(--text-primary)]">Ranking Score (AF3 / Boltz-2)</div>
                      <p className="mt-1">
                        Standard multimer confidence blend: <code className="font-mono-code">0.8 × ipTM + 0.2 × pTM</code> (with clash/disorder adjustments in AF3). Useful for ranking seeds, but always verify local interface PAE too.
                      </p>
                    </div>
                  </>
                )}

                {guideTab === 'pitfalls' && (
                  <>
                    <div className="apple-glass-subtle rounded-2xl p-3.5">
                      <div className="font-semibold text-amber-500">Pitfall 1: Disordered Tails Dragging ipTM</div>
                      <p className="mt-1">
                        A genuine domain-domain or peptide interface can score <strong>ipTM ~0.55</strong> if long unstructured N/C-terminal tails are included. Check <strong>Mean i-PAE</strong> directly at the contact patch or trim tails and re-fold!
                      </p>
                    </div>
                    <div className="apple-glass-subtle rounded-2xl p-3.5">
                      <div className="font-semibold text-amber-500">Pitfall 2: Treating pLDDT &lt;50 as a Real Helix</div>
                      <p className="mt-1">
                        Orange/red ribbons (&lt;50 pLDDT) are strong predictors of <strong>intrinsic disorder</strong>, not static spaghetti coordinates. Do not measure distances or design point mutations on &lt;50 pLDDT regions.
                      </p>
                    </div>
                    <div className="apple-glass-subtle rounded-2xl p-3.5">
                      <div className="font-semibold text-amber-500">Pitfall 3: Hallucinated Peptide/Coil Packing</div>
                      <p className="mt-1">
                        Small contact patches (&lt;10 pairs) with high PAE (&gt;12 Å) can be crystallization-like packing artifacts. Look for complementary electrostatics (salt bridges/H-bonds) + buried hydrophobics in the Contact Table.
                      </p>
                    </div>
                  </>
                )}
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3 Segmented Metric Cards (Global/Interface · Alignment/PAE · Local/pLDDT) */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {/* SEGMENT 1: Global & Interface Reliability */}
        <GlassCard className="flex flex-col gap-3 p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-sky-500/14 text-sky-500">
                <Layers className="h-4 w-4" />
              </span>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.07em] text-sky-500">
                  Segment 1 · {m.isMonomer ? 'Global Fold' : 'Interface Fold'}
                </div>
                <div className="text-[13.5px] font-semibold text-[var(--text-primary)]">
                  {m.isMonomer ? 'Overall Tertiary Topology' : 'Complex Assembly Confidence'}
                </div>
              </div>
            </div>
            <span className="font-mono-code rounded-full bg-[var(--bg-subtle)] px-2.5 py-0.5 text-[10.5px] font-semibold text-[var(--text-secondary)]">
              Rank {m.rankingScore.toFixed(2)}
            </span>
          </div>

          {m.isMonomer ? (
            <>
              <ThresholdMetricRow
                name={isSimple ? 'Overall Shape Score (pTM)' : 'pTM (Predicted TM-score)'}
                valueDisplay={m.ptm.toFixed(2)}
                statusText={m.ptm >= 0.8 ? 'High Fold' : m.ptm >= 0.55 ? 'Moderate' : 'Uncertain'}
                statusTone={m.ptm >= 0.8 ? 'emerald' : m.ptm >= 0.55 ? 'amber' : 'rose'}
                markerPct={m.ptm * 100}
                zones={[
                  { label: 'Unfolded / Wrong (<0.5)', widthPct: 50, color: '#FF453A' },
                  { label: 'Plausible Fold (0.5–0.8)', widthPct: 30, color: '#FF9F0A' },
                  { label: 'Confident Globular Fold (≥0.8)', widthPct: 20, color: '#30D158' },
                ]}
                scaleTicks={['0.0', '0.50 (Fold)', '0.80 (High)', '1.0']}
                plainExplanation={
                  isSimple
                    ? 'Did the AI get the big-picture 3D shape right? Scores above 0.80 mean the overall folded architecture is solid.'
                    : 'Estimates overall 3D backbone similarity to the true native fold. Scores ≥0.80 confirm an accurate globular domain.'
                }
                formulaNote="Predicted Template Modeling (TM) score across the full chain. Unlike RMSD, pTM is length-normalized and insensitive to tiny terminal wiggles."
              />
              <ThresholdMetricRow
                name={isSimple ? 'Internal Packing Anchors' : 'Core Tertiary Contacts (|Δi| ≥ 12)'}
                valueDisplay={`${m.contactCount8A}`}
                statusText={m.contactCount8A >= 60 ? 'Compact Core' : m.contactCount8A >= 20 ? 'Moderate' : 'Extended'}
                statusTone={m.contactCount8A >= 60 ? 'emerald' : m.contactCount8A >= 20 ? 'amber' : 'rose'}
                markerPct={Math.min(98, (m.contactCount8A / 320) * 100)}
                zones={[
                  { label: 'Extended / Disordered (<20)', widthPct: 18, color: '#FF453A' },
                  { label: 'Loose Packing (20–60)', widthPct: 27, color: '#FF9F0A' },
                  { label: 'Compact Globular Core (≥60)', widthPct: 55, color: '#30D158' },
                ]}
                scaleTicks={['0', '60', '180', '320+']}
                plainExplanation={
                  isSimple
                    ? 'How many far-apart parts of the sequence fold up and hug each other tightly—proving this is a real compact globe, not a loose noodle.'
                    : 'Counts sequence-distant residues packed within 8 Å CB–CB — distinguishing true globular domains from extended coils.'
                }
                formulaNote="Pairs (i, j) with |resSeq_i − resSeq_j| ≥ 12 and CB–CB distance ≤ 8.0 Å (CA used for Glycine)."
              />
            </>
          ) : (
            <>
              <ThresholdMetricRow
                name={isSimple ? 'Partner Fit Score (ipTM)' : 'ipTM (Interface pTM)'}
                valueDisplay={m.iptm.toFixed(2)}
                statusText={m.iptm >= 0.75 ? 'High Confidence' : m.iptm >= 0.5 ? 'Gray Zone' : 'Low / Artifact'}
                statusTone={m.iptm >= 0.75 ? 'emerald' : m.iptm >= 0.5 ? 'amber' : 'rose'}
                markerPct={m.iptm * 100}
                zones={[
                  { label: 'Likely Artifact (<0.50)', widthPct: 50, color: '#FF453A' },
                  { label: 'Gray Zone (0.50–0.75)', widthPct: 25, color: '#FF9F0A' },
                  { label: 'Confident Interface (≥0.75)', widthPct: 25, color: '#30D158' },
                ]}
                scaleTicks={['0.0', '0.50', '0.75 (Target)', '1.0']}
                plainExplanation={
                  isSimple
                    ? 'Do these two proteins really snap together like this? Above 0.75 means the AI is strongly confident the docking pose is real.'
                    : 'Measures accuracy of how the protein chains pack against each other. Above 0.75 strongly supports a real biological complex.'
                }
                formulaNote={`AlphaFold-Multimer / AF3 / Boltz-2 inter-chain TM score (0–1). Current global pTM is ${m.ptm.toFixed(2)} and composite ranking score (0.8×ipTM + 0.2×pTM) is ${m.rankingScore.toFixed(2)}.`}
              />
              <ThresholdMetricRow
                name={isSimple ? 'Docking Trust (pDockQ)' : 'pDockQ (Interface Docking)'}
                valueDisplay={m.pDockQ.toFixed(2)}
                statusText={m.pDockQ >= 0.495 ? 'High Accuracy' : m.pDockQ >= 0.23 ? 'Acceptable' : 'Incorrect'}
                statusTone={m.pDockQ >= 0.495 ? 'emerald' : m.pDockQ >= 0.23 ? 'amber' : 'rose'}
                markerPct={(m.pDockQ / 0.75) * 100}
                zones={[
                  { label: 'Incorrect (<0.23)', widthPct: 31, color: '#FF453A' },
                  { label: 'Acceptable (0.23–0.49)', widthPct: 35, color: '#FF9F0A' },
                  { label: 'Medium–High (≥0.50)', widthPct: 34, color: '#30D158' },
                ]}
                scaleTicks={['0.0', '0.23 (Min)', '0.50 (High)', '0.74']}
                plainExplanation={
                  isSimple
                    ? 'A second opinion on docking quality based on how many confident atoms touch across the boundary (0.23+ acceptable, 0.50+ strong).'
                    : 'Calibrated docking score combining interface contact count and interface pLDDT — robust even when tails are disordered.'
                }
                formulaNote="Bryant et al. (Nature Comm. 2022): pDockQ = 0.724 / (1 + exp(-0.052 × (i-pLDDT × log10(contacts) − 152.611))) + 0.018."
              />
            </>
          )}
        </GlassCard>

        {/* SEGMENT 2: Relative Positioning & PAE Alignment */}
        <GlassCard className="flex flex-col gap-3 p-4 sm:p-5" delay={0.04}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-500/14 text-emerald-500">
                <Grid2x2 className="h-4 w-4" />
              </span>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.07em] text-emerald-500">
                  Segment 2 · Relative Error (PAE)
                </div>
                <div className="text-[13.5px] font-semibold text-[var(--text-primary)]">
                  Domain &amp; Interface Positioning
                </div>
              </div>
            </div>
            <span className="font-mono-code rounded-full bg-[var(--bg-subtle)] px-2.5 py-0.5 text-[10.5px] font-semibold text-[var(--text-secondary)]">
              Min {m.minInterfacePae.toFixed(1)} Å
            </span>
          </div>

          <ThresholdMetricRow
            name={
              isSimple
                ? m.isMonomer
                  ? 'Core Wobble (PAE)'
                  : 'Packing Wobble (i-PAE)'
                : m.isMonomer
                  ? 'Mean Core Contact PAE'
                  : 'Mean Interface PAE (i-PAE)'
            }
            valueDisplay={`${m.meanInterfacePae.toFixed(1)} Å`}
            statusText={
              m.meanInterfacePae <= 5.5
                ? 'Rigidly Locked'
                : m.meanInterfacePae <= 10.5
                  ? 'Moderate / Flexible'
                  : 'Uncertain Drift'
            }
            statusTone={
              m.meanInterfacePae <= 5.5 ? 'emerald' : m.meanInterfacePae <= 10.5 ? 'amber' : 'rose'
            }
            // Lower PAE is BETTER: left = 0 Å (emerald), right = 25 Å (rose)
            markerPct={Math.min(98, (m.meanInterfacePae / 25) * 100)}
            zones={[
              { label: 'Rigidly Locked (0–6 Å)', widthPct: 24, color: '#30D158' },
              { label: 'Plausible / Flexible (6–12 Å)', widthPct: 24, color: '#FF9F0A' },
              { label: 'Uncertain / Spurious (>12 Å)', widthPct: 52, color: '#FF453A' },
            ]}
            scaleTicks={['0 Å (Best)', '6 Å', '12 Å', '25+ Å (Poor)']}
            plainExplanation={
              isSimple
                ? 'Think of this like GPS margin of error between touching residues—lower is better! Under 6 Å means atoms are locked within one amino-acid width.'
                : 'Average expected distance error (in Ångströms) across contacting residue pairs. Lower is better — under 6 Å means tight locking.'
            }
            formulaNote="Computed as the mean symmetrized PAE(i,j) & PAE(j,i) across all detected contact pairs ≤8 Å. Unlike global ipTM, i-PAE focuses strictly on the binding patch."
          />

          {/* Intra vs Inter PAE Contrast Mini-Grid */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="apple-glass-subtle rounded-2xl p-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--text-tertiary)]">
                Intra-Chain PAE
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="tabular-nums-strict font-mono-code text-[18px] font-bold text-[var(--text-primary)]">
                  {paeBreakdown.intraMean.toFixed(1)} Å
                </span>
                <span className="text-[10.5px] text-emerald-500">Within chain</span>
              </div>
              <p className="mt-1 text-[10.5px] leading-snug text-[var(--text-tertiary)]">
                Diagonal blocks of the PAE plot — verifies internal domain rigidity.
              </p>
            </div>

            <div className="apple-glass-subtle rounded-2xl p-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--text-tertiary)]">
                {m.isMonomer ? 'Global pTM' : 'Cross-Chain PAE'}
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="tabular-nums-strict font-mono-code text-[18px] font-bold text-[var(--text-primary)]">
                  {m.isMonomer ? m.ptm.toFixed(2) : `${paeBreakdown.interMean.toFixed(1)} Å`}
                </span>
                <span className="text-[10.5px] text-sky-400">
                  {m.isMonomer ? 'Single chain' : 'Off-diagonal'}
                </span>
              </div>
              <p className="mt-1 text-[10.5px] leading-snug text-[var(--text-tertiary)]">
                {m.isMonomer
                  ? 'Single globular domain — no inter-chain off-diagonal block.'
                  : 'Off-diagonal quadrants — lower values mean chains dock consistently.'}
              </p>
            </div>
          </div>
        </GlassCard>

        {/* SEGMENT 3: Local Atomic Confidence (pLDDT Band Segmentation) */}
        <GlassCard className="flex flex-col gap-3 p-4 sm:p-5" delay={0.08}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-violet-500/14 text-violet-400">
                <Activity className="h-4 w-4" />
              </span>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.07em] text-violet-400">
                  Segment 3 · Local Accuracy (pLDDT)
                </div>
                <div className="text-[13.5px] font-semibold text-[var(--text-primary)]">
                  Per-Residue Confidence Bands
                </div>
              </div>
            </div>
            <span className="tabular-nums-strict font-mono-code rounded-full bg-[var(--bg-subtle)] px-2.5 py-0.5 text-[11px] font-bold text-[var(--text-primary)]">
              Mean {m.meanComplexPlddt.toFixed(1)}
            </span>
          </div>

          {/* Apple Storage-Bar–style Stacked pLDDT Distribution */}
          <div className="apple-glass-subtle rounded-2xl p-3.5">
            <div className="mb-2 flex items-center justify-between text-[11.5px]">
              <span className="font-semibold text-[var(--text-primary)]">
                Residue Distribution ({dataset.residues.length} aa)
              </span>
              {!m.isMonomer && (
                <span className="font-mono-code text-[11px] text-sky-400">
                  Interface i-pLDDT: <strong>{m.meanInterfacePlddt.toFixed(1)}</strong>
                </span>
              )}
            </div>

            <div className="flex h-3 w-full overflow-hidden rounded-full bg-black/8 dark:bg-white/10">
              {[
                { pct: plddtBreakdown.veryHighPct, color: '#0A84FF', label: 'Very High ≥90' },
                { pct: plddtBreakdown.confidentPct, color: '#5AC8FA', label: 'Confident 70–90' },
                { pct: plddtBreakdown.lowPct, color: '#FFD60A', label: 'Low 50–70' },
                { pct: plddtBreakdown.disorderedPct, color: '#FF6B4A', label: 'Disordered <50' },
              ].map((seg) =>
                seg.pct > 0 ? (
                  <motion.div
                    key={seg.label}
                    initial={{ width: 0 }}
                    animate={{ width: `${seg.pct}%` }}
                    transition={{ duration: 0.7, ease: APPLE_EASE }}
                    style={{ backgroundColor: seg.color }}
                    title={`${seg.label}: ${seg.pct}%`}
                    className="h-full"
                  />
                ) : null
              )}
            </div>

            {/* 4-Band Plain-English Breakdown */}
            <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
              {[
                {
                  color: '#0A84FF',
                  title: 'Very High (≥90)',
                  pct: plddtBreakdown.veryHighPct,
                  count: plddtBreakdown.veryHigh,
                  desc: 'Sidechain-accurate core',
                },
                {
                  color: '#5AC8FA',
                  title: 'Confident (70–90)',
                  pct: plddtBreakdown.confidentPct,
                  count: plddtBreakdown.confident,
                  desc: 'Good backbone fold',
                },
                {
                  color: '#FFD60A',
                  title: 'Low (50–70)',
                  pct: plddtBreakdown.lowPct,
                  count: plddtBreakdown.low,
                  desc: 'Flexible loops / hinges',
                },
                {
                  color: '#FF6B4A',
                  title: 'Disordered (<50)',
                  pct: plddtBreakdown.disorderedPct,
                  count: plddtBreakdown.disordered,
                  desc: 'Unstructured IDR tail',
                },
              ].map((b) => (
                <div key={b.title} className="rounded-xl bg-[var(--bg-elevated-solid)]/60 px-2.5 py-2">
                  <div className="flex items-center justify-between gap-1">
                    <span className="inline-flex items-center gap-1.5 font-semibold text-[var(--text-primary)]">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: b.color }} />
                      {b.title}
                    </span>
                    <span className="tabular-nums-strict font-mono-code font-bold text-[var(--text-primary)]">
                      {b.pct}%
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center justify-between text-[10px] text-[var(--text-tertiary)]">
                    <span>{b.desc}</span>
                    <span className="font-mono-code">{b.count} aa</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Automated 5-Gate Real vs. Artifact Diagnostic Scorecard */}
      <GlassCard className="p-4" delay={0.1}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500/12 text-emerald-500">
              <ShieldCheck className="h-4.5 w-4.5" />
            </span>
            <div>
              <div className="text-[12.5px] font-bold text-[var(--text-primary)]">
                Automated Quality Gates · {passedGates}/{diagnosticGates.length} Passed
              </div>
              <div className="text-[11.5px] text-[var(--text-tertiary)]">
                {m.isMonomer
                  ? 'Evaluates globular fold compactness, local confidence, and core alignment'
                  : 'Standard structural biology checklist to distinguish native interfaces from docking artifacts'}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {diagnosticGates.map((g) => (
              <div
                key={g.label}
                title={g.tip}
                className="apple-glass-subtle inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11.5px]"
              >
                {g.status === 'pass' ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                ) : g.status === 'warn' ? (
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                ) : (
                  <XCircle className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                )}
                <span className="font-medium text-[var(--text-secondary)]">{g.label.split('(')[0].trim()}</span>
                <span className="font-mono-code font-bold text-[var(--text-primary)]">{g.value}</span>
              </div>
            ))}
          </div>
        </div>
      </GlassCard>
    </div>
  );
};
