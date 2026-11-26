import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  ExternalLink,
  Download,
  FileImage,
  FileText,
  Sparkles,
  ShieldAlert,
  Compass,
  Flame,
  Loader2,
  Database,
  CheckCircle2,
} from 'lucide-react';
import {
  CURATED_PROTEIN_PRESETS,
  TRIAGE_PRESET_QUERIES,
  evaluateVariants,
  exportTriageCardsSVG,
  fetchLiveProteinProfile,
  hydrateProfileStatic3D,
  parseMutationList,
  type ProteinProfile,
  type VariantTriageResult,
} from '../../lib/variantTriage';
import { plddtColor } from '../../lib/aminoAcids';
import { downloadSvgAsPng, downloadTextFile } from '../../lib/figureExport';
import { GlassCard, StatusPill, APPLE_EASE } from '../ui/ApplePrimitives';
import { Triage3DSpotlight } from './Triage3DSpotlight';

interface VariantTriageStudioProps {
  isDark: boolean;
  requestedPreset?: { uniprotId: string; mutations: string } | null;
  onPresetHandled?: () => void;
  onStateChange?: (state: { uniprotId: string; mutations: string }) => void;
}

export const VariantTriageStudio: React.FC<VariantTriageStudioProps> = ({
  isDark,
  requestedPreset,
  onPresetHandled,
  onStateChange,
}) => {
  const [uniprotInput, setUniprotInput] = useState(requestedPreset?.uniprotId || 'P04637');
  const [mutationInput, setMutationInput] = useState(
    requestedPreset?.mutations || 'R175H, Y220C, R248Q, R273H, R337H'
  );
  const [profile, setProfile] = useState<ProteinProfile>(
    (requestedPreset?.uniprotId && CURATED_PROTEIN_PRESETS[requestedPreset.uniprotId.toUpperCase()]) ||
      CURATED_PROTEIN_PRESETS.P04637
  );
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [focusedMutation, setFocusedMutation] = useState<string | null>(null);

  useEffect(() => {
    onStateChange?.({ uniprotId: uniprotInput.trim().toUpperCase(), mutations: mutationInput.trim() });
  }, [uniprotInput, mutationInput]);

  // Hydrate static 3D globular PDB whenever a profile with staticPdbPath is active
  useEffect(() => {
    let active = true;
    if (profile.staticPdbPath && !profile.rawPdbText) {
      hydrateProfileStatic3D(profile).then((hydrated) => {
        if (active && hydrated.rawPdbText) setProfile(hydrated);
      });
    }
    return () => {
      active = false;
    };
  }, [profile.uniprotId, profile.staticPdbPath, profile.rawPdbText]);

  useEffect(() => {
    if (requestedPreset) {
      setUniprotInput(requestedPreset.uniprotId);
      setMutationInput(requestedPreset.mutations);
      setErrorMsg(null);
      setFocusedMutation(null);
      const p = CURATED_PROTEIN_PRESETS[requestedPreset.uniprotId];
      if (p) setProfile(p);
      onPresetHandled?.();
    }
  }, [requestedPreset]);

  const parsedMutations = useMemo(() => parseMutationList(mutationInput), [mutationInput]);
  const results = useMemo(
    () => evaluateVariants(profile, parsedMutations),
    [profile, parsedMutations]
  );

  const handleAnalyze = async (e?: React.FormEvent, overrideId?: string, overrideMuts?: string) => {
    e?.preventDefault();
    const targetId = (overrideId ?? uniprotInput).trim().toUpperCase();
    if (!targetId) return;
    if (overrideId) setUniprotInput(targetId);
    if (overrideMuts) setMutationInput(overrideMuts);

    setErrorMsg(null);
    // Load curated preset immediately for instant UX if available, then optionally upgrade via live UniProt+AlphaFold
    if (CURATED_PROTEIN_PRESETS[targetId]) {
      setProfile(CURATED_PROTEIN_PRESETS[targetId]);
    }
    setLoading(true);
    try {
      const live = await fetchLiveProteinProfile(targetId);
      setProfile(live);
    } catch (err) {
      if (!CURATED_PROTEIN_PRESETS[targetId]) {
        setErrorMsg(err instanceof Error ? err.message : 'Unable to retrieve UniProt record.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePresetClick = (preset: (typeof TRIAGE_PRESET_QUERIES)[number]) => {
    setUniprotInput(preset.uniprotId);
    setMutationInput(preset.mutations);
    setErrorMsg(null);
    setFocusedMutation(null);
    if (CURATED_PROTEIN_PRESETS[preset.uniprotId]) {
      setProfile(CURATED_PROTEIN_PRESETS[preset.uniprotId]);
    }
  };

  const handleExportSVG = () => {
    const svg = exportTriageCardsSVG(profile, results);
    downloadTextFile(`${profile.geneName}-${profile.uniprotId}-triage.svg`, svg, 'image/svg+xml');
  };

  const handleExportPNG = async () => {
    const svg = exportTriageCardsSVG(profile, results);
    await downloadSvgAsPng(`${profile.geneName}-${profile.uniprotId}-triage.png`, svg, 2);
  };

  const handleExportMarkdown = () => {
    const lines = [
      `# ${profile.geneName} (${profile.uniprotId}) — Structural Variant Triage Report`,
      `> ${profile.proteinName} · ${profile.organism} · Source: ${profile.source}`,
      '',
      '| Variant | Risk | Exposure (RSA) | pLDDT | Grantham | BLOSUM62 | Nearest Site | ClinVar |',
      '|---|---:|---|---:|---:|---:|---|---|',
      ...results.map(
        (r) =>
          `| **${r.mutation.raw}** | ${r.impactScore}/100 (${r.verdict}) | ${r.exposure} (${r.rsaPercent}%) | ${r.plddt} | ${r.grantham} | ${r.blosum} | ${r.nearestFunctionalSite ? `${r.nearestFunctionalSite.type} (${r.nearestFunctionalSite.spatialDistanceA ?? '?'} Å)` : '—'} | ${r.clinvarSummary} |`
      ),
    ];
    downloadTextFile(`${profile.geneName}-variant-triage.md`, lines.join('\n'), 'text/markdown');
  };

  const domainTracks = useMemo(
    () => profile.sites.filter((s) => s.type === 'Domain' || s.type === 'Region').slice(0, 6),
    [profile.sites]
  );

  return (
    <div className="space-y-5">
      {/* Query Input Bar + Presets */}
      <GlassCard className="p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill tone="emerald">
                <Sparkles className="h-3 w-3" />
                {profile.source}
              </StatusPill>
              {profile.residues3D && (
                <StatusPill tone="blue">
                  <CheckCircle2 className="h-3 w-3" />
                  3D AlphaFold RSA Active ({profile.residues3D.length} aa)
                </StatusPill>
              )}
            </div>
            <h2 className="mt-2 text-[22px] font-bold tracking-[-0.03em] text-[var(--text-primary)] sm:text-[26px]">
              {profile.geneName}{' '}
              <span className="font-mono-code text-[18px] font-medium text-[var(--text-tertiary)]">
                ({profile.uniprotId})
              </span>
            </h2>
            <p className="mt-0.5 text-[13px] text-[var(--text-secondary)]">
              {profile.proteinName} · <em>{profile.organism}</em> · {profile.length} amino acids
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleExportSVG}
              disabled={results.length === 0}
              className="apple-button-primary inline-flex cursor-pointer items-center gap-1.5 rounded-full px-4 py-2 text-[12.5px] font-semibold disabled:opacity-40"
            >
              <Download className="h-3.5 w-3.5" />
              Export Cards SVG
            </button>
            <button
              type="button"
              onClick={handleExportPNG}
              disabled={results.length === 0}
              className="apple-button-secondary inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-2 text-[12.5px] font-medium disabled:opacity-40"
            >
              <FileImage className="h-3.5 w-3.5" />
              PNG
            </button>
            <button
              type="button"
              onClick={handleExportMarkdown}
              disabled={results.length === 0}
              className="apple-button-secondary inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-2 text-[12.5px] font-medium disabled:opacity-40"
            >
              <FileText className="h-3.5 w-3.5" />
              Markdown
            </button>
          </div>
        </div>

        {/* Interactive Form */}
        <form
          onSubmit={(e) => handleAnalyze(e)}
          className="mt-4 grid grid-cols-1 gap-3 border-t border-[var(--border-hairline)] pt-4 md:grid-cols-12"
        >
          <div className="md:col-span-3">
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-tertiary)]">
              UniProt Accession ID
            </label>
            <div className="relative">
              <Database className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
              <input
                type="text"
                value={uniprotInput}
                onChange={(e) => setUniprotInput(e.target.value)}
                placeholder="e.g. P04637"
                className="font-mono-code w-full rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-subtle)] py-2.5 pr-3 pl-9 text-[13.5px] font-semibold text-[var(--text-primary)] outline-none focus:border-emerald-500/60"
              />
            </div>
          </div>

          <div className="md:col-span-6">
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-tertiary)]">
              Missense Mutation List (comma or space separated)
            </label>
            <input
              type="text"
              value={mutationInput}
              onChange={(e) => setMutationInput(e.target.value)}
              placeholder="e.g. R175H, Y220C, R248Q, R273H"
              className="font-mono-code w-full rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-subtle)] px-3.5 py-2.5 text-[13.5px] text-[var(--text-primary)] outline-none focus:border-emerald-500/60"
            />
          </div>

          <div className="flex items-end md:col-span-3">
            <button
              type="submit"
              disabled={loading}
              className="apple-button-primary inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-[13px] font-semibold"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Fetching Live 3D…
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" />
                  Fetch Live UniProt &amp; AFDB
                </>
              )}
            </button>
          </div>
        </form>

        {/* Instant Clinical Presets */}
        <div className="mt-3.5 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-tertiary)]">
            Clinical Presets
          </span>
          {TRIAGE_PRESET_QUERIES.map((p) => (
            <button
              key={p.uniprotId}
              type="button"
              onClick={() => handlePresetClick(p)}
              className={`cursor-pointer rounded-full px-3 py-1 text-[12px] font-medium transition-all ${
                profile.uniprotId === p.uniprotId
                  ? 'bg-[var(--text-primary)] text-[var(--bg-canvas)] shadow-sm'
                  : 'apple-button-secondary'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {errorMsg && (
          <div className="mt-3 rounded-xl bg-rose-500/12 px-3.5 py-2 text-[12px] font-medium text-rose-500">
            {errorMsg}
          </div>
        )}
      </GlassCard>

      {/* Interactive Domain Architecture + 3D Globular Mutation Spotlight */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <GlassCard className="p-4 sm:p-5 lg:col-span-7" delay={0.05}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-[13.5px] font-semibold tracking-tight text-[var(--text-primary)]">
                Domain Architecture &amp; Variant Lollipop Map
              </h3>
              <p className="text-[11.5px] text-[var(--text-tertiary)]">
                Click any lollipop pin or triage card to zoom directly onto that residue in 3D
              </p>
            </div>
            <span className="font-mono-code text-[11.5px] text-[var(--text-tertiary)]">
              1 — {profile.length} aa
            </span>
          </div>

          <div className="relative pt-20 pb-5">
            {/* Backbone bar */}
            <div className="relative h-6 w-full rounded-full bg-black/8 dark:bg-white/10">
              {domainTracks.map((d, idx) => {
                const leftPct = Math.max(0, Math.min(100, ((d.start - 1) / Math.max(1, profile.length)) * 100));
                const widthPct = Math.max(
                  3,
                  Math.min(100 - leftPct, ((d.end - d.start + 1) / Math.max(1, profile.length)) * 100)
                );
                const colors = [
                  'from-sky-500/85 to-indigo-500/85',
                  'from-emerald-500/85 to-teal-500/85',
                  'from-violet-500/85 to-fuchsia-500/85',
                  'from-amber-500/85 to-orange-500/85',
                ];
                return (
                  <div
                    key={`${d.description}-${d.start}`}
                    style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                    title={`${d.description} (${d.start}–${d.end})`}
                    className={`absolute inset-y-0 flex items-center justify-center overflow-hidden rounded-full bg-gradient-to-r px-2 text-[10px] font-bold text-white shadow-sm ${colors[idx % colors.length]}`}
                  >
                    <span className="truncate">{d.description}</span>
                  </div>
                );
              })}

              {/* Mutation Lollipop Pins with collision-free tiered stagger */}
              {(() => {
                const sorted = [...results].sort((a, b) => a.mutation.pos - b.mutation.pos);
                const laneRightEdge = [-99, -99, -99];
                return sorted.map((r) => {
                  const pct = Math.max(3, Math.min(97, (r.mutation.pos / Math.max(1, profile.length)) * 100));
                  let lane = 0;
                  for (let l = 0; l < laneRightEdge.length; l++) {
                    if (pct - laneRightEdge[l] >= 9.5) {
                      lane = l;
                      break;
                    }
                    lane = (l + 1) % laneRightEdge.length;
                  }
                  laneRightEdge[lane] = pct;

                  const stemH = 14 + lane * 22;
                  const dotColor =
                    r.verdictTone === 'rose'
                      ? 'bg-rose-500 ring-rose-500/35'
                      : r.verdictTone === 'amber'
                        ? 'bg-amber-400 ring-amber-400/35'
                        : 'bg-emerald-500 ring-emerald-500/35';
                  const active = focusedMutation === r.mutation.raw;
                  return (
                    <div
                      key={r.mutation.raw}
                      style={{ left: `${pct}%`, bottom: '100%' }}
                      className="pointer-events-none absolute flex -translate-x-1/2 flex-col items-center"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setFocusedMutation((prev) => (prev === r.mutation.raw ? null : r.mutation.raw))
                        }
                        className="group pointer-events-auto relative z-10 flex cursor-pointer flex-col items-center"
                      >
                        <span
                          className={`font-mono-code mb-0.5 whitespace-nowrap rounded-full px-1.5 py-0.5 text-[10px] font-bold shadow-xs transition-transform group-hover:scale-110 ${
                            active
                              ? 'bg-[var(--text-primary)] text-[var(--bg-canvas)]'
                              : 'bg-[var(--bg-elevated-solid)] text-[var(--text-primary)] ring-1 ring-[var(--border-hairline)]'
                          }`}
                        >
                          {r.mutation.raw}
                        </span>
                        <span className={`h-2 w-2 rounded-full ring-3 ${dotColor}`} />
                      </button>
                      <span
                        style={{ height: stemH }}
                        className="w-[1.5px] bg-[var(--border-strong)]"
                      />
                    </div>
                  );
                });
              })()}
            </div>
          </div>

          {/* Annotated Functional Sites Quick Chips */}
          <div className="mt-2 flex flex-wrap gap-1.5 border-t border-[var(--border-hairline)] pt-3">
            {profile.sites.slice(0, 6).map((s) => (
              <span
                key={`${s.type}-${s.start}-${s.description}`}
                className="inline-flex items-center gap-1 rounded-full bg-[var(--bg-subtle)] px-2.5 py-0.5 text-[11px] text-[var(--text-secondary)] ring-1 ring-[var(--border-hairline)]"
              >
                <strong className="font-semibold text-[var(--text-primary)]">{s.type}:</strong>
                <span className="max-w-[190px] truncate">{s.description}</span>
                <span className="font-mono-code text-[10px] text-[var(--text-tertiary)]">
                  ({s.start}{s.end !== s.start ? `–${s.end}` : ''})
                </span>
              </span>
            ))}
          </div>
        </GlassCard>

        <GlassCard className="p-4 sm:p-5 lg:col-span-5" delay={0.08}>
          <Triage3DSpotlight
            profile={profile}
            results={results}
            focusedMutation={focusedMutation}
            onSelectMutation={(m) => setFocusedMutation(m || null)}
            isDark={isDark}
          />
        </GlassCard>
      </div>

      {/* Variant Triage Cards Grid */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {results.map((r: VariantTriageResult, idx: number) => {
          const isHighlighted = focusedMutation === r.mutation.raw;
          const accentColor =
            r.verdictTone === 'rose'
              ? '#FF453A'
              : r.verdictTone === 'amber'
                ? '#FF9F0A'
                : '#30D158';
          const circ = 2 * Math.PI * 22;

          return (
            <motion.article
              key={`${profile.uniprotId}-${r.mutation.raw}`}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.38, delay: idx * 0.05, ease: APPLE_EASE }}
              onClick={() =>
                setFocusedMutation((prev) => (prev === r.mutation.raw ? null : r.mutation.raw))
              }
              className={`apple-glass relative cursor-pointer overflow-hidden rounded-[22px] p-5 transition-all hover:border-[var(--border-strong)] ${
                isHighlighted ? 'ring-2 ring-sky-500' : ''
              }`}
            >
              {/* Subtle colored top specular accent */}
              <div
                className="pointer-events-none absolute inset-x-0 top-0 h-[2.5px]"
                style={{
                  background: `linear-gradient(90deg, ${accentColor}, transparent 75%)`,
                }}
              />

              {/* Card Header */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-mono-code text-[22px] font-bold tracking-tight text-[var(--text-primary)]">
                      {r.mutation.raw}
                    </h3>
                    <StatusPill tone={r.verdictTone}>
                      <ShieldAlert className="h-3 w-3" />
                      {r.verdict}
                    </StatusPill>
                    {!r.wtValid && (
                      <StatusPill tone="amber">
                        WT mismatch (UniProt has {r.actualWt}
                        {r.mutation.pos})
                      </StatusPill>
                    )}
                  </div>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-[var(--text-secondary)]">
                    {r.rationale}
                  </p>
                </div>

                {/* Animated Impact Risk Ring */}
                <div className="relative h-14 w-14 shrink-0" title="Composite Structural Impact Index">
                  <svg viewBox="0 0 54 54" className="h-full w-full -rotate-90">
                    <circle
                      cx="27"
                      cy="27"
                      r="22"
                      fill="none"
                      stroke="currentColor"
                      className="text-black/8 dark:text-white/10"
                      strokeWidth="4.5"
                    />
                    <motion.circle
                      cx="27"
                      cy="27"
                      r="22"
                      fill="none"
                      stroke={accentColor}
                      strokeWidth="4.5"
                      strokeLinecap="round"
                      strokeDasharray={circ}
                      initial={{ strokeDashoffset: circ }}
                      animate={{ strokeDashoffset: circ * (1 - r.impactScore / 100) }}
                      transition={{ duration: 0.75, ease: APPLE_EASE }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="tabular-nums-strict text-[13px] font-bold text-[var(--text-primary)]">
                      {r.impactScore}
                    </span>
                    <span className="text-[8px] font-semibold uppercase text-[var(--text-tertiary)]">
                      Risk
                    </span>
                  </div>
                </div>
              </div>

              {/* 3-Column Structural & Biophysical Breakdown */}
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {/* Structural Context */}
                <div className="apple-glass-subtle rounded-2xl p-3">
                  <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--text-tertiary)]">
                    <Compass className="h-3.5 w-3.5 text-sky-400" />
                    Structural Context
                  </div>
                  <div className="mt-1.5 text-[13px] font-semibold text-[var(--text-primary)]">
                    {r.exposure}
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-400"
                      style={{ width: `${r.rsaPercent}%` }}
                    />
                  </div>
                  <div className="mt-1.5 flex items-center justify-between text-[11px] text-[var(--text-secondary)]">
                    <span>RSA {r.rsaPercent}%</span>
                    <span className="font-mono-code font-semibold" style={{ color: plddtColor(r.plddt) }}>
                      pLDDT {r.plddt}
                    </span>
                  </div>
                  <div className="mt-0.5 text-[11px] text-[var(--text-tertiary)]">
                    {r.secondaryStructure}
                  </div>
                </div>

                {/* Physicochemical Shift */}
                <div className="apple-glass-subtle rounded-2xl p-3">
                  <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--text-tertiary)]">
                    <Flame className="h-3.5 w-3.5 text-amber-400" />
                    Biophysical Shift
                  </div>
                  <div className="mt-1.5 space-y-1 text-[11.5px]">
                    <div className="flex justify-between">
                      <span className="text-[var(--text-tertiary)]">Grantham</span>
                      <span className="font-mono-code font-semibold text-[var(--text-primary)]">
                        {r.grantham} / 215
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--text-tertiary)]">BLOSUM62</span>
                      <span className="font-mono-code font-semibold text-[var(--text-primary)]">
                        {r.blosum >= 0 ? `+${r.blosum}` : r.blosum}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--text-tertiary)]">ΔVolume</span>
                      <span className="font-mono-code text-[var(--text-primary)]">
                        {r.deltaVolume >= 0 ? `+${r.deltaVolume}` : r.deltaVolume} Å³
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--text-tertiary)]">Charge</span>
                      <span className="font-mono-code text-[var(--text-primary)]">{r.chargeChange}</span>
                    </div>
                  </div>
                </div>

                {/* Active-Site & Clinical Context */}
                <div className="apple-glass-subtle rounded-2xl p-3">
                  <div className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--text-tertiary)]">
                    Site &amp; Clinical
                  </div>
                  <div className="mt-1.5 text-[12px] font-semibold text-[var(--text-primary)]">
                    {r.nearestFunctionalSite
                      ? `${r.nearestFunctionalSite.type} · ${r.nearestFunctionalSite.spatialDistanceA ?? '?'} Å`
                      : 'No proximal active site'}
                  </div>
                  {r.nearestFunctionalSite && (
                    <div className="mt-0.5 line-clamp-2 text-[11px] text-[var(--text-tertiary)]">
                      {r.nearestFunctionalSite.description}
                    </div>
                  )}
                  <div className="mt-2 border-t border-[var(--border-hairline)] pt-1.5 text-[11px] text-[var(--text-secondary)]">
                    <div className="line-clamp-2 font-medium leading-snug" title={r.clinvarSummary}>
                      ClinVar: {r.clinvarSummary}
                    </div>
                    <div className="mt-0.5 text-[var(--text-tertiary)]">gnomAD: {r.gnomadAf}</div>
                  </div>
                </div>
              </div>

              {/* Structural Flags + Direct Database Links */}
              <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border-hairline)] pt-3">
                <div className="flex flex-wrap gap-1.5">
                  {r.structuralFlags.map((flag) => (
                    <span
                      key={flag}
                      className="rounded-full bg-[var(--bg-subtle)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--text-secondary)] ring-1 ring-[var(--border-hairline)]"
                    >
                      {flag}
                    </span>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {[
                    { label: 'UniProt', href: r.links.uniprot },
                    { label: 'AlphaFold', href: r.links.alphafold },
                    { label: 'ClinVar', href: r.links.clinvar },
                    { label: 'gnomAD', href: r.links.gnomad },
                    { label: 'PDB', href: r.links.pdb },
                  ].map((lnk) => (
                    <a
                      key={lnk.label}
                      href={lnk.href}
                      target="_blank"
                      rel="noreferrer"
                      className="apple-button-secondary inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium hover:text-sky-500"
                    >
                      {lnk.label}
                      <ExternalLink className="h-2.5 w-2.5 opacity-70" />
                    </a>
                  ))}
                </div>
              </div>
            </motion.article>
          );
        })}

        {results.length === 0 && (
          <GlassCard className="col-span-full p-10 text-center">
            <p className="text-[14px] text-[var(--text-secondary)]">
              Enter one or more missense variants in standard format (e.g.{' '}
              <code className="font-mono-code rounded bg-[var(--bg-subtle)] px-1.5 py-0.5">
                R175H, Y220C, R248Q
              </code>
              ) to generate structural triage cards.
            </p>
          </GlassCard>
        )}
      </div>
    </div>
  );
};
