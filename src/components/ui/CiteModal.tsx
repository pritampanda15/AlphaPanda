import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BookMarked, Check, Copy, ExternalLink, X, GraduationCap } from 'lucide-react';
import { APPLE_SPRING, SegmentedControl } from './ApplePrimitives';

type CiteFormat = 'bibtex' | 'plain' | 'methods';

interface CiteModalProps {
  open: boolean;
  onClose: () => void;
}

const CITATIONS: Record<CiteFormat, { label: string; text: string }> = {
  bibtex: {
    label: 'BibTeX Entry',
    text: `@software{panda2026alphapanda,
  author  = {Panda, Pritam Kumar},
  title   = {AlphaPanda Studio: Structural Biology \\& AI Folding Workstation},
  year    = {2026},
  url     = {https://github.com/pritampanda15/AlphaPanda},
  note    = {Web application: https://pritampanda15.github.io/AlphaPanda/}
}`,
  },
  plain: {
    label: 'Journal Citation',
    text: `Panda, P. K. (2026). AlphaPanda Studio: Structural Biology & AI Folding Workstation [Web software]. GitHub. https://github.com/pritampanda15/AlphaPanda (Live app: https://pritampanda15.github.io/AlphaPanda/)`,
  },
  methods: {
    label: 'Methods Section Boilerplate',
    text: `Predicted protein structures and complex interfaces were inspected and visualized using AlphaPanda Studio (https://pritampanda15.github.io/AlphaPanda/), which integrates interactive 3Dmol.js molecular rendering (Rego & Koes, 2015), Predicted Aligned Error (PAE) and per-residue pLDDT confidence segmentation, and automated interface scoring including pDockQ (Bryant et al., 2022) and CB–CB contact classification. Multiple sequence alignments with secondary structure and Shannon information sequence-logo tracks were formatted for publication SVG export, and missense variants were triaged using live UniProtKB/AlphaFold DB coordinates, relative solvent accessibility, Grantham distance (Grantham, 1974), and BLOSUM62 substitution scores.`,
  },
};

export const CiteModal: React.FC<CiteModalProps> = ({ open, onClose }) => {
  const [format, setFormat] = useState<CiteFormat>('bibtex');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(CITATIONS[format].text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4 backdrop-blur-md"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={APPLE_SPRING}
            onClick={(e) => e.stopPropagation()}
            className="apple-glass w-full max-w-[620px] overflow-hidden rounded-[24px] p-5 sm:p-6"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-500/14 text-sky-500">
                  <BookMarked className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-[17px] font-bold tracking-tight text-[var(--text-primary)]">
                    Cite AlphaPanda Studio
                  </h2>
                  <p className="text-[12px] text-[var(--text-tertiary)]">
                    Free for academic &amp; non-commercial research · Copy citation or Methods text
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="apple-button-secondary inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full"
                aria-label="Close citation dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              <SegmentedControl
                layoutId="cite-format-tabs"
                size="xs"
                value={format}
                onChange={(v) => {
                  setFormat(v);
                  setCopied(false);
                }}
                options={[
                  { value: 'bibtex', label: 'BibTeX' },
                  { value: 'plain', label: 'Journal Citation' },
                  { value: 'methods', label: 'Methods Paragraph' },
                ]}
              />

              <button
                type="button"
                onClick={handleCopy}
                className="apple-button-primary inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-semibold"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copied!' : 'Copy Text'}
              </button>
            </div>

            <pre className="font-mono-code mt-3.5 max-h-[240px] overflow-auto whitespace-pre-wrap rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-subtle)] p-4 text-[12px] leading-relaxed text-[var(--text-primary)]">
              {CITATIONS[format].text}
            </pre>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border-hairline)] pt-3.5 text-[11.5px] text-[var(--text-tertiary)]">
              <span className="inline-flex items-center gap-1.5">
                <GraduationCap className="h-4 w-4 text-emerald-500" />
                Academic &amp; Non-Commercial Research License (Not for Clinical Diagnosis)
              </span>
              <a
                href="https://github.com/pritampanda15/AlphaPanda/blob/main/LICENSE"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-sky-500 hover:underline"
              >
                View License
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
