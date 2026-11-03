/**
 * Centralized Threshold Configuration for Kashef Detection Engines.
 *
 * IMPORTANT:
 * All numerical benchmarks and thresholds in this file are PROVISIONAL HEURISTICS.
 * They represent empirical approximations drawn from computational linguistics literature
 * and academic stylometry benchmarks. They are NOT certified or forensically validated detectors.
 */

export interface ProvisionalThreshold<T> {
  value: T;
  status: 'provisional';
  rationale: string;
}

export const THRESHOLDS = {
  // Document and paragraph length requirements
  minDocumentWords: {
    value: 250,
    status: 'provisional',
    rationale:
      'Statistical proxies (variance, TTR, hapax) destabilize significantly on short texts (< 250 words) due to sample sparsity.',
  } as ProvisionalThreshold<number>,

  minParagraphWords: {
    value: 25,
    status: 'provisional',
    rationale:
      'Paragraphs with fewer than 25 words lack sufficient sentence diversity to compute reliable variance or n-gram repetition.',
  } as ProvisionalThreshold<number>,

  // 1. Sentence-length variance (Burstiness proxy)
  sentenceLengthVariance: {
    value: {
      humanThreshold: 40.0, // High variance (> 40) suggests natural human pacing
      aiThreshold: 22.0, // Low variance (< 22) suggests uniform machine-generated sentence lengths
    },
    status: 'provisional',
    rationale:
      'Human writers mix short declarative sentences with complex clauses. LLMs default to consistent sentence length with low standard deviation.',
  } as ProvisionalThreshold<{ humanThreshold: number; aiThreshold: number }>,

  // 2. Type-Token Ratio (TTR: Unique words / Total words)
  typeTokenRatio: {
    value: {
      humanThreshold: 0.52, // Rich lexical diversity
      aiThreshold: 0.44, // Redundant lexical choices
    },
    status: 'provisional',
    rationale:
      'Repetitive vocabulary selection is characteristic of machine text optimized for average token probability.',
  } as ProvisionalThreshold<{ humanThreshold: number; aiThreshold: number }>,

  // 3. Hapax Rate (Proportion of unique words occurring exactly once)
  hapaxRate: {
    value: {
      humanThreshold: 0.48, // High single-occurrence word count
      aiThreshold: 0.36, // Lower hapax rate due to high-frequency token preference
    },
    status: 'provisional',
    rationale:
      'Natural human writing introduces unique domain-specific synonyms and creative word choices obeying Zipf’s law.',
  } as ProvisionalThreshold<{ humanThreshold: number; aiThreshold: number }>,

  // 4. Repeated N-Grams (Repeated 3-grams / total 3-grams)
  ngramRepetition: {
    value: {
      humanThreshold: 0.05, // Infrequent phrase repetition (< 5%)
      aiThreshold: 0.12, // High phrase repetition (> 12%)
    },
    status: 'provisional',
    rationale:
      'LLM transitions frequently recycle multi-word connective phrases (e.g., "it is important to note", "delves into the", "a crucial role in").',
  } as ProvisionalThreshold<{ humanThreshold: number; aiThreshold: number }>,

  // 5. Punctuation Profile (Diversity & frequency of non-period/comma marks: ; : — ( ) ? !)
  punctuationDiversity: {
    value: {
      humanThreshold: 0.012, // Moderate use of diverse rhetorical punctuation
      aiThreshold: 0.004, // Monotone punctuation, predominantly commas and periods
    },
    status: 'provisional',
    rationale:
      'Human writers deploy semicolons, em-dashes, and parentheticals for cadence. LLMs favor simple comma-period structures unless prompted otherwise.',
  } as ProvisionalThreshold<{ humanThreshold: number; aiThreshold: number }>,

  // 6. Function Word Profile (Proportion of structural stop words)
  functionWordDensity: {
    value: {
      humanRange: [0.32, 0.54] as [number, number],
      aiTypicalRange: [0.42, 0.48] as [number, number],
    },
    status: 'provisional',
    rationale:
      'Function word usage in LLMs converges tightly around 42%-48% of total tokens, whereas human writing exhibits wider stylistic variability depending on discipline.',
  } as ProvisionalThreshold<{ humanRange: [number, number]; aiTypicalRange: [number, number] }>,

  // Score tier boundaries mapping 0.0-1.0 probability to status tiers
  scoreTiers: {
    value: {
      likelyHumanMax: 0.40, // [0.00, 0.40] -> Likely human
      mixedMin: 0.35, // [0.35, 0.65] -> Mixed / uncertain
      mixedMax: 0.65,
      likelyAiMin: 0.60, // [0.60, 1.00] -> Likely AI-assisted
    },
    status: 'provisional',
    rationale:
      'Mapped directly to Kashef three-tier visual design tokens in docs/design-tokens.md with overlapping transition buffers for uncertain ranges.',
  } as ProvisionalThreshold<{
    likelyHumanMax: number;
    mixedMin: number;
    mixedMax: number;
    likelyAiMin: number;
  }>,
} as const;
