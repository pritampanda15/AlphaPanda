import React, { useEffect, useRef, useState } from 'react';
import { RotateCcw, Box } from 'lucide-react';
import { plddtColor } from '../../lib/aminoAcids';
import type { ProteinProfile, VariantTriageResult } from '../../lib/variantTriage';

interface Triage3DSpotlightProps {
  profile: ProteinProfile;
  results: VariantTriageResult[];
  focusedMutation: string | null;
  onSelectMutation: (mutRaw: string) => void;
  isDark: boolean;
}

/**
 * Compact Apple-framed 3Dmol globular protein spotlight inside Variant Triage.
 * Renders the real PDB / AlphaFold globular domain and illuminates every queried variant
 * as a risk-colored glowing sphere + label; clicking a triage card flies the camera right to it.
 */
export const Triage3DSpotlight: React.FC<Triage3DSpotlightProps> = ({
  profile,
  results,
  focusedMutation,
  onSelectMutation,
  isDark,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<import('3dmol').GLViewer | null>(null);
  const [viewerReady, setViewerReady] = useState(false);

  // Container div is ALWAYS mounted so 3Dmol initializes reliably before async PDB arrives
  useEffect(() => {
    let disposed = false;
    let obs: ResizeObserver | null = null;

    async function init() {
      const el = containerRef.current;
      if (!el) return;
      const $3Dmol = await import('3dmol');
      if (disposed || !containerRef.current) return;
      const viewer = $3Dmol.createViewer(containerRef.current, {
        backgroundColor: isDark ? '#0B0E17' : '#F3F5F9',
        antialias: true,
      });
      viewerRef.current = viewer;
      setViewerReady(true);

      obs = new ResizeObserver(() => {
        try {
          viewer.resize();
          viewer.render();
        } catch {
          // noop
        }
      });
      obs.observe(el);
    }

    init();
    return () => {
      disposed = true;
      obs?.disconnect();
      try {
        viewerRef.current?.clear();
      } catch {
        // noop
      }
      viewerRef.current = null;
      setViewerReady(false);
    };
  }, []);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewerReady || !viewer) return;

    viewer.setBackgroundColor(isDark ? '#0B0E17' : '#F3F5F9', 1);
    viewer.removeAllModels();
    viewer.removeAllLabels();
    viewer.removeAllShapes();

    if (!profile.rawPdbText) {
      viewer.render();
      return;
    }

    viewer.addModel(profile.rawPdbText, 'pdb');

    const chain = profile.staticPdbChain;
    if (chain) {
      viewer.setStyle({}, { cartoon: { color: '#64748B', opacity: 0.24, thickness: 0.28 } });
      viewer.setStyle(
        { chain },
        {
          cartoon: {
            colorfunc: (atom: { b: number }) => plddtColor(atom.b <= 1.05 ? atom.b * 100 : atom.b),
            thickness: 0.42,
            opacity: 0.9,
          },
        }
      );
    } else {
      viewer.setStyle(
        {},
        {
          cartoon: {
            colorfunc: (atom: { b: number }) => plddtColor(atom.b <= 1.05 ? atom.b * 100 : atom.b),
            thickness: 0.42,
          },
        }
      );
    }

    const resSet = new Set((profile.residues3D ?? []).map((r) => r.resSeq));
    let focusSel: Record<string, unknown> | null = null;
    const labeledPositions = new Set<number>();

    for (const r of results) {
      if (!resSet.has(r.mutation.pos)) continue;
      const color =
        r.verdictTone === 'rose'
          ? '#FF453A'
          : r.verdictTone === 'amber'
            ? '#FFD60A'
            : '#30D158';
      const isFocus = focusedMutation === r.mutation.raw;
      const sel: Record<string, unknown> = chain
        ? { chain, resi: r.mutation.pos }
        : { resi: r.mutation.pos };

      viewer.addStyle(sel, {
        stick: { radius: isFocus ? 0.3 : 0.2, color },
        sphere: { radius: isFocus ? 1.15 : 0.72, color, opacity: isFocus ? 1 : 0.92 },
      });

      const matchRes = profile.residues3D?.find((res) => res.resSeq === r.mutation.pos);
      if (matchRes && (isFocus || !labeledPositions.has(r.mutation.pos))) {
        labeledPositions.add(r.mutation.pos);
        viewer.addLabel(r.mutation.raw, {
          position: { x: matchRes.ca[0], y: matchRes.ca[1], z: matchRes.ca[2] },
          backgroundColor: isFocus ? 'rgba(10, 132, 255, 0.94)' : 'rgba(15, 23, 42, 0.86)',
          fontColor: '#FFFFFF',
          fontSize: isFocus ? 12 : 10.5,
          borderRadius: 6,
          inFront: true,
        });
      }

      if (isFocus) focusSel = sel;
    }

    viewer.resize();
    viewer.zoomTo(focusSel ?? (chain ? { chain } : undefined), focusSel ? 420 : 0);
    viewer.render();
  }, [viewerReady, profile, results, focusedMutation, isDark]);

  const mappedCount = (() => {
    if (!profile.residues3D) return 0;
    const set = new Set(profile.residues3D.map((r) => r.resSeq));
    return results.filter((r) => set.has(r.mutation.pos)).length;
  })();

  return (
    <div className="flex h-full flex-col">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Box className="h-3.5 w-3.5 text-sky-400" />
          <span className="text-[12.5px] font-semibold text-[var(--text-primary)]">
            3D Globular Mutation Spotlight
          </span>
          <span className="rounded-full bg-[var(--bg-subtle)] px-2 py-0.5 text-[10.5px] font-medium text-[var(--text-tertiary)]">
            {mappedCount}/{results.length} mapped in 3D
          </span>
        </div>
        <button
          type="button"
          onClick={() => {
            onSelectMutation('');
            viewerRef.current?.zoomTo(profile.staticPdbChain ? { chain: profile.staticPdbChain } : undefined, 360);
          }}
          className="apple-button-secondary inline-flex cursor-pointer items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium"
        >
          <RotateCcw className="h-3 w-3" />
          Reset
        </button>
      </div>

      <div className="relative h-[228px] w-full overflow-hidden rounded-2xl border border-[var(--border-hairline)] bg-[#0B0E17]">
        <div ref={containerRef} className="h-full w-full" />

        {!profile.rawPdbText && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0B0E17]/95 p-4 text-center text-[12px] text-slate-400">
            <Box className="mb-2 h-6 w-6 text-slate-500" />
            <span>
              Click <strong className="text-slate-200">Fetch Live UniProt &amp; AFDB</strong> above to load full AlphaFold 3D coordinates for {profile.geneName}.
            </span>
          </div>
        )}

        {profile.rawPdbText && (
          <div className="pointer-events-none absolute bottom-2 left-2.5 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-medium text-slate-200 backdrop-blur-md">
            Drag to rotate · Click any variant card to fly to site
          </div>
        )}
      </div>
    </div>
  );
};
