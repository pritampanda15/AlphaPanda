import { AMINO_ACIDS } from './aminoAcids';

export interface AlignedSequence {
  id: string;
  label: string;
  sequence: string;
}

export interface ColumnStats {
  index: number; // 0-based alignment column
  refPos: number | null; // 1-based ungapped index in first sequence
  consensus: string;
  conservation: number; // 0..1 (frequency of consensus non-gap residue)
  informationBits: number; // 0..4.32 bits (Shannon WebLogo height)
  gapFraction: number;
  letterStack: Array<{ aa: string; bits: number; freq: number }>;
  ss: 'H' | 'E' | 'C';
}

export interface MSAMutationPin {
  id: string;
  column: number; // 1-based alignment column
  label: string;
  category: 'active-site' | 'mutation' | 'motif';
  note?: string;
}

export type MSAColorScheme =
  | 'alphapanda'
  | 'clustalx'
  | 'espript-red'
  | 'hydrophobicity'
  | 'conservation';

export interface MSADataset {
  id: string;
  title: string;
  subtitle: string;
  rawText: string;
  sequences: AlignedSequence[];
  secondaryStructure: string; // aligned H/E/C string
  pins: MSAMutationPin[];
  motifRegex?: string;
}

/**
 * Parse FASTA or Clustal (.aln / .clustal) multiple sequence alignment text
 */
export function parseMSA(rawText: string): AlignedSequence[] {
  const trimmed = rawText.trim();
  if (!trimmed) return [];

  // FASTA format
  if (trimmed.startsWith('>')) {
    const records: AlignedSequence[] = [];
    let current: AlignedSequence | null = null;
    for (const line of trimmed.split(/\r?\n/)) {
      const l = line.trim();
      if (!l) continue;
      if (l.startsWith('>')) {
        if (current) records.push(current);
        const header = l.slice(1).trim();
        const [idPart, ...rest] = header.split(/\s+/);
        current = {
          id: idPart || `Seq_${records.length + 1}`,
          label: rest.length > 0 ? `${idPart} ${rest.join(' ')}`.slice(0, 26) : idPart.slice(0, 26),
          sequence: '',
        };
      } else if (current) {
        current.sequence += l.replace(/\s+/g, '').toUpperCase();
      }
    }
    if (current) records.push(current);
    return normalizeLengths(records);
  }

  // Clustal format (blocks of `seq_id   SEQUENCE`)
  const seqMap = new Map<string, string>();
  const order: string[] = [];
  for (const line of trimmed.split(/\r?\n/)) {
    if (
      !line.trim() ||
      line.startsWith('CLUSTAL') ||
      line.startsWith('MUSCLE') ||
      line.startsWith('#') ||
      /^\s+[\*\:\.\s]+$/.test(line)
    ) {
      continue;
    }
    const match = line.match(/^(\S+)\s+([A-Za-z\-\.]+)(?:\s+\d+)?\s*$/);
    if (match) {
      const id = match[1];
      const chunk = match[2].replace(/\./g, '-').toUpperCase();
      if (!seqMap.has(id)) {
        seqMap.set(id, '');
        order.push(id);
      }
      seqMap.set(id, seqMap.get(id)! + chunk);
    }
  }

  if (order.length > 0) {
    return normalizeLengths(
      order.map((id) => ({ id, label: id.slice(0, 24), sequence: seqMap.get(id)! }))
    );
  }

  // Plain line-per-sequence fallback
  const lines = trimmed.split(/\r?\n/).filter((l) => l.trim().length > 0);
  return normalizeLengths(
    lines.map((l, i) => ({
      id: `Seq_${i + 1}`,
      label: `Seq_${i + 1}`,
      sequence: l.replace(/\s+/g, '').toUpperCase(),
    }))
  );
}

function normalizeLengths(seqs: AlignedSequence[]): AlignedSequence[] {
  if (seqs.length === 0) return [];
  const maxLen = Math.max(...seqs.map((s) => s.sequence.length));
  return seqs.map((s) => ({
    ...s,
    sequence: s.sequence.padEnd(maxLen, '-'),
  }));
}

/**
 * Predict a smooth secondary structure track (H / E / C) using Chou-Fasman sliding window
 */
export function predictSecondaryStructure(alignedSeq: string): string {
  const n = alignedSeq.length;
  const out: Array<'H' | 'E' | 'C'> = new Array(n).fill('C');
  for (let i = 0; i < n; i++) {
    let hSum = 0;
    let eSum = 0;
    let count = 0;
    for (let k = Math.max(0, i - 2); k <= Math.min(n - 1, i + 2); k++) {
      const aa = AMINO_ACIDS[alignedSeq[k]];
      if (aa) {
        hSum += aa.helixPropensity;
        eSum += aa.sheetPropensity;
        count++;
      }
    }
    if (count === 0) continue;
    const hAvg = hSum / count;
    const eAvg = eSum / count;
    if (hAvg >= 1.07 && hAvg >= eAvg) out[i] = 'H';
    else if (eAvg >= 1.12 && eAvg > hAvg) out[i] = 'E';
  }
  // Smooth isolated 1-2 residue blips
  for (let i = 1; i < n - 1; i++) {
    if (out[i] !== out[i - 1] && out[i - 1] === out[i + 1]) {
      out[i] = out[i - 1];
    }
  }
  return out.join('');
}

/**
 * Compute per-column conservation, consensus, Shannon entropy, and WebLogo letter stack
 */
export function analyzeMSAColumns(
  sequences: AlignedSequence[],
  secondaryStructure?: string
): ColumnStats[] {
  if (sequences.length === 0) return [];
  const width = sequences[0].sequence.length;
  const ssTrack =
    secondaryStructure && secondaryStructure.length >= width
      ? secondaryStructure
      : predictSecondaryStructure(sequences[0].sequence);

  const stats: ColumnStats[] = [];
  let refCounter = 0;
  const log2_20 = Math.log2(20); // ~4.3219 bits

  for (let col = 0; col < width; col++) {
    const counts = new Map<string, number>();
    let nonGap = 0;
    const refChar = sequences[0].sequence[col];
    const refPos = refChar && refChar !== '-' ? ++refCounter : null;

    for (const seq of sequences) {
      const ch = seq.sequence[col] || '-';
      if (ch !== '-' && ch !== '.') {
        nonGap++;
        counts.set(ch, (counts.get(ch) || 0) + 1);
      }
    }

    const gapFraction = 1 - nonGap / sequences.length;
    let bestAA = '-';
    let bestCount = 0;
    let entropy = 0;

    for (const [aa, c] of counts.entries()) {
      if (c > bestCount) {
        bestCount = c;
        bestAA = aa;
      }
      const p = c / Math.max(1, nonGap);
      if (p > 0) entropy -= p * Math.log2(p);
    }

    const conservation = nonGap > 0 ? bestCount / sequences.length : 0;
    // Scale information content by non-gap occupancy
    const rawBits = Math.max(0, log2_20 - entropy) * (1 - gapFraction);

    const letterStack = Array.from(counts.entries())
      .map(([aa, c]) => ({
        aa,
        freq: c / Math.max(1, nonGap),
        bits: (c / Math.max(1, nonGap)) * rawBits,
      }))
      .sort((a, b) => a.bits - b.bits); // bottom-to-top for logo stacking

    const ssChar = ssTrack[col];
    const ss: 'H' | 'E' | 'C' = ssChar === 'H' || ssChar === 'E' ? ssChar : 'C';

    stats.push({
      index: col,
      refPos,
      consensus: bestAA,
      conservation,
      informationBits: Math.round(rawBits * 100) / 100,
      gapFraction,
      letterStack,
      ss,
    });
  }

  return stats;
}

/**
 * Residue coloring rules across publication styles
 */
export function getResidueCellStyle(
  aa: string,
  colStat: ColumnStats,
  scheme: MSAColorScheme,
  isDark: boolean
): { bg: string; fg: string } {
  if (aa === '-' || aa === '.') {
    return { bg: 'transparent', fg: isDark ? '#475569' : '#94A3B8' };
  }

  const info = AMINO_ACIDS[aa];

  if (scheme === 'espript-red') {
    if (colStat.conservation >= 0.99) {
      return { bg: '#D92D20', fg: '#FFFFFF' };
    }
    if (colStat.conservation >= 0.7 && aa === colStat.consensus) {
      return { bg: isDark ? 'rgba(251, 191, 36, 0.22)' : '#FEF0C7', fg: isDark ? '#FDE68A' : '#B42318' };
    }
    return { bg: 'transparent', fg: isDark ? '#CBD5E1' : '#334155' };
  }

  if (scheme === 'conservation') {
    const c = colStat.conservation;
    if (c >= 0.95 && aa === colStat.consensus) return { bg: '#0A84FF', fg: '#FFFFFF' };
    if (c >= 0.75 && aa === colStat.consensus) return { bg: 'rgba(10, 132, 255, 0.42)', fg: isDark ? '#FFFFFF' : '#0B3D91' };
    if (c >= 0.55 && aa === colStat.consensus) return { bg: 'rgba(10, 132, 255, 0.16)', fg: isDark ? '#E2E8F0' : '#1E293B' };
    return { bg: 'transparent', fg: isDark ? '#94A3B8' : '#64748B' };
  }

  if (scheme === 'hydrophobicity') {
    const kd = info?.hydropathy ?? 0;
    if (kd >= 2.5) return { bg: isDark ? 'rgba(249, 115, 22, 0.34)' : '#FFEDD5', fg: isDark ? '#FDBA74' : '#9A3412' };
    if (kd >= 0.5) return { bg: isDark ? 'rgba(234, 179, 8, 0.24)' : '#FEF9C3', fg: isDark ? '#FDE047' : '#854D0E' };
    if (kd <= -3.0) return { bg: isDark ? 'rgba(14, 165, 233, 0.34)' : '#E0F2FE', fg: isDark ? '#7DD3FC' : '#075985' };
    return { bg: isDark ? 'rgba(148, 163, 184, 0.12)' : '#F1F5F9', fg: isDark ? '#CBD5E1' : '#334155' };
  }

  if (scheme === 'clustalx') {
    if (colStat.conservation < 0.45) {
      return { bg: 'transparent', fg: isDark ? '#94A3B8' : '#475569' };
    }
    const group = info?.group;
    switch (group) {
      case 'hydrophobic': return { bg: isDark ? 'rgba(59, 130, 246, 0.34)' : '#DBEAFE', fg: isDark ? '#93C5FD' : '#1E40AF' };
      case 'positive': return { bg: isDark ? 'rgba(239, 68, 68, 0.34)' : '#FEE2E2', fg: isDark ? '#FCA5A5' : '#991B1B' };
      case 'negative': return { bg: isDark ? 'rgba(192, 132, 252, 0.34)' : '#F3E8FF', fg: isDark ? '#E9D5FF' : '#6B21A8' };
      case 'polar': return { bg: isDark ? 'rgba(34, 197, 94, 0.30)' : '#DCFCE7', fg: isDark ? '#86EFAC' : '#166534' };
      case 'aromatic': return { bg: isDark ? 'rgba(20, 184, 166, 0.34)' : '#CCFBF1', fg: isDark ? '#5EEAD4' : '#115E59' };
      default: return { bg: isDark ? 'rgba(245, 158, 11, 0.32)' : '#FEF3C7', fg: isDark ? '#FCD34D' : '#92400E' };
    }
  }

  // Default: Apple Studio Modern (subtle chemistry tint with strong conserved anchor emphasis)
  const isHighlyConserved = colStat.conservation >= 0.85 && aa === colStat.consensus;
  const group = info?.group;
  const palette: Record<string, { solid: string; tintDark: string; tintLight: string; fgDark: string; fgLight: string }> = {
    hydrophobic: { solid: '#0A84FF', tintDark: 'rgba(10,132,255,0.20)', tintLight: '#E0F0FF', fgDark: '#93C5FD', fgLight: '#0055B3' },
    aromatic: { solid: '#5E5CE6', tintDark: 'rgba(94,92,230,0.24)', tintLight: '#ECEBFF', fgDark: '#C4B5FD', fgLight: '#4338CA' },
    positive: { solid: '#FF453A', tintDark: 'rgba(255,69,58,0.22)', tintLight: '#FFE5E3', fgDark: '#FCA5A5', fgLight: '#B91C1C' },
    negative: { solid: '#BF5AF2', tintDark: 'rgba(191,90,242,0.22)', tintLight: '#F7E8FF', fgDark: '#E9D5FF', fgLight: '#7E22CE' },
    polar: { solid: '#30D158', tintDark: 'rgba(48,209,88,0.20)', tintLight: '#E3FBE9', fgDark: '#86EFAC', fgLight: '#15803D' },
    special: { solid: '#FF9F0A', tintDark: 'rgba(255,159,10,0.24)', tintLight: '#FFF2DC', fgDark: '#FCD34D', fgLight: '#B45309' },
  };
  const entry = palette[group ?? 'special'];
  if (isHighlyConserved) {
    return { bg: entry.solid, fg: '#FFFFFF' };
  }
  if (colStat.conservation >= 0.5) {
    return {
      bg: isDark ? entry.tintDark : entry.tintLight,
      fg: isDark ? entry.fgDark : entry.fgLight,
    };
  }
  return { bg: 'transparent', fg: isDark ? '#94A3B8' : '#64748B' };
}

export function getLogoLetterColor(aa: string): string {
  const g = AMINO_ACIDS[aa]?.group;
  switch (g) {
    case 'hydrophobic': return '#0A84FF';
    case 'aromatic': return '#5E5CE6';
    case 'positive': return '#FF453A';
    case 'negative': return '#BF5AF2';
    case 'polar': return '#28CD41';
    default: return '#FF9F0A';
  }
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Export crisp publication-grade Vector SVG of the MSA with Secondary Structure cartoon,
 * Sequence Logo, Conservation Bars, and Mutation / Active-Site Callout Pins
 */
export function exportMSAPublicationSVG(params: {
  title: string;
  subtitle: string;
  sequences: AlignedSequence[];
  columns: ColumnStats[];
  pins: MSAMutationPin[];
  scheme: MSAColorScheme;
  showSS: boolean;
  showLogo: boolean;
  showConservation: boolean;
  wrapWidth?: number;
}): string {
  const {
    title,
    subtitle,
    sequences,
    columns,
    pins,
    scheme,
    showSS,
    showLogo,
    showConservation,
    wrapWidth = 55,
  } = params;

  const cellW = 16;
  const cellH = 20;
  const labelW = 148;
  const padX = 36;
  const totalCols = columns.length;
  const numBlocks = Math.max(1, Math.ceil(totalCols / wrapWidth));
  const pinMap = new Map<number, MSAMutationPin>();
  for (const p of pins) pinMap.set(p.column - 1, p);

  const ssH = showSS ? 26 : 0;
  const pinH = 26;
  const seqBlockH = sequences.length * cellH;
  const logoH = showLogo ? 52 : 0;
  const consH = showConservation ? 30 : 0;
  const blockHeight = pinH + ssH + 18 + seqBlockH + logoH + consH + 34;

  const svgW = padX * 2 + labelW + Math.min(wrapWidth, totalCols) * cellW + 44;
  const svgH = 96 + numBlocks * blockHeight + 36;

  const parts: string[] = [];
  parts.push(`<?xml version="1.0" encoding="UTF-8"?>`);
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}">`);
  parts.push(`<rect width="${svgW}" height="${svgH}" fill="#FFFFFF" />`);

  // Header
  parts.push(`<text x="${padX}" y="38" font-family="-apple-system, BlinkMacSystemFont, Inter, sans-serif" font-size="20" font-weight="700" fill="#0F172A" letter-spacing="-0.3">${escapeXml(title)}</text>`);
  parts.push(`<text x="${padX}" y="58" font-family="-apple-system, BlinkMacSystemFont, Inter, sans-serif" font-size="12" fill="#64748B">${escapeXml(subtitle)}  •  ${sequences.length} sequences × ${totalCols} columns  •  AlphaPanda MSA Publisher</text>`);
  parts.push(`<line x1="${padX}" y1="74" x2="${svgW - padX}" y2="74" stroke="#E2E8F0" stroke-width="1" />`);

  for (let b = 0; b < numBlocks; b++) {
    const startCol = b * wrapWidth;
    const endCol = Math.min(totalCols, startCol + wrapWidth);
    const baseY = 92 + b * blockHeight;
    let curY = baseY;

    // 1. Mutation / Active Site Pins
    for (let c = startCol; c < endCol; c++) {
      const pin = pinMap.get(c);
      if (!pin) continue;
      const x = padX + labelW + (c - startCol) * cellW + cellW / 2;
      const fill =
        pin.category === 'active-site'
          ? '#D92D20'
          : pin.category === 'mutation'
            ? '#7C3AED'
            : '#0071E3';
      parts.push(`<rect x="${x - 22}" y="${curY}" width="44" height="16" rx="8" fill="${fill}" />`);
      parts.push(`<text x="${x}" y="${curY + 11.5}" text-anchor="middle" font-family="-apple-system, Inter, sans-serif" font-size="9" font-weight="700" fill="#FFFFFF">${escapeXml(pin.label)}</text>`);
      parts.push(`<path d="M${x - 3.5} ${curY + 16} L${x + 3.5} ${curY + 16} L${x} ${curY + 21} Z" fill="${fill}" />`);
    }
    curY += pinH;

    // 2. Secondary Structure Ribbon Track
    if (showSS) {
      parts.push(`<text x="${padX}" y="${curY + 15}" font-family="-apple-system, Inter, sans-serif" font-size="10" font-weight="600" fill="#64748B">Sec. Struct.</text>`);
      let c = startCol;
      while (c < endCol) {
        const ss = columns[c].ss;
        let runEnd = c;
        while (runEnd + 1 < endCol && columns[runEnd + 1].ss === ss) runEnd++;
        const x1 = padX + labelW + (c - startCol) * cellW;
        const w = (runEnd - c + 1) * cellW;
        const midY = curY + 12;
        if (ss === 'H') {
          // Crisp sinusoidal alpha-helix ribbon
          const loops = Math.max(2, Math.round(w / 10));
          const step = w / loops;
          let d = `M ${x1} ${midY}`;
          for (let k = 0; k < loops; k++) {
            const sx = x1 + k * step;
            d += ` Q ${sx + step * 0.25} ${midY - 8}, ${sx + step * 0.5} ${midY} Q ${sx + step * 0.75} ${midY + 8}, ${sx + step} ${midY}`;
          }
          parts.push(`<path d="${d}" fill="none" stroke="#E11D48" stroke-width="2.4" stroke-linecap="round" />`);
        } else if (ss === 'E') {
          // Crisp beta-strand arrow
          const arrowHead = Math.min(8, w * 0.35);
          const bodyEnd = x1 + w - arrowHead;
          parts.push(
            `<path d="M${x1} ${midY - 4} L${bodyEnd} ${midY - 4} L${bodyEnd} ${midY - 7.5} L${x1 + w} ${midY} L${bodyEnd} ${midY + 7.5} L${bodyEnd} ${midY + 4} L${x1} ${midY + 4} Z" fill="#0071E3" />`
          );
        } else {
          parts.push(`<line x1="${x1}" y1="${midY}" x2="${x1 + w}" y2="${midY}" stroke="#94A3B8" stroke-width="1.5" />`);
        }
        c = runEnd + 1;
      }
      curY += ssH;
    }

    // 3. Column Ruler
    for (let c = startCol; c < endCol; c++) {
      if ((c + 1) % 10 === 0 || c === startCol) {
        const x = padX + labelW + (c - startCol) * cellW + cellW / 2;
        parts.push(`<text x="${x}" y="${curY + 11}" text-anchor="middle" font-family="ui-monospace, monospace" font-size="9" fill="#94A3B8">${c + 1}</text>`);
      }
    }
    curY += 18;

    // 4. Aligned Sequence Rows
    for (let r = 0; r < sequences.length; r++) {
      const seq = sequences[r];
      const ry = curY + r * cellH;
      parts.push(`<text x="${padX}" y="${ry + 14}" font-family="-apple-system, Inter, sans-serif" font-size="11" font-weight="${r === 0 ? '700' : '500'}" fill="${r === 0 ? '#0F172A' : '#334155'}">${escapeXml(seq.label.slice(0, 20))}</text>`);

      for (let c = startCol; c < endCol; c++) {
        const aa = seq.sequence[c] || '-';
        const x = padX + labelW + (c - startCol) * cellW;
        const { bg, fg } = getResidueCellStyle(aa, columns[c], scheme, false);
        if (bg !== 'transparent') {
          parts.push(`<rect x="${x + 0.5}" y="${ry + 1}" width="${cellW - 1}" height="${cellH - 2}" rx="3" fill="${bg}" />`);
        }
        if (pinMap.has(c)) {
          parts.push(`<rect x="${x + 0.5}" y="${ry + 1}" width="${cellW - 1}" height="${cellH - 2}" rx="3" fill="none" stroke="#7C3AED" stroke-width="0.9" stroke-opacity="0.45" />`);
        }
        parts.push(`<text x="${x + cellW / 2}" y="${ry + 14.5}" text-anchor="middle" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="11.5" font-weight="600" fill="${fg}">${escapeXml(aa)}</text>`);
      }
    }
    curY += seqBlockH + 6;

    // 5. WebLogo Stacked Sequence Logo Track
    if (showLogo) {
      parts.push(`<text x="${padX}" y="${curY + 26}" font-family="-apple-system, Inter, sans-serif" font-size="10" font-weight="600" fill="#64748B">Seq. Logo</text>`);
      const maxH = 40;
      const baseLine = curY + maxH + 4;
      for (let c = startCol; c < endCol; c++) {
        const col = columns[c];
        const x = padX + labelW + (c - startCol) * cellW + cellW / 2;
        let stackY = baseLine;
        for (const item of col.letterStack) {
          const h = (item.bits / 4.322) * maxH;
          if (h < 2.2) continue;
          const scaleY = h / 11;
          parts.push(
            `<text x="${x}" y="${stackY.toFixed(1)}" text-anchor="middle" font-family="-apple-system, Inter, sans-serif" font-size="14" font-weight="800" fill="${getLogoLetterColor(item.aa)}" transform="translate(${x}, ${stackY.toFixed(1)}) scale(0.95, ${scaleY.toFixed(2)}) translate(${-x}, ${(-stackY).toFixed(1)})">${escapeXml(item.aa)}</text>`
          );
          stackY -= h;
        }
      }
      parts.push(`<line x1="${padX + labelW}" y1="${baseLine}" x2="${padX + labelW + (endCol - startCol) * cellW}" y2="${baseLine}" stroke="#E2E8F0" stroke-width="1" />`);
      curY += logoH;
    }

    // 6. Conservation Bar Track
    if (showConservation) {
      parts.push(`<text x="${padX}" y="${curY + 18}" font-family="-apple-system, Inter, sans-serif" font-size="10" font-weight="600" fill="#64748B">Conservation</text>`);
      for (let c = startCol; c < endCol; c++) {
        const cons = columns[c].conservation;
        const barH = Math.max(2, cons * 20);
        const x = padX + labelW + (c - startCol) * cellW + 2.5;
        const barColor = cons >= 0.9 ? '#0071E3' : cons >= 0.65 ? '#5AC8FA' : '#CBD5E1';
        parts.push(`<rect x="${x}" y="${curY + 22 - barH}" width="${cellW - 5}" height="${barH}" rx="2" fill="${barColor}" />`);
      }
    }
  }

  parts.push(`</svg>`);
  return parts.join('\n');
}

// ============================================================================
// Curated Biological Demo Alignments
// ============================================================================
export const DEMO_MSA_DATASETS: MSADataset[] = [
  {
    id: 'lrp4-propeller',
    title: 'LRP4 / LRP5 / LRP6 YWTD β-Propeller Blades (E3 Ectodomain)',
    subtitle: 'Human LRP4, LRP5, LRP6, LDLR · Conserved YWTD β-Propeller Repeats & Sclerosteosis-2 / Cenani-Lenz Hotspots',
    rawText: `>LRP4_HUMAN   Low-density lipoprotein receptor-related protein 4 (E3)
VDVAFDPTTRRIYWTDVNVGSIGRANGTGSGVVVRGLDSPRGLAVDWVAGNL-YWTDAGVGRIEVANLDGTRRKVLFWQDLDQPRAIALDPAHGYMYWTDWGETPRIERAGMDGSTRKIIVDSDIYWPNGLTIDLEEQKLYWADAKLSFIHRANLDGSFRQKVVEGSLTHPFALTLSGDTLYWTDWQTRSIHACNKRTGGKRKEILSALYSPMDIQVLSQERQ
>LRP5_HUMAN   Low-density lipoprotein receptor-related protein 5 (E3)
VDLVFDPEARRVYWTDVKTGTIGRANMNGSNVEVVGLEDPRGLALDWVNGKL-YWTDTGSNRIEVSNLDGSLRKVLFWQELDQPRAIALDPSSGFMYWTDWGEVPKIERAGMDGSSRFIIINSEIYWPNGLTLDYEEQKLYWADAKLNFIHKSNLDGTNRQAVVKGSLPHPFALTLFEDILYWTDWSTHSILACNKYTGEGLREIHSDIFSPMDIHAFSQQRQ
>LRP6_HUMAN   Low-density lipoprotein receptor-related protein 6 (E3)
VDLVFDPETRRIYWTDVKTGTIGRANGTGSNVEIVGLEDPRGLALDWVNGKL-YWTDTGNNRIEVSNLDGSMRKVLFWQELDQPRAIALDPSSGFMYWTDWGEVPKIERAGMDGSSRFVIINTEIYWPNGLTLDYQERKLYWADAKLNFIHKSNLDGTNRQAVVKGSLPHPFALTLFEDILYWTDWSTHSILACNKYTGEGLREIHSDIFSPMDIHAFSQQRQ
>LRP4_MOUSE   Murine LRP4 β-Propeller 3
VDVAFDPTTRRIYWTDVNVGSIGRANGTGSGVVVRGLDSPRGLAVDWVAGNL-YWTDAGVGRIEVANLDGTRRKVLFWQDLDQPRAIALDPAHGYMYWTDWGETPRIERAGMDGSTRKIIVDSDIYWPNGLTIDLEEQKLYWADAKLSFIHRANLDGSFRQKVVEGSLTHPFALTLSGDTLYWTDWQTRSIHACNKRTGGKRKEILSALYSPMDIQVLSQERQ
>LDLR_HUMAN   Low-density lipoprotein receptor β-Propeller
VDIYSQ--VRRIYWSDVKTQRIAKMDKTGTSVVLNRLDVPRGIALDWIARNI-YWTDLGTNKVSVANLDGSLRKVLFWQDIDSPRAIAVDPLRGFMYWTDWGPAKIKKGGINGVDIHSLVTENIQWPNGITLDLSGRRLYWVDSKLHSISSIDVNGGNRKTILEDEKRLAHPFSLAVFEDKVFWTDIINEAIFSANRLTGSDVNLLAENLLSPEDMVLFHNLTQ`,
    sequences: [],
    secondaryStructure:
      'CEEEECCCCEEEEEECCCCEEEEEEECCCCCEEEEECCCCCEEEEEECCCCCEEEEECCCCEEEEEECCCCEEEEEECCCCCEEEEEECCCCEEEEEECCCCEEEEECCCCCEEEEECCCCCEEEEEECCCCEEEEEECCCCEEEEEECCCCEEEEECCCCCEEEEEECCCCEEEEEECCCCEEEEEEECCCCCEEEEECCCCCEEEEEECCCC',
    pins: [
      { id: 'lrp1', column: 13, label: 'YWTD-1', category: 'motif', note: 'Blade 1 structural YWTD β-propeller signature' },
      { id: 'lrp2', column: 55, label: 'YWTD-2', category: 'motif', note: 'Blade 2 conserved YWTD packing anchor' },
      { id: 'lrp3', column: 109, label: 'R1170W', category: 'mutation', note: 'Sclerosteosis-2 pathogenic mutation — disrupts SOST/DKK1 binding cleft' },
      { id: 'lrp4', column: 125, label: 'W1186S', category: 'mutation', note: 'Sclerosteosis-2 hydrophobic core collapse mutation' },
      { id: 'lrp5', column: 179, label: 'E1233K', category: 'active-site', note: 'Agrin/SOST electrostatic docking hotspot on central funnel' },
    ],
    motifRegex: 'YW[TSVA]D|YWPN',
  },
  {
    id: 'kinase-catalytic',
    title: 'Human Protein Kinase Catalytic Domain (HRD · DFG Motifs)',
    subtitle: 'EGFR, BRAF, ABL1, SRC, CDK2, MAPK1 · Oncogenic Hotspot & Active-Site Conservation',
    rawText: `>EGFR_HUMAN   Epidermal growth factor receptor
GSLGEGAFGTVYKGLWIPEGEKVKIPVAIKELREATSPKANKEILDEAYVMASVDNPHVCRLLGICLTSTVQLITQLMPFGCLLDYVREHKDNIGSQYLLNWCVQIAKGMNYLEDRRLVHRDLAARNVLVKTPQHVKITDFGLAKLLGAEEKEYHAEGGKVPIKWMALESILHRIYTHQSDVWSYGVTVWELMTFGSKPYDGIP
>BRAF_HUMAN   Serine/threonine-protein kinase B-raf
GQIGSGSFGTVYKGKWHG---DVAVKMLNVTAPTPQQLQAFKNEVGVLRKTR---HVNILLFMGYSTKP-QLAIVTQWCEGSSLYHHLHIIETKFEMIKLIDIARQTAQGMDYLHAKSIIHRDLKSNNIFLHEDLTVKIGDFGLATVKSRWSGSHQFEQLSGSILWMAPEVIRMQDKNPYSFQSDVYAFGIVLYELMTGQLPYSNIN
>ABL1_HUMAN   Tyrosine-protein kinase ABL1
HKLGGGQYGEVYEGVWKK--YSLTVAVKTLKEDTMEVEEFLKEAAVMKEIK----HPNLVQLLGVCTREPPFYIITEFMTYGNLLDYLRECNRQEVNAVVLLYMATQISSAMEYLEKKNFIHRDLAARNCLVGENHLVKVADFGLSRLMTGDTYTAHAGAKFPIKWTAPESLAYNKFSIKSDVWAFGVLLWEIATYGMSPYPGID
>SRC_HUMAN    Proto-oncogene tyrosine-protein kinase Src
RKLGQGCFGEVWMGTWNG--TTRVAIKTLKPGTMSPEAFLQEAQVMKKLR-----HEKLVQLYAVVSEE-PIYIVTEYMSKGSLLDFLKGETGKYLRLPQLVDMAAQIASGMAYVERMNYVHRDLRAANILVGENLVCKVADFGLARLIEDNEYTARQGAKFPIKWTAPEAALYGRFTIKSDVWSFGILLTELTTKGRVPYPGMV
>CDK2_HUMAN   Cyclin-dependent kinase 2
EKIGEGTYGVVYKARNK---LTGEVVALKKIRLDTETEGVPSTAIREISLLKELNHPNIVKLLDVIHTE-NKLYLVFEFLHQDLKKFMDASALTGIPLPLIKSYLFQLLQGLAFCHSHRVLHRDLKPQNLLINTEGAIKLADFGLARAFGVPVRTYTHEVVT----LWYRAPEILLGCKYYSTAVDIWSLGCIFAEMVTRRALFPGDS
>MAPK1_HUMAN  Mitogen-activated protein kinase 1
SYIGEGAYGMVCSAYDNV--NKVRVAIKKISPFEHQTYCQRTLREIKILLRFR--HENIIGINDIIRAPTIEQMKDVYIVQDLMETDLYKLLKTQHLSNDHICYFLYQILRGLKYIHSANVLHRDLKPSNLLLNTTCDLKICDFGLARVADPDHDHTGFLTEYVATRWYRAPEIMLNSKGYTKSIDIWSVGCILAEMLSNRPIFPGKH`,
    sequences: [],
    secondaryStructure:
      'CEEEECCEEEEEEECCCCCEEEEEEEEEEECHHHHHHHHHHHHHHHHHHHCCCCCEEEEEECCCCCCEEEEEECCCHHHHHHHHHCCCCCHHHHHHHHHHHHHHHCCCEEEECCCCCEEEECCCCCEEEECCCCCCCCCCCCCCHHHHHHHHCCCCCCCCCCCHHHHHHHHHHCCCCCHHHHHHHHHHHHHHHHHCCCC',
    pins: [
      { id: 'p1', column: 28, label: 'K745', category: 'active-site', note: 'Catalytic Lys (VAIK motif) — ATP α/β-phosphate anchor' },
      { id: 'p2', column: 74, label: 'T790M', category: 'mutation', note: 'Gatekeeper mutation — Osimertinib / Gefitinib resistance' },
      { id: 'p3', column: 123, label: 'HRD', category: 'active-site', note: 'Catalytic loop Asp (HRD motif) — proton acceptor' },
      { id: 'p4', column: 145, label: 'DFG', category: 'motif', note: 'Mg²⁺-coordinating DFG activation segment' },
      { id: 'p5', column: 150, label: 'L858R', category: 'mutation', note: 'Oncogenic activating mutation (BRAF V600E locus)' },
    ],
    motifRegex: 'HRD|DFG',
  },
  {
    id: 'serine-protease',
    title: 'Chymotrypsin-Family Serine Protease Catalytic Triad',
    subtitle: 'Trypsin, Chymotrypsin, Thrombin, Neutrophil Elastase, Factor Xa · His57 / Asp102 / Ser195',
    rawText: `>TRY1_HUMAN   Cationic Trypsinogen
IVGGYNCEENSVPYQVSLNSGYHFCGGSLINEQWVVSAGHCYKSRIQVRLGEHNIEVLEGNEQFINAAKIIRHPQYDRKTLNNDIMLIKLSSRAVINARVSTISLPTAPPATGTKCLISGWGNTASSGADYPDELQCLDAPVLSQAKCEASYPGKITSNMFCVGFLEGGKDSCQGDSGGPVVCNGQLQGVVSWGDGCAQKNKPGVYTKVYNYVKWIKNTIAANS
>CTRA_BOVIN   Chymotrypsinogen A
IVNGEEAVPGSWPWQVSLQDKTGFHFCGGSLINENWVVTAAHCGVTTSDVVVAGEFDQGSSSEKIQKLKIAKVFKNSKYNSLTINNDITLLKLSTAASFSQTVSAVCLPSASDDFAAGTTCVTTGWGLTRYTNANTPDRLQQASLPLLSNTNCKKYWGTKIKDAMICAGASGVSSCMGDSGGPLVCKKNGAWTLVGIVSWGSSTCSTSTPGVYARVTALVNWVQQTLAAN
>THRB_HUMAN   Prothrombin (Thrombin)
IVEGSDAEIGMSPWQVMLFRKSPQELLCGASLISDRWVLTAAHCLLYPPWDKNFTENDLLVRIGKHSRTRYERNIEKISMLEKIYIHPRYNWRENLDRDIALMKLKKPVAFSDYIHPVCLPDRETAASLLQAGYKGRVTGWGNLKETWTANVGKGQPSVLQVVNLPIVERPVCKDSTRIRITDNMFCAGYKPDEGKRGDACEGDSGGPFVMKSPFNNRWYQMGIVSWGEGCDRDGKYGFYTHVFRLKKWIQKVIDQFGE
>ELNE_HUMAN   Neutrophil Elastase
IVGGRRARPHAWPFMVSLQLRGGHFCGATLIAPNFVMSAAHCVANVNVRAVRVVLGAHNLSRREPTRQVFAVQRIFENGYDPVNLLNDIVILQLNGSATINANVQVAQLPAQGRRLGNGVQCLAMGWGLLGRNRGIASVLQELNVTVVTSLCRRSNVCTLVRGRQAGVCFGDSGSPLVCNGLIHGIASFVRGGCASGLYPDAFAPVAQFVNWIDSIIQRSEDNPCPH
>FA10_HUMAN   Coagulation Factor Xa
IVGGQECKDGECPWQALLINEENEGFCGGTILSEFYILTAAHCLYQAKRFKVRVGDRNTEQEEGGEAVHEVEVVIKHNRFTKETYDFDIAVLRLKTPITFRMNVAPACLPERDWAESTLMTQKTGIVSGFGRTHEKGRQSTRLKMLEVPYVDRNSCKLSSSFIITQNMFCAGYDTKQEDACQGDSGGPHVTRFKDTYFVTGIVSWGEGCARKGKYGIYTKVTAFLKWIDRSMKTRGLPKAKSHAPEVITSSPLK`,
    sequences: [],
    secondaryStructure: '',
    pins: [
      { id: 'sp1', column: 41, label: 'His57', category: 'active-site', note: 'Catalytic triad general base Histidine' },
      { id: 'sp2', column: 86, label: 'Asp102', category: 'active-site', note: 'Catalytic triad electrostatic stabilizer Aspartate' },
      { id: 'sp3', column: 180, label: 'GDSGG', category: 'active-site', note: 'Catalytic Ser195 nucleophile & oxyanion hole' },
    ],
    motifRegex: 'GDSGG|TAAHC',
  },
  {
    id: 'sarbeco-rbd',
    title: 'Sarbecovirus Spike Receptor-Binding Domain (RBD)',
    subtitle: 'SARS-CoV-2 Wuhan / Omicron BA.1 / SARS-CoV-1 / RaTG13 · ACE2 Interface & Escape Sites',
    rawText: `>SARS2_WT     SARS-CoV-2 Wuhan-Hu-1
NITNLCPFGEVFNATRFASVYAWNRKRISNCVADYSVLYNSASFSTFKCYGVSPTKLNDLCFTNVYADSFVIRGDEVRQIAPGQTGKIADYNYKLPDDFTGCVIAWNSNNLDSKVGGNYNYLYRLFRKSNLKPFERDISTEIYQAGSTPCNGVEGFNCYFPLQSYGFQPTNGVGYQPYRVVVLSFELLHAPATVCGPKKSTNLVKNKCVNF
>SARS2_OMIC   SARS-CoV-2 Omicron BA.1
NITNLCPFDEVFNATRFASVYAWNRKRISNCVADYSVLYNLAPFFTFKCYGVSPTKLNDLCFTNVYADSFVIRGDEVRQIAPGQTGNIADYNYKLPDDFTGCVIAWNSNKLDSKVSGNYNYLYRLFRKSNLKPFERDISTEIYQAGNKPCNGVAGFNCYFPLRSYSFRPTYGVGHQPYRVVVLSFELLHAPATVCGPKKSTNLVKNKCVNF
>RATG13_BAT   Bat CoV RaTG13
NITNLCPFGEVFNATTFASVYAWNRKRISNCVADYSVLYNSTSFSTFKCYGVSPTKLNDLCFTNVYADSFVITGDEVRQIAPGQTGKIADYNYKLPDDFTGCVIAWNSKHIDAKEGGNFNYLYRLFRKANLKPFERDISTEIYQAGSKPCNGQTGLNCYYPLYRYGFYPTDGVGHQPYRVVVLSFELLNAPATVCGPKKSTNLVKNKCVNF
>SARS1_TOR2   SARS-CoV-1 Tor2
NITNLCPFGEVFNATKFPSVYAWERKKISNCVADYSVLYNSTFFSTFKCYGVSATKLNDLCFSNVYADSFVVKGDDVRQIAPGQTGVIADYNYKLPDDFMGCVLAWNTRNIDATSTGNYNYKYRYLRHGKLRPFERDISNVPFSPDGKPCTPP-ALNCYWPLNDYGFYTTTGIGYQPYRVVVLSFELLNAPATVCGPKLSTDLIKNQCVNF`,
    sequences: [],
    secondaryStructure: '',
    pins: [
      { id: 'r1', column: 87, label: 'K417N', category: 'mutation', note: 'Class-1 antibody escape mutation (salt bridge with ACE2 D30)' },
      { id: 'r2', column: 154, label: 'E484A', category: 'mutation', note: 'Major neutralizing antibody escape hotspot' },
      { id: 'r3', column: 171, label: 'N501Y', category: 'mutation', note: 'Enhanced ACE2 binding affinity via π-stacking with Y41' },
    ],
    motifRegex: 'GCVIA|YNYKL',
  },
];

// Hydrate sequences for demos once
for (const demo of DEMO_MSA_DATASETS) {
  demo.sequences = parseMSA(demo.rawText);
  if (!demo.secondaryStructure && demo.sequences.length > 0) {
    demo.secondaryStructure = predictSecondaryStructure(demo.sequences[0].sequence);
  }
}
