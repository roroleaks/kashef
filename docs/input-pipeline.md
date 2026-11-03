# Step 1: Input Pipeline & Extraction Architecture

Implemented and verified in repo `roroleaks/kashef`.

---

## What Was Built

### 1. Endpoint: `POST /api/extract`
* Accepts:
  1. `multipart/form-data` with `.docx` or `.pdf` file payload.
  2. `application/json` with `{ "url": "https://..." }`.
* **Zero Persistence**: All buffers are streamed and processed purely in volatile RAM, never written to disk or logged.

### 2. Document Extractors
* **`.docx` (`src/lib/extractors/docx.ts`)**: In-memory text extraction using `mammoth`.
* **`.pdf` (`src/lib/extractors/pdf.ts`)**: Digital text-layer extraction via `pdf-parse`. Detects documents with missing text layers (scanned images) and returns explicit error code `NO_TEXT_LAYER` explaining that OCR is out of scope.
* **URL Article Extractor (`src/lib/extractors/url.ts`)**:
  * Strips boilerplate, navigation, headers, scripts, and ads using `@mozilla/readability` and `jsdom`.
  * Enforces **10-second timeout** via `AbortController`.
  * Enforces **5 MB maximum download size** limit during stream ingestion.

### 3. Security & SSRF Protection (`src/lib/extractors/ssrf.ts`)
* Resolves hostnames via Node's `dns.promises.lookup` and checks all resolved A and AAAA records against:
  * IPv4 Loopback (`127.0.0.0/8`)
  * IPv4 Private Networks (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`)
  * IPv4 Link-Local & Cloud Metadata (`169.254.0.0/16`)
  * IPv6 Loopback (`::1`) and Unique Local (`fc00::/7`)
  * IPv4-mapped IPv6 ranges (`::ffff:...`)
  * Hostname aliases (`localhost`, `*.internal`, `*.local`)
  * Non-HTTP(S) protocols (`ftp:`, `file:`, `gopher:`)

### 4. Input Limits & Validation (`src/lib/extractors/utils.ts`)
* **File Size**: Max 10 MB limit (`413 Payload Too Large`).
* **Word Count**: Rejects documents with fewer than 250 words (`422 Unprocessable Entity`) with an informative message.
* **Language Detection**: Identifies English vs Arabic and unsupported character distributions, returning an advisory warning for non-English inputs.

---

## Test Verification Summary
* Test suite: `vitest run` (`src/lib/extractors/__tests__/pipeline.test.ts`)
* **11 unit tests passed**:
  * Loopback IPv4 blocking (`127.0.0.1`, `127.0.0.5`)
  * Localhost hostname blocking (`localhost`, `*.internal`)
  * RFC 1918 private IPv4 blocking (`10.0.0.1`, `172.16.0.1`, `172.31.255.255`, `192.168.1.1`)
  * AWS/GCP cloud metadata IP blocking (`169.254.169.254`)
  * IPv6 loopback and unique local blocking (`::1`, `fc00::1`, `fe80::1`)
  * Protocol blocking (`ftp:`, `file:`, `gopher:`)
  * Valid public domain allowance (`https://example.com`)
  * Word count calculation and threshold validation (< 250 rejected, >= 250 accepted)
  * Language detection (English confirmed, Arabic advisory tagged)
* Typecheck: `tsc --noEmit` passed with 0 errors.
* Build: `next build` compiled successfully in 7.2s.

---

## What Is Still Unverified / Future Phases
1. **Live OCR for Scanned PDFs**: Out of scope for Phase 1. Currently returns `NO_TEXT_LAYER` message as specified.
2. **Detection Engines (Step 2 to 4)**: Interface and engines A & B are scheduled for subsequent steps.
