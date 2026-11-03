# Kashef (كاشف)

> **Probabilistic AI Text Estimation & Evidence Breakdown**  
> An open, transparent research tool for evaluating linguistic patterns and AI-generated text likelihood. Created by Dr. Raouf Roshdy.

---

## Overview

Kashef estimates the likelihood that a document was authored or co-authored by an artificial intelligence model. Rather than emitting an opaque verdict, Kashef evaluates multiple linguistic proxy signals (sentence-length variance, vocabulary diversity, n-gram repetition, transition entropy) alongside server-side language model classifiers, presenting transparent probability ranges and per-paragraph heat-maps.

### Key Principles
* **Probabilistic Integrity**: Detector results are probabilistic indicators that can produce false positives and false negatives. Kashef never presents scores as certain verdicts.
* **Zero Persistence**: All uploaded files (`.docx`, `.pdf`), URLs, and pasted text are processed purely in volatile server memory and discarded immediately upon response delivery. Nothing is logged or written to disk.
* **Security Guardrails**: Hardened against Server-Side Request Forgery (SSRF) with multi-tier IP/DNS validation, encoded IP detection, and per-redirect verification up to a 5-hop cap.
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

## Input Pipeline (`POST /api/extract`)
* **File Upload**: Accepts Microsoft Word (`.docx`) and Adobe PDF (`.pdf`) up to 10 MB.
* **URL Extraction**: Server-side article extraction via `@mozilla/readability` and `jsdom` with 8s timeout and 10 MB limit.
* **Minimum Length**: Requires at least 250 words for reliable statistical significance.
* **Language Support**: English-first with `franc-min` detection; Arabic and RTL support planned for subsequent phases.

---

## License & Credits

Created by **Dr. Raouf Roshdy** ([GitHub: @roroleaks](https://github.com/roroleaks)).  
Distributed for research and educational purposes.
