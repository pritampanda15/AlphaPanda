import React, { useEffect, useImperativeHandle, useRef, useState } from 'react';
import { RotateCcw, RefreshCw, Layers, Focus, Camera } from 'lucide-react';
import { CHAIN_COLORS, plddtColor } from '../../lib/aminoAcids';
import type { ParsedResidue, StructureDataset } from '../../lib/structureParser';
import { SegmentedControl } from '../ui/ApplePrimitives';

export type ColorMode = 'plddt' | 'chain' | 'interface';

export interface Mol3DHandle {
  captureSnapshot: () => string | null;
  resetCamera: () => void;
  focusSelected: () => void;
}

interface Mol3DViewportProps {
  dataset: StructureDataset;
  selectedPair: { a: ParsedResidue; b?: ParsedResidue } | null;
  onSelectResidue: (res: ParsedResidue) => void;
  isDark: boolean;
}

export const Mol3DViewport = React.forwardRef<Mol3DHandle, Mol3DViewportProps>(
  ({ dataset, selectedPair, onSelectResidue, isDark }, ref) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const viewerRef = useRef<import('3dmol').GLViewer | null>(null);
    const [colorMode, setColorMode] = useState<ColorMode>('plddt');
    const [showSurface, setShowSurface] = useState(false);
    const [showSticks, setShowSticks] = useState(false);
    const [spinning, setSpinning] = useState(false);
    const [webglError, setWebglError] = useState<string | null>(null);

    const onSelectRef = useRef(onSelectResidue);
    onSelectRef.current = onSelectResidue;

    const datasetRef = useRef(dataset);
    datasetRef.current = dataset;

    const zoomToSelection = () => {
      if (!viewerRef.current || !selectedPair) return;
      const sel = selectedPair.b
        ? {
            or: [
              { chain: selectedPair.a.chain, resi: selectedPair.a.resSeq },
              { chain: selectedPair.b.chain, resi: selectedPair.b.resSeq },
            ],
          }
        : { chain: selectedPair.a.chain, resi: selectedPair.a.resSeq };
      viewerRef.current.zoomTo(sel, 420);
      viewerRef.current.render();
    };

    useImperativeHandle(ref, () => ({
      captureSnapshot: () => {
        try {
          return viewerRef.current?.pngURI() ?? null;
        } catch {
          return null;
        }
      },
      resetCamera: () => {
        try {
          viewerRef.current?.zoomTo(undefined, 380);
          viewerRef.current?.render();
        } catch {
          // noop
        }
      },
      focusSelected: zoomToSelection,
    }));

    // Initialize 3Dmol viewer once
    useEffect(() => {
      let disposed = false;
      let resizeObs: ResizeObserver | null = null;

      async function init() {
        const el = containerRef.current;
        if (!el) return;
        try {
          const $3Dmol = await import('3dmol');
          if (disposed || !containerRef.current) return;
          const viewer = $3Dmol.createViewer(containerRef.current, {
            backgroundColor: isDark ? '#0B0E17' : '#F2F4F8',
            antialias: true,
          });
          viewerRef.current = viewer;

          resizeObs = new ResizeObserver(() => {
            try {
              viewer.resize();
              viewer.render();
            } catch {
              // ignore during unmount
            }
          });
          resizeObs.observe(el);
        } catch (err) {
          setWebglError(err instanceof Error ? err.message : 'WebGL initialization failed');
        }
      }

      init();
      return () => {
        disposed = true;
        resizeObs?.disconnect();
        try {
          viewerRef.current?.clear();
        } catch {
          // ignore
        }
        viewerRef.current = null;
      };
    }, []);

    // Render structure whenever dataset, style options, theme, or selection change
    useEffect(() => {
      let active = true;

      async function renderScene() {
        const viewer = viewerRef.current;
        if (!viewer) return;
        const $3Dmol = await import('3dmol');
        if (!active || !viewerRef.current) return;

        viewer.setBackgroundColor(isDark ? '#0B0E17' : '#F3F5F9', 1);
        viewer.removeAllModels();
        viewer.removeAllLabels();
        viewer.removeAllShapes();
        viewer.removeAllSurfaces();

        viewer.addModel(dataset.rawStructureText, dataset.format);

        const interfaceSet = new Set<string>();
        for (const c of dataset.contacts.slice(0, 65)) {
          interfaceSet.add(`${c.resA.chain}:${c.resA.resSeq}`);
          interfaceSet.add(`${c.resB.chain}:${c.resB.resSeq}`);
        }

        if (colorMode === 'plddt') {
          viewer.setStyle(
            {},
            {
              cartoon: {
                colorfunc: (atom: { b: number }) => plddtColor(atom.b <= 1.05 ? atom.b * 100 : atom.b),
                thickness: 0.42,
              },
              ...(showSticks ? { stick: { radius: 0.11, colorscheme: 'Jmol', opacity: 0.6 } } : {}),
            }
          );
        } else if (colorMode === 'chain') {
          dataset.chains.forEach((ch, idx) => {
            viewer.setStyle(
              { chain: ch.id },
              {
                cartoon: {
                  color: CHAIN_COLORS[idx % CHAIN_COLORS.length],
                  thickness: 0.44,
                },
                ...(showSticks
                  ? { stick: { radius: 0.11, color: CHAIN_COLORS[idx % CHAIN_COLORS.length], opacity: 0.65 } }
                  : {}),
              }
            );
          });
        } else {
          dataset.chains.forEach((ch, idx) => {
            viewer.setStyle(
              { chain: ch.id },
              {
                cartoon: {
                  color: CHAIN_COLORS[idx % CHAIN_COLORS.length],
                  opacity: 0.34,
                  thickness: 0.36,
                },
              }
            );
          });
          for (const key of interfaceSet) {
            const [chain, seqStr] = key.split(':');
            const resi = parseInt(seqStr, 10);
            const chIdx = dataset.chains.findIndex((c) => c.id === chain);
            viewer.addStyle(
              { chain, resi },
              {
                cartoon: { color: CHAIN_COLORS[Math.max(0, chIdx) % CHAIN_COLORS.length], opacity: 1 },
                stick: { radius: 0.17, color: CHAIN_COLORS[Math.max(0, chIdx) % CHAIN_COLORS.length] },
              }
            );
          }
        }

        if (showSurface) {
          dataset.chains.forEach((ch, idx) => {
            viewer.addSurface(
              $3Dmol.SurfaceType.VDW,
              {
                opacity: isDark ? 0.22 : 0.18,
                color: CHAIN_COLORS[idx % CHAIN_COLORS.length],
              },
              { chain: ch.id }
            );
          });
        }

        if (selectedPair) {
          const { a, b } = selectedPair;
          viewer.addStyle(
            { chain: a.chain, resi: a.resSeq },
            { stick: { radius: 0.26, color: '#FFD60A' }, sphere: { radius: 0.48, color: '#FFD60A' } }
          );
          viewer.addLabel(`${a.chain}:${a.aa}${a.resSeq} (${a.plddt})`, {
            position: { x: a.ca[0], y: a.ca[1], z: a.ca[2] },
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            fontColor: '#FFD60A',
            fontSize: 11,
            borderRadius: 6,
            inFront: true,
          });

          if (b && (b.chain !== a.chain || b.resSeq !== a.resSeq)) {
            viewer.addStyle(
              { chain: b.chain, resi: b.resSeq },
              { stick: { radius: 0.26, color: '#30D158' }, sphere: { radius: 0.48, color: '#30D158' } }
            );
            viewer.addLabel(`${b.chain}:${b.aa}${b.resSeq} (${b.plddt})`, {
              position: { x: b.ca[0], y: b.ca[1], z: b.ca[2] },
              backgroundColor: 'rgba(15, 23, 42, 0.9)',
              fontColor: '#30D158',
              fontSize: 11,
              borderRadius: 6,
              inFront: true,
            });
            viewer.addCylinder({
              start: { x: a.cb[0], y: a.cb[1], z: a.cb[2] },
              end: { x: b.cb[0], y: b.cb[1], z: b.cb[2] },
              radius: 0.13,
              color: '#64D2FF',
              dashed: true,
            });
          }
        }

        viewer.setClickable({}, true, (atom) => {
          const found = datasetRef.current.residues.find(
            (r) => r.chain === atom.chain && r.resSeq === atom.resi
          );
          if (found) onSelectRef.current(found);
        });

        viewer.zoomTo(undefined, 0);
        viewer.render();
      }

      const id = setTimeout(renderScene, 50);
      return () => {
        active = false;
        clearTimeout(id);
      };
    }, [dataset, colorMode, showSurface, showSticks, selectedPair, isDark]);

    useEffect(() => {
      try {
        viewerRef.current?.spin(spinning ? 'y' : false, 0.5);
      } catch {
        // noop
      }
    }, [spinning]);

    const downloadQuickPng = () => {
      const uri = viewerRef.current?.pngURI();
      if (!uri) return;
      const a = document.createElement('a');
      a.href = uri;
      a.download = `${dataset.id}-3d-view.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    };

    return (
      <div className="flex h-full flex-col">
        {/* Toolbar */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <SegmentedControl
            layoutId="mol3d-color-mode"
            size="xs"
            value={colorMode}
            onChange={setColorMode}
            options={[
              { value: 'plddt', label: 'pLDDT' },
              { value: 'chain', label: 'Chains' },
              { value: 'interface', label: dataset.metrics.isMonomer ? 'Core' : 'Interface' },
            ]}
          />

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowSticks((v) => !v)}
              className={`apple-button-secondary inline-flex cursor-pointer items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-medium ${
                showSticks ? 'ring-1 ring-sky-500/60 text-sky-500' : ''
              }`}
              title="Toggle all-atom sidechain sticks"
            >
              Sticks
            </button>
            <button
              type="button"
              onClick={() => setShowSurface((v) => !v)}
              className={`apple-button-secondary inline-flex cursor-pointer items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-medium ${
                showSurface ? 'ring-1 ring-sky-500/60 text-sky-500' : ''
              }`}
              title="Toggle molecular surface"
            >
              <Layers className="h-3.5 w-3.5" />
              Surface
            </button>
            <button
              type="button"
              onClick={() => setSpinning((v) => !v)}
              className={`apple-button-secondary inline-flex cursor-pointer items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-medium ${
                spinning ? 'ring-1 ring-sky-500/60 text-sky-500' : ''
              }`}
              title="Toggle turntable rotation"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${spinning ? 'animate-spin' : ''}`} />
              Spin
            </button>
            {selectedPair && (
              <button
                type="button"
                onClick={zoomToSelection}
                className="apple-button-secondary inline-flex cursor-pointer items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-medium"
                title="Focus selected residue pair"
              >
                <Focus className="h-3.5 w-3.5" />
                Focus
              </button>
            )}
            <button
              type="button"
              onClick={downloadQuickPng}
              className="apple-button-secondary inline-flex cursor-pointer items-center rounded-full p-1.5"
              title="Download transparent 3D snapshot PNG"
            >
              <Camera className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => viewerRef.current?.zoomTo(undefined, 360)}
              className="apple-button-secondary inline-flex cursor-pointer items-center rounded-full p-1.5"
              title="Reset 3D camera"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* 3D Canvas Container */}
        <div className="relative min-h-[360px] flex-1 overflow-hidden rounded-2xl border border-[var(--border-hairline)] bg-[#0B0E17]">
          <div ref={containerRef} className="h-full min-h-[360px] w-full" />

          {webglError && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-950/90 p-6 text-center text-sm text-slate-300">
              WebGL viewport unavailable: {webglError}
            </div>
          )}

          {/* Floating Legend Overlay */}
          <div className="pointer-events-none absolute bottom-3 left-3 flex flex-wrap items-center gap-2 rounded-full bg-black/62 px-3 py-1.5 text-[10.5px] font-medium text-slate-200 backdrop-blur-md">
            {colorMode === 'plddt' ? (
              <>
                <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#0A84FF]" />&gt;90</span>
                <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#5AC8FA]" />70–90</span>
                <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#FFD60A]" />50–70</span>
                <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#FF6B4A]" />&lt;50</span>
              </>
            ) : (
              dataset.chains.map((ch, idx) => (
                <span key={ch.id} className="inline-flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: CHAIN_COLORS[idx % CHAIN_COLORS.length] }}
                  />
                  Chain {ch.id} {ch.label ? `(${ch.label})` : ''}
                </span>
              ))
            )}
          </div>

          <div className="pointer-events-none absolute top-3 right-3 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-medium text-slate-300 backdrop-blur-md">
            Drag to orbit · Scroll to zoom · Click residue to sync
          </div>
        </div>
      </div>
    );
  }
);

Mol3DViewport.displayName = 'Mol3DViewport';
