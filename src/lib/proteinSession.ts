import { predictSecondaryStructure, type MSAMutationPin } from './msaParser';
import type { ParsedResidue, StructureDataset } from './structureParser';
import { CURATED_PROTEIN_PRESETS, TRIAGE_PRESET_QUERIES, type ProteinProfile } from './variantTriage';

export interface ActiveProteinSession {
  sessionKey: string;
  name: string;
  source: 'preset' | 'live-fetch' | 'upload';
  uniprotId?: string;
  geneName?: string;
  pdbId?: string;
  rawStructureText: string;
  format: 'pdb' | 'cif';
  primaryChainId: string;
  residues: ParsedResidue[];
  sequence: string;
  secondaryStructure: string;
  hotspotMutations: string[];
  hotspotPins: MSAMutationPin[];
  matchedMsaPresetId?: string;
}

const PRESET_TO_MSA: Record<string, string> = {
  'lrp4-agrin-complex': 'lrp4-propeller',
};

/**
 * Extract a portable ActiveProteinSession from any StructureDataset loaded in the Explorer
 * (whether a static globular preset, a live RCSB PDB / AlphaFold DB fetch, or a custom .cif/.pdb upload).
 */
export function buildSessionFromDataset(
  dataset: StructureDataset,
  source: ActiveProteinSession['source']
): ActiveProteinSession {
  const primaryChain = dataset.chains[0]?.id ?? 'A';
  const primaryResidues = dataset.residues.filter((r) => r.chain === primaryChain);
  const sequence = primaryResidues.map((r) => (r.aa === 'X' ? 'A' : r.aa)).join('');

  // Use real secondary structure from PDB HELIX/SHEET if present; otherwise Chou-Fasman prediction
  const hasParsedSS = primaryResidues.some((r) => r.ss === 'H' || r.ss === 'E');
  const secondaryStructure = hasParsedSS
    ? primaryResidues.map((r) => r.ss).join('')
    : predictSecondaryStructure(sequence);

  // Rank top 5 hotspot residues on the primary chain for automatic mutation triage & MSA pinning
  const degreeMap = new Map<number, { res: ParsedResidue; count: number; paeSum: number }>();
  for (const c of dataset.contacts) {
    if (c.distance > 8.0) continue;
    const candidates = [c.resA, c.resB].filter((r) => r.chain === primaryChain);
    for (const res of candidates) {
      const cur = degreeMap.get(res.resSeq);
      if (!cur) degreeMap.set(res.resSeq, { res, count: 1, paeSum: c.meanPae });
      else {
        cur.count += 1;
        cur.paeSum += c.meanPae;
      }
    }
  }

  const rankedHotspots = Array.from(degreeMap.values())
    .sort((a, b) => {
      const sa = a.count * (a.res.plddt / 100) / Math.max(0.5, a.paeSum / a.count);
      const sb = b.count * (b.res.plddt / 100) / Math.max(0.5, b.paeSum / b.count);
      return sb - sa;
    })
    .slice(0, 5);

  const hotspotPins: MSAMutationPin[] = rankedHotspots.map((h, i) => {
    const colIdx = primaryResidues.findIndex((r) => r.resSeq === h.res.resSeq);
    return {
      id: `hs-${i}-${h.res.resSeq}`,
      column: Math.max(1, colIdx + 1),
      label: `${h.res.aa}${h.res.resSeq}`,
      category: i < 2 ? 'active-site' : 'mutation',
      note: `Carried forward from 3D Explorer · ${h.count} contacts, pLDDT ${h.res.plddt.toFixed(1)}`,
    };
  });

  // Suggest clinical preset mutations if UniProt matches a known clinical preset; else alanine-scanning hotspots
  const presetQuery = dataset.uniprotId
    ? TRIAGE_PRESET_QUERIES.find((q) => q.uniprotId === dataset.uniprotId)
    : undefined;

  let hotspotMutations: string[] = [];
  if (presetQuery) {
    hotspotMutations = presetQuery.mutations.split(/[\s,]+/).filter(Boolean);
  } else if (rankedHotspots.length > 0) {
    hotspotMutations = rankedHotspots.slice(0, 4).map((h) => {
      const mutAA = h.res.aa === 'A' ? 'G' : 'A';
      return `${h.res.aa}${h.res.resSeq}${mutAA}`;
    });
  } else if (primaryResidues.length > 10) {
    // Fallback: pick 3 well-ordered core positions
    const picks = [
      primaryResidues[Math.floor(primaryResidues.length * 0.25)],
      primaryResidues[Math.floor(primaryResidues.length * 0.5)],
      primaryResidues[Math.floor(primaryResidues.length * 0.75)],
    ].filter(Boolean);
    hotspotMutations = picks.map((r) => `${r.aa}${r.resSeq}${r.aa === 'A' ? 'G' : 'A'}`);
  }

  return {
    sessionKey: `${dataset.id}:${dataset.uniprotId || ''}:${primaryResidues.length}`,
    name: dataset.name,
    source,
    uniprotId: dataset.uniprotId,
    geneName: dataset.geneName,
    pdbId: dataset.pdbId,
    rawStructureText: dataset.rawStructureText,
    format: dataset.format,
    primaryChainId: primaryChain,
    residues: primaryResidues,
    sequence,
    secondaryStructure,
    hotspotMutations,
    hotspotPins,
    matchedMsaPresetId: PRESET_TO_MSA[dataset.id],
  };
}

/**
 * Align a homologous ortholog sequence cleanly onto a reference domain window using a fast k-mer anchor.
 */
function extractAlignedWindow(refSeq: string, targetSeq: string): string | null {
  const L = refSeq.length;
  if (L === 0 || targetSeq.length < Math.min(20, L * 0.5)) return null;

  // Vote on best offset using 5-mer matches across the reference sequence
  const k = 5;
  const targetIndex = new Map<string, number[]>();
  for (let i = 0; i <= targetSeq.length - k; i++) {
    const kmer = targetSeq.slice(i, i + k);
    const arr = targetIndex.get(kmer);
    if (arr) {
      if (arr.length < 4) arr.push(i);
    } else {
      targetIndex.set(kmer, [i]);
    }
  }

  const offsetVotes = new Map<number, number>();
  for (let i = 0; i <= L - k; i += 2) {
    const kmer = refSeq.slice(i, i + k);
    const hits = targetIndex.get(kmer);
    if (!hits) continue;
    for (const pos of hits) {
      const offset = pos - i;
      offsetVotes.set(offset, (offsetVotes.get(offset) || 0) + 1);
    }
  }

  let bestOffset = 0;
  let bestVotes = 0;
  for (const [off, votes] of offsetVotes.entries()) {
    if (votes > bestVotes) {
      bestVotes = votes;
      bestOffset = off;
    }
  }

  // Require at least 2 k-mer anchor hits (or direct start alignment for very short peptides)
  if (bestVotes < 2 && L > 25) return null;

  const out: string[] = [];
  let matches = 0;
  for (let i = 0; i < L; i++) {
    const idx = i + bestOffset;
    if (idx >= 0 && idx < targetSeq.length) {
      const ch = targetSeq[idx];
      out.push(ch);
      if (ch === refSeq[i]) matches++;
    } else {
      out.push('-');
    }
  }

  // Filter out unrelated paralogs (<25% identity)
  if (matches / L < 0.25) return null;
  return out.join('');
}

export interface CarryForwardMSAResult {
  title: string;
  subtitle: string;
  rawFasta: string;
  secondaryStructure: string;
  pins: MSAMutationPin[];
  orthologCount: number;
}

/**
 * Build an instant carry-forward MSA for any protein fetched/loaded in the Explorer!
 * Automatically fetches live reviewed orthologs from UniProtKB when a UniProt/gene ID is known,
 * anchored to the exact 3D domain window with real 3D secondary structure & hotspot pins.
 */
export async function buildCarryForwardMSA(
  session: ActiveProteinSession
): Promise<CarryForwardMSAResult> {
  // Trim very long (>260 aa) single-chain AlphaFold models to the highest-confidence / hotspot-centered 220 aa window for crisp MSA publishing
  let startSlice = 0;
  let endSlice = session.sequence.length;
  if (session.sequence.length > 260) {
    const firstPinCol = session.hotspotPins[0]?.column ?? 60;
    startSlice = Math.max(0, Math.min(session.sequence.length - 220, firstPinCol - 70));
    endSlice = startSlice + 220;
  }

  const refSeq = session.sequence.slice(startSlice, endSlice);
  const refSS = session.secondaryStructure.slice(startSlice, endSlice);
  const shiftedPins = session.hotspotPins
    .map((p) => ({ ...p, column: p.column - startSlice }))
    .filter((p) => p.column >= 1 && p.column <= refSeq.length);

  const refHeader = `${session.geneName || session.uniprotId || session.name.replace(/\s+/g, '_').slice(0, 14)}_3D`;
  const fastaEntries: Array<{ id: string; desc: string; seq: string }> = [
    {
      id: refHeader,
      desc: `${session.name} (Chain ${session.primaryChainId}, 3D structure)`,
      seq: refSeq,
    },
  ];

  // Try fetching real reviewed orthologs via UniProtKB CORS API
  let geneQuery = session.geneName;
  if (!geneQuery && session.uniprotId) {
    try {
      const upRes = await fetch(
        `https://rest.uniprot.org/uniprotkb/${encodeURIComponent(session.uniprotId)}.json`
      );
      if (upRes.ok) {
        const d = await upRes.json();
        geneQuery = d.genes?.[0]?.geneName?.value;
      }
    } catch {
      // Optional enrichment
    }
  }

  if (geneQuery) {
    try {
      const url = `https://rest.uniprot.org/uniprotkb/search?query=gene_exact:${encodeURIComponent(
        geneQuery
      )}+AND+reviewed:true&size=8&format=json&fields=accession,id,organism_name,sequence`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const seenIds = new Set<string>([refHeader]);
        for (const item of data.results || []) {
          const entryId: string = item.uniProtkbId || item.primaryAccession;
          const seqVal: string = item.sequence?.value || '';
          if (!seqVal || seenIds.has(entryId)) continue;
          const aligned = extractAlignedWindow(refSeq, seqVal);
          if (aligned && aligned !== refSeq) {
            seenIds.add(entryId);
            fastaEntries.push({
              id: entryId,
              desc: item.organism?.scientificName || 'UniProtKB reviewed ortholog',
              seq: aligned,
            });
          } else if (aligned === refSeq && fastaEntries.length === 1 && item.primaryAccession !== session.uniprotId) {
            seenIds.add(entryId);
            fastaEntries.push({
              id: entryId,
              desc: item.organism?.scientificName || 'UniProtKB reviewed ortholog',
              seq: aligned,
            });
          }
          if (fastaEntries.length >= 6) break;
        }
      }
    } catch {
      // Offline or rate-limited: still returns clean 3D structure sequence + SS track
    }
  }

  const rawFasta = fastaEntries.map((e) => `>${e.id} ${e.desc}\n${e.seq}`).join('\n');
  const orthologCount = fastaEntries.length - 1;

  return {
    title: `${session.name} — Carried-Forward Domain Alignment`,
    subtitle:
      orthologCount > 0
        ? `Synced from Explorer (${session.uniprotId || session.pdbId || '3D Structure'}) · ${orthologCount} live UniProt ortholog(s) + 3D secondary structure`
        : `Synced from Explorer (${session.uniprotId || session.pdbId || 'Uploaded 3D Structure'}) · Real 3D secondary structure & hotspot pins`,
    rawFasta,
    secondaryStructure: refSS,
    pins: shiftedPins,
    orthologCount,
  };
}

/**
 * Create a local ProteinProfile directly from an uploaded/fetched 3D structure when no UniProt ID exists
 * (or merge the already-loaded 3D structure into a UniProt profile so Variant Triage never re-downloads!).
 */
export function buildProfileFromSession(session: ActiveProteinSession): ProteinProfile {
  const existingPreset = session.uniprotId ? CURATED_PROTEIN_PRESETS[session.uniprotId] : undefined;
  if (existingPreset) {
    return {
      ...existingPreset,
      rawPdbText: session.format === 'pdb' ? session.rawStructureText : existingPreset.rawPdbText,
      residues3D: session.residues.length > 0 ? session.residues : existingPreset.residues3D,
      staticPdbChain: session.primaryChainId,
    };
  }

  const minRes = session.residues[0]?.resSeq ?? 1;
  const maxRes = session.residues[session.residues.length - 1]?.resSeq ?? session.sequence.length;

  return {
    uniprotId: session.uniprotId || session.pdbId || 'CUSTOM-3D',
    geneName: session.geneName || session.name.split(/[·\s(]/)[0] || 'Structure',
    proteinName: `${session.name} (Carried forward from 3D Explorer)`,
    organism: 'Loaded 3D Coordinates',
    length: Math.max(maxRes, session.sequence.length),
    sequence: session.sequence,
    source: 'Curated Built-in Profile',
    rawPdbText: session.format === 'pdb' ? session.rawStructureText : undefined,
    staticPdbChain: session.primaryChainId,
    residues3D: session.residues,
    sites: [
      {
        type: 'Domain',
        description: `Loaded 3D Chain ${session.primaryChainId}`,
        start: minRes,
        end: maxRes,
      },
    ],
    knownClinvar: {},
  };
}
