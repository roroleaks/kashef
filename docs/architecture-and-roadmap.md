# Kashef — Architecture, Tech Stack & 4-Phase Roadmap

---

## 1. Proposed Tech Stack & Rationale

| Layer / Concern | Selection | Consistency with Existing Repos & Rationale |
| :--- | :--- | :--- |
| **Framework** | **Next.js 15+ (App Router)** | Consistent with `AIMed` and `AIPICO-app`. Built-in serverless edge/Node API routes, native streaming support, SSR for SEO, zero-configuration Vercel deployment. |
| **Language** | **TypeScript 5 (Strict Mode)** | Consistent with all modern repos (`AIMed`, `AIPICO-app`, `roshdy-med-suite`). Guarantees strong typing for modular detector interfaces (`DetectorEngine`, `DetectionResult`). |
| **Styling** | **Tailwind CSS + CSS Design Tokens** | Consistent with `roshdy-med-suite`, `AIMed`, and `Sysrevai`. Provides standard Sysrevai CSS tokens (`--accent`, `--ink`, `--bg`, `--good`, `--warn`) with high-contrast utility classes. |
| **Icons** | **Lucide React** | Consistent with `roshdy-med-suite`, `AIMed`, and `Sysrevai`. Clean, accessible SVG iconography. |
| **Document Text Extraction** | **`mammoth`** (.docx) & **`pdf-parse` / `unpdf`** (.pdf) | Zero-footprint in-memory buffer processing without disk persistence. Fallback detection for scanned PDFs lacking digital text layers. |
| **URL Article Extraction** | **`@mozilla/readability` + `jsdom`** | Server-side DOM parsing to cleanly isolate main article bodies and discard menus, advertisements, navigation bars, and footers. |
| **Security & SSRF Mitigation** | **`ip-address` + DNS validation** | Blocks private RFC-1918 ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16), loopback (127.0.0.1), link-local, and cloud metadata endpoints (169.254.169.254). Strict timeout (8s) and size limits (10MB). |
| **Schema Validation** | **Zod** | Consistent with `AIMed` and `Sysrevai` for runtime request validation. |
| **PDF Report Generation** | **`pdfkit` or `@react-pdf/renderer`** | Consistent with `AIMed` and `AIPICO-app` for deterministic client/server export. |

---

## 2. Proposed Folder Structure

```
kashef/
├── docs/
│   ├── design-tokens.md          # Extracted tokens & UI specification
│   └── architecture-and-roadmap.md # Tech stack, folder structure & phase roadmap
├── public/
│   ├── dr-raouf.jpg              # Lead investigator avatar
│   └── favicon.ico
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── extract/
│   │   │   │   ├── file/route.ts # .docx & .pdf multipart in-memory parsing
│   │   │   │   └── url/route.ts  # Hardened SSRF-safe URL reader & readability
│   │   │   ├── analyze/
│   │   │   │   └── route.ts      # Modular detector orchestration endpoint
│   │   │   └── export-pdf/
│   │   │       └── route.ts      # Server-side PDF generation for report download
│   │   ├── globals.css           # Extracted Sysrevai/Preppt design tokens & base rules
│   │   ├── layout.tsx            # Root layout with LTR/RTL support structure & metadata
│   │   ├── page.tsx              # Landing page, hero, input tabs, & results container
│   │   └── privacy/
│   │       └── page.tsx          # In-memory ephemeral privacy statement
│   ├── components/
│   │   ├── Header.tsx            # Standardized brand header, author badge & GitHub link
│   │   ├── Footer.tsx            # Mandatory disclaimer banner, credits & legal links
│   │   ├── InputTabs.tsx         # Upload / URL / Paste tabbed interface
│   │   ├── ResultsView.tsx       # Probability gauge, heat-map, signal breakdown
│   │   ├── ParagraphHeatMap.tsx  # Granular paragraph score visualization
│   │   ├── SignalCard.tsx        # Statistical proxy & LLM explanation cards
│   │   └── GithubIcon.tsx        # Inline SVG icon
│   └── lib/
│       ├── detectors/
│       │   ├── types.ts          # Unified DetectorEngine & AnalysisResult interfaces
│       │   ├── statistical.ts    # Engine A: Perplexity, burstiness, variance, vocab diversity
│       │   ├── llm-classifier.ts # Engine B: Server-side LLM evaluator (API-key protected)
│       │   └── orchestrator.ts   # Weighted ensemble combiner & confidence calculator
│       ├── extractors/
│       │   ├── docx.ts           # Mammoth text extractor
│       │   ├── pdf.ts            # Digital text-layer extractor & scanned layer detection
│       │   └── url.ts            # Readability extractor with SSRF filter & timeouts
│       └── utils/
│           ├── language-detect.ts# Word-count validator & language detector (warn if non-English)
│           └── text-stats.ts     # Syllable, sentence, token, and n-gram calculation helpers
├── .env.example                  # Environment template for LLM API keys
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

---

## 3. Four-Phase Task List with Acceptance Criteria

### Phase 1: Foundation, Design System & Input Pipeline Scaffold (Current)
- [x] **Task 1.1: Design Tokens Extraction & Specification**
  - *Acceptance Criteria*: Complete extraction of colors, typography, spacing, border radii, shadows, header/footer from existing repos into `/docs/design-tokens.md`. Explicit "Not found" section with zero invented tokens.
- [x] **Task 1.2: Repository & Tech Stack Proposal**
  - *Acceptance Criteria*: Scaffold GitHub repository `roroleaks/kashef` with Next.js 15, TypeScript, Tailwind, and matching brand identity.
- [x] **Task 1.3: UI Skeleton & Scaffolding**
  - *Acceptance Criteria*: Pixel-perfect header with Dr. Raouf Roshdy photo badge, empty 3-tab layout (Upload, URL, Paste), permanent honesty disclaimer footer, and ephemeral privacy page.
- [ ] **Task 1.4: In-Memory File & URL Extraction Services**
  - *Acceptance Criteria*:
    - `.docx` extraction using `mammoth` entirely in memory.
    - `.pdf` extraction using text-layer reader. If no text layer is found, return explicit error: *"No extractable text layer found (scanned image). OCR is planned for a later phase."*
    - URL reader validates protocol (HTTP/HTTPS only), resolves DNS, blocks private/local IPs (SSRF protection), applies 8s timeout and 10MB limit, strips boilerplate via readability.
    - Word counter rejects texts under 250 words with a user-friendly message.
    - Language detector checks for English and warns if unsupported.

---

### Phase 2: Modular Detection Engines (Statistical & LLM)
- [ ] **Task 2.1: Detector Interface & Modular Architecture**
  - *Acceptance Criteria*: Strict TypeScript contract `DetectorEngine` exposing `analyze(text: string): Promise<DetectionResult>`.
- [ ] **Task 2.2: Engine A — Statistical Proxy Signals**
  - *Acceptance Criteria*:
    - **Burstiness**: Sentence-length standard deviation and coefficient of variation.
    - **Perplexity proxy**: Tri-gram frequency distribution and common token transitional entropy.
    - **Vocabulary Diversity**: Type-Token Ratio (TTR) and Maas/Hapax legomena index.
    - **Repetition Index**: Repetitive syntactic n-grams and transition phrase redundancy.
    - Fully deterministic, run locally in Node.js server-side without external API calls.
- [ ] **Task 2.3: Engine B — Server-Side LLM Classifier**
  - *Acceptance Criteria*:
    - Calls external LLM classifier endpoint strictly server-side.
    - API keys isolated in server environment variables (`.env.local`), zero exposure to client bundles.
    - Resilient timeout (12s) and graceful degradation if the API is unavailable.
- [ ] **Task 2.4: Ensemble Combiner & Confidence Estimator**
  - *Acceptance Criteria*: Produces an overall probability range (e.g. "65% – 78% likely AI-assisted") rather than a single hard binary verdict. Calculates a transparent confidence level and limitations note.

---

### Phase 3: Results Visualization & Interactive Heat-Map UI
- [ ] **Task 3.1: Probability Gauge & Classification Range**
  - *Acceptance Criteria*: Responsive non-judgmental visual gauge labeled with probabilistic terminology ("Likely human-authored", "Mixed / Possibly AI-assisted", "Likely AI-generated").
- [ ] **Task 3.2: Per-Paragraph Heat-Map**
  - *Acceptance Criteria*: Splits document into paragraphs, computes individual proxy scores, and highlights them using Sysrevai alert scales (`--good-bg` for human-like, `--warn-bg` for mixed, `--danger-bg` for high AI likelihood). Clicking a paragraph reveals contributing factors.
- [ ] **Task 3.3: Plain-Language Signal Breakdown**
  - *Acceptance Criteria*: Expandable diagnostic cards explaining which specific linguistic factors (burstiness, lexical repetition, uniform sentence length) contributed to the score.
- [ ] **Task 3.4: PDF Report Export**
  - *Acceptance Criteria*: Downloadable PDF report containing the document metrics, paragraph breakdown, timestamp, and mandatory academic integrity disclaimer.

---

### Phase 4: Arabic Language Expansion & Hardening
- [ ] **Task 4.1: Arabic Language Support (RTL & Tokenization)**
  - *Acceptance Criteria*: Complete Arabic text tokenization, Arabic stopword filtering, Tashkeel/diacritics handling, and native RTL UI flip (`dir="rtl"`).
- [ ] **Task 4.2: WCAG 2.1 AA Accessibility & Keyboard Nav Audit**
  - *Acceptance Criteria*: 100% keyboard navigable tab panels, ARIA live regions for analysis status, minimum 4.5:1 text contrast across all badges and heat-map highlights.
- [ ] **Task 4.3: Automated Regression & Security Test Suite**
  - *Acceptance Criteria*: Unit tests verifying SSRF blocking against IPv4/IPv6 private ranges, text extraction parity tests for DOCX/PDF, and synthetic detection benchmark tests.
