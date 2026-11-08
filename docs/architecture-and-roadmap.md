# Kashef — Architecture, Real Tech Stack & 4-Phase Roadmap

---

## 1. Actual Tech Stack Specification

| Concern | Production Choice | Rationale & Realized Architecture |
| :--- | :--- | :--- |
| **Framework** | **Next.js 15 (App Router)** | Retained in-repo. Built-in Node.js server route handlers (`/api/extract`, `/api/analyze`), streaming body processing, zero client credential leakage, and seamless Vercel deployment. |
| **Runtime & Language** | **Node.js 24 + TypeScript 5 (Strict Mode)** | Full end-to-end type safety, native DNS promise lookup, buffer streaming, and strict contracts (`DetectorEngine`). |
| **Styling & Design System** | **Tailwind CSS 3.4 + CSS Design Tokens** | Extracted directly from `ehc-obgyn-guidelines` and `AIFV`. Clean light (`#1a5c8a`) and dark (`#4da8da`) modes, 3 distinct classification tiers (Human, Mixed, High AI), WCAG AA contrast. |
| **Icons** | **Lucide React** | Consistent iconography matching Dr. Raouf Roshdy's medical AI suite. |
| **Document Text Extraction** | **`mammoth`** (.docx) & **`unpdf`** (.pdf) | In-memory stream parsing without disk persistence. Clear `NO_TEXT_LAYER` exception for scanned image PDFs. |
| **URL Extraction** | **`@mozilla/readability` + `jsdom`** | Isolates core article content, stripping boilerplate, ads, and navigation. |
| **Security & SSRF Mitigation** | **Custom Multi-Layer SSRF Guard** (`src/lib/extractors/ssrf.ts`) | Blocks loopback, RFC 1918 private subnets, link-local (169.254.169.254), IPv6 equivalents, integer/hex encoded IPs, and validates DNS records on **every redirect** up to a 3-hop cap. |
| **Language Detection** | **`franc-min`** (ISO 639-3) | Rapid statistical language detection (validates English `eng`, identifies Arabic `arb`, issues unsupported language warnings). |
| **Validation** | **`zod`** | Schema validation for URL payloads, form requests, and structured LLM responses. |
| **Testing** | **`vitest`** | Fast unit testing for SSRF blocking, extractor integrity, and detection math. |

---

## 2. Real Folder Structure

```
kashef/
├── docs/
│   ├── design-tokens.md            # Extracted tokens with 3 distinct classification tiers
│   ├── architecture-and-roadmap.md # Real tech stack & roadmap
│   └── input-pipeline.md           # Step 1 implementation report
├── public/
│   ├── dr-raouf-roshdy.jpg         # Lead investigator avatar
│   └── favicon.ico
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── extract/
│   │   │   │   └── route.ts        # In-memory extraction (docx, pdf, SSRF-safe URL)
│   │   │   └── analyze/
│   │   │       └── route.ts        # Modular detector route (Phases 2-4)
│   │   ├── globals.css             # Tiered color tokens, dark mode, typography
│   │   ├── layout.tsx              # Root layout with LTR/RTL support structure
│   │   ├── page.tsx                # Hero, tagline Option A, input tabs
│   │   └── privacy/
│   │       └── page.tsx            # Ephemeral data privacy statement
│   ├── components/
│   │   ├── Header.tsx              # EHC 3-zone header pattern with theme toggle
│   │   ├── Footer.tsx              # EHC 3-line footer pattern with honesty disclaimer
│   │   └── InputTabs.tsx           # Accessible 44px tap-target tabs
│   ├── hooks/
│   │   └── use-theme.ts            # AIFV localStorage theme synchronization hook
│   └── lib/
│       ├── extractors/
│       │   ├── docx.ts             # Mammoth in-memory docx parser
│       │   ├── pdf.ts              # unpdf in-memory parser with text-layer validation
│       │   ├── ssrf.ts             # Strict SSRF, DNS check, and encoded IP blocker
│       │   ├── url.ts              # Readability extractor with per-redirect SSRF check
│       │   └── utils.ts            # Word counting & franc-min language check
│       └── detectors/              # Phase 2 detector modules
├── eslint.config.mjs
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

---

## 3. Four-Phase Task Roadmap

### Phase 1: Input Pipeline & Extraction (Completed)
- [x] **1.1 Design System & Tokens**: Updated with distinct Crimson "High AI" tier and Option A tagline.
- [x] **1.2 In-Memory Input Pipeline**: `POST /api/extract` handling `.docx`, `.pdf` (`unpdf`), and URL (`readability` + `jsdom`).
- [x] **1.3 Exhaustive SSRF & Redirect Guard**: Validates schemes, blocks loopback/private/cloud metadata/encoded IPs, re-checks on every redirect up to 5 hops.
- [x] **1.4 Language & Length Constraints**: Minimum 250 words rule; `franc-min` language detection.
- [x] **1.5 Unit Test Suite**: Comprehensive vitest coverage for extraction, SSRF, redirects, and limits.

### Phase 2: Modular Detection Engines (Behind One Interface)
- [ ] **2.1 Detector Contract**: Strict TypeScript interface `analyze(text: string): Promise<DetectionResult>`.
- [ ] **2.2 Engine A (Statistical Signals)**: Sentence-length variance, burstiness proxy, vocabulary diversity (TTR), punctuation profile, and n-gram repetition.
- [ ] **2.3 Engine B (Server-Side LLM Classifier)**: Server-side API key isolation (`.env.local`), structured JSON via zod, fallback to Engine A, per-IP rate limiting.
- [ ] **2.4 Range & Confidence Combiner**: Produces probabilistic likelihood ranges, confidence scoring, and limitations notice.

### Phase 3: Evaluation Harness & Benchmark Suite
- [ ] **3.1 Evaluation Dataset**: Curated benchmark with labeled human text, pure AI text, blended/edited AI, and non-native English.
- [ ] **3.2 Metrics Harness**: Measures accuracy, false-positive rate, and false-negative rate per engine without inflating claims.
- [ ] **3.3 "About the Method" Page**: Public documentation of measured benchmark figures.

### Phase 4: Results Visualization & Multi-Format Export
- [ ] **4.1 Likelihood Gauge**: Visual range display with probabilistic language ("likely", "possibly").
- [ ] **4.2 Paragraph Heat-Map**: Granular paragraph highlighting utilizing the 3 distinct color tiers.
- [ ] **4.3 Plain-Language Signal Breakdown**: Informative diagnostic cards explaining contributing signals.
- [ ] **4.4 Multi-Format Export**: Follows AIFV export pattern (PDF print layout, JSON, and Markdown downloads).
