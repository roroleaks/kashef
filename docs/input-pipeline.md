# Step 1: Input Pipeline & Extraction Architecture

Implemented and verified in repo `roroleaks/kashef`.

---

## 1. Endpoint Architecture: `POST /api/extract`

* **Accepted Payloads**:
  1. `multipart/form-data`: Accepts `.docx` or `.pdf` file in memory. Max file size: **10 MB**.
  2. `application/json`: `{ "url": "https://..." }`.
* **Zero Persistence Principle**:
  * Ingested documents and extracted text reside strictly in volatile process memory (`Buffer`, `Uint8Array`).
  * No file uploads or extracted text are written to disk, scratch directories, or application logs.
* **Per-IP Rate Limiting (`src/lib/rate-limiter.ts`)**:
  * Limit: **20 requests per minute per IP** via `MemoryRateLimiter` sliding window.
  * Headers returned on all requests: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`.
  * Exceeded status: `429 Too Many Requests` with RFC `Retry-After: <seconds>` header.
  * **Client IP Determination & Proxy Trust**: Inspects headers in order (`cf-connecting-ip`, `x-real-ip`, leftmost `x-forwarded-for`, with fallback to socket address). Note on trust: `X-Forwarded-For` is only reliable when running behind an edge proxy/load balancer configured to sanitize or overwrite client-provided headers; in direct deployments without a reverse proxy, client-supplied headers could be spoofed.
  * **Memory Cleanup**: Automatically prunes stale timestamps and drops expired IP entries every 60 seconds to prevent memory unbounded growth.
  * **Multi-instance Behavior**: Strictly **per-instance** in process memory. In horizontal or serverless multi-instance deployments (e.g. AWS Lambda / container clusters without sticky sessions), each instance maintains an independent window; total capacity scales to $N \times 20$ requests/min across $N$ instances. Production distributed clusters can swap the store with an external centralized cache (e.g. Upstash Redis) or enforce limits at an edge gateway (Cloudflare, NGINX).

---

## 2. In-Memory Document Extractors

* **`.docx` Extractor (`src/lib/extractors/docx.ts`)**:
  * In-memory text extraction using `mammoth`.
  * Verified against real multi-paragraph clinical trial fixture `test/fixtures/sample.docx` (60 words).
* **`.pdf` Extractor (`src/lib/extractors/pdf.ts`)**:
  * In-memory text extraction using `unpdf` (`Uint8Array` binary interface).
  * Verified against valid text-layer PDF fixture `test/fixtures/sample.pdf` (13 words).
  * **Scanned Image Detection**: Evaluates extracted word count. If extractable text has fewer than 5 words, returns clear error code `NO_TEXT_LAYER` informing the user that the document is a scanned image and OCR is out of scope for this phase.
* **URL Article Extractor (`src/lib/extractors/url.ts`)**:
  * Server-side DOM processing using `@mozilla/readability` + `jsdom`.
  * Removes noise elements (`<script>`, `<style>`, `<nav>`, `<header>`, `<footer>`, `<aside>`, `<form>`, `<noscript>`, `<iframe>`, `<svg>`).
  * Enforces **8-second timeout** (`FETCH_TIMEOUT_MS = 8000`).
  * Enforces **10 MB maximum download size limit** (`MAX_URL_BYTES = 10 * 1024 * 1024`) during streaming body read.
  * Enforces **strict 3-redirect cap** (`MAX_REDIRECTS = 3`).

---

## 3. SSRF Protection & Connection IP Pinning (`src/lib/extractors/ssrf.ts`)

To defend against Server-Side Request Forgery and reduce the check-to-fetch window for DNS rebinding attacks:
1. **Connection IP Pinning**:
   * Initial URL is validated via DNS lookup checking all A and AAAA records.
   * Socket connection is established via custom lookup pinned to the validated IP address, significantly reducing the check-to-fetch window between DNS validation and TCP handshake.
   * Transmits standard `Host` and TLS SNI `servername` headers matching the URL hostname, ensuring full TLS certificate validation.
2. **Blocked IPv4 Subnets**:
   * `0.0.0.0/8` (Current network / "this" host RFC 1122)
   * `10.0.0.0/8` (Private RFC 1918)
   * `100.64.0.0/10` (Carrier-Grade NAT / Shared Address Space RFC 6598)
   * `127.0.0.0/8` (Loopback RFC 1122)
   * `169.254.0.0/16` (Link-Local & Cloud Metadata RFC 3927, e.g. AWS/GCP `169.254.169.254`)
   * `172.16.0.0/12` (Private RFC 1918)
   * `192.0.0.0/24` (IETF Protocol Assignments RFC 6890)
   * `192.0.2.0/24` (TEST-NET-1 documentation RFC 5737)
   * `192.88.99.0/24` (6to4 Relay Anycast RFC 7526)
   * `192.168.0.0/16` (Private RFC 1918)
   * `198.18.0.0/15` (Device Benchmark RFC 2544)
   * `198.51.100.0/24` (TEST-NET-2 documentation RFC 5737)
   * `203.0.113.0/24` (TEST-NET-3 documentation RFC 5737)
   * `224.0.0.0/4` (Multicast RFC 5771: `224.0.0.0` to `239.255.255.255`)
   * `240.0.0.0/4` (Reserved for future use RFC 1112 / RFC 6890, including `255.255.255.255` broadcast)
3. **Blocked IPv6 Ranges**:
   * `::/128` (Unspecified)
   * `::1/128` (Loopback)
   * `64:ff9b::/96` (NAT64 well-known prefix RFC 6052)
   * `64:ff9b:1::/48` (NAT64 local prefix RFC 8215)
   * `100::/64` (Discard-only prefix RFC 6666)
   * `2001:db8::/32` (Documentation prefix RFC 3849)
   * `2002::/16` (6to4 prefix RFC 3056 / RFC 7526)
   * `fc00::/7` (Unique Local Address ULA RFC 4193, `fc00::` to `fdff::`)
   * `fe80::/10` (Link-Local Unicast RFC 4291, `fe80::` to `febf::`)
   * `ff00::/8` (Multicast RFC 4291)
   * `::ffff:0:0/96` (IPv4-mapped IPv6 addresses RFC 4291)
4. **Redirect Hop Re-validation**:
   * Each HTTP redirect destination (301, 302, 303, 307, 308) is fully re-parsed and re-validated against all SSRF rules before any subsequent connection is dispatched.
   * Redirect limit capped at **3 hops** maximum.

---

## 4. Input Validation & Language Detection (`src/lib/extractors/utils.ts`)

* **Word Count Threshold**: Enforces minimum of **250 words** required for statistical reliability. Returns `422 Unprocessable Entity` with clear advisory message if below threshold.
* **Language Detection (`franc-min`)**: Detects natural language distribution. Identifies English (`eng`) and flags unsupported languages (e.g., Arabic `arb`, French `fra`) with an advisory warning indicating the model heuristics are tuned for English academic prose.

---

## 5. Automated Test Suite (Vitest)

All 30 tests in the test suite pass cleanly:
1. SSRF loopback & numeric variant blocking (decimal, hex, octal).
2. Extended subnet blocking (0.0.0.0/8, 100.64.0.0/10, 192.0.0.0/24, 198.18.0.0/15, multicast, reserved).
3. Localhost and internal hostname alias blocking (`*.localhost`, `*.internal`, `*.local`, `*.lan`).
4. RFC 1918 private IPv4 blocking.
5. IPv6 loopback, ULA, link-local, NAT64, documentation, and multicast blocking.
6. Protocol filtering (`ftp:`, `file:`, `gopher:`).
7. Valid public domain validation with IP pinning.
8. Mocked DNS resolution returning private IPv4 (blocked).
9. Mocked DNS resolution returning private IPv6 (blocked).
10. Mocked HTTP server redirecting to private metadata IP (blocked).
11. Real `.docx` fixture text extraction and word count (`sample.docx`).
12. Real `.pdf` text-layer extraction and word count (`sample.pdf`).
13. Scanned PDF buffer `NO_TEXT_LAYER` exception.
14. Readability extraction stripping navigation, header, and footer noise.
15. Word count calculation and threshold validation.
16. Language detection via `franc-min`.
17. Sliding window rate limiter enforcement (20 req/min).
18. WCAG 2.1 AA mathematical color contrast verification for all 3 status tiers in light and dark mode ($\ge 4.5:1$).
