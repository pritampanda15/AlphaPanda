import React, { useMemo, useState } from 'react';
import { CHAIN_COLORS, plddtBandLabel, plddtColor } from '../../lib/aminoAcids';
import type { ParsedResidue, StructureDataset } from '../../lib/structureParser';

interface PLDDTTrackProps {
  dataset: StructureDataset;
  selectedResidues: ParsedResidue[];
  onSelectResidue: (res: ParsedResidue) => void;
}

export const PLDDTTrack: React.FC<PLDDTTrackProps> = ({
  dataset,
  selectedResidues,
  onSelectResidue,
}) => {
  const [hoverRes, setHoverRes] = useState<ParsedResidue | null>(null);
  const n = Math.max(1, dataset.residues.length);
  const W = 760;
  const H = 148;
  const padL = 34;
  const padR = 14;
  const padT = 14;
  const padB = 26;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const interfaceIndices = useMemo(() => {
    const s = new Set<number>();
    for (const c of dataset.contacts) {
      s.add(c.resA.index);
      s.add(c.resB.index);
    }
    return s;
  }, [dataset.contacts]);

  const xOf = (idx: number) => padL + (idx / Math.max(1, n - 1)) * plotW;
  const yOf = (score: number) => padT + plotH - (Math.max(0, Math.min(100, score)) / 100) * plotH;

  const handleSvgMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const t = Math.max(0, Math.min(1, (px - padL) / plotW));
    const idx = Math.round(t * (n - 1));
    const r = dataset.residues[idx];
    if (r) setHoverRes(r);
  };

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-[13.5px] font-semibold tracking-tight text-[var(--text-primary)]">
            Per-Residue Local Confidence (pLDDT)
          </h3>
          <p className="text-[11.5px] text-[var(--text-tertiary)]">
            Emerald ticks mark interface contact residues · Click anywhere along the curve to jump in 3D
          </p>
        </div>
        {hoverRes ? (
          <div className="font-mono-code rounded-full border border-[var(--border-hairline)] bg-[var(--bg-subtle)] px-3 py-1 text-[11.5px] text-[var(--text-primary)]">
            {hoverRes.chain}:{hoverRes.aa}
            {hoverRes.resSeq} · <strong style={{ color: plddtColor(hoverRes.plddt) }}>{hoverRes.plddt.toFixed(1)}</strong>{' '}
            <span className="text-[var(--text-tertiary)]">({plddtBandLabel(hoverRes.plddt)})</span>
          </div>
        ) : (
          <div className="text-[11.5px] text-[var(--text-tertiary)]">
            Mean Complex pLDDT:{' '}
            <strong className="tabular-nums-strict text-[var(--text-primary)]">
              {dataset.metrics.meanComplexPlddt.toFixed(1)}
            </strong>
          </div>
        )}
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full cursor-pointer select-none overflow-visible"
        onMouseMove={handleSvgMove}
        onMouseLeave={() => setHoverRes(null)}
        onClick={() => hoverRes && onSelectResidue(hoverRes)}
      >
        {/* Subtle horizontal confidence guides */}
        {[100, 90, 70, 50, 0].map((tick) => {
          const y = yOf(tick);
          return (
            <g key={tick}>
              <line
                x1={padL}
                y1={y}
                x2={padL + plotW}
                y2={y}
                stroke="currentColor"
                className="text-black/8 dark:text-white/10"
                strokeDasharray={tick === 70 || tick === 50 ? '3 4' : undefined}
              />
              <text
                x={padL - 7}
                y={y + 3.5}
                textAnchor="end"
                className="fill-[var(--text-tertiary)] font-mono-code text-[9.5px]"
              >
                {tick}
              </text>
            </g>
          );
        })}

        {/* Chain dividers & labels */}
        {dataset.chains.map((ch, idx) => {
          const xStart = xOf(ch.startIndex);
          const xMid = xOf(ch.startIndex + ch.length / 2);
          return (
            <g key={ch.id}>
              {idx > 0 && (
                <line
                  x1={xStart}
                  y1={padT}
                  x2={xStart}
                  y2={padT + plotH}
                  stroke="currentColor"
                  className="text-slate-400/50"
                  strokeDasharray="4 3"
                />
              )}
              <text
                x={xMid}
                y={H - 6}
                textAnchor="middle"
                fontSize="10.5"
                fontWeight="600"
                fill={CHAIN_COLORS[idx % CHAIN_COLORS.length]}
              >
                Chain {ch.id} {ch.label ? `· ${ch.label}` : ''} ({ch.meanPlddt})
              </text>
            </g>
          );
        })}

        {/* Interface residue baseline ticks */}
        {dataset.residues.map((r) =>
          interfaceIndices.has(r.index) ? (
            <rect
              key={`if-${r.index}`}
              x={xOf(r.index) - 1.2}
              y={padT + plotH - 5}
              width="2.4"
              height="5"
              rx="1"
              fill="#30D158"
              opacity="0.85"
            />
          ) : null
        )}

        {/* Color-coded pLDDT line segments */}
        {dataset.residues.slice(0, -1).map((r, i) => {
          const next = dataset.residues[i + 1];
          if (r.chain !== next.chain) return null;
          return (
            <line
              key={i}
              x1={xOf(i)}
              y1={yOf(r.plddt)}
              x2={xOf(i + 1)}
              y2={yOf(next.plddt)}
              stroke={plddtColor(r.plddt)}
              strokeWidth="2.4"
              strokeLinecap="round"
            />
          );
        })}

        {/* Selected markers */}
        {selectedResidues.map((res, idx) => (
          <g key={`sel-${res.index}-${idx}`}>
            <line
              x1={xOf(res.index)}
              y1={padT}
              x2={xOf(res.index)}
              y2={padT + plotH}
              stroke={idx === 0 ? '#FFD60A' : '#30D158'}
              strokeWidth="1.4"
              strokeDasharray="3 2"
            />
            <circle
              cx={xOf(res.index)}
              cy={yOf(res.plddt)}
              r="4.5"
              fill={idx === 0 ? '#FFD60A' : '#30D158'}
              stroke="#0B0E17"
              strokeWidth="1.5"
            />
          </g>
        ))}

        {/* Hover cursor */}
        {hoverRes && (
          <g>
            <line
              x1={xOf(hoverRes.index)}
              y1={padT}
              x2={xOf(hoverRes.index)}
              y2={padT + plotH}
              stroke="currentColor"
              className="text-sky-400/60"
              strokeWidth="1"
            />
            <circle
              cx={xOf(hoverRes.index)}
              cy={yOf(hoverRes.plddt)}
              r="4"
              fill={plddtColor(hoverRes.plddt)}
              stroke="#FFFFFF"
              strokeWidth="1.5"
            />
          </g>
        )}
      </svg>
    </div>
  );
};
