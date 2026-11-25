import React, { useEffect, useRef, useState } from 'react';
import { CHAIN_COLORS } from '../../lib/aminoAcids';
import { paeToHex } from '../../lib/figureExport';
import type { ParsedResidue, StructureDataset } from '../../lib/structureParser';

interface PAEHeatmapProps {
  dataset: StructureDataset;
  selectedPair: { a: ParsedResidue; b?: ParsedResidue } | null;
  onSelectPair: (a: ParsedResidue, b: ParsedResidue) => void;
}

export const PAEHeatmap: React.FC<PAEHeatmapProps> = ({
  dataset,
  selectedPair,
  onSelectPair,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hoverInfo, setHoverInfo] = useState<{
    row: ParsedResidue;
    col: ParsedResidue;
    pae: number;
    xPct: number;
    yPct: number;
  } | null>(null);

  const n = dataset.residues.length;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || n === 0) return;
    const size = 340;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const cell = size / n;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        ctx.fillStyle = paeToHex(dataset.pae[i]?.[j] ?? 20);
        ctx.fillRect(Math.floor(j * cell), Math.floor(i * cell), Math.ceil(cell), Math.ceil(cell));
      }
    }

    // Chain boundaries
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.78)';
    ctx.lineWidth = 1.5;
    for (let c = 1; c < dataset.chains.length; c++) {
      const p = Math.round((dataset.chains[c].startIndex / n) * size) + 0.5;
      ctx.beginPath();
      ctx.moveTo(p, 0);
      ctx.lineTo(p, size);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, p);
      ctx.lineTo(size, p);
      ctx.stroke();
    }

    // Draw selected pair crosshair
    if (selectedPair) {
      const ri = selectedPair.a.index;
      const ci = (selectedPair.b ?? selectedPair.a).index;
      const x = ((ci + 0.5) / n) * size;
      const y = ((ri + 0.5) / n) * size;

      ctx.strokeStyle = 'rgba(255, 214, 10, 0.9)';
      ctx.lineWidth = 1.25;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, size);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size, y);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#FFD60A';
      ctx.fill();
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }, [dataset, n, selectedPair]);

  const mapPointerToIndices = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const xPct = Math.max(0, Math.min(0.9999, (e.clientX - rect.left) / rect.width));
    const yPct = Math.max(0, Math.min(0.9999, (e.clientY - rect.top) / rect.height));
    const colIdx = Math.floor(xPct * n);
    const rowIdx = Math.floor(yPct * n);
    return { rowIdx, colIdx, xPct, yPct };
  };

  const handleMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (n === 0) return;
    const { rowIdx, colIdx, xPct, yPct } = mapPointerToIndices(e);
    const row = dataset.residues[rowIdx];
    const col = dataset.residues[colIdx];
    if (!row || !col) return;
    setHoverInfo({
      row,
      col,
      pae: dataset.pae[rowIdx]?.[colIdx] ?? 0,
      xPct,
      yPct,
    });
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (n === 0) return;
    const { rowIdx, colIdx } = mapPointerToIndices(e);
    const row = dataset.residues[rowIdx];
    const col = dataset.residues[colIdx];
    if (row && col) onSelectPair(row, col);
  };

  return (
    <div className="flex flex-col">
      <div className="mb-2.5 flex items-center justify-between">
        <div>
          <h3 className="text-[13.5px] font-semibold tracking-tight text-[var(--text-primary)]">
            Predicted Aligned Error (PAE)
          </h3>
          <p className="text-[11.5px] text-[var(--text-tertiary)]">
            Click any off-diagonal patch to inspect interface pairs in 3D
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-[10.5px] font-medium text-[var(--text-tertiary)]">
          <span>0 Å</span>
          <div
            className="h-2.5 w-16 rounded-full"
            style={{
              background: 'linear-gradient(90deg, #0C6C4E 0%, #56C690 38%, #F4F6FA 100%)',
            }}
          />
          <span>30 Å</span>
        </div>
      </div>

      {/* Top Chain Ribbon Bar */}
      <div className="mb-1.5 flex h-2 w-full overflow-hidden rounded-full">
        {dataset.chains.map((ch, idx) => (
          <div
            key={ch.id}
            style={{
              width: `${(ch.length / Math.max(1, n)) * 100}%`,
              backgroundColor: CHAIN_COLORS[idx % CHAIN_COLORS.length],
            }}
            title={`Chain ${ch.id} (${ch.length} aa)`}
          />
        ))}
      </div>

      {/* Interactive Matrix Canvas */}
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-[var(--border-hairline)] shadow-inner">
        <canvas
          ref={canvasRef}
          onMouseMove={handleMove}
          onMouseLeave={() => setHoverInfo(null)}
          onClick={handleClick}
          className="h-full w-full cursor-crosshair block"
        />

        {hoverInfo && (
          <div
            className="pointer-events-none absolute z-20 rounded-xl border border-white/15 bg-slate-950/90 px-2.5 py-1.5 text-[11px] text-slate-100 shadow-lg backdrop-blur-md"
            style={{
              left: hoverInfo.xPct > 0.58 ? undefined : `${hoverInfo.xPct * 100 + 3}%`,
              right: hoverInfo.xPct > 0.58 ? `${(1 - hoverInfo.xPct) * 100 + 3}%` : undefined,
              top: hoverInfo.yPct > 0.72 ? undefined : `${hoverInfo.yPct * 100 + 3}%`,
              bottom: hoverInfo.yPct > 0.72 ? `${(1 - hoverInfo.yPct) * 100 + 3}%` : undefined,
            }}
          >
            <div className="font-mono-code font-semibold text-sky-300">
              {hoverInfo.row.chain}:{hoverInfo.row.aa}
              {hoverInfo.row.resSeq} ↔ {hoverInfo.col.chain}:{hoverInfo.col.aa}
              {hoverInfo.col.resSeq}
            </div>
            <div className="mt-0.5 flex items-center gap-2 text-[10.5px] text-slate-300">
              <span>PAE: <strong className="text-white">{hoverInfo.pae.toFixed(1)} Å</strong></span>
              <span>·</span>
              <span>{hoverInfo.row.chain === hoverInfo.col.chain ? 'Intra-chain' : 'Inter-chain'}</span>
            </div>
          </div>
        )}
      </div>

      <div className="mt-2 flex items-center justify-between text-[11px] text-[var(--text-tertiary)]">
        <span className="flex items-center gap-2">
          {dataset.chains.map((ch, idx) => (
            <span key={ch.id} className="inline-flex items-center gap-1">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: CHAIN_COLORS[idx % CHAIN_COLORS.length] }}
              />
              {ch.id} ({ch.length})
            </span>
          ))}
        </span>
        <span>{dataset.hasRealPae ? 'Exact JSON PAE' : 'Structure-estimated PAE'}</span>
      </div>
    </div>
  );
};
