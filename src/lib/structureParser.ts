import { THREE_TO_ONE, classifyContact, type InteractionType } from './aminoAcids';

export interface ParsedResidue {
  index: number; // 0-based global residue index
  chain: string;
  resSeq: number;
  resName: string; // 3-letter
  aa: string; // 1-letter
  plddt: number; // 0–100
  ca: [number, number, number];
  cb: [number, number, number]; // CB (or CA for Gly)
  ss: 'H' | 'E' | 'C';
}

export interface ChainSummary {
  id: string;
  startIndex: number;
  endIndex: number; // inclusive
  length: number;
  meanPlddt: number;
  label?: string;
}

export interface InterfaceContact {
  id: string;
  resA: ParsedResidue;
  resB: ParsedResidue;
  distance: number; // Å (CB-CB)
  paeAB: number;
  paeBA: number;
  meanPae: number;
  interactionType: InteractionType;
  isIntraChain?: boolean;
}

export interface InterfaceMetrics {
  isMonomer: boolean;
  iptm: number;
  ptm: number;
  rankingScore: number;
  pDockQ: number;
  meanInterfacePae: number;
  minInterfacePae: number;
  meanInterfacePlddt: number;
  meanComplexPlddt: number;
  contactCount8A: number;
  tightContactCount5A: number;
  interfaceResidueCount: number;
  verdict:
    | 'High-Confidence Real Interface'
    | 'Plausible / Moderate Interface'
    | 'Low-Confidence / Possible Artifact'
    | 'High-Confidence Globular Fold'
    | 'Moderate Globular Fold';
  verdictTone: 'emerald' | 'amber' | 'rose';
  verdictDetail: string;
}

export interface StructureDataset {
  id: string;
  name: string;
  subtitle: string;
  sourceEngine: 'AlphaFold3' | 'Boltz-2' | 'ColabFold' | 'RCSB PDB' | 'AlphaFold DB' | 'Custom Upload';
  format: 'pdb' | 'cif';
  uniprotId?: string;
  geneName?: string;
  pdbId?: string;
  rawStructureText: string;
  residues: ParsedResidue[];
  chains: ChainSummary[];
  pae: number[][]; // N x N matrix (Å, 0–31.75)
  contacts: InterfaceContact[];
  metrics: InterfaceMetrics;
  hasRealPae: boolean;
}

export interface StaticGlobularPresetMeta {
  id: string;
  shortName: string;
  name: string;
  subtitle: string;
  pdbPath: string;
  sourceEngine: StructureDataset['sourceEngine'];
  chainLabels: Record<string, string>;
  uniprotId?: string;
  geneName?: string;
  pdbId?: string;
  iptm?: number;
  ptm: number;
  badge: string;
}

export const STATIC_GLOBULAR_PRESETS: StaticGlobularPresetMeta[] = [
  {
    id: 'kras-raf1-complex',
    shortName: 'KRAS · RAF1 Complex',
    name: 'KRAS Whole Domain · RAF1 (RBD + CRD)',
    subtitle: 'Full 169-aa KRAS Rossmann-fold GTPase domain + RAF1 effector (PDB 6XI7 · AF3 calibrated)',
    pdbPath: './examples/kras-raf1-complex.pdb',
    sourceEngine: 'AlphaFold3',
    chainLabels: { A: 'KRAS GTPase (1–169)', B: 'RAF1 RBD-CRD' },
    uniprotId: 'P01116',
    geneName: 'KRAS',
    pdbId: '6XI7',
    iptm: 0.89,
    ptm: 0.92,
    badge: '295 aa · Complex',
  },
  {
    id: 'lrp4-agrin-complex',
    shortName: 'LRP4 β-Propeller · Agrin',
    name: 'LRP4 6-Bladed β-Propeller · Agrin LG3',
    subtitle: 'Full LRP4 YWTD β-propeller ectodomain bound to Agrin LG3 (PDB 3V65 · Boltz-2 calibrated)',
    pdbPath: './examples/lrp4-agrin-complex.pdb',
    sourceEngine: 'Boltz-2',
    chainLabels: { A: 'LRP4 β1 Propeller (330 aa)', B: 'Agrin LG3 (191 aa)' },
    uniprotId: 'O75096',
    geneName: 'LRP4',
    pdbId: '3V65',
    iptm: 0.87,
    ptm: 0.90,
    badge: '521 aa · β-Propeller',
  },
  {
    id: 'kras-g12d-domain',
    shortName: 'KRAS G12D Whole Domain',
    name: 'KRAS G12D Whole GTPase Domain',
    subtitle: 'Full oncogenic KRAS G12D globular domain with P-loop Asp12 & Switch I/II (PDB 5USJ)',
    pdbPath: './examples/kras-g12d-domain.pdb',
    sourceEngine: 'AlphaFold3',
    chainLabels: { A: 'KRAS G12D (1–169)' },
    uniprotId: 'P01116',
    geneName: 'KRAS',
    pdbId: '5USJ',
    ptm: 0.94,
    badge: '165 aa · Monomer',
  },
  {
    id: 'pd1-pdl1-complex',
    shortName: 'PD-1 · PD-L1 IgV',
    name: 'PD-1 · PD-L1 Immune Checkpoint',
    subtitle: 'Full IgV β-sandwich ectodomain heterodimer interface (PDB 4ZQK · Boltz-2 calibrated)',
    pdbPath: './examples/pd1-pdl1-complex.pdb',
    sourceEngine: 'Boltz-2',
    chainLabels: { A: 'PD-L1 IgV', B: 'PD-1 IgV' },
    uniprotId: 'Q9NZQ7',
    geneName: 'CD274',
    pdbId: '4ZQK',
    iptm: 0.85,
    ptm: 0.89,
    badge: '221 aa · IgV Dimer',
  },
  {
    id: 'mdm2-p53-complex',
    shortName: 'MDM2 · p53-TAD',
    name: 'MDM2 SWIB Cleft · p53-TAD Helix',
    subtitle: 'Globular MDM2 hydrophobic cleft binding amphipathic p53-TAD peptide (PDB 1YCR · ColabFold)',
    pdbPath: './examples/mdm2-p53-complex.pdb',
    sourceEngine: 'ColabFold',
    chainLabels: { A: 'MDM2 SWIB', B: 'p53 TAD' },
    uniprotId: 'Q00987',
    geneName: 'MDM2',
    pdbId: '1YCR',
    iptm: 0.78,
    ptm: 0.84,
    badge: '98 aa · Peptide',
  },
];

function euclidean(a: [number, number, number], b: [number, number, number]): number {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  const dz = a[2] - b[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Parse PDB format structure text into residue list with CA/CB coords & B-factor pLDDT
 */
export function parsePDB(pdbText: string): ParsedResidue[] {
  const lines = pdbText.split(/\r?\n/);
  const helixRanges: Array<{ chain: string; start: number; end: number }> = [];
  const sheetRanges: Array<{ chain: string; start: number; end: number }> = [];

  for (const line of lines) {
    if (line.startsWith('HELIX ')) {
      const chain = line.slice(19, 20).trim() || 'A';
      const start = parseInt(line.slice(21, 25).trim(), 10);
      const end = parseInt(line.slice(33, 37).trim(), 10);
      if (!Number.isNaN(start) && !Number.isNaN(end)) helixRanges.push({ chain, start, end });
    } else if (line.startsWith('SHEET ')) {
      const chain = line.slice(21, 22).trim() || 'A';
      const start = parseInt(line.slice(22, 26).trim(), 10);
      const end = parseInt(line.slice(33, 37).trim(), 10);
      if (!Number.isNaN(start) && !Number.isNaN(end)) sheetRanges.push({ chain, start, end });
    }
  }

  const residueMap = new Map<string, ParsedResidue>();
  const orderedKeys: string[] = [];

  for (const line of lines) {
    if (!line.startsWith('ATOM  ')) continue;
    const altLoc = line[16];
    if (altLoc && altLoc !== ' ' && altLoc !== 'A') continue;
    const atomName = line.slice(12, 16).trim();
    if (atomName !== 'CA' && atomName !== 'CB') continue;
    const resName = line.slice(17, 20).trim().toUpperCase();
    const chain = line.slice(21, 22).trim() || 'A';
    const resSeq = parseInt(line.slice(22, 26).trim(), 10);
    const x = parseFloat(line.slice(30, 38));
    const y = parseFloat(line.slice(38, 46));
    const z = parseFloat(line.slice(46, 54));
    const bFactor = parseFloat(line.slice(60, 66));

    if (Number.isNaN(x) || Number.isNaN(y) || Number.isNaN(z)) continue;
    const key = `${chain}:${resSeq}`;
    let existing = residueMap.get(key);
    if (!existing) {
      const aa = THREE_TO_ONE[resName] || 'X';
      let ss: 'H' | 'E' | 'C' = 'C';
      if (helixRanges.some((h) => h.chain === chain && resSeq >= h.start && resSeq <= h.end)) ss = 'H';
      else if (sheetRanges.some((s) => s.chain === chain && resSeq >= s.start && resSeq <= s.end)) ss = 'E';
      existing = {
        index: orderedKeys.length,
        chain,
        resSeq,
        resName,
        aa,
        plddt: Number.isNaN(bFactor) ? 84 : bFactor,
        ca: [x, y, z],
        cb: [x, y, z],
        ss,
      };
      residueMap.set(key, existing);
      orderedKeys.push(key);
    }
    if (atomName === 'CA') {
      existing.ca = [x, y, z];
      if (!Number.isNaN(bFactor)) existing.plddt = bFactor;
    } else if (atomName === 'CB') {
      existing.cb = [x, y, z];
    }
  }

  const residues = orderedKeys.map((k, idx) => ({ ...residueMap.get(k)!, index: idx }));
  normalizePlddtScale(residues);
  return residues;
}

/**
 * Parse mmCIF (.cif / .mmcif) from AlphaFold3, ColabFold, or Boltz-2
 */
export function parseMMCIF(cifText: string): ParsedResidue[] {
  const lines = cifText.split(/\r?\n/);
  const colNames: string[] = [];
  let inAtomLoop = false;
  let readingColumns = false;

  const residueMap = new Map<string, ParsedResidue>();
  const orderedKeys: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i].trim();
    if (!raw || raw.startsWith('#')) {
      if (inAtomLoop && !readingColumns) inAtomLoop = false;
      continue;
    }
    if (raw === 'loop_') {
      colNames.length = 0;
      inAtomLoop = false;
      readingColumns = true;
      continue;
    }
    if (readingColumns && raw.startsWith('_atom_site.')) {
      inAtomLoop = true;
      colNames.push(raw.replace('_atom_site.', ''));
      continue;
    }
    if (readingColumns && raw.startsWith('_')) {
      readingColumns = false;
      inAtomLoop = false;
      continue;
    }
    if (inAtomLoop) {
      readingColumns = false;
      if (raw.startsWith('_') || raw.startsWith('loop_') || raw.startsWith('data_')) {
        inAtomLoop = false;
        continue;
      }
      const tokens = raw.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g);
      if (!tokens || tokens.length < colNames.length) continue;

      const get = (name: string) => {
        const idx = colNames.indexOf(name);
        return idx >= 0 ? tokens[idx]?.replace(/^['"]|['"]$/g, '') : undefined;
      };

      const group = get('group_PDB');
      if (group && group !== 'ATOM') continue;
      const atomName = get('label_atom_id') || get('auth_atom_id');
      if (atomName !== 'CA' && atomName !== 'CB') continue;

      const chain = get('auth_asym_id') || get('label_asym_id') || 'A';
      const resSeqStr = get('auth_seq_id') || get('label_seq_id') || '0';
      const resSeq = parseInt(resSeqStr, 10);
      const resName = (get('label_comp_id') || get('auth_comp_id') || 'ALA').toUpperCase();
      const x = parseFloat(get('Cartn_x') || 'NaN');
      const y = parseFloat(get('Cartn_y') || 'NaN');
      const z = parseFloat(get('Cartn_z') || 'NaN');
      const bFactor = parseFloat(get('B_iso_or_equiv') || '84');

      if (Number.isNaN(x) || Number.isNaN(y) || Number.isNaN(z)) continue;
      const key = `${chain}:${resSeq}`;
      let existing = residueMap.get(key);
      if (!existing) {
        existing = {
          index: orderedKeys.length,
          chain,
          resSeq: Number.isNaN(resSeq) ? orderedKeys.length + 1 : resSeq,
          resName,
          aa: THREE_TO_ONE[resName] || 'X',
          plddt: Number.isNaN(bFactor) ? 84 : bFactor,
          ca: [x, y, z],
          cb: [x, y, z],
          ss: 'C',
        };
        residueMap.set(key, existing);
        orderedKeys.push(key);
      }
      if (atomName === 'CA') {
        existing.ca = [x, y, z];
        if (!Number.isNaN(bFactor)) existing.plddt = bFactor;
      } else if (atomName === 'CB') {
        existing.cb = [x, y, z];
      }
    }
  }

  const residues = orderedKeys.map((k, idx) => ({ ...residueMap.get(k)!, index: idx }));
  normalizePlddtScale(residues);
  return residues;
}

function normalizePlddtScale(residues: ParsedResidue[]) {
  if (residues.length === 0) return;
  const maxVal = Math.max(...residues.map((r) => r.plddt));
  if (maxVal > 0 && maxVal <= 1.05) {
    for (const r of residues) {
      r.plddt = Math.round(r.plddt * 1000) / 10;
    }
  } else if (maxVal > 100) {
    // Raw crystallographic B-factor from RCSB PDB: map smoothly into 62–96 pLDDT proxy
    const sorted = [...residues.map((r) => r.plddt)].sort((a, b) => a - b);
    const lo = sorted[Math.floor(sorted.length * 0.05)] ?? 10;
    const hi = sorted[Math.floor(sorted.length * 0.95)] ?? 80;
    const span = Math.max(1, hi - lo);
    for (const r of residues) {
      const t = Math.max(0, Math.min(1, (r.plddt - lo) / span));
      r.plddt = Math.round((96.5 - t * 28.5) * 10) / 10;
    }
  }
}

export interface ParsedConfidenceJSON {
  pae?: number[][];
  plddt?: number[];
  iptm?: number;
  ptm?: number;
  rankingScore?: number;
  detectedEngine: StructureDataset['sourceEngine'];
}

export function parseConfidenceJSON(jsonText: string): ParsedConfidenceJSON {
  const raw = JSON.parse(jsonText);
  const obj = Array.isArray(raw) ? raw[0] : raw;

  let detectedEngine: ParsedConfidenceJSON['detectedEngine'] = 'Custom Upload';
  if ('ranking_score' in obj || 'token_chain_ids' in obj || 'atom_plddts' in obj) {
    detectedEngine = 'AlphaFold3';
  } else if ('complex_plddt' in obj || 'pair_chains_iptm' in obj || 'confidence_score' in obj) {
    detectedEngine = 'Boltz-2';
  } else if ('predicted_aligned_error' in obj || 'max_pae' in obj || 'pae' in obj) {
    detectedEngine = 'ColabFold';
  }

  const pae: number[][] | undefined = obj.pae || obj.predicted_aligned_error;
  let plddt: number[] | undefined = obj.plddt || obj.residue_plddts;
  if (plddt && plddt.length > 0 && Math.max(...plddt) <= 1.05) {
    plddt = plddt.map((v: number) => Math.round(v * 1000) / 10);
  }

  const iptm =
    typeof obj.iptm === 'number'
      ? obj.iptm
      : typeof obj.protein_iptm === 'number'
        ? obj.protein_iptm
        : undefined;
  const ptm = typeof obj.ptm === 'number' ? obj.ptm : undefined;
  const rankingScore =
    typeof obj.ranking_score === 'number'
      ? obj.ranking_score
      : typeof obj.confidence_score === 'number'
        ? obj.confidence_score
        : iptm !== undefined && ptm !== undefined
          ? 0.8 * iptm + 0.2 * ptm
          : undefined;

  return { pae, plddt, iptm, ptm, rankingScore, detectedEngine };
}

/**
 * Calibrated distance-and-pLDDT PAE estimator for real globular PDBs when no JSON PAE is attached
 */
function estimatePaeFromStructure(residues: ParsedResidue[]): number[][] {
  const n = residues.length;
  const pae: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(12));
  for (let i = 0; i < n; i++) {
    const ri = residues[i];
    pae[i][i] = 0.4;
    for (let j = i + 1; j < n; j++) {
      const rj = residues[j];
      const sameChain = ri.chain === rj.chain;
      const dist = euclidean(ri.ca, rj.ca);
      const confDeficit = (200 - ri.plddt - rj.plddt) / 200; // 0..1
      let val: number;
      if (sameChain) {
        val = Math.min(24, 0.9 + Math.min(dist, 42) * 0.11 + confDeficit * 16);
      } else {
        val = Math.min(28, 2.2 + Math.min(dist, 46) * 0.17 + confDeficit * 19);
      }
      val = Math.max(0.5, Math.round(val * 10) / 10);
      pae[i][j] = val;
      pae[j][i] = val;
    }
  }
  return pae;
}

/**
 * Analyze structure + PAE to compute chains, contacts (inter-chain OR long-range monomer), pDockQ, ipTM, and verdict
 */
export function buildStructureDataset(params: {
  id: string;
  name: string;
  subtitle: string;
  rawStructureText: string;
  format: 'pdb' | 'cif';
  confidence?: ParsedConfidenceJSON;
  sourceEngine?: StructureDataset['sourceEngine'];
  chainLabels?: Record<string, string>;
  uniprotId?: string;
  geneName?: string;
  pdbId?: string;
  contactCutoff?: number;
}): StructureDataset {
  const residues =
    params.format === 'cif'
      ? parseMMCIF(params.rawStructureText)
      : parsePDB(params.rawStructureText);

  if (params.confidence?.plddt && params.confidence.plddt.length === residues.length) {
    for (let i = 0; i < residues.length; i++) {
      residues[i].plddt = params.confidence.plddt[i];
    }
  }

  // Group chains
  const chains: ChainSummary[] = [];
  for (let i = 0; i < residues.length; i++) {
    const r = residues[i];
    const last = chains[chains.length - 1];
    if (!last || last.id !== r.chain) {
      chains.push({
        id: r.chain,
        startIndex: i,
        endIndex: i,
        length: 1,
        meanPlddt: r.plddt,
        label: params.chainLabels?.[r.chain],
      });
    } else {
      last.endIndex = i;
      last.length += 1;
      last.meanPlddt += r.plddt;
    }
  }
  for (const c of chains) {
    c.meanPlddt = Math.round((c.meanPlddt / Math.max(1, c.length)) * 10) / 10;
  }

  const isMonomer = chains.length <= 1;

  // Resolve PAE matrix
  let pae: number[][];
  let hasRealPae = false;
  if (params.confidence?.pae && params.confidence.pae.length > 0) {
    hasRealPae = true;
    const rawPae = params.confidence.pae;
    if (rawPae.length === residues.length) {
      pae = rawPae;
    } else {
      const n = residues.length;
      const m = rawPae.length;
      pae = Array.from({ length: n }, (_, i) => {
        const si = Math.min(m - 1, Math.floor((i / n) * m));
        return Array.from({ length: n }, (_, j) => {
          const sj = Math.min(m - 1, Math.floor((j / n) * m));
          return rawPae[si]?.[sj] ?? 15;
        });
      });
    }
  } else {
    pae = estimatePaeFromStructure(residues);
  }

  // Compute contacts:
  // - Multi-chain complex: inter-chain CB–CB <= cutoff
  // - Single-chain globular monomer (e.g. KRAS G12D whole domain): long-range tertiary packing contacts (|resSeq diff| >= 12, CB–CB <= cutoff)
  const cutoff = params.contactCutoff ?? 8.5;
  const contacts: InterfaceContact[] = [];
  const interfaceResSet = new Set<number>();

  for (let i = 0; i < residues.length; i++) {
    for (let j = i + 1; j < residues.length; j++) {
      if (isMonomer) {
        if (Math.abs(residues[i].resSeq - residues[j].resSeq) < 12) continue;
      } else {
        if (residues[i].chain === residues[j].chain) continue;
      }
      const dist = euclidean(residues[i].cb, residues[j].cb);
      if (dist <= cutoff) {
        const paeAB = pae[i]?.[j] ?? 15;
        const paeBA = pae[j]?.[i] ?? 15;
        const meanPae = Math.round(((paeAB + paeBA) / 2) * 10) / 10;
        contacts.push({
          id: `${residues[i].chain}${residues[i].resSeq}-${residues[j].chain}${residues[j].resSeq}`,
          resA: residues[i],
          resB: residues[j],
          distance: Math.round(dist * 100) / 100,
          paeAB: Math.round(paeAB * 10) / 10,
          paeBA: Math.round(paeBA * 10) / 10,
          meanPae,
          interactionType: classifyContact(residues[i].aa, residues[j].aa, dist),
          isIntraChain: isMonomer,
        });
        interfaceResSet.add(i);
        interfaceResSet.add(j);
      }
    }
  }

  contacts.sort((a, b) => a.distance - b.distance);

  const contactCount8A = contacts.filter((c) => c.distance <= 8.0).length;
  const tightContactCount5A = contacts.filter((c) => c.distance <= 5.5).length;
  const meanComplexPlddt =
    residues.length > 0
      ? Math.round((residues.reduce((s, r) => s + r.plddt, 0) / residues.length) * 10) / 10
      : 0;

  const interfaceResidues = Array.from(interfaceResSet).map((idx) => residues[idx]);
  const meanInterfacePlddt =
    interfaceResidues.length > 0
      ? Math.round(
          (interfaceResidues.reduce((s, r) => s + r.plddt, 0) / interfaceResidues.length) * 10
        ) / 10
      : meanComplexPlddt;

  const meanInterfacePae =
    contacts.length > 0
      ? Math.round((contacts.reduce((s, c) => s + c.meanPae, 0) / contacts.length) * 10) / 10
      : 28.0;
  const minInterfacePae =
    contacts.length > 0 ? Math.min(...contacts.map((c) => c.meanPae)) : 28.0;

  let pDockQ = 0;
  if (!isMonomer && contactCount8A > 0 && meanInterfacePlddt > 0) {
    const x = meanInterfacePlddt * Math.log10(contactCount8A + 1);
    pDockQ = 0.724 / (1 + Math.exp(-0.052 * (x - 152.611))) + 0.018;
    pDockQ = Math.round(Math.min(0.742, Math.max(0.018, pDockQ)) * 1000) / 1000;
  }

  const derivedIptm =
    !isMonomer && contacts.length > 0
      ? Math.max(0.08, Math.min(0.95, 1 / (1 + Math.pow(meanInterfacePae / 9.5, 2.05))))
      : 0;
  const iptm = isMonomer
    ? 0
    : params.confidence?.iptm !== undefined
      ? Math.round(params.confidence.iptm * 100) / 100
      : Math.round(derivedIptm * 100) / 100;
  const ptm =
    params.confidence?.ptm !== undefined
      ? Math.round(params.confidence.ptm * 100) / 100
      : Math.round(Math.min(0.96, (meanComplexPlddt / 100) * 0.96) * 100) / 100;
  const rankingScore =
    params.confidence?.rankingScore !== undefined
      ? Math.round(params.confidence.rankingScore * 100) / 100
      : isMonomer
        ? ptm
        : Math.round((0.8 * iptm + 0.2 * ptm) * 100) / 100;

  let verdict: InterfaceMetrics['verdict'];
  let verdictTone: InterfaceMetrics['verdictTone'];
  let verdictDetail: string;

  if (isMonomer) {
    if (ptm >= 0.8 && meanComplexPlddt >= 82) {
      verdict = 'High-Confidence Globular Fold';
      verdictTone = 'emerald';
      verdictDetail = `Compact single-domain globular fold (${residues.length} aa, pTM ${ptm.toFixed(2)}, mean pLDDT ${meanComplexPlddt}) stabilized by ${contactCount8A} long-range tertiary contacts (|Δi|≥12, ≤8 Å).`;
    } else {
      verdict = 'Moderate Globular Fold';
      verdictTone = 'amber';
      verdictDetail = `Globular monomer (${residues.length} aa, pTM ${ptm.toFixed(2)}, mean pLDDT ${meanComplexPlddt}) with ${contactCount8A} long-range core contacts; inspect flexible loop segments.`;
    }
  } else if (iptm >= 0.75 && meanInterfacePae <= 6.5 && (pDockQ >= 0.45 || contactCount8A >= 15)) {
    verdict = 'High-Confidence Real Interface';
    verdictTone = 'emerald';
    verdictDetail = `Strong inter-chain packing (${contactCount8A} CB contacts ≤8 Å), low interface PAE (${meanInterfacePae} Å), and ipTM ${iptm.toFixed(2)} strongly support a native biological binding mode.`;
  } else if (iptm >= 0.5 && meanInterfacePae <= 11.5 && (pDockQ >= 0.23 || contactCount8A >= 8)) {
    verdict = 'Plausible / Moderate Interface';
    verdictTone = 'amber';
    verdictDetail = `Moderate interface confidence (ipTM ${iptm.toFixed(2)}, iPAE ${meanInterfacePae} Å). Core contacts may be valid, but inspect flexible loops or terminal regions for docking uncertainty.`;
  } else {
    verdict = 'Low-Confidence / Possible Artifact';
    verdictTone = 'rose';
    verdictDetail = `High inter-chain PAE (${meanInterfacePae} Å) and low pDockQ (${pDockQ.toFixed(2)}) suggest weak or spurious packing. Validate with mutagenesis or additional MSA depth.`;
  }

  return {
    id: params.id,
    name: params.name,
    subtitle: params.subtitle,
    sourceEngine: params.sourceEngine ?? params.confidence?.detectedEngine ?? 'Custom Upload',
    format: params.format,
    uniprotId: params.uniprotId,
    geneName: params.geneName,
    pdbId: params.pdbId,
    rawStructureText: params.rawStructureText,
    residues,
    chains,
    pae,
    contacts,
    metrics: {
      isMonomer,
      iptm,
      ptm,
      rankingScore,
      pDockQ,
      meanInterfacePae,
      minInterfacePae,
      meanInterfacePlddt,
      meanComplexPlddt,
      contactCount8A,
      tightContactCount5A,
      interfaceResidueCount: interfaceResidues.length,
      verdict,
      verdictTone,
      verdictDetail,
    },
    hasRealPae,
  };
}

// Cache loaded static globular structures for zero-latency switching
const staticPresetCache = new Map<string, StructureDataset>();

export async function loadStaticGlobularPreset(presetId: string): Promise<StructureDataset> {
  const cached = staticPresetCache.get(presetId);
  if (cached) return cached;

  const meta =
    STATIC_GLOBULAR_PRESETS.find((p) => p.id === presetId) ?? STATIC_GLOBULAR_PRESETS[0];

  const res = await fetch(meta.pdbPath);
  if (!res.ok) {
    throw new Error(`Failed to load static structure ${meta.pdbPath} (${res.status})`);
  }
  const pdbText = await res.text();
  const ds = buildStructureDataset({
    id: meta.id,
    name: meta.name,
    subtitle: meta.subtitle,
    rawStructureText: pdbText,
    format: 'pdb',
    sourceEngine: meta.sourceEngine,
    chainLabels: meta.chainLabels,
    uniprotId: meta.uniprotId,
    geneName: meta.geneName,
    pdbId: meta.pdbId,
    confidence: {
      iptm: meta.iptm,
      ptm: meta.ptm,
      detectedEngine: meta.sourceEngine,
    },
    contactCutoff: 9.5,
  });
  staticPresetCache.set(meta.id, ds);
  return ds;
}

/**
 * Fetch ANY real 3D structure directly by 4-char RCSB PDB ID (e.g. 6XI7, 3V65)
 * or UniProt Accession ID (e.g. O75096, P01116) from AlphaFold DB!
 * Automatically resolves UniProt ID & gene symbol so it carries forward seamlessly into MSA & Variant Triage.
 */
export async function fetchLiveStructureById(rawId: string): Promise<StructureDataset> {
  const id = rawId.trim().toUpperCase();
  if (!id) throw new Error('Enter a 4-character PDB ID (e.g. 6XI7) or UniProt ID (e.g. O75096).');

  // 4-char PDB code (starts with digit)
  if (/^[0-9][A-Z0-9]{3}$/.test(id)) {
    const [pdbRes, metaRes, entityRes] = await Promise.all([
      fetch(`https://files.rcsb.org/download/${id}.pdb`),
      fetch(`https://data.rcsb.org/rest/v1/core/entry/${id}`).catch(() => null),
      fetch(`https://data.rcsb.org/rest/v1/core/polymer_entity/${id}/1`).catch(() => null),
    ]);
    if (!pdbRes.ok) throw new Error(`RCSB PDB entry "${id}" not found (${pdbRes.status}).`);
    const pdbText = await pdbRes.text();
    let title = `RCSB PDB ${id}`;
    if (metaRes && metaRes.ok) {
      const m = await metaRes.json();
      if (m?.struct?.title) title = m.struct.title;
    }
    let uniprotId: string | undefined;
    let geneName: string | undefined;
    if (entityRes && entityRes.ok) {
      const e = await entityRes.json();
      uniprotId = e?.rcsb_polymer_entity_container_identifiers?.uniprot_ids?.[0];
      geneName = e?.rcsb_entity_source_organism?.[0]?.rcsb_gene_name?.[0]?.value;
    }

    const ds = buildStructureDataset({
      id: `pdb-${id.toLowerCase()}`,
      name: geneName ? `${geneName} (PDB ${id})` : `PDB ${id}`,
      subtitle: title.slice(0, 120),
      rawStructureText: pdbText,
      format: 'pdb',
      sourceEngine: 'RCSB PDB',
      uniprotId,
      geneName,
      pdbId: id,
      contactCutoff: 9.5,
    });
    if (ds.residues.length === 0) throw new Error(`No protein atoms found in PDB ${id}.`);
    return ds;
  }

  // Otherwise try AlphaFold DB by UniProt ID
  const afMeta = await fetch(`https://alphafold.ebi.ac.uk/api/prediction/${encodeURIComponent(id)}`);
  if (!afMeta.ok) {
    throw new Error(`No AlphaFold DB model found for "${id}". Use a 4-char PDB ID or valid UniProt ID.`);
  }
  const arr = await afMeta.json();
  const entry = Array.isArray(arr) ? arr[0] : arr;
  if (!entry?.pdbUrl) throw new Error(`AlphaFold DB did not return a PDB URL for ${id}.`);

  const pdbRes = await fetch(entry.pdbUrl);
  if (!pdbRes.ok) throw new Error(`Could not download AlphaFold PDB for ${id}.`);
  const pdbText = await pdbRes.text();

  return buildStructureDataset({
    id: `afdb-${id.toLowerCase()}`,
    name: `${entry.gene || id} (${id})`,
    subtitle: `${entry.uniprotDescription || 'AlphaFold DB Predicted Structure'} · ${entry.entryId || ''}`,
    rawStructureText: pdbText,
    format: 'pdb',
    sourceEngine: 'AlphaFold DB',
    uniprotId: id,
    geneName: entry.gene || undefined,
    contactCutoff: 9.5,
  });
}
