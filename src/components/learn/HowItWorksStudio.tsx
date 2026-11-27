import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dna,
  Grid2x2,
  Sparkles,
  Award,
  ArrowRight,
  Stethoscope,
  CheckCircle2,
  Lightbulb,
} from 'lucide-react';
import { GlassCard, StatusPill, APPLE_EASE, APPLE_SPRING } from '../ui/ApplePrimitives';
import { DiffusionPlayground } from './DiffusionPlayground';

interface HowItWorksStudioProps {
  isDark: boolean;
  onJumpToExample: (presetId: string) => void;
}

const MECHANISM_STEPS = [
  {
    id: 0,
    stepNum: 'Step 1',
    title: 'Evolutionary Clues (MSA)',
    simpleTag: 'The Family-Tree Trick',
    icon: <Dna className="h-4 w-4 text-sky-400" />,
    analogy: 'Like comparing 500 family photos to see which two relatives always stand next to each other.',
    summary:
      'AlphaFold searches massive genetic databases to align your protein against evolutionary cousins from bacteria, plants, mice, and humans (an MSA).',
    keyInsight:
      'If position #33 mutates from a negative charge to a positive charge across species, and position #84 always flips to the opposite charge at the same time, evolution just gave away a secret: those two letters touch in 3D!',
    visualNote: 'Coevolving pairs → Hidden 3D contact clues',
  },
  {
    id: 1,
    stepNum: 'Step 2',
    title: 'The Distance Brain (Pairformer)',
    simpleTag: 'Building the 2D Relationship Grid',
    icon: <Grid2x2 className="h-4 w-4 text-sky-400" />,
    analogy: 'Like drawing a giant city mileage chart before trying to draw the actual map.',
    summary:
      'A neural network (Evoformer in AF2; streamlined Pairformer in AF3 & Boltz-2) reads the sequence and MSA clues to build a 2D table of every residue pair.',
    keyInsight:
      'It checks geometric logic called "triangle attention": if A is near B and B is near C, then A must be reasonably close to C. This 2D distance brain is also where the PAE heatmap comes from!',
    visualNote: '2D Pair Representation → Powers the PAE matrix',
  },
  {
    id: 2,
    stepNum: 'Step 3',
    title: '3D Sculpting (Diffusion)',
    simpleTag: 'Carving Atoms Out of Noise',
    icon: <Sparkles className="h-4 w-4 text-sky-400" />,
    analogy: 'AF2 snapped rigid Lego bricks together; AF3 & Boltz-2 sculpt marble out of 3D fog.',
    summary:
      'AlphaFold 2 built proteins using rigid amino-acid triangles (so it couldn’t easily handle small-molecule drugs or DNA). AlphaFold 3 & Boltz-2 replaced that with an all-atom Diffusion model.',
    keyInsight:
      'Starting from pure random atomic coordinates (try the playground above!), diffusion directly predicts 3D coordinates for every single atom—proteins, DNA, RNA, drugs, metals, and sugars—all in one unified step.',
    visualNote: 'All-Atom Diffusion → Proteins + DNA + RNA + Ligands together',
  },
  {
    id: 3,
    stepNum: 'Step 4',
    title: 'Self-Grading Homework',
    simpleTag: 'Confidence Head (pLDDT · PAE · ipTM)',
    icon: <Award className="h-4 w-4 text-sky-400" />,
    analogy: 'An honest scientist who highlights what they are sure about in blue and guesses in orange.',
    summary:
      'After sculpting the 3D atoms, a separate Confidence Head grades the result from multiple angles so you never have to trust a structure blindly.',
    keyInsight:
      'pLDDT grades each individual amino acid locally (0–100). PAE grades whether two domains or chains are locked together (0–30 Å). ipTM summarizes overall partner-docking confidence (0–1).',
    visualNote: 'High pLDDT + Dark-Green PAE + ipTM ≥ 0.75 = Trustworthy Complex',
  },
];

const TROUBLESHOOTER_CASES = [
  {
    id: 'high-plddt-white-pae',
    title: 'Blue Domains + White Off-Diagonal PAE',
    symptom: 'Each chain has high pLDDT (>85), but the cross-chain PAE blocks are pale/white (>15 Å).',
    diagnosis: 'Well-folded proteins that either do not bind, bind transiently, or sit on a flexible linker.',
    action: 'Do not trust the docked interface. Try truncating long flexible linkers or checking if a cofactor/partner chain is missing.',
    tone: 'amber' as const,
  },
  {
    id: 'orange-noodle',
    title: 'Orange / Red Spaghetti Ribbon (pLDDT < 50)',
    symptom: 'Long stretched-out loops colored yellow/orange/red with very low local confidence.',
    diagnosis: 'Usually NOT an AI failure—pLDDT < 50 is one of the strongest predictors of an intrinsically disordered region (IDR)!',
    action: 'Treat this region as a dynamic ensemble rather than a fixed shape. Avoid measuring exact distances or designing point mutations here.',
    tone: 'rose' as const,
  },
  {
    id: 'good-pae-low-iptm',
    title: 'Dark-Green Contact Patch, Yet Low ipTM (~0.55)',
    symptom: 'A small dark-green spot appears on the PAE heatmap, but global ipTM looks underwhelming.',
    diagnosis: 'Disordered tail dilution! Long unstructured N/C-terminal tails pull down the global ipTM average even when the binding cleft is real.',
    action: 'Inspect Mean i-PAE directly on the contacting patch (in AlphaPanda Segment 2) and re-fold just the interacting domains.',
    tone: 'blue' as const,
  },
  {
    id: 'low-everywhere',
    title: 'Low pLDDT Everywhere (< 60)',
    symptom: 'Even the core domain looks yellow/orange with poor pTM (< 0.50).',
    diagnosis: 'Shallow MSA (orphan/viral/de novo protein with few evolutionary cousins) or a genuinely unfolded protein.',
    action: 'Increase MSA depth (metagenomic databases / ColabFold MMseqs2), add binding partners/ions that stabilize folding, or try more recycles.',
    tone: 'amber' as const,
  },
];

export const HowItWorksStudio: React.FC<HowItWorksStudioProps> = ({
  isDark,
  onJumpToExample,
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [selectedCase, setSelectedCase] = useState(TROUBLESHOOTER_CASES[0].id);

  const currentStep = MECHANISM_STEPS[activeStep];
  const currentCase =
    TROUBLESHOOTER_CASES.find((c) => c.id === selectedCase) ?? TROUBLESHOOTER_CASES[0];

  return (
    <div className="space-y-6">
      {/* 1. Hero Interactive Diffusion Denoising Playground */}
      <GlassCard className="p-5 sm:p-6">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <StatusPill tone="blue">
              <Sparkles className="h-3 w-3" />
              Interactive Visual Intuition
            </StatusPill>
            <h2 className="mt-2 text-[22px] font-bold tracking-[-0.03em] text-[var(--text-primary)] sm:text-[26px]">
              How Diffusion Folds a Protein From Random Noise
            </h2>
            <p className="mt-1 max-w-3xl text-[13.5px] text-[var(--text-secondary)]">
              Drag the slider or hit <strong>Play</strong> to watch how AlphaFold 3 and Boltz-2 sculpt a 3D
              protein out of pure atomic static—and switch seeds to see why folded cores score high pLDDT while
              disordered tails stay fuzzy.
            </p>
          </div>
        </div>

        <DiffusionPlayground isDark={isDark} />
      </GlassCard>

      {/* 2. Plain-English 4-Step AlphaFold Mechanism Walkthrough */}
      <GlassCard className="p-5 sm:p-6" delay={0.05}>
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-[20px] font-bold tracking-[-0.025em] text-[var(--text-primary)]">
              The 4-Step AlphaFold Mechanism in Plain English
            </h2>
            <p className="text-[13px] text-[var(--text-secondary)]">
              Click through each stage from 1D amino-acid letters to a graded 3D atomic structure
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onJumpToExample('kras-g12d-domain')}
              className="apple-button-secondary inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-semibold"
            >
              See Real KRAS G12D Fold
              <ArrowRight className="h-3.5 w-3.5 text-sky-400" />
            </button>
            <button
              type="button"
              onClick={() => onJumpToExample('lrp4-agrin-complex')}
              className="apple-button-primary inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-semibold"
            >
              See Real LRP4 · Agrin Complex
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* 4 Interactive Step Pills */}
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {MECHANISM_STEPS.map((s) => {
            const active = s.id === activeStep;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setActiveStep(s.id)}
                className={`relative cursor-pointer rounded-2xl border p-3.5 text-left transition-all ${
                  active
                    ? 'border-sky-500/50 bg-sky-500/10 shadow-sm'
                    : 'border-[var(--border-hairline)] bg-[var(--bg-subtle)] hover:border-[var(--border-strong)]'
                }`}
              >
                {active && (
                  <motion.div
                    layoutId="mechanism-step-ring"
                    transition={APPLE_SPRING}
                    className="pointer-events-none absolute inset-0 rounded-2xl ring-2 ring-sky-500/45"
                  />
                )}
                <div className="flex items-center justify-between">
                  <span className="font-mono-code text-[10.5px] font-bold uppercase tracking-[0.08em] text-sky-500">
                    {s.stepNum}
                  </span>
                  {s.icon}
                </div>
                <div className="mt-1.5 text-[14px] font-bold text-[var(--text-primary)]">{s.title}</div>
                <div className="mt-0.5 text-[11.5px] text-[var(--text-tertiary)]">{s.simpleTag}</div>
              </button>
            );
          })}
        </div>

        {/* Expanded Plain-English Detail Box */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: APPLE_EASE }}
            className="mt-4 grid grid-cols-1 gap-4 rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-subtle)] p-4 sm:p-5 lg:grid-cols-12"
          >
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/14 px-2.5 py-0.5 text-[11px] font-semibold text-sky-600 dark:text-sky-300">
                <Lightbulb className="h-3 w-3" />
                Everyday Analogy
              </div>
              <p className="mt-2 text-[15px] font-semibold italic text-[var(--text-primary)]">
                “{currentStep.analogy}”
              </p>
              <p className="mt-2.5 text-[13.5px] leading-relaxed text-[var(--text-secondary)]">
                {currentStep.summary}
              </p>
            </div>
            <div className="flex flex-col justify-between rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-elevated-solid)] p-4 lg:col-span-5">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.07em] text-sky-500">
                  Why This Matters to You
                </div>
                <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--text-secondary)]">
                  {currentStep.keyInsight}
                </p>
              </div>
              <div className="mt-3 border-t border-[var(--border-hairline)] pt-2.5 font-mono-code text-[11px] font-semibold text-emerald-500">
                {currentStep.visualNote}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </GlassCard>

      {/* 3. Model Comparison Cheat Sheet + Interactive Troubleshooter */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* 10-Second Model Cheat Sheet */}
        <GlassCard className="p-5 lg:col-span-6" delay={0.08}>
          <h3 className="text-[17px] font-bold tracking-tight text-[var(--text-primary)]">
            AlphaFold 2 vs. AlphaFold 3 vs. Boltz-2
          </h3>
          <p className="mt-0.5 text-[12.5px] text-[var(--text-tertiary)]">
            Quick plain-English guide to picking the right folding model
          </p>

          <div className="mt-4 space-y-3">
            {[
              {
                name: 'AlphaFold 2 / ColabFold',
                badge: 'Rigid Amino-Acid Frames',
                color: 'text-[var(--text-primary)]',
                canFold: 'Proteins & protein-protein multimers',
                strength: 'Fast, battle-tested, ultra-reliable for single domains & classic protein complexes.',
                limit: 'Cannot natively fold small-molecule drugs, DNA, RNA, or covalent ligands.',
              },
              {
                name: 'AlphaFold 3',
                badge: 'All-Atom Diffusion',
                color: 'text-sky-500 dark:text-sky-400',
                canFold: 'Proteins + DNA + RNA + Ligands + Ions + PTMs',
                strength: 'Unified diffusion architecture predicts biomolecular complexes across chemistry in one shot.',
                limit: 'Can occasionally hallucinate confident-looking loops in disordered regions; check PAE!',
              },
              {
                name: 'Boltz-2',
                badge: 'Open Diffusion + Affinity',
                color: 'text-sky-500 dark:text-sky-400',
                canFold: 'Proteins + Nucleic Acids + Ligands + Binding Affinity',
                strength: 'Open-weights biomolecular diffusion model that also estimates ligand binding affinity.',
                limit: 'Like all diffusion models, run multiple random seeds to confirm interface consistency.',
              },
            ].map((row) => (
              <div key={row.name} className="apple-glass-subtle rounded-2xl p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className={`text-[14px] font-bold ${row.color}`}>{row.name}</span>
                  <span className="rounded-full bg-[var(--bg-elevated-solid)] px-2.5 py-0.5 text-[10.5px] font-semibold text-[var(--text-secondary)] ring-1 ring-[var(--border-hairline)]">
                    {row.badge}
                  </span>
                </div>
                <div className="mt-1.5 text-[12px] font-medium text-[var(--text-primary)]">
                  Folds: <span className="font-normal text-[var(--text-secondary)]">{row.canFold}</span>
                </div>
                <div className="mt-1 text-[12px] text-[var(--text-secondary)]">
                  <strong className="text-emerald-500">Best for:</strong> {row.strength}
                </div>
                <div className="mt-1 text-[11.5px] text-[var(--text-tertiary)]">
                  <strong>Watch out:</strong> {row.limit}
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Interactive "Why Does My Structure Look Like This?" Troubleshooter */}
        <GlassCard className="p-5 lg:col-span-6" delay={0.1}>
          <div className="flex items-center gap-2">
            <Stethoscope className="h-4.5 w-4.5 text-sky-500" />
            <h3 className="text-[17px] font-bold tracking-tight text-[var(--text-primary)]">
              Why Does My Prediction Look Like This?
            </h3>
          </div>
          <p className="mt-0.5 text-[12.5px] text-[var(--text-tertiary)]">
            Click a common visual symptom to see what it means and what to do next
          </p>

          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {TROUBLESHOOTER_CASES.map((c) => {
              const active = c.id === selectedCase;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCase(c.id)}
                  className={`cursor-pointer rounded-2xl border p-3 text-left transition-all ${
                    active
                      ? 'border-sky-500/50 bg-sky-500/10'
                      : 'border-[var(--border-hairline)] bg-[var(--bg-subtle)] hover:border-[var(--border-strong)]'
                  }`}
                >
                  <div className="text-[12.5px] font-bold text-[var(--text-primary)]">{c.title}</div>
                  <div className="mt-1 line-clamp-2 text-[11px] text-[var(--text-tertiary)]">
                    {c.symptom}
                  </div>
                </button>
              );
            })}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentCase.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2, ease: APPLE_EASE }}
              className="mt-4 rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-elevated-solid)] p-4"
            >
              <StatusPill tone={currentCase.tone}>{currentCase.title}</StatusPill>
              <div className="mt-3 space-y-2.5 text-[12.5px] leading-relaxed">
                <div>
                  <span className="font-bold text-[var(--text-primary)]">What you’re seeing: </span>
                  <span className="text-[var(--text-secondary)]">{currentCase.symptom}</span>
                </div>
                <div>
                  <span className="font-bold text-[var(--text-primary)]">What it actually means: </span>
                  <span className="text-[var(--text-secondary)]">{currentCase.diagnosis}</span>
                </div>
                <div className="flex items-start gap-2 rounded-xl bg-emerald-500/10 p-3 text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <strong className="font-bold">Recommended next step: </strong>
                    {currentCase.action}
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </GlassCard>
      </div>
    </div>
  );
};
