export interface AminoAcidInfo {
  code1: string;
  code3: string;
  name: string;
  group: 'hydrophobic' | 'polar' | 'positive' | 'negative' | 'aromatic' | 'special';
  hydropathy: number; // Kyte-Doolittle
  volume: number; // Å³ (Zamyatnin)
  charge: number; // Nominal charge at pH 7.4
  polarity: number; // Grantham polarity
  molecularWeight: number;
  helixPropensity: number; // Chou-Fasman P(alpha)
  sheetPropensity: number; // Chou-Fasman P(beta)
  maxASA: number; // Tien et al. 2013 theoretical MaxASA (Å²)
}

export const AMINO_ACIDS: Record<string, AminoAcidInfo> = {
  A: { code1: 'A', code3: 'ALA', name: 'Alanine', group: 'hydrophobic', hydropathy: 1.8, volume: 88.6, charge: 0, polarity: 8.1, molecularWeight: 89.1, helixPropensity: 1.42, sheetPropensity: 0.83, maxASA: 129 },
  R: { code1: 'R', code3: 'ARG', name: 'Arginine', group: 'positive', hydropathy: -4.5, volume: 173.4, charge: 1, polarity: 10.5, molecularWeight: 174.2, helixPropensity: 0.98, sheetPropensity: 0.93, maxASA: 274 },
  N: { code1: 'N', code3: 'ASN', name: 'Asparagine', group: 'polar', hydropathy: -3.5, volume: 114.1, charge: 0, polarity: 11.6, molecularWeight: 132.1, helixPropensity: 0.67, sheetPropensity: 0.89, maxASA: 195 },
  D: { code1: 'D', code3: 'ASP', name: 'Aspartate', group: 'negative', hydropathy: -3.5, volume: 111.1, charge: -1, polarity: 13.0, molecularWeight: 133.1, helixPropensity: 1.01, sheetPropensity: 0.54, maxASA: 193 },
  C: { code1: 'C', code3: 'CYS', name: 'Cysteine', group: 'special', hydropathy: 2.5, volume: 108.5, charge: 0, polarity: 5.5, molecularWeight: 121.2, helixPropensity: 0.70, sheetPropensity: 1.19, maxASA: 167 },
  Q: { code1: 'Q', code3: 'GLN', name: 'Glutamine', group: 'polar', hydropathy: -3.5, volume: 143.8, charge: 0, polarity: 10.5, molecularWeight: 146.2, helixPropensity: 1.11, sheetPropensity: 1.10, maxASA: 225 },
  E: { code1: 'E', code3: 'GLU', name: 'Glutamate', group: 'negative', hydropathy: -3.5, volume: 138.4, charge: -1, polarity: 12.3, molecularWeight: 147.1, helixPropensity: 1.51, sheetPropensity: 0.37, maxASA: 223 },
  G: { code1: 'G', code3: 'GLY', name: 'Glycine', group: 'special', hydropathy: -0.4, volume: 60.1, charge: 0, polarity: 9.0, molecularWeight: 75.1, helixPropensity: 0.57, sheetPropensity: 0.75, maxASA: 104 },
  H: { code1: 'H', code3: 'HIS', name: 'Histidine', group: 'positive', hydropathy: -3.2, volume: 153.2, charge: 0.1, polarity: 10.4, molecularWeight: 155.2, helixPropensity: 1.00, sheetPropensity: 0.87, maxASA: 224 },
  I: { code1: 'I', code3: 'ILE', name: 'Isoleucine', group: 'hydrophobic', hydropathy: 4.5, volume: 166.7, charge: 0, polarity: 5.2, molecularWeight: 131.2, helixPropensity: 1.08, sheetPropensity: 1.60, maxASA: 197 },
  L: { code1: 'L', code3: 'LEU', name: 'Leucine', group: 'hydrophobic', hydropathy: 3.8, volume: 166.7, charge: 0, polarity: 4.9, molecularWeight: 131.2, helixPropensity: 1.21, sheetPropensity: 1.30, maxASA: 201 },
  K: { code1: 'K', code3: 'LYS', name: 'Lysine', group: 'positive', hydropathy: -3.9, volume: 168.6, charge: 1, polarity: 11.3, molecularWeight: 146.2, helixPropensity: 1.16, sheetPropensity: 0.74, maxASA: 236 },
  M: { code1: 'M', code3: 'MET', name: 'Methionine', group: 'hydrophobic', hydropathy: 1.9, volume: 162.9, charge: 0, polarity: 5.7, molecularWeight: 149.2, helixPropensity: 1.45, sheetPropensity: 1.05, maxASA: 224 },
  F: { code1: 'F', code3: 'PHE', name: 'Phenylalanine', group: 'aromatic', hydropathy: 2.8, volume: 189.9, charge: 0, polarity: 5.2, molecularWeight: 165.2, helixPropensity: 1.13, sheetPropensity: 1.38, maxASA: 240 },
  P: { code1: 'P', code3: 'PRO', name: 'Proline', group: 'special', hydropathy: -1.6, volume: 112.7, charge: 0, polarity: 8.0, molecularWeight: 115.1, helixPropensity: 0.57, sheetPropensity: 0.55, maxASA: 159 },
  S: { code1: 'S', code3: 'SER', name: 'Serine', group: 'polar', hydropathy: -0.8, volume: 89.0, charge: 0, polarity: 9.2, molecularWeight: 105.1, helixPropensity: 0.77, sheetPropensity: 0.75, maxASA: 155 },
  T: { code1: 'T', code3: 'THR', name: 'Threonine', group: 'polar', hydropathy: -0.7, volume: 116.1, charge: 0, polarity: 8.6, molecularWeight: 119.1, helixPropensity: 0.83, sheetPropensity: 1.19, maxASA: 172 },
  W: { code1: 'W', code3: 'TRP', name: 'Tryptophan', group: 'aromatic', hydropathy: -0.9, volume: 227.8, charge: 0, polarity: 5.4, molecularWeight: 204.2, helixPropensity: 1.08, sheetPropensity: 1.37, maxASA: 285 },
  Y: { code1: 'Y', code3: 'TYR', name: 'Tyrosine', group: 'aromatic', hydropathy: -1.3, volume: 193.6, charge: 0, polarity: 6.2, molecularWeight: 181.2, helixPropensity: 0.69, sheetPropensity: 1.47, maxASA: 263 },
  V: { code1: 'V', code3: 'VAL', name: 'Valine', group: 'hydrophobic', hydropathy: 4.2, volume: 140.0, charge: 0, polarity: 5.9, molecularWeight: 117.1, helixPropensity: 1.06, sheetPropensity: 1.70, maxASA: 174 },
};

export const THREE_TO_ONE: Record<string, string> = Object.values(AMINO_ACIDS).reduce(
  (acc, aa) => {
    acc[aa.code3] = aa.code1;
    return acc;
  },
  { MSE: 'M', SEC: 'C', PYL: 'K', HID: 'H', HIE: 'H', HIP: 'H' } as Record<string, string>
);

// Grantham (1974) composition, polarity, volume parameters for exact pairwise Grantham score
const GRANTHAM_COMP: Record<string, number> = {
  S: 1.42, R: 0.65, L: 0.0, P: 0.39, T: 0.71, A: 0.0, V: 0.0, G: 0.74, I: 0.0, F: 0.0,
  Y: 0.2, C: 2.75, H: 0.58, Q: 0.89, N: 1.33, K: 0.33, D: 1.38, E: 0.92, M: 0.0, W: 0.13,
};
const GRANTHAM_VOL: Record<string, number> = {
  S: 32, R: 124, L: 111, P: 32.5, T: 61, A: 31, V: 84, G: 3, I: 111, F: 132,
  Y: 136, C: 55, H: 96, Q: 85, N: 56, K: 119, D: 54, E: 83, M: 105, W: 170,
};

export function granthamDistance(a: string, b: string): number {
  const aa1 = AMINO_ACIDS[a.toUpperCase()];
  const aa2 = AMINO_ACIDS[b.toUpperCase()];
  if (!aa1 || !aa2) return 0;
  if (aa1.code1 === aa2.code1) return 0;
  const dc = GRANTHAM_COMP[aa1.code1] - GRANTHAM_COMP[aa2.code1];
  const dp = aa1.polarity - aa2.polarity;
  const dv = GRANTHAM_VOL[aa1.code1] - GRANTHAM_VOL[aa2.code1];
  return Math.round(Math.sqrt(1.833 * dc * dc + 0.1018 * dp * dp + 0.000399 * dv * dv) * 50.723);
}

// Standard BLOSUM62 order and lower-triangular rows
const BLOSUM_ORDER = 'ARNDCQEGHILKMFPSTWYV';
const BLOSUM62_ROWS: number[][] = [
  [4],
  [-1, 5],
  [-2, 0, 6],
  [-2, -2, 1, 6],
  [0, -3, -3, -3, 9],
  [-1, 1, 0, 0, -3, 5],
  [-1, 0, 0, 2, -4, 2, 5],
  [0, -2, 0, -1, -3, -2, -2, 6],
  [-2, 0, 1, -1, -3, 0, 0, -2, 8],
  [-1, -3, -3, -3, -1, -3, -3, -4, -3, 4],
  [-1, -2, -3, -4, -1, -2, -3, -4, -3, 2, 4],
  [-1, 2, 0, -1, -3, 1, 1, -2, -1, -3, -2, 5],
  [-1, -1, -2, -3, -1, 0, -2, -3, -2, 1, 2, -1, 5],
  [-2, -3, -3, -3, -2, -3, -3, -3, -1, 0, 0, -3, 0, 6],
  [-1, -2, -2, -1, -3, -1, -1, -2, -2, -3, -3, -1, -2, -4, 7],
  [1, -1, 1, 0, -1, 0, 0, 0, -1, -2, -2, 0, -1, -2, -1, 4],
  [0, -1, 0, -1, -1, -1, -1, -2, -2, -1, -1, -1, -1, -2, -1, 1, 5],
  [-3, -3, -4, -4, -2, -2, -3, -2, -2, -3, -2, -3, -1, 1, -4, -3, -2, 11],
  [-2, -2, -2, -3, -2, -1, -2, -3, 2, -1, -1, -2, -1, 3, -3, -2, -2, 2, 7],
  [0, -3, -3, -3, -1, -2, -2, -3, -3, 3, 1, -2, 1, -1, -2, -2, 0, -3, -1, 4],
];

export function blosum62(a: string, b: string): number {
  const i = BLOSUM_ORDER.indexOf(a.toUpperCase());
  const j = BLOSUM_ORDER.indexOf(b.toUpperCase());
  if (i < 0 || j < 0) return -4;
  return i >= j ? BLOSUM62_ROWS[i][j] : BLOSUM62_ROWS[j][i];
}

export type InteractionType =
  | 'Salt Bridge'
  | 'Hydrogen Bond'
  | 'Hydrophobic'
  | 'Aromatic π-Stack'
  | 'Disulfide'
  | 'Polar Contact';

export function classifyContact(res1: string, res2: string, dist: number): InteractionType {
  const a = AMINO_ACIDS[res1.toUpperCase()];
  const b = AMINO_ACIDS[res2.toUpperCase()];
  if (!a || !b) return 'Polar Contact';
  if (a.code1 === 'C' && b.code1 === 'C' && dist <= 3.2) return 'Disulfide';
  if ((a.charge > 0.5 && b.charge < -0.5) || (a.charge < -0.5 && b.charge > 0.5)) {
    return dist <= 5.5 ? 'Salt Bridge' : 'Polar Contact';
  }
  if (a.group === 'aromatic' && b.group === 'aromatic' && dist <= 6.2) {
    return 'Aromatic π-Stack';
  }
  if (
    (a.group === 'hydrophobic' || a.group === 'aromatic') &&
    (b.group === 'hydrophobic' || b.group === 'aromatic')
  ) {
    return 'Hydrophobic';
  }
  if (
    ['polar', 'positive', 'negative'].includes(a.group) &&
    ['polar', 'positive', 'negative'].includes(b.group) &&
    dist <= 4.2
  ) {
    return 'Hydrogen Bond';
  }
  return 'Polar Contact';
}

export function plddtColor(score: number): string {
  if (score >= 90) return '#0A84FF'; // Very high (AlphaFold deep blue / Apple blue)
  if (score >= 70) return '#5AC8FA'; // Confident (Cyan)
  if (score >= 50) return '#FFD60A'; // Low (Yellow)
  return '#FF6B4A'; // Very low / Disordered (Orange-Red)
}

export function plddtBandLabel(score: number): string {
  if (score >= 90) return 'Very High (≥90)';
  if (score >= 70) return 'Confident (70–90)';
  if (score >= 50) return 'Low (50–70)';
  return 'Disordered (<50)';
}

export const CHAIN_COLORS = [
  '#0A84FF', // Apple Blue
  '#FF6B6B', // Coral Rose
  '#30D158', // Emerald
  '#BF5AF2', // Iris Purple
  '#FF9F0A', // Amber
  '#64D2FF', // Sky Cyan
];
