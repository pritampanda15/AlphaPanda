# AlphaPanda Studio

> **Structural Biology & AI Folding Workstation** — Synchronized 3D Confidence & Interface Explorer, Modern Vector MSA Conservation Publisher, and 3D Variant Structural Triage Cards.

[![Deploy to GitHub Pages](https://github.com/pritampanda15/AlphaPanda/actions/workflows/deploy.yml/badge.svg)](https://github.com/pritampanda15/AlphaPanda/actions/workflows/deploy.yml)
[![License: Academic Only](https://img.shields.io/badge/License-Academic%20%26%20Non--Commercial%20Only-0A84FF.svg)](./LICENSE)

**Live Web App (GitHub Pages):** **[https://pritampanda15.github.io/AlphaPanda/](https://pritampanda15.github.io/AlphaPanda/)**

> **Academic Research Purpose Only:** AlphaPanda Studio is released strictly for **non-commercial academic research, teaching, and scientific education**. It is not intended for commercial use or clinical diagnosis. See [LICENSE](./LICENSE) for full terms.

---

## Why AlphaPanda Studio?

Modern structural biology runs on AI structure predictors (**AlphaFold 3**, **ColabFold**, **Boltz-2**), multiple sequence alignments, and rapid variant triage — yet researchers still jump between dated desktop viewers, Python notebooks, and ad-hoc web databases just to check an interface or assemble a clean figure.

**AlphaPanda Studio** brings all three daily workflows into a single, **100% client-side** Apple-styled workstation that runs directly in your browser. Your uploaded `.cif`, `.pdb`, `.json`, and `.fasta` files **never leave your machine**.

---

## Modules & How to Use Each Tool

### 1. AlphaFold3 / ColabFold / Boltz-2 Confidence & Interface Explorer

Evaluate whether a predicted protein-protein complex interface (or single globular domain) is real or an artifact, and export clean multi-panel figures in one click.

**How to use it:**
1. **Try built-in real globular proteins immediately:**
   - **KRAS Whole Domain · RAF1 (RBD + CRD)** (`PDB 6XI7`, 295 aa) — full Rossmann-fold GTPase + effector signaling interface.
   - **LRP4 6-Bladed β-Propeller · Agrin LG3** (`PDB 3V65`, 521 aa) — iconic 6-bladed YWTD β-propeller bound to Agrin.
   - **KRAS G12D Whole GTPase Domain** (`PDB 5USJ`, 165 aa monomer) — switches automatically into single-domain globular fold mode (`pTM`, `Mean pLDDT`, long-range core contacts `|Δi| ≥ 12`, oncogenic `Asp12` highlighted).
   - **PD-1 · PD-L1 Immune Checkpoint** (`PDB 4ZQK`, 221 aa IgV heterodimer).
   - **MDM2 SWIB Cleft · p53-TAD Helix** (`PDB 1YCR`, 98 aa).
2. **Upload your own AI folding outputs:**
   - Drag and drop (or click the drop zone to select) a structure file (`.cif`, `.mmcif`, or `.pdb`) **together with** its confidence JSON (`.json`).
   - Automatically detects **AlphaFold 3** (`*_full_data_0.json` / `*_summary_confidences_0.json`), **ColabFold** (`*_scores_rank_001_*.json`), and **Boltz-2** (`confidence_*.json`).
3. **Or fetch any live structure by ID:**
   - Type any 4-character **RCSB PDB ID** (e.g., `6XI7`, `3V65`, `7RPZ`) or **UniProt Accession ID** (e.g., `O75096`, `P01116`) into the **Fetch 3D** search bar to pull coordinates directly from RCSB PDB or AlphaFold DB.
4. **Explore synchronously:**
   - **Click any off-diagonal cell in the PAE Heatmap**, **any residue on the pLDDT curve**, or **any row in the Contact Table** — the 3Dmol WebGL viewport automatically highlights the residue pair with sticks, labels, and a distance bridge.
   - Use the **Cutoff slider** (4.5–9.5 Å) and **Interaction Type filter** (*Salt Bridge*, *Hydrogen Bond*, *Hydrophobic*, *Aromatic π-Stack*, *Polar Contact*) to inspect key stabilizing contacts.
   - Switch 3D modes between `pLDDT`, `Chains`, and `Interface` (or `Core` for monomers), plus `Sticks`, `Surface`, `Spin`, and camera snapshot.
5. **Export publication figures:**
   - Click **Export Figure SVG** or **300-DPI PNG** to download a four-panel Nature/Cell-style composite figure (3D snapshot + PAE heatmap + pLDDT track + automated metrics & top contacts), or **Contacts CSV** for tabular analysis.

---

### 2. Modern MSA & Sequence Conservation Publisher

Create publication-ready multiple sequence alignment figures with secondary structure cartoons, WebLogo sequence logos, and mutation callouts — without fighting legacy Java viewers.

**How to use it:**
1. **Load an alignment:**
   - Explore the curated alignments (**LRP4 / LRP5 / LRP6 YWTD β-Propeller Blades**, **Human Protein Kinase HRD · DFG**, **Serine Protease Catalytic Triad**, and **Sarbecovirus Spike RBD**).
   - Or click **Upload FASTA/Clustal** (`.fasta`, `.fa`, `.aln`, `.clustal`) or **Paste MSA** to load your own alignment live.
2. **Customize publication styling & tracks:**
   - Switch between 5 palettes: **AlphaPanda**, **ESPript Red**, **ClustalX**, **Hydropathy**, and **Conservation**.
   - Toggle **Secondary Structure** (red α-helix spirals & blue β-strand arrows), **Sequence Logo (Bits)** (Shannon information content), and **Conservation Bars**.
   - **Edit secondary structure directly:** click any position along the `Sec. Struct.` ribbon to cycle `α-Helix → β-Strand → Coil`.
   - **Pin mutations or active sites:** click any alignment residue cell to attach a color-coded callout pin (*Mutation*, *Active Site*, or *Conserved Motif*).
   - **Highlight conserved motifs:** type any regular expression in the motif box (e.g., `YW[TSVA]D|YWPN` or `HRD|DFG`).
3. **Export:**
   - Click **Export Publication SVG** (fully editable in Adobe Illustrator, Affinity Designer, Inkscape, or Keynote), **PNG**, or **Consensus** (copies consensus FASTA to clipboard).

---

### 3. Variant / Mutation Structural Triage Cards

Rapidly triage missense variants by combining 3D structural exposure, AlphaFold confidence, active-site proximity, biophysical shifts, and database links.

**How to use it:**
1. **Select a clinical preset or query any protein:**
   - Choose a built-in preset (**TP53**, **KRAS Whole GTPase Domain**, **LRP4 β-Propeller Ectodomain**, **EGFR**, **BRCA1**), or enter **any UniProt Accession ID** (e.g., `P04637`, `O75096`, `P01116`) + comma/space-separated missense variants (e.g., `R175H, Y220C, R248Q, R273H`).
   - Click **Fetch Live UniProt & AFDB** to retrieve live UniProtKB domain/active-site annotations and full AlphaFold DB 3D coordinates for real 3D solvent accessibility (RSA) and spatial Ångström distance calculations.
2. **Inspect in 3D & domain context:**
   - Review the collision-free **Domain Architecture & Variant Lollipop Map** alongside the interactive **3D Globular Mutation Spotlight**.
   - Click any lollipop pin or triage card to fly the 3D spotlight camera directly onto that mutated sidechain.
3. **Review biophysical & clinical context:**
   - Each card reports a composite Risk Index, burial state (`Buried Core` / `Partially Buried` / `Surface Exposed`, RSA %), local pLDDT, **Grantham distance**, **BLOSUM62**, **ΔVolume (Å³)**, charge transition, nearest functional site distance (Å), structural disruption flags, and 1-click links to **UniProt**, **AlphaFold DB**, **ClinVar**, **gnomAD**, and **RCSB PDB**.
4. **Export triage reports:**
   - Download crisp **Cards SVG**, **PNG**, or a structured **Markdown** summary table.

---

### 4. How It Works — Plain-English Diffusion & AlphaFold Primer

An interactive visual classroom designed for students, clinicians, and wet-lab biologists who want crystal-clear intuition without heavy equations:

- **Interactive Diffusion Denoising Playground:** Play or scrub from `100% Random Noise → 0% Folded Protein` across multiple random seeds to see *why* compact globular cores score high `pLDDT` while disordered tails diverge into low-`pLDDT` loops.
- **4-Step AlphaFold Mechanism:** Plain-English cards with everyday analogies covering Evolutionary Clues (MSA), Pairformer Distance Brain, All-Atom Diffusion vs. Rigid Frames, and Self-Grading Confidence (`pLDDT`, `PAE`, `ipTM`).
- **AF2 vs. AF3 vs. Boltz-2 Cheat Sheet & Prediction Troubleshooter:** Quickly diagnose common visual artifacts (*Blue Domains + White PAE*, *Orange Spaghetti Ribbon*, *Disordered Tail ipTM Dilution*, and *Low pLDDT Everywhere*).
- **Plain English / Expert Toggle** on the Explorer page lets beginners view friendly metric labels (`Partner Fit Score`, `Packing Wobble`, `Docking Trust`) alongside exact scientific scores.

---

### Quick Keyboard Navigation

- Press **`⌘K`** (macOS) or **`Ctrl+K`** (Windows/Linux) anywhere to open the **Spotlight Quick Jump** palette — switch modules, load KRAS G12D / LRP4 / PD-1·PD-L1 structures, jump to clinical triage presets, or toggle Dark / Light Studio mode.

---

## Local Development

**Prerequisites:** Node.js `>= 20` and `pnpm` (or `npm`).

```bash
git clone https://github.com/pritampanda15/AlphaPanda.git
cd AlphaPanda
pnpm install
pnpm dev
```

Build the static production bundle (output to `./dist`, configured with relative `./` paths for GitHub Pages):

```bash
pnpm build
pnpm preview
```

---

## GitHub Pages Deployment

Deployment is automated via [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml). Every push to the `main` branch builds the Vite production bundle and publishes `./dist` to GitHub Pages automatically.

---

## Data Attribution & Privacy

- **Client-Side Privacy:** All user-uploaded structure files (`.cif`, `.pdb`), PAE/pLDDT JSON files, and FASTA/Clustal alignments are processed exclusively in browser memory and never uploaded to any third-party server.
- **Public APIs (optional live fetches):** Live ID lookups query public read-only endpoints at [UniProtKB](https://www.uniprot.org/), [AlphaFold Protein Structure Database](https://alphafold.ebi.ac.uk/), and [RCSB PDB](https://www.rcsb.org/).
- **Bundled Static Globular Examples:** Derived from public experimental structures deposited in the RCSB PDB (`5USJ`, `6XI7`, `3V65`, `4ZQK`, `1YCR`, `2OCJ`).

---

## Citation & License

This project is licensed strictly for **Academic & Non-Commercial Research Purposes Only** — see [LICENSE](./LICENSE).

If you use AlphaPanda Studio in your academic research, teaching, or publications, please cite:

```bibtex
@software{panda2026alphapanda,
  author  = {Panda, Pritam Kumar},
  title   = {AlphaPanda Studio: Structural Biology \& AI Folding Workstation},
  year    = {2026},
  url     = {https://github.com/pritampanda15/AlphaPanda}
}
```
