# Kashef (كاشف)

> **Probabilistic AI Text Estimation & Evidence Breakdown**  
> An open, transparent research tool for evaluating linguistic patterns and AI-generated text likelihood. Created by Dr. Raouf Roshdy.

---

## Overview

Kashef estimates the likelihood that a document was authored or co-authored by an artificial intelligence model. Rather than emitting an opaque verdict, Kashef evaluates multiple linguistic proxy signals (sentence-length variance, vocabulary richness, hapax legomena distribution, n-gram repetition, and function-word density) via a transparent multi-signal statistical engine, presenting transparent probability ranges and per-paragraph heat-maps.

### Key Principles
* **Probabilistic Integrity**: Detector results are probabilistic indicators that can produce false positives and false negatives. Kashef never presents scores as certain verdicts.
* **Zero Persistence**: All uploaded files (`.docx`, `.pdf`), URLs, and pasted text are processed purely in volatile server memory and discarded immediately upon response delivery. Nothing is logged or written to disk.
* **Security Guardrails**: Hardened against Server-Side Request Forgery (SSRF) and reduces the check-to-fetch window for DNS rebinding with socket connection IP pinning, multi-tier IP/DNS subnet filtering, encoded/numeric IP normalization, and per-redirect verification capped at 3 hops.
* **Rate Limiting**: In-memory sliding window rate limiter enforcing 20 requests per minute per IP on extraction endpoints (per-instance scope with periodic memory cleanup).
* **Design System**: Directly extracted from Dr. Raouf Roshdy's medical AI suite (`ehc-obgyn-guidelines` and `AIFV`), featuring WCAG AA accessible contrast, light and dark modes, and full keyboard navigation.

---

## Getting Started

### Prerequisites
* Node.js 20+ (Node.js 24 recommended)
* npm 10+

### Installation & Run

```bash
# Clone the repository
git clone https://github.com/roroleaks/kashef.git
cd kashef

# Install dependencies
npm install

# Run the development server
npm run dev

# Run unit tests
npm run test

# Run type check and lint
npm run typecheck
npm run lint

# Build for production
npm run build
```

---

## Detection Engines

Kashef features a modular multi-engine architecture operating behind a unified `analyze(text)` contract:

* **Engine A — Statistical Linguistic Proxies (`src/lib/detectors/engine-a.ts`)**: Runs in-memory deterministic stylometry evaluating sentence-length burstiness, Moving-Average Type-Token Ratio (MATTR), length-normalized hapax legomena distribution, n-gram repetition, punctuation diversity, and function-word density. Operates with zero network requests or API keys.
* **Engine B — Language Model Evaluation (`src/lib/detectors/engine-b.ts`)**: Optional server-side evaluator analyzing semantic predictability, formulaic rhetorical structures, and idiosyncratic voice using enterprise zero-data-retention APIs (Google Gemini or OpenAI-compatible endpoints). If unconfigured, Kashef falls back to Engine A.
* **Multi-Engine Consensus Combiner (`src/lib/detectors/combiner.ts`)**: Merges outputs across engines, widening the uncertainty envelope and flagging limitations when engines diverge.

---

## Input Pipeline (`POST /api/extract` & `POST /api/analyze`)
* **File Upload**: Accepts Microsoft Word (`.docx`) and Adobe PDF (`.pdf`) up to 10 MB.
* **URL Extraction**: Server-side article extraction via `@mozilla/readability` and `jsdom` with 8s timeout and 10 MB limit.
* **Minimum Length**: Requires at least 250 words for reliable statistical significance.
* **Language Support**: English-first with `franc-min` detection; Arabic and RTL support planned for subsequent phases.

---

## License & Credits

Created by **Dr. Raouf Roshdy** ([GitHub: @roroleaks](https://github.com/roroleaks)).  
Distributed for research and educational purposes.
