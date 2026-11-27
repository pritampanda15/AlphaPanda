import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  Download,
  FileImage,
  Pin,
  Search,
  Sparkles,
  Eye,
  Code2,
  X,
  Plus,
  Copy,
  Check,
  Link2,
  Loader2,
} from 'lucide-react';
import {
  DEMO_MSA_DATASETS,
  analyzeMSAColumns,
  exportMSAPublicationSVG,
  getLogoLetterColor,
  getResidueCellStyle,
  parseMSA,
  predictSecondaryStructure,
  type ColumnStats,
  type MSAColorScheme,
  type MSADataset,
  type MSAMutationPin,
} from '../../lib/msaParser';
import {
  buildCarryForwardMSA,
  type ActiveProteinSession,
} from '../../lib/proteinSession';
import { downloadSvgAsPng, downloadTextFile } from '../../lib/figureExport';
import { GlassCard, SegmentedControl, StatusPill, APPLE_EASE } from '../ui/ApplePrimitives';

interface MSAPublisherProps {
  isDark: boolean;
  initialPresetId?: string | null;
  onPresetChange?: (presetId: string) => void;
  activeSession?: ActiveProteinSession | null;
  syncedSessionKey?: string | null;
  onSessionSynced?: (key: string) => void;
}

const COLOR_SCHEMES: Array<{ value: MSAColorScheme; label: string }> = [
  { value: 'alphapanda', label: 'AlphaPanda' },
  { value: 'espript-red', label: 'ESPript Red' },
  { value: 'clustalx', label: 'ClustalX' },
  { value: 'hydrophobicity', label: 'Hydropathy' },
  { value: 'conservation', label: 'Conservation' },
];

export const MSAPublisher: React.FC<MSAPublisherProps> = ({
  isDark,
  initialPresetId,
  onPresetChange,
  activeSession,
  syncedSessionKey,
  onSessionSynced,
}) => {
  const initialDemo =
    DEMO_MSA_DATASETS.find((d) => d.id === initialPresetId) ?? DEMO_MSA_DATASETS[0];
  const [activePresetId, setActivePresetId] = useState<string>(initialDemo.id);
  const [title, setTitle] = useState(initialDemo.title);
  const [subtitle, setSubtitle] = useState(initialDemo.subtitle);
  const [rawText, setRawText] = useState(initialDemo.rawText);
  const [ssTrack, setSsTrack] = useState(initialDemo.secondaryStructure);
  const [pins, setPins] = useState<MSAMutationPin[]>(initialDemo.pins);
  const [motifRegex, setMotifRegex] = useState(initialDemo.motifRegex || '');
  const [syncingFromExplorer, setSyncingFromExplorer] = useState(false);
  const [carriedLabel, setCarriedLabel] = useState<string | null>(null);

  const applyCarriedSession = async (session: ActiveProteinSession) => {
    setSyncingFromExplorer(true);
    try {
      // If it matches a curated rich alignment (like LRP4) AND came from preset, load curated or build live orthologs
      if (session.source === 'preset' && session.matchedMsaPresetId) {
        const matched = DEMO_MSA_DATASETS.find((d) => d.id === session.matchedMsaPresetId);
        if (matched) {
          setActivePresetId(matched.id);
          setTitle(matched.title);
          setSubtitle(matched.subtitle);
          setRawText(matched.rawText);
          setSsTrack(matched.secondaryStructure);
          setPins(matched.pins);
          setMotifRegex(matched.motifRegex || '');
          setCarriedLabel(`${session.name} (Synced from Explorer)`);
          onSessionSynced?.(session.sessionKey);
          return;
        }
      }

      const built = await buildCarryForwardMSA(session);
      setActivePresetId('carried-session');
      setTitle(built.title);
      setSubtitle(built.subtitle);
      setRawText(built.rawFasta);
      setSsTrack(built.secondaryStructure);
      setPins(built.pins);
      setMotifRegex('');
      setSelectedCol(null);
      setCarriedLabel(
        `${session.name}${built.orthologCount > 0 ? ` · ${built.orthologCount} live UniProt orthologs` : ' · 3D structure sequence'}`
      );
      onSessionSynced?.(session.sessionKey);
    } finally {
      setSyncingFromExplorer(false);
    }
  };

  // Automatically carry forward any active protein from Explorer when switching to MSA
  useEffect(() => {
    if (!activeSession) return;
    if (syncedSessionKey === activeSession.sessionKey && activePresetId === 'carried-session') return;
    if (syncedSessionKey !== activeSession.sessionKey) {
      applyCarriedSession(activeSession);
    }
  }, [activeSession?.sessionKey]);

  const [scheme, setScheme] = useState<MSAColorScheme>('alphapanda');
  const [showSS, setShowSS] = useState(true);
  const [showLogo, setShowLogo] = useState(true);
  const [showConservation, setShowConservation] = useState(true);
  const [wrapWidth, setWrapWidth] = useState(50);
  const [showPasteDrawer, setShowPasteDrawer] = useState(false);

  const [selectedCol, setSelectedCol] = useState<number | null>(null);
  const [newPinLabel, setNewPinLabel] = useState('');
  const [newPinCategory, setNewPinCategory] = useState<MSAMutationPin['category']>('mutation');
  const [newPinNote, setNewPinNote] = useState('');
  const [copiedConsensus, setCopiedConsensus] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const sequences = useMemo(() => parseMSA(rawText), [rawText]);
  const columns = useMemo(() => analyzeMSAColumns(sequences, ssTrack), [sequences, ssTrack]);

  // Pairwise % identity of each sequence vs. the first (reference) sequence
  const identityPctByRow = useMemo(() => {
    if (sequences.length === 0) return [];
    const ref = sequences[0].sequence;
    return sequences.map((s) => {
      let match = 0;
      let valid = 0;
      for (let i = 0; i < ref.length; i++) {
        if (ref[i] === '-' && s.sequence[i] === '-') continue;
        valid++;
        if (ref[i] === s.sequence[i]) match++;
      }
      return valid > 0 ? Math.round((match / valid) * 100) : 100;
    });
  }, [sequences]);

  const cycleSecondaryStructureAt = (colIndex: number) => {
    const base =
      ssTrack.length >= columns.length
        ? ssTrack.split('')
        : columns.map((c) => c.ss);
    const cur = base[colIndex] || 'C';
    base[colIndex] = cur === 'H' ? 'E' : cur === 'E' ? 'C' : 'H';
    setSsTrack(base.join(''));
  };

  const handleCopyConsensus = async () => {
    const consensus = columns.map((c) => c.consensus).filter((c) => c !== '-').join('');
    await navigator.clipboard.writeText(`>Consensus_${activePresetId}\n${consensus}`);
    setCopiedConsensus(true);
    setTimeout(() => setCopiedConsensus(false), 1800);
  };

  // Compute regex-matched columns on the consensus sequence
  const motifCols = useMemo(() => {
    const matched = new Set<number>();
    if (!motifRegex.trim() || columns.length === 0) return matched;
    try {
      const consensusStr = columns.map((c) => c.consensus).join('');
      const rx = new RegExp(motifRegex.trim(), 'gi');
      let m: RegExpExecArray | null;
      while ((m = rx.exec(consensusStr)) !== null) {
        if (m[0].length === 0) break;
        for (let k = m.index; k < m.index + m[0].length; k++) {
          matched.add(k);
        }
      }
    } catch {
      // Invalid regex while typing
    }
    return matched;
  }, [columns, motifRegex]);

  const pinByZeroCol = useMemo(() => {
    const map = new Map<number, MSAMutationPin>();
    for (const p of pins) map.set(p.column - 1, p);
    return map;
  }, [pins]);

  const meanConservation = useMemo(() => {
    if (columns.length === 0) return 0;
    return Math.round((columns.reduce((s, c) => s + c.conservation, 0) / columns.length) * 100);
  }, [columns]);

  const strictlyConservedCount = useMemo(
    () => columns.filter((c) => c.conservation >= 0.99 && c.consensus !== '-').length,
    [columns]
  );

  const loadPreset = (preset: MSADataset) => {
    setActivePresetId(preset.id);
    setTitle(preset.title);
    setSubtitle(preset.subtitle);
    setRawText(preset.rawText);
    setSsTrack(preset.secondaryStructure);
    setPins(preset.pins);
    setMotifRegex(preset.motifRegex || '');
    setSelectedCol(null);
    setCarriedLabel(null);
    onPresetChange?.(preset.id);
  };

  const handleFileUpload = async (file: File | undefined) => {
    if (!file) return;
    const text = await file.text();
    const parsed = parseMSA(text);
    if (parsed.length === 0) return;
    setActivePresetId('custom');
    setTitle(file.name.replace(/\.(fasta|fa|aln|clustal|txt)$/i, ''));
    setSubtitle(`Uploaded ${file.name} · ${parsed.length} sequences`);
    setRawText(text);
    setSsTrack(predictSecondaryStructure(parsed[0].sequence));
    setPins([]);
    setMotifRegex('');
    setSelectedCol(null);
  };

  const handleAddPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedCol === null || !newPinLabel.trim()) return;
    const col1 = selectedCol + 1;
    setPins((prev) => [
      ...prev.filter((p) => p.column !== col1),
      {
        id: `pin-${Date.now()}`,
        column: col1,
        label: newPinLabel.trim(),
        category: newPinCategory,
        note: newPinNote.trim() || undefined,
      },
    ]);
    setNewPinLabel('');
    setNewPinNote('');
    setSelectedCol(null);
  };

  const handleExport = async (fmt: 'svg' | 'png') => {
    const svg = exportMSAPublicationSVG({
      title,
      subtitle,
      sequences,
      columns,
      pins,
      scheme,
      showSS,
      showLogo,
      showConservation,
      wrapWidth,
    });
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    if (fmt === 'svg') {
      downloadTextFile(`${slug}-msa.svg`, svg, 'image/svg+xml');
    } else {
      await downloadSvgAsPng(`${slug}-msa.png`, svg, 2);
    }
  };

  // Partition columns into clean wrapped publication blocks
  const blocks = useMemo(() => {
    const res: Array<{ start: number; end: number; cols: ColumnStats[] }> = [];
    for (let i = 0; i < columns.length; i += wrapWidth) {
      res.push({
        start: i,
        end: Math.min(columns.length, i + wrapWidth),
        cols: columns.slice(i, Math.min(columns.length, i + wrapWidth)),
      });
    }
    return res;
  }, [columns, wrapWidth]);

  return (
    <div className="space-y-5">
      {/* Header & Controls Card */}
      <GlassCard className="p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill tone="blue">
                <Sparkles className="h-3 w-3" />
                Vector SVG Publisher
              </StatusPill>
              <StatusPill tone="slate">
                {sequences.length} Sequences · {columns.length} Columns
              </StatusPill>
              <StatusPill tone="emerald">
                {strictlyConservedCount} Invariant · {meanConservation}% Mean Identity
              </StatusPill>
              {syncingFromExplorer && (
                <StatusPill tone="blue">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Syncing orthologs from Explorer…
                </StatusPill>
              )}
              {!syncingFromExplorer && carriedLabel && (
                <StatusPill tone="blue">
                  <Link2 className="h-3 w-3" />
                  Synced: {carriedLabel}
                </StatusPill>
              )}
            </div>
            <h2 className="mt-2 text-[22px] font-bold tracking-[-0.03em] text-[var(--text-primary)] sm:text-[26px]">
              {title}
            </h2>
            <p className="mt-0.5 text-[13px] text-[var(--text-secondary)]">{subtitle}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleExport('svg')}
              className="apple-button-primary inline-flex cursor-pointer items-center gap-1.5 rounded-full px-4 py-2 text-[12.5px] font-semibold"
            >
              <Download className="h-3.5 w-3.5" />
              Export Publication SVG
            </button>
            <button
              type="button"
              onClick={() => handleExport('png')}
              className="apple-button-secondary inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-2 text-[12.5px] font-medium"
            >
              <FileImage className="h-3.5 w-3.5" />
              PNG
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="apple-button-secondary inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-2 text-[12.5px] font-medium"
            >
              <Upload className="h-3.5 w-3.5 text-sky-400" />
              Upload FASTA/Clustal
            </button>
            <button
              type="button"
              onClick={handleCopyConsensus}
              className="apple-button-secondary inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-2 text-[12.5px] font-medium"
            >
              {copiedConsensus ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              {copiedConsensus ? 'Copied' : 'Consensus'}
            </button>
            <button
              type="button"
              onClick={() => setShowPasteDrawer((v) => !v)}
              className="apple-button-secondary inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-2 text-[12.5px] font-medium"
            >
              <Code2 className="h-3.5 w-3.5" />
              {showPasteDrawer ? 'Hide Input' : 'Paste MSA'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".fasta,.fa,.aln,.clustal,.txt"
              className="hidden"
              onChange={(e) => handleFileUpload(e.target.files?.[0])}
            />
          </div>
        </div>

        {/* Presets & Visual Style Toolbar */}
        <div className="mt-4 flex flex-col gap-3 border-t border-[var(--border-hairline)] pt-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-tertiary)]">
              Alignments
            </span>
            {activeSession && (
              <button
                type="button"
                onClick={() => applyCarriedSession(activeSession)}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold transition-all ${
                  activePresetId === 'carried-session'
                    ? 'bg-[var(--text-primary)] text-[var(--bg-canvas)] shadow-sm'
                    : 'apple-button-secondary text-sky-600 dark:text-sky-400'
                }`}
                title="Re-sync alignment from active Explorer 3D structure"
              >
                <Link2 className="h-3 w-3" />
                Explorer: {activeSession.geneName || activeSession.pdbId || activeSession.name.slice(0, 18)}
              </button>
            )}
            {DEMO_MSA_DATASETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => loadPreset(preset)}
                className={`cursor-pointer rounded-full px-3 py-1.5 text-[12px] font-medium transition-all ${
                  activePresetId === preset.id
                    ? 'bg-[var(--text-primary)] text-[var(--bg-canvas)] shadow-sm'
                    : 'apple-button-secondary'
                }`}
              >
                {preset.title.split('(')[0].trim()}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <SegmentedControl
              layoutId="msa-color-scheme"
              size="xs"
              value={scheme}
              onChange={setScheme}
              options={COLOR_SCHEMES}
            />
          </div>
        </div>

        {/* Tracks + Motif Search + Block Width */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-tertiary)]">
              <Eye className="h-3.5 w-3.5" /> Tracks
            </span>
            {[
              { label: 'Secondary Structure', active: showSS, toggle: () => setShowSS((v) => !v) },
              { label: 'Sequence Logo (Bits)', active: showLogo, toggle: () => setShowLogo((v) => !v) },
              { label: 'Conservation Bars', active: showConservation, toggle: () => setShowConservation((v) => !v) },
            ].map((t) => (
              <button
                key={t.label}
                type="button"
                onClick={t.toggle}
                className={`cursor-pointer rounded-full px-3 py-1 text-[11.5px] font-medium transition-all ${
                  t.active
                    ? 'bg-sky-500/15 text-sky-600 dark:text-sky-300 ring-1 ring-sky-500/35'
                    : 'apple-button-secondary opacity-70'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex items-center">
              <Search className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-[var(--text-tertiary)]" />
              <input
                type="text"
                value={motifRegex}
                onChange={(e) => setMotifRegex(e.target.value)}
                placeholder="Highlight motif (e.g. HRD|DFG)"
                className="font-mono-code w-48 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-subtle)] py-1 pr-3 pl-8 text-[11.5px] text-[var(--text-primary)] outline-none focus:border-sky-500/60"
              />
            </div>

            <label className="inline-flex items-center gap-2 text-[11.5px] text-[var(--text-secondary)]">
              Cols/row
              <select
                value={wrapWidth}
                onChange={(e) => setWrapWidth(parseInt(e.target.value, 10))}
                className="rounded-full border border-[var(--border-hairline)] bg-[var(--bg-subtle)] px-2.5 py-1 text-[11.5px] font-medium text-[var(--text-primary)] outline-none"
              >
                <option value={40}>40</option>
                <option value={50}>50</option>
                <option value={65}>65</option>
                <option value={80}>80</option>
              </select>
            </label>
          </div>
        </div>

        {/* Collapsible Raw FASTA / Clustal Paste Drawer */}
        <AnimatePresence>
          {showPasteDrawer && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: APPLE_EASE }}
              className="overflow-hidden"
            >
              <div className="mt-4 rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-subtle)] p-3.5">
                <div className="mb-2 flex items-center justify-between text-[11.5px] font-medium text-[var(--text-secondary)]">
                  <span>Paste FASTA or Clustal alignment (updates live)</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (sequences[0]) setSsTrack(predictSecondaryStructure(sequences[0].sequence));
                    }}
                    className="cursor-pointer text-sky-500 hover:underline"
                  >
                    Auto-predict Secondary Structure
                  </button>
                </div>
                <textarea
                  value={rawText}
                  onChange={(e) => {
                    setActivePresetId('custom');
                    setRawText(e.target.value);
                  }}
                  rows={5}
                  className="font-mono-code w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-elevated-solid)] p-2.5 text-[11.5px] text-[var(--text-primary)] outline-none focus:border-sky-500/60"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </GlassCard>

      {/* Active Pins Legend + Click-to-Pin Editor */}
      <GlassCard className="p-4" delay={0.05}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-[var(--text-tertiary)]">
              <Pin className="h-3.5 w-3.5 text-sky-400" />
              Annotated Positions
            </span>
            {pins.map((p) => {
              const badgeColor =
                p.category === 'active-site'
                  ? 'bg-rose-500/14 text-rose-500 ring-rose-500/30'
                  : p.category === 'mutation'
                    ? 'bg-sky-500/16 text-sky-600 dark:text-sky-300 ring-sky-500/35'
                    : 'bg-[var(--bg-subtle)] text-[var(--text-primary)] ring-[var(--border-strong)]';
              return (
                <span
                  key={p.id}
                  title={p.note}
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold ring-1 ${badgeColor}`}
                >
                  <span>{p.label}</span>
                  <span className="font-mono-code text-[10px] opacity-75">col {p.column}</span>
                  <button
                    type="button"
                    onClick={() => setPins((prev) => prev.filter((item) => item.id !== p.id))}
                    className="cursor-pointer opacity-60 hover:opacity-100"
                    title="Remove pin"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              );
            })}
          </div>
          <span className="text-[11.5px] text-[var(--text-tertiary)]">
            Tip: Click any residue column below to pin a mutation or active site
          </span>
        </div>

        <AnimatePresence>
          {selectedCol !== null && columns[selectedCol] && (
            <motion.form
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              onSubmit={handleAddPin}
              className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-sky-500/30 bg-sky-500/8 p-3"
            >
              <span className="font-mono-code text-[12px] font-semibold text-sky-400">
                Col {selectedCol + 1} (Consensus {columns[selectedCol].consensus},{' '}
                {Math.round(columns[selectedCol].conservation * 100)}%)
              </span>
              <input
                type="text"
                required
                value={newPinLabel}
                onChange={(e) => setNewPinLabel(e.target.value)}
                placeholder="Label (e.g. G12D, His57)"
                className="rounded-full border border-[var(--border-hairline)] bg-[var(--bg-elevated-solid)] px-3 py-1 text-[12px] text-[var(--text-primary)] outline-none"
              />
              <select
                value={newPinCategory}
                onChange={(e) => setNewPinCategory(e.target.value as MSAMutationPin['category'])}
                className="rounded-full border border-[var(--border-hairline)] bg-[var(--bg-elevated-solid)] px-3 py-1 text-[12px] text-[var(--text-primary)] outline-none"
              >
                <option value="mutation">Mutation</option>
                <option value="active-site">Active Site</option>
                <option value="motif">Conserved Motif</option>
              </select>
              <input
                type="text"
                value={newPinNote}
                onChange={(e) => setNewPinNote(e.target.value)}
                placeholder="Optional note"
                className="min-w-[160px] flex-1 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-elevated-solid)] px-3 py-1 text-[12px] text-[var(--text-primary)] outline-none"
              />
              <button
                type="submit"
                className="apple-button-primary inline-flex cursor-pointer items-center gap-1 rounded-full px-3 py-1 text-[12px] font-semibold"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Pin
              </button>
              <button
                type="button"
                onClick={() => setSelectedCol(null)}
                className="apple-button-secondary cursor-pointer rounded-full px-2.5 py-1 text-[12px]"
              >
                Cancel
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </GlassCard>

      {/* Main Live Publication Alignment Canvas */}
      <GlassCard className="p-4 sm:p-6" delay={0.1}>
        <div className="space-y-8 overflow-x-auto pb-2">
          {blocks.map((block) => {
            const cellW = 19;
            const blockW = block.cols.length * cellW;
            return (
              <div key={block.start} className="min-w-fit">
                {/* 1. Pin Callouts Row */}
                <div className="mb-1 flex items-end">
                  <div className="w-[164px] shrink-0" />
                  <div className="relative h-6" style={{ width: blockW }}>
                    {block.cols.map((col, offset) => {
                      const pin = pinByZeroCol.get(col.index);
                      if (!pin) return null;
                      const bg =
                        pin.category === 'active-site'
                          ? 'bg-rose-500 text-white'
                          : pin.category === 'mutation'
                            ? 'bg-sky-500 text-white'
                            : 'bg-slate-600 text-white';
                      return (
                        <div
                          key={pin.id}
                          title={pin.note}
                          style={{ left: offset * cellW + cellW / 2 }}
                          className={`absolute bottom-0 -translate-x-1/2 whitespace-nowrap rounded-full px-2 py-0.5 text-[9.5px] font-bold shadow-sm ${bg}`}
                        >
                          {pin.label}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Secondary Structure Vector Track (Click any column to cycle H → E → C) */}
                {showSS && (
                  <div className="mb-1 flex items-center">
                    <div
                      className="w-[164px] shrink-0 pr-3 text-right text-[10.5px] font-semibold text-[var(--text-tertiary)]"
                      title="Click any position on the secondary structure ribbon to toggle α-Helix / β-Strand / Coil"
                    >
                      Sec. Struct.
                    </div>
                    <svg width={blockW} height={22} className="cursor-pointer overflow-visible">
                      {(() => {
                        const elems: React.ReactNode[] = [];
                        let i = 0;
                        while (i < block.cols.length) {
                          const ss = block.cols[i].ss;
                          let j = i;
                          while (j + 1 < block.cols.length && block.cols[j + 1].ss === ss) j++;
                          const x = i * cellW;
                          const w = (j - i + 1) * cellW;
                          const cy = 11;
                          if (ss === 'H') {
                            const loops = Math.max(2, Math.round(w / 11));
                            const step = w / loops;
                            let d = `M ${x} ${cy}`;
                            for (let k = 0; k < loops; k++) {
                              const sx = x + k * step;
                              d += ` Q ${sx + step * 0.25} ${cy - 7}, ${sx + step * 0.5} ${cy} Q ${sx + step * 0.75} ${cy + 7}, ${sx + step} ${cy}`;
                            }
                            elems.push(
                              <path
                                key={`ss-${i}`}
                                d={d}
                                fill="none"
                                stroke="#FF453A"
                                strokeWidth="2.3"
                                strokeLinecap="round"
                              />
                            );
                          } else if (ss === 'E') {
                            const head = Math.min(9, w * 0.35);
                            const end = x + w - head;
                            elems.push(
                              <path
                                key={`ss-${i}`}
                                d={`M${x} ${cy - 3.5} L${end} ${cy - 3.5} L${end} ${cy - 6.8} L${x + w} ${cy} L${end} ${cy + 6.8} L${end} ${cy + 3.5} L${x} ${cy + 3.5} Z`}
                                fill="#0A84FF"
                              />
                            );
                          } else {
                            elems.push(
                              <line
                                key={`ss-${i}`}
                                x1={x}
                                y1={cy}
                                x2={x + w}
                                y2={cy}
                                stroke="currentColor"
                                className="text-slate-400/55"
                                strokeWidth="1.6"
                              />
                            );
                          }
                          i = j + 1;
                        }
                        // Invisible interactive hit targets to cycle H -> E -> C on click
                        block.cols.forEach((col, offset) => {
                          elems.push(
                            <rect
                              key={`hit-${col.index}`}
                              x={offset * cellW}
                              y={0}
                              width={cellW}
                              height={22}
                              fill="transparent"
                              onClick={() => cycleSecondaryStructureAt(col.index)}
                            >
                              <title>Col {col.index + 1}: {col.ss === 'H' ? 'α-Helix' : col.ss === 'E' ? 'β-Strand' : 'Coil'} (click to cycle)</title>
                            </rect>
                          );
                        });
                        return elems;
                      })()}
                    </svg>
                  </div>
                )}

                {/* 3. Column Position Ruler */}
                <div className="mb-1 flex items-center">
                  <div className="w-[164px] shrink-0" />
                  <div className="flex" style={{ width: blockW }}>
                    {block.cols.map((col, offset) => {
                      const showNum = offset === 0 || (col.index + 1) % 10 === 0;
                      return (
                        <div
                          key={col.index}
                          style={{ width: cellW }}
                          className="font-mono-code text-center text-[9.5px] text-[var(--text-tertiary)]"
                        >
                          {showNum ? col.index + 1 : ''}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 4. Aligned Sequences Matrix */}
                <div className="space-y-[3px]">
                  {sequences.map((seq, rIdx) => (
                    <div key={seq.id} className="flex items-center">
                      <div
                        className={`flex w-[164px] shrink-0 items-center justify-end gap-1.5 pr-3 text-[11.5px] ${
                          rIdx === 0
                            ? 'font-bold text-[var(--text-primary)]'
                            : 'font-medium text-[var(--text-secondary)]'
                        }`}
                        title={`${seq.label} (${identityPctByRow[rIdx]}% identity to ref)`}
                      >
                        <span className="truncate">{seq.id}</span>
                        <span className="font-mono-code rounded bg-[var(--bg-subtle)] px-1 py-0.2 text-[9px] text-[var(--text-tertiary)]">
                          {identityPctByRow[rIdx]}%
                        </span>
                      </div>
                      <div className="flex" style={{ width: blockW }}>
                        {block.cols.map((col) => {
                          const aa = seq.sequence[col.index] || '-';
                          const { bg, fg } = getResidueCellStyle(aa, col, scheme, isDark);
                          const isPinned = pinByZeroCol.has(col.index);
                          const isMotif = motifCols.has(col.index);
                          const isSelected = selectedCol === col.index;

                          return (
                            <button
                              key={col.index}
                              type="button"
                              onClick={() => setSelectedCol(col.index)}
                              style={{
                                width: cellW,
                                height: 22,
                                backgroundColor: bg,
                                color: fg,
                              }}
                              title={`${seq.id} · Col ${col.index + 1}: ${aa} (${Math.round(col.conservation * 100)}% conserved, ${col.informationBits} bits)`}
                              className={`font-mono-code flex cursor-pointer items-center justify-center rounded-[4px] text-[12px] font-semibold transition-transform hover:scale-110 hover:z-10 ${
                                isSelected
                                  ? 'ring-2 ring-sky-400'
                                  : isPinned
                                    ? 'ring-1 ring-sky-500/70'
                                    : isMotif
                                      ? 'ring-1 ring-sky-400/50'
                                      : ''
                              }`}
                            >
                              {aa}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {/* 5. WebLogo Sequence Logo Track */}
                {showLogo && (
                  <div className="mt-2 flex items-center">
                    <div className="w-[164px] shrink-0 pr-3 text-right text-[10.5px] font-semibold text-[var(--text-tertiary)]">
                      Seq. Logo
                    </div>
                    <svg
                      width={blockW}
                      height={46}
                      className="border-b border-[var(--border-hairline)]"
                    >
                      {block.cols.map((col, offset) => {
                        const cx = offset * cellW + cellW / 2;
                        let yCursor = 43;
                        const maxH = 38;
                        return (
                          <g key={`logo-${col.index}`}>
                            {col.letterStack.map((item) => {
                              const h = (item.bits / 4.322) * maxH;
                              if (h < 2.2) return null;
                              const scaleY = h / 11;
                              const yPos = yCursor;
                              yCursor -= h;
                              return (
                                <text
                                  key={item.aa}
                                  x={cx}
                                  y={yPos}
                                  textAnchor="middle"
                                  fontSize="14"
                                  fontWeight="800"
                                  fill={getLogoLetterColor(item.aa)}
                                  transform={`translate(${cx}, ${yPos}) scale(0.92, ${scaleY.toFixed(2)}) translate(${-cx}, ${-yPos})`}
                                >
                                  {item.aa}
                                </text>
                              );
                            })}
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                )}

                {/* 6. Conservation Bar Track */}
                {showConservation && (
                  <div className="mt-1.5 flex items-center">
                    <div className="w-[164px] shrink-0 pr-3 text-right text-[10.5px] font-semibold text-[var(--text-tertiary)]">
                      Conservation
                    </div>
                    <div className="flex items-end" style={{ width: blockW, height: 22 }}>
                      {block.cols.map((col) => {
                        const pct = Math.round(col.conservation * 100);
                        const color =
                          col.conservation >= 0.9
                            ? '#0A84FF'
                            : col.conservation >= 0.65
                              ? '#5AC8FA'
                              : isDark
                                ? 'rgba(148,163,184,0.35)'
                                : 'rgba(148,163,184,0.5)';
                        return (
                          <div
                            key={`cons-${col.index}`}
                            style={{ width: cellW }}
                            className="flex justify-center"
                            title={`Col ${col.index + 1}: ${pct}% conservation`}
                          >
                            <div
                              style={{
                                width: cellW - 6,
                                height: Math.max(2, Math.round(col.conservation * 20)),
                                backgroundColor: color,
                              }}
                              className="rounded-t-[2px]"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </GlassCard>
    </div>
  );
};
