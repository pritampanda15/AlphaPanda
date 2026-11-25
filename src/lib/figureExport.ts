import { CHAIN_COLORS, plddtColor } from './aminoAcids';
import type { StructureDataset } from './structureParser';

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function paeToHex(val: number): string {
  // AlphaFold-inspired crisp green-to-white-to-slate PAE ramp (0 Å deep emerald → 30 Å pale mist)
  const t = Math.max(0, Math.min(1, val / 30));
  if (t < 0.35) {
    const k = t / 0.35;
    const r = Math.round(12 + k * 74);
    const g = Math.round(108 + k * 90);
    const b = Math.round(78 + k * 66);
    return `rgb(${r},${g},${b})`;
  }
  const k = (t - 0.35) / 0.65;
  const r = Math.round(86 + k * 158);
  const g = Math.round(198 + k * 48);
  const b = Math.round(144 + k * 106);
  return `rgb(${r},${g},${b})`;
}

/**
 * Render the PAE matrix to a crisp offscreen canvas data URL for instant embedding in SVG publication figures
 */
export function renderPaeCanvasDataUrl(dataset: StructureDataset, size = 360): string {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const n = dataset.residues.length;
  if (n === 0) return '';
  const cell = size / n;

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      ctx.fillStyle = paeToHex(dataset.pae[i]?.[j] ?? 20);
      ctx.fillRect(Math.floor(j * cell), Math.floor(i * cell), Math.ceil(cell), Math.ceil(cell));
    }
  }

  // Crisp chain boundary dividers
  ctx.strokeStyle = 'rgba(15, 23, 42, 0.72)';
  ctx.lineWidth = 1.5;
  for (let c = 1; c < dataset.chains.length; c++) {
    const pos = Math.round((dataset.chains[c].startIndex / n) * size) + 0.5;
    ctx.beginPath();
    ctx.moveTo(pos, 0);
    ctx.lineTo(pos, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, pos);
    ctx.lineTo(size, pos);
    ctx.stroke();
  }

  return canvas.toDataURL('image/png');
}

/**
 * One-Click Publication Composite Figure SVG (Nature / Cell / Apple Studio style)
 * Combines Panel A (3D Snapshot), Panel B (PAE Heatmap), Panel C (pLDDT Track), and Panel D (Interface Metrics & Contacts)
 */
export function buildPublicationFigureSVG(
  dataset: StructureDataset,
  snapshot3dDataUrl: string | null
): string {
  const W = 1240;
  const H = 860;
  const paeUrl = renderPaeCanvasDataUrl(dataset, 340);
  const n = Math.max(1, dataset.residues.length);

  // Build pLDDT polyline
  const plotX = 56;
  const plotY = 548;
  const plotW = 680;
  const plotH = 178;

  const plddtSegments: string[] = [];
  for (let i = 0; i < dataset.residues.length - 1; i++) {
    const r1 = dataset.residues[i];
    const r2 = dataset.residues[i + 1];
    if (r1.chain !== r2.chain) continue;
    const x1 = plotX + (i / (n - 1)) * plotW;
    const y1 = plotY + plotH - (r1.plddt / 100) * plotH;
    const x2 = plotX + ((i + 1) / (n - 1)) * plotW;
    const y2 = plotY + plotH - (r2.plddt / 100) * plotH;
    plddtSegments.push(
      `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${plddtColor(r1.plddt)}" stroke-width="2.2" stroke-linecap="round" />`
    );
  }

  // Chain divider lines on pLDDT plot
  const chainMarkers = dataset.chains
    .map((c, idx) => {
      const cx = plotX + ((c.startIndex + c.length / 2) / n) * plotW;
      const divider =
        idx > 0
          ? `<line x1="${(plotX + (c.startIndex / n) * plotW).toFixed(1)}" y1="${plotY}" x2="${(plotX + (c.startIndex / n) * plotW).toFixed(1)}" y2="${plotY + plotH}" stroke="#94A3B8" stroke-dasharray="4 4" stroke-width="1" />`
          : '';
      return `${divider}<text x="${cx.toFixed(1)}" y="${plotY + plotH + 22}" text-anchor="middle" font-size="11" font-weight="600" fill="${CHAIN_COLORS[idx % CHAIN_COLORS.length]}">Chain ${escapeXml(c.id)} (${c.length} aa · ${c.meanPlddt} pLDDT)</text>`;
    })
    .join('\n');

  const topContacts = dataset.contacts.slice(0, 7);
  const contactRows = topContacts
    .map((c, idx) => {
      const y = 606 + idx * 24;
      return `
      <text x="784" y="${y}" font-size="11.5" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" fill="#0F172A">${escapeXml(c.resA.chain)}:${escapeXml(c.resA.aa)}${c.resA.resSeq} ↔ ${escapeXml(c.resB.chain)}:${escapeXml(c.resB.aa)}${c.resB.resSeq}</text>
      <text x="975" y="${y}" font-size="11.5" text-anchor="end" font-family="ui-monospace, monospace" fill="#334155">${c.distance.toFixed(2)} Å</text>
      <text x="1045" y="${y}" font-size="11.5" text-anchor="end" font-family="ui-monospace, monospace" fill="#0F766E">${c.meanPae.toFixed(1)} Å</text>
      <text x="1188" y="${y}" font-size="11" text-anchor="end" fill="#475569">${escapeXml(c.interactionType)}</text>
      <line x1="780" y1="${y + 7}" x2="1190" y2="${y + 7}" stroke="#E2E8F0" stroke-width="0.8" />`;
    })
    .join('\n');

  const verdictColor =
    dataset.metrics.verdictTone === 'emerald'
      ? '#059669'
      : dataset.metrics.verdictTone === 'amber'
        ? '#D97706'
        : '#DC2626';

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <clipPath id="clip3d"><rect x="36" y="112" width="540" height="360" rx="16" /></clipPath>
    <clipPath id="clipPae"><rect x="616" y="112" width="340" height="340" rx="12" /></clipPath>
  </defs>
  <rect width="${W}" height="${H}" fill="#FFFFFF" />
  <rect x="0" y="0" width="${W}" height="82" fill="#F8FAFC" />
  <line x1="0" y1="82" x2="${W}" y2="82" stroke="#E2E8F0" stroke-width="1" />

  <!-- Header -->
  <text x="36" y="38" font-family="-apple-system, BlinkMacSystemFont, Inter, sans-serif" font-size="22" font-weight="700" fill="#0F172A" letter-spacing="-0.4">${escapeXml(dataset.name)}</text>
  <text x="36" y="61" font-family="-apple-system, BlinkMacSystemFont, Inter, sans-serif" font-size="12.5" fill="#475569">${escapeXml(dataset.subtitle)}  •  Engine: ${escapeXml(dataset.sourceEngine)}  •  Generated by AlphaPanda Studio</text>
  <rect x="930" y="24" width="274" height="32" rx="16" fill="${verdictColor}" fill-opacity="0.12" stroke="${verdictColor}" stroke-opacity="0.35" />
  <text x="1067" y="44.5" text-anchor="middle" font-family="-apple-system, Inter, sans-serif" font-size="12" font-weight="600" fill="${verdictColor}">${escapeXml(dataset.metrics.verdict)}</text>

  <!-- Panel A: 3D Structure -->
  <text x="36" y="104" font-family="-apple-system, Inter, sans-serif" font-size="13" font-weight="700" fill="#0F172A">A  Predicted 3D Complex Architecture</text>
  <rect x="36" y="112" width="540" height="360" rx="16" fill="#0B0E17" stroke="#CBD5E1" stroke-width="1" />
  ${
    snapshot3dDataUrl
      ? `<image href="${snapshot3dDataUrl}" x="36" y="112" width="540" height="360" preserveAspectRatio="xMidYMid meet" clip-path="url(#clip3d)" />`
      : `<text x="306" y="295" text-anchor="middle" font-family="-apple-system, Inter, sans-serif" font-size="14" fill="#94A3B8">3D Viewport Snapshot</text>`
  }
  <!-- pLDDT Color Key -->
  <g transform="translate(52, 444)">
    <rect width="12" height="12" rx="3" fill="#0A84FF" /><text x="18" y="10" font-family="-apple-system, Inter, sans-serif" font-size="10.5" fill="#E2E8F0">Very High (&gt;90)</text>
    <rect x="118" width="12" height="12" rx="3" fill="#5AC8FA" /><text x="136" y="10" font-family="-apple-system, Inter, sans-serif" font-size="10.5" fill="#E2E8F0">Confident (70-90)</text>
    <rect x="248" width="12" height="12" rx="3" fill="#FFD60A" /><text x="266" y="10" font-family="-apple-system, Inter, sans-serif" font-size="10.5" fill="#E2E8F0">Low (50-70)</text>
    <rect x="352" width="12" height="12" rx="3" fill="#FF6B4A" /><text x="370" y="10" font-family="-apple-system, Inter, sans-serif" font-size="10.5" fill="#E2E8F0">Disordered (&lt;50)</text>
  </g>

  <!-- Panel B: PAE Heatmap -->
  <text x="616" y="104" font-family="-apple-system, Inter, sans-serif" font-size="13" font-weight="700" fill="#0F172A">B  Predicted Aligned Error (PAE, Å)</text>
  <image href="${paeUrl}" x="616" y="112" width="340" height="340" clip-path="url(#clipPae)" />
  <rect x="616" y="112" width="340" height="340" rx="12" fill="none" stroke="#CBD5E1" stroke-width="1" />
  <text x="786" y="472" text-anchor="middle" font-family="-apple-system, Inter, sans-serif" font-size="11" fill="#475569">Scored Residue Index (1 – ${n})</text>

  <!-- KPI Sidebar (Right of PAE) -->
  <text x="988" y="104" font-family="-apple-system, Inter, sans-serif" font-size="13" font-weight="700" fill="#0F172A">Interface Metrics</text>
  ${[
    { label: 'ipTM Score', val: dataset.metrics.iptm.toFixed(2), sub: 'Target ≥ 0.75' },
    { label: 'pTM Score', val: dataset.metrics.ptm.toFixed(2), sub: 'Global Fold' },
    { label: 'pDockQ', val: dataset.metrics.pDockQ.toFixed(3), sub: 'Bryant et al. 2022' },
    { label: 'Mean i-PAE', val: `${dataset.metrics.meanInterfacePae.toFixed(1)} Å`, sub: `Min ${dataset.metrics.minInterfacePae.toFixed(1)} Å` },
    { label: 'Interface Contacts', val: String(dataset.metrics.contactCount8A), sub: `${dataset.metrics.interfaceResidueCount} interface res` },
  ]
    .map(
      (k, idx) => `
    <g transform="translate(988, ${114 + idx * 69})">
      <rect width="216" height="58" rx="12" fill="#F8FAFC" stroke="#E2E8F0" stroke-width="1" />
      <text x="14" y="21" font-family="-apple-system, Inter, sans-serif" font-size="10.5" font-weight="600" fill="#64748B">${escapeXml(k.label)}</text>
      <text x="14" y="46" font-family="-apple-system, Inter, sans-serif" font-size="21" font-weight="700" fill="#0F172A">${escapeXml(k.val)}</text>
      <text x="202" y="44" text-anchor="end" font-family="-apple-system, Inter, sans-serif" font-size="10" fill="#64748B">${escapeXml(k.sub)}</text>
    </g>`
    )
    .join('\n')}

  <!-- Panel C: Per-Residue pLDDT Track -->
  <text x="36" y="524" font-family="-apple-system, Inter, sans-serif" font-size="13" font-weight="700" fill="#0F172A">C  Per-Residue Local Confidence (pLDDT)</text>
  <rect x="36" y="534" width="716" height="236" rx="14" fill="#F8FAFC" stroke="#E2E8F0" stroke-width="1" />
  <!-- Gridlines -->
  ${[100, 90, 70, 50, 0]
    .map((tick) => {
      const ty = plotY + plotH - (tick / 100) * plotH;
      return `<line x1="${plotX}" y1="${ty.toFixed(1)}" x2="${plotX + plotW}" y2="${ty.toFixed(1)}" stroke="#E2E8F0" stroke-width="1" />
              <text x="${plotX - 8}" y="${(ty + 3.5).toFixed(1)}" text-anchor="end" font-family="ui-monospace, monospace" font-size="9.5" fill="#64748B">${tick}</text>`;
    })
    .join('\n')}
  ${plddtSegments.join('\n')}
  ${chainMarkers}

  <!-- Panel D: Key Interface Contacts -->
  <text x="774" y="524" font-family="-apple-system, Inter, sans-serif" font-size="13" font-weight="700" fill="#0F172A">D  Top Interface Contacts (CB–CB ≤ 8 Å)</text>
  <rect x="774" y="534" width="430" height="236" rx="14" fill="#F8FAFC" stroke="#E2E8F0" stroke-width="1" />
  <text x="784" y="564" font-family="-apple-system, Inter, sans-serif" font-size="10.5" font-weight="700" fill="#64748B">RESIDUE PAIR</text>
  <text x="975" y="564" text-anchor="end" font-family="-apple-system, Inter, sans-serif" font-size="10.5" font-weight="700" fill="#64748B">DIST</text>
  <text x="1045" y="564" text-anchor="end" font-family="-apple-system, Inter, sans-serif" font-size="10.5" font-weight="700" fill="#64748B">i-PAE</text>
  <text x="1188" y="564" text-anchor="end" font-family="-apple-system, Inter, sans-serif" font-size="10.5" font-weight="700" fill="#64748B">INTERACTION</text>
  <line x1="780" y1="574" x2="1190" y2="574" stroke="#CBD5E1" stroke-width="1" />
  ${contactRows}

  <!-- Footer -->
  <text x="36" y="832" font-family="-apple-system, Inter, sans-serif" font-size="11" fill="#64748B">${escapeXml(dataset.metrics.verdictDetail)}</text>
</svg>`;
}

export function downloadTextFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function downloadSvgAsPng(filename: string, svgString: string, scale = 2): Promise<void> {
  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = (e) => reject(e);
      img.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = img.width * scale;
    canvas.height = img.height * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0);
    const pngUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = pngUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}
