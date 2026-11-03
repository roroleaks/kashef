# Step 2: Modular Detector Interface Specification

Implemented and verified in repo `roroleaks/kashef`.

---

## 1. Detector Interface Contract (`src/lib/detectors/types.ts`)

All detection engines in Kashef (statistical proxies, LLM classifier, ensemble combiner) implement the interchangeable contract:

```typescript
export interface DetectorEngine {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  analyze(text: string): Promise<DetectionResult>;
}
```

### Response Payload Structure (`DetectionResult`)
```typescript
export interface DetectionResult {
  score: [number, number];       // Overall probability range [low, high], e.g. [68, 82]
  label: DetectionLabel;         // 'likely_human' | 'mixed_uncertain' | 'likely_ai'
  confidence: number;            // Normalized confidence level (0.0 to 1.0)
  evidence: SignalEvidence[];    // Global diagnostic signals & benchmarks
  paragraphs: ParagraphAnalysis[]; // Granular per-paragraph scores & signals
  limitations: string;           // Plain-language limitations notice
  engineUsed: string;            // Identifier of the executing engine
  timestamp: string;             // ISO-8601 evaluation timestamp
}
```

### Per-Paragraph Granularity (`ParagraphAnalysis`)
```typescript
export interface ParagraphAnalysis {
  text: string;
  index: number;
  wordCount: number;
  score: [number, number];       // Local probability range [low, high]
  label: DetectionLabel;
  signals: SignalEvidence[];
}
```

---

## 2. Orchestration & Utilities

* **Registry & Orchestration (`src/lib/detectors/index.ts`)**:
  * `registerEngine(engine: DetectorEngine)`: Registers interchangeable engine modules.
  * `getDetector(engineId?: string)`: Resolves engine by ID with fallback to the default engine.
  * `analyze(text: string, engineId?: string)`: Main execution facade adhering strictly to `analyze(text) -> DetectionResult`.
* **Segmentation Utilities (`src/lib/detectors/utils.ts`)**:
  * `splitParagraphs(text)`: Preserves original paragraph ordering, whitespace integrity, and word counts.
  * `splitSentences(text)`: Segments sentences while safeguarding scholarly, medical, and title abbreviations (e.g. `Dr.`, `Prof.`, `vs.`, `e.g.`, `i.e.`, `approx.`, `R. Roshdy`).

---

## 3. Verification & Test Summary

* **Unit Tests**: `vitest run src/lib/detectors/__tests__/interface.test.ts`
  * Interface contract compliance verified.
  * Engine registration and retrieval verified.
  * Score range structure (`[low, high]`) verified.
  * Paragraph segmentation and sentence abbreviation protection verified.
* **Overall Vitest Suite**: 18 / 18 tests passing across pipeline and interface suites.
* **Typecheck**: `tsc --noEmit` exited with 0 errors.
* **Lint**: `eslint .` exited with 0 errors.
* **Build**: `next build` compiled successfully in 6.1s.

---

## 4. What Is Still Unverified / Next Step

* Engine A (statistical signals: sentence-length variance, type-token ratio, n-gram repetition, punctuation/function-word profile) is to be implemented in **Step 3**.
