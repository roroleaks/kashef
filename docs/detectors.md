# Detector Engine Specifications & Methodological Limitations

This document specifies the detection architecture, heuristic signals, provisional calibration thresholds, and known failure modes of the Kashef platform.

---

## 1. Core Principles & Epistemological Boundaries

> **Fundamental Principle**:  
> All statistical proxies in Kashef are **unvalidated heuristic indicators**. They do **not** constitute mathematical proof of artificial intelligence authorship. Machine learning language models and human writers draw from the same natural language corpus; consequently, proxy boundaries naturally overlap. Kashef strictly produces **probabilistic uncertainty ranges** (`[low, high]`) alongside evidence breakdowns, and **never outputs binary or definitive verdicts**.

---

## 2. Status Tiers & Score Range Mapping

Scores are expressed strictly on a **0.00 to 1.00 probability scale** mapped to three status tiers corresponding to the visual design tokens in [`docs/design-tokens.md`](./design-tokens.md):

| Status Tier | Score Range | Design Token (Light / Dark) | Methodological Meaning |
| :--- | :--- | :--- | :--- |
| **Likely human** | `[0.00, 0.40]` | `#15803d` / `#4ade80` (Emerald) | Linguistic variance, punctuation diversity, and burstiness align with natural human prose. |
| **Mixed / uncertain** | `[0.35, 0.65]` | `#b45309` / `#fbbf24` (Amber) | Statistical indicators conflict, text demonstrates heavy post-editing, or signals fall in transition boundaries. |
| **Likely AI-assisted** | `[0.60, 1.00]` | `#b91c1c` / `#f87171` (Crimson) | Monotone sentence length, constrained vocabulary diversity, and formulaic 3-gram repetitions align with unedited language model outputs. |
| **Insufficient evidence** | `[0.00, 1.00]` | Neutral Gray | Text is below minimal length requirements for stable statistical evaluation. |

---

## 3. Engine A: Statistical Linguistic Proxies (`src/lib/detectors/engine-a.ts`)

Engine A operates entirely in-memory using deterministic stylometry algorithms. It does **not** call any external API or LLM.

### Signals Evaluated

1. **Sentence-Length Variance (Burstiness)**:
   - *Rationale*: Human writers naturally alternate between short punchy sentences and complex compound-complex clauses. Language models, optimized for average perplexity, tend to emit uniform sentence lengths with low standard deviation.
   - *Provisional Thresholds*: Human `> 40.0`; AI `< 22.0`.
2. **Type-Token Ratio (TTR - Lexical Diversity)**:
   - *Rationale*: Measures the ratio of unique words to total word tokens. Constrained TTR indicates recurrent vocabulary selection.
   - *Provisional Thresholds*: Human `> 0.52`; AI `< 0.44`.
3. **Hapax Legomena Rate**:
   - *Rationale*: Measures the proportion of words occurring only once relative to the total vocabulary. Human prose adheres naturally to Zipfian long-tail distributions, while default machine text clusters around common vocabulary.
   - *Provisional Thresholds*: Human `> 0.48`; AI `< 0.36`.
4. **N-Gram Repetition (Trigrams)**:
   - *Rationale*: Evaluates repeated 3-word transition phrases (e.g. *"it is important to"*, *"plays a crucial role"*). High trigram repetition reflects formulaic machine transitions.
   - *Provisional Thresholds*: Human `< 0.05` (< 5%); AI `> 0.12` (> 12%).
5. **Punctuation Diversity**:
   - *Rationale*: Counts expressive/rhetorical punctuation marks (semicolons, colons, em-dashes, parentheticals, question marks). Human writing displays stylistic punctuation variety; unedited machine text predominantly sticks to commas and periods.
   - *Provisional Thresholds*: Human `> 0.012` per token; AI `< 0.004` per token.
6. **Function Word Profile**:
   - *Rationale*: Evaluates the density of English function/stop words (articles, prepositions, conjunctions). LLM outputs cluster tightly around 42%–48%, whereas human styles vary widely depending on academic field and authorial voice.
   - *Provisional Range*: Machine cluster `[0.42, 0.48]`.

---

## 4. Engine B: Server-Side Language Model Evaluation (`src/lib/detectors/engine-b.ts`)

Engine B is an optional, server-side classifier that queries enterprise language models (Google Gemini or OpenAI-compatible endpoints) under strict zero-data-retention and privacy guarantees.

### Qualitative Signals Evaluated
1. **Semantic Predictability & Information Density**:
   - Assesses whether the text maintains an unnaturally smooth, predictable distribution of ideas or exhibits genuine authorial digressions, idiosyncratic anecdotes, and uneven information pacing.
2. **Rhetorical Patterns & Machine Artifacts**:
   - Analyzes formulaic structural conventions, such as robotic introductory/concluding transitions, sycophantic hedging, excessive balanced clauses, and generic listicle formatting.
3. **Stylistic & Authorial Voice**:
   - Identifies domain-authentic colloquialisms, specialized practitioner shorthand, and natural syntactic variance that machine models typically homogenize.

### Fallback & Reliability Guarantees
- **Strict Zero-Retention**: Payloads are ephemeral in-memory buffers; neither prompt texts nor API keys are persisted or logged.
- **Fail-Open Graceful Fallback**: If API credentials are not configured, or if the upstream API times out (10s cap) or encounters rate limits, Engine B cleanly falls back without crashing, allowing Engine A statistical stylometry to proceed uninterrupted.
- **Strict Zod Validation**: Upstream model outputs are parsed and validated against `LLMResponseSchema`. Any non-conforming or hallucinated response triggers the fallback pathway.

---

## 5. Known Failure Cases & False Positive Risks

Users and evaluators must account for known failure modes:

1. **Formal Academic & Medical Prose**:
   - Scientific papers, clinical trial protocols, and systematic reviews follow strict standardized conventions (passive voice, uniform terminology, structured methodology). This standardisation frequently lowers sentence-length variance and suppresses vocabulary diversity, causing human scientific writing to trigger elevated AI proxy scores.
2. **Non-Native English (ESL) Authorship**:
   - Authors writing in English as an additional language often utilize simpler syntactic structures and repeated transitional phrases, which statistical heuristics may mistakenly flag as machine-like.
3. **Heavily Edited AI Text (Hybrid Authorship)**:
   - A single round of human line editing (breaking long sentences, inserting personal idioms or rhetorical punctuation) alters surface burstiness and TTR, easily evading statistical detection even if the underlying ideation was machine-generated.
4. **Short Texts (< 250 words document, < 25 words paragraph)**:
   - Statistical estimators suffer high variance on small sample sizes. Documents below 250 words and paragraphs below 25 words are tagged as `"Insufficient evidence"` / `"Insufficient text"`.

---

## 6. Multi-Engine Combiner & Range Widening (`src/lib/detectors/combiner.ts`)

When multiple engines (e.g., Engine A statistical + Engine B language model) evaluate the same text:
- **Agreement**: When engines produce concordant ranges, the combined score envelope remains focused and confidence is high.
- **Disagreement**: When engines diverge (e.g. Engine A reports `[0.20, 0.35]` and Engine B reports `[0.65, 0.80]`):
  1. The combined probability range is **broadened** to encompass the full envelope `[min(low), max(high)]` (e.g. `[0.20, 0.80]`).
  2. Confidence is penalized in direct proportion to the disagreement spread.
  3. The status label automatically transitions to **`Mixed / uncertain`**.
  4. An explicit limitation warning is added documenting the inter-engine divergence.
