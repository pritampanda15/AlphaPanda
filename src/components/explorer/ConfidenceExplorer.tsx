import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  Download,
  FileImage,
  Table2,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  SlidersHorizontal,
  Search,
  Loader2,
  Focus,
  X,
} from 'lucide-react';
import {
  STATIC_GLOBULAR_PRESETS,
  buildStructureDataset,
  fetchLiveStructureById,
  loadStaticGlobularPreset,
  parseConfidenceJSON,
  type InterfaceContact,
  type ParsedResidue,
  type StructureDataset,
} from '../../lib/structureParser';
import {
  buildPublicationFigureSVG,
  downloadSvgAsPng,
  downloadTextFile,
} from '../../lib/figureExport';
import { GlassCard, MetricRing, StatusPill, APPLE_EASE } from '../ui/ApplePrimitives';
import { Mol3DViewport, type Mol3DHandle } from './Mol3DViewport';
import { PAEHeatmap } from './PAEHeatmap';
import { PLDDTTrack } from './PLDDTTrack';

interface ConfidenceExplorerProps {
  isDark: boolean;
  requestedPresetId?: string | null;
  onPresetHandled?: () => void;
}

export const ConfidenceExplorer: React.FC<ConfidenceExplorerProps> = ({
  isDark,
  requestedPresetId,
  onPresetHandled,
}) => {
  const [dataset, setDataset] = useState<StructureDataset | null>(null);
  const [activePresetId, setActivePresetId] = useState<string>(STATIC_GLOBULAR_PRESETS[0].id);
  const [loadingStruct, setLoadingStruct] = useState<boolean>(true);
  const [selectedPair, setSelectedPair] = useState<{ a: ParsedResidue; b?: ParsedResidue } | null>(null);
  const [cutoff, setCutoff] = useState(8.0);
  const [bondFilter, setBondFilter] = useState<string>('ALL');
  const [isDragging, setIsDragging] = useState(false);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [fetchIdInput, setFetchIdInput] = useState('');

  const molRef = useRef<Mol3DHandle | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const selectStaticPreset = async (presetId: string) => {
    setLoadingStruct(true);
    setUploadNotice(null);
    try {
      const ds = await loadStaticGlobularPreset(presetId);
      setDataset(ds);
      setActivePresetId(presetId);
      setBondFilter('ALL');
      setCutoff(8.0);
      // For KRAS G12D monomer, highlight oncogenic Asp12 by default; otherwise top interface contact
      if (presetId === 'kras-g12d-domain') {
        const asp12 = ds.residues.find((r) => r.resSeq === 12);
        setSelectedPair(asp12 ? { a: asp12 } : null);
      } else {
        setSelectedPair(ds.contacts[0] ? { a: ds.contacts[0].resA, b: ds.contacts[0].resB } : null);
      }
    } catch (err) {
      setUploadNotice(err instanceof Error ? err.message : 'Failed to load static globular structure');
    } finally {
      setLoadingStruct(false);
    }
  };

  useEffect(() => {
    selectStaticPreset(STATIC_GLOBULAR_PRESETS[0].id);
  }, []);

  useEffect(() => {
    if (requestedPresetId) {
      selectStaticPreset(requestedPresetId);
      onPresetHandled?.();
    }
  }, [requestedPresetId]);

  const handleFetchById = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fetchIdInput.trim()) return;
    setLoadingStruct(true);
    setUploadNotice(null);
    try {
      const ds = await fetchLiveStructureById(fetchIdInput);
      setDataset(ds);
      setActivePresetId('live-fetch');
      setBondFilter('ALL');
      setCutoff(8.0);
      setSelectedPair(ds.contacts[0] ? { a: ds.contacts[0].resA, b: ds.contacts[0].resB } : null);
      setUploadNotice(
        `Fetched live ${ds.sourceEngine} structure: ${ds.residues.length} aa across ${ds.chains.length} chain(s)`
      );
    } catch (err) {
      setUploadNotice(err instanceof Error ? err.message : 'Could not fetch structure ID.');
    } finally {
      setLoadingStruct(false);
    }
  };

  const filteredContacts = useMemo(() => {
    if (!dataset) return [];
    return dataset.contacts.filter((c) => {
      if (c.distance > cutoff) return false;
      if (bondFilter !== 'ALL' && c.interactionType !== bondFilter) return false;
      return true;
    });
  }, [dataset, cutoff, bondFilter]);

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    let structFile: File | null = null;
    let jsonFile: File | null = null;

    for (const f of Array.from(fileList)) {
      const lower = f.name.toLowerCase();
      if (lower.endsWith('.cif') || lower.endsWith('.mmcif') || lower.endsWith('.pdb')) {
        structFile = f;
      } else if (lower.endsWith('.json')) {
        jsonFile = f;
      }
    }

    if (!structFile && !jsonFile) {
      setUploadNotice('Please drop a .cif / .pdb structure file and/or a .json PAE confidence file.');
      return;
    }

    try {
      const confidence = jsonFile ? parseConfidenceJSON(await jsonFile.text()) : undefined;
      const rawStructureText = structFile
        ? await structFile.text()
        : dataset?.rawStructureText ?? '';
      const format: 'cif' | 'pdb' = structFile
        ? structFile.name.toLowerCase().endsWith('.pdb')
          ? 'pdb'
          : 'cif'
        : dataset?.format ?? 'pdb';

      const built = buildStructureDataset({
        id: `custom-${Date.now()}`,
        name: structFile ? structFile.name.replace(/\.(cif|mmcif|pdb)$/i, '') : dataset?.name ?? 'Custom Structure',
        subtitle: `${structFile ? structFile.name : 'Current structure'}${jsonFile ? ` + ${jsonFile.name}` : ''}`,
        rawStructureText,
        format,
        confidence,
        contactCutoff: 9.5,
      });

      if (built.residues.length === 0) {
        setUploadNotice('No protein CA atoms were detected in the uploaded file. Check mmCIF/PDB format.');
        return;
      }

      setDataset(built);
      setActivePresetId('custom-upload');
      setSelectedPair(
        built.contacts[0] ? { a: built.contacts[0].resA, b: built.contacts[0].resB } : null
      );
      setUploadNotice(
        `Loaded ${built.residues.length} residues across ${built.chains.length} chain(s) · Detected ${built.sourceEngine}`
      );
    } catch (err) {
      setUploadNotice(
        `Could not parse uploaded files: ${err instanceof Error ? err.message : 'Invalid format'}`
      );
    }
  };

  const handleExportFigure = async (type: 'svg' | 'png') => {
    if (!dataset) return;
    setExporting(true);
    try {
      const snap = molRef.current?.captureSnapshot() ?? null;
      const svg = buildPublicationFigureSVG(dataset, snap);
      const slug = dataset.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      if (type === 'svg') {
        downloadTextFile(`${slug}-alphapanda-figure.svg`, svg, 'image/svg+xml');
      } else {
        await downloadSvgAsPng(`${slug}-alphapanda-figure.png`, svg, 2);
      }
    } finally {
      setExporting(false);
    }
  };

  const handleExportCSV = () => {
    if (!dataset) return;
    const header = 'ChainA,ResA,ChainB,ResB,Distance_A,PAE_AB,PAE_BA,Mean_PAE,Interaction\n';
    const rows = filteredContacts
      .map(
        (c) =>
          `${c.resA.chain},${c.resA.aa}${c.resA.resSeq},${c.resB.chain},${c.resB.aa}${c.resB.resSeq},${c.distance},${c.paeAB},${c.paeBA},${c.meanPae},"${c.interactionType}"`
      )
      .join('\n');
    downloadTextFile(`${dataset.id}-contacts.csv`, header + rows, 'text/csv');
  };

  const selectedResidues = useMemo(() => {
    if (!selectedPair) return [];
    return selectedPair.b ? [selectedPair.a, selectedPair.b] : [selectedPair.a];
  }, [selectedPair]);

  const selectedPairStats = useMemo(() => {
    if (!dataset || !selectedPair) return null;
    const { a, b } = selectedPair;
    if (!b || (a.chain === b.chain && a.resSeq === b.resSeq)) {
      return {
        label: `${a.chain}:${a.resName} ${a.resSeq} (${a.aa})`,
        detail: `pLDDT ${a.plddt.toFixed(1)} · Secondary structure: ${a.ss === 'H' ? 'α-Helix' : a.ss === 'E' ? 'β-Strand' : 'Loop'}`,
      };
    }
    const dx = a.cb[0] - b.cb[0];
    const dy = a.cb[1] - b.cb[1];
    const dz = a.cb[2] - b.cb[2];
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const paeVal = ((dataset.pae[a.index]?.[b.index] ?? 0) + (dataset.pae[b.index]?.[a.index] ?? 0)) / 2;
    return {
      label: `${a.chain}:${a.aa}${a.resSeq} ↔ ${b.chain}:${b.aa}${b.resSeq}`,
      detail: `CB–CB ${dist.toFixed(2)} Å · Mean PAE ${paeVal.toFixed(1)} Å · pLDDT ${a.plddt.toFixed(0)} / ${b.plddt.toFixed(0)}`,
    };
  }, [dataset, selectedPair]);

  if (!dataset) {
    return (
      <GlassCard className="flex min-h-[420px] flex-col items-center justify-center gap-3 p-10">
        <Loader2 className="h-7 w-7 animate-spin text-sky-500" />
        <p className="text-[13.5px] font-medium text-[var(--text-secondary)]">
          Loading static globular protein coordinates…
        </p>
      </GlassCard>
    );
  }

  const m = dataset.metrics;

  return (
    <div className="space-y-5">
      {/* Top Bar: Verdict + Static Globular Examples + Live PDB/AFDB Fetch + Drag & Drop */}
      <GlassCard className="p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill tone="blue">
                <Sparkles className="h-3 w-3" />
                {dataset.sourceEngine}
              </StatusPill>
              <StatusPill tone={m.verdictTone}>
                {m.verdictTone === 'emerald' ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : (
                  <AlertTriangle className="h-3.5 w-3.5" />
                )}
                {m.verdict}
              </StatusPill>
              {loadingStruct && (
                <StatusPill tone="slate">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Loading…
                </StatusPill>
              )}
            </div>
            <h2 className="mt-2 text-[22px] font-bold tracking-[-0.03em] text-[var(--text-primary)] sm:text-[26px]">
              {dataset.name}
            </h2>
            <p className="mt-0.5 text-[13px] text-[var(--text-secondary)]">{m.verdictDetail}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={exporting}
              onClick={() => handleExportFigure('svg')}
              className="apple-button-primary inline-flex cursor-pointer items-center gap-1.5 rounded-full px-4 py-2 text-[12.5px] font-semibold"
            >
              <Download className="h-3.5 w-3.5" />
              Export Figure SVG
            </button>
            <button
              type="button"
              disabled={exporting}
              onClick={() => handleExportFigure('png')}
              className="apple-button-secondary inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-2 text-[12.5px] font-medium"
            >
              <FileImage className="h-3.5 w-3.5" />
              300-DPI PNG
            </button>
            <button
              type="button"
              onClick={handleExportCSV}
              className="apple-button-secondary inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-2 text-[12.5px] font-medium"
            >
              <Table2 className="h-3.5 w-3.5" />
              Contacts CSV
            </button>
          </div>
        </div>

        {/* Static Globular Protein Gallery */}
        <div className="mt-4 border-t border-[var(--border-hairline)] pt-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-tertiary)]">
              Static Globular Proteins
            </span>
            {STATIC_GLOBULAR_PRESETS.map((p) => {
              const active = p.id === activePresetId;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => selectStaticPreset(p.id)}
                  className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium transition-all ${
                    active
                      ? 'bg-[var(--text-primary)] text-[var(--bg-canvas)] shadow-sm'
                      : 'apple-button-secondary'
                  }`}
                >
                  <span>{p.shortName}</span>
                  <span className={`text-[10px] ${active ? 'opacity-70' : 'text-[var(--text-tertiary)]'}`}>
                    {p.badge}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Drag-and-Drop + Live PDB / AlphaFold ID Fetch */}
          <div className="mt-3 flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                handleFiles(e.dataTransfer.files);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`flex flex-1 cursor-pointer items-center gap-2.5 rounded-2xl border border-dashed px-4 py-2 text-[12px] transition-all ${
                isDragging
                  ? 'border-sky-500 bg-sky-500/12 text-sky-400 scale-[1.005]'
                  : 'border-[var(--border-strong)] bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:border-sky-500/60 hover:text-[var(--text-primary)]'
              }`}
            >
              <Upload className="h-4 w-4 text-sky-500 shrink-0" />
              <span>
                Drop <strong className="text-[var(--text-primary)]">.cif / .pdb</strong> +{' '}
                <strong className="text-[var(--text-primary)]">PAE .json</strong> (AlphaFold3 · ColabFold · Boltz-2)
              </span>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".cif,.mmcif,.pdb,.json"
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
            </div>

            <form onSubmit={handleFetchById} className="flex items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-tertiary)]" />
                <input
                  type="text"
                  value={fetchIdInput}
                  onChange={(e) => setFetchIdInput(e.target.value)}
                  placeholder="PDB or UniProt (e.g. 6XI7, O75096)"
                  className="font-mono-code w-60 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-subtle)] py-1.5 pr-3 pl-8 text-[12px] text-[var(--text-primary)] outline-none focus:border-sky-500/60"
                />
              </div>
              <button
                type="submit"
                disabled={loadingStruct}
                className="apple-button-secondary cursor-pointer whitespace-nowrap rounded-full px-3.5 py-1.5 text-[12px] font-semibold"
              >
                Fetch 3D
              </button>
            </form>
          </div>
        </div>

        {uploadNotice && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 rounded-xl bg-sky-500/10 px-3.5 py-2 text-[12px] font-medium text-sky-600 dark:text-sky-300"
          >
            {uploadNotice}
          </motion.div>
        )}
      </GlassCard>

      {/* Automated Metric Rings (Smartly adapts for Monomer Globular Fold vs Multi-Chain Complex) */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {m.isMonomer ? (
          <>
            <MetricRing
              label="pTM Fold"
              valueText={m.ptm.toFixed(2)}
              sublabel="Globular domain score"
              progress={m.ptm}
              color="#30D158"
            />
            <MetricRing
              label="Mean pLDDT"
              valueText={m.meanComplexPlddt.toFixed(1)}
              sublabel="Local accuracy"
              progress={m.meanComplexPlddt / 100}
              color="#0A84FF"
            />
            <MetricRing
              label="Core PAE"
              valueText={`${m.meanInterfacePae.toFixed(1)}Å`}
              sublabel={`Min ${m.minInterfacePae.toFixed(1)} Å`}
              progress={1 - Math.min(1, m.meanInterfacePae / 20)}
              color="#30D158"
            />
            <MetricRing
              label="Length"
              valueText={`${dataset.residues.length}`}
              sublabel="Single globular chain"
              progress={Math.min(1, dataset.residues.length / 400)}
              color="#5AC8FA"
            />
            <MetricRing
              label="Core Packs"
              valueText={String(m.contactCount8A)}
              sublabel="Long-range (|Δi|≥12)"
              progress={Math.min(1, m.contactCount8A / 260)}
              color="#BF5AF2"
            />
          </>
        ) : (
          <>
            <MetricRing
              label="ipTM"
              valueText={m.iptm.toFixed(2)}
              sublabel={m.iptm >= 0.75 ? 'High interface fold' : m.iptm >= 0.5 ? 'Moderate fold' : 'Weak interface'}
              progress={m.iptm}
              color={m.iptm >= 0.75 ? '#30D158' : m.iptm >= 0.5 ? '#FFD60A' : '#FF453A'}
            />
            <MetricRing
              label="pDockQ"
              valueText={m.pDockQ.toFixed(2)}
              sublabel={m.pDockQ >= 0.45 ? 'Acceptable–High' : m.pDockQ >= 0.23 ? 'Borderline' : 'Low docking'}
              progress={m.pDockQ / 0.75}
              color={m.pDockQ >= 0.45 ? '#0A84FF' : m.pDockQ >= 0.23 ? '#FF9F0A' : '#FF453A'}
            />
            <MetricRing
              label="Mean i-PAE"
              valueText={`${m.meanInterfacePae.toFixed(1)}Å`}
              sublabel={`Min ${m.minInterfacePae.toFixed(1)} Å`}
              progress={1 - Math.min(1, m.meanInterfacePae / 25)}
              color={m.meanInterfacePae <= 6.5 ? '#30D158' : m.meanInterfacePae <= 12 ? '#FFD60A' : '#FF453A'}
            />
            <MetricRing
              label="i-pLDDT"
              valueText={m.meanInterfacePlddt.toFixed(0)}
              sublabel={`pTM ${m.ptm.toFixed(2)}`}
              progress={m.meanInterfacePlddt / 100}
              color="#5AC8FA"
            />
            <MetricRing
              label="Contacts"
              valueText={String(m.contactCount8A)}
              sublabel={`${m.interfaceResidueCount} interface aa`}
              progress={Math.min(1, m.contactCount8A / 65)}
              color="#BF5AF2"
            />
          </>
        )}
      </div>

      {/* Synchronized Selection Inspector Strip */}
      <AnimatePresence>
        {selectedPairStats && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2, ease: APPLE_EASE }}
            className="apple-glass flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-2.5"
          >
            <div className="flex flex-wrap items-center gap-2.5 text-[12.5px]">
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              <span className="font-mono-code font-bold text-[var(--text-primary)]">
                {selectedPairStats.label}
              </span>
              <span className="text-[var(--text-secondary)]">{selectedPairStats.detail}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => molRef.current?.focusSelected()}
                className="apple-button-secondary inline-flex cursor-pointer items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-medium"
              >
                <Focus className="h-3 w-3 text-sky-400" />
                Zoom 3D
              </button>
              <button
                type="button"
                onClick={() => setSelectedPair(null)}
                className="apple-button-secondary inline-flex cursor-pointer items-center rounded-full p-1"
                title="Clear selection"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Synchronized 3D Viewer + PAE Heatmap Grid */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <GlassCard className="p-4 sm:p-5 lg:col-span-7" delay={0.05}>
          <Mol3DViewport
            ref={molRef}
            dataset={dataset}
            selectedPair={selectedPair}
            onSelectResidue={(res) => setSelectedPair({ a: res })}
            isDark={isDark}
          />
        </GlassCard>

        <GlassCard className="p-4 sm:p-5 lg:col-span-5" delay={0.1}>
          <PAEHeatmap
            dataset={dataset}
            selectedPair={selectedPair}
            onSelectPair={(a, b) => setSelectedPair({ a, b })}
          />
        </GlassCard>
      </div>

      {/* Synchronized Per-Residue pLDDT Confidence Track */}
      <GlassCard className="p-4 sm:p-5" delay={0.14}>
        <PLDDTTrack
          dataset={dataset}
          selectedResidues={selectedResidues}
          onSelectResidue={(res) => setSelectedPair({ a: res })}
        />
      </GlassCard>

      {/* Automated Contact Table */}
      <GlassCard className="p-4 sm:p-5" delay={0.18}>
        <div className="mb-3.5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-[14px] font-semibold tracking-tight text-[var(--text-primary)]">
              {m.isMonomer
                ? `Long-Range Globular Packing Contacts (${filteredContacts.length} pairs, |Δi| ≥ 12)`
                : `Interface Residue Contact Table (${filteredContacts.length} pairs)`}
            </h3>
            <p className="text-[11.5px] text-[var(--text-tertiary)]">
              Click any contact row to illuminate the residue pair and distance bridge in 3D and PAE
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-2 text-[11.5px] font-medium text-[var(--text-secondary)]">
              <SlidersHorizontal className="h-3.5 w-3.5 text-sky-500" />
              Cutoff ≤ <span className="font-mono-code text-[var(--text-primary)]">{cutoff.toFixed(1)} Å</span>
              <input
                type="range"
                min={4.5}
                max={9.5}
                step={0.5}
                value={cutoff}
                onChange={(e) => setCutoff(parseFloat(e.target.value))}
                className="w-24 accent-sky-500"
              />
            </label>

            <select
              value={bondFilter}
              onChange={(e) => setBondFilter(e.target.value)}
              className="rounded-full border border-[var(--border-hairline)] bg-[var(--bg-subtle)] px-3 py-1 text-[11.5px] font-medium text-[var(--text-primary)] outline-none"
            >
              <option value="ALL">All Interaction Types</option>
              <option value="Salt Bridge">Salt Bridge</option>
              <option value="Hydrogen Bond">Hydrogen Bond</option>
              <option value="Hydrophobic">Hydrophobic</option>
              <option value="Aromatic π-Stack">Aromatic π-Stack</option>
              <option value="Polar Contact">Polar Contact</option>
            </select>
          </div>
        </div>

        <div className="max-h-[290px] overflow-auto rounded-2xl border border-[var(--border-hairline)]">
          <table className="w-full border-collapse text-left text-[12.5px]">
            <thead className="sticky top-0 z-10 bg-[var(--bg-elevated-solid)] text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--text-tertiary)]">
              <tr className="border-b border-[var(--border-hairline)]">
                <th className="px-4 py-2.5">{m.isMonomer ? 'Residue i' : 'Chain A Residue'}</th>
                <th className="px-4 py-2.5">{m.isMonomer ? 'Residue j' : 'Chain B Residue'}</th>
                <th className="px-4 py-2.5 text-right">CB–CB Dist</th>
                <th className="px-4 py-2.5 text-right">Mean PAE</th>
                <th className="px-4 py-2.5 text-right">pLDDT (i / j)</th>
                <th className="px-4 py-2.5 text-right">Interaction</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-hairline)]">
              {filteredContacts.slice(0, 100).map((c: InterfaceContact) => {
                const isSelected =
                  selectedPair?.a.index === c.resA.index && selectedPair?.b?.index === c.resB.index;
                return (
                  <motion.tr
                    key={c.id}
                    whileHover={{ backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.025)' }}
                    transition={{ duration: 0.12, ease: APPLE_EASE }}
                    onClick={() => setSelectedPair({ a: c.resA, b: c.resB })}
                    className={`cursor-pointer ${isSelected ? 'bg-sky-500/12' : ''}`}
                  >
                    <td className="font-mono-code px-4 py-2 font-semibold text-[var(--text-primary)]">
                      {c.resA.chain}:{c.resA.resName} {c.resA.resSeq}
                    </td>
                    <td className="font-mono-code px-4 py-2 font-semibold text-[var(--text-primary)]">
                      {c.resB.chain}:{c.resB.resName} {c.resB.resSeq}
                    </td>
                    <td className="tabular-nums-strict font-mono-code px-4 py-2 text-right text-[var(--text-secondary)]">
                      {c.distance.toFixed(2)} Å
                    </td>
                    <td className="tabular-nums-strict font-mono-code px-4 py-2 text-right font-semibold text-emerald-500">
                      {c.meanPae.toFixed(1)} Å
                    </td>
                    <td className="tabular-nums-strict font-mono-code px-4 py-2 text-right text-[var(--text-secondary)]">
                      {c.resA.plddt.toFixed(0)} / {c.resB.plddt.toFixed(0)}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <span className="inline-flex rounded-full bg-[var(--bg-subtle)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--text-secondary)] ring-1 ring-[var(--border-hairline)]">
                        {c.interactionType}
                      </span>
                    </td>
                  </motion.tr>
                );
              })}
              {filteredContacts.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[12.5px] text-[var(--text-tertiary)]">
                    No contacts match the current filter and distance cutoff ({cutoff.toFixed(1)} Å).
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
};
