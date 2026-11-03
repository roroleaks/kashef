/**
 * Strict TypeScript contract for Kashef detection engines.
 * All detectors (statistical, LLM-based, ensemble) implement this modular interface.
 */

export type DetectionLabel = 'likely_human' | 'mixed_uncertain' | 'likely_ai';

export interface SignalEvidence {
  name: string;
  value: number | string;
  benchmark?: string;
  description: string;
  scoreContribution: number; // -1.0 (strongly human-like) to +1.0 (strongly AI-like)
}

export interface ParagraphAnalysis {
  text: string;
  index: number;
  wordCount: number;
  score: [number, number]; // [low, high] probability range 0–100
  label: DetectionLabel;
  signals: SignalEvidence[];
}

export interface DetectionResult {
  score: [number, number]; // Overall probability range, e.g. [68, 82]
  label: DetectionLabel;
  confidence: number; // Confidence level 0.0 – 1.0 (0% – 100%)
  evidence: SignalEvidence[];
  paragraphs: ParagraphAnalysis[];
  limitations: string;
  engineUsed: string;
  timestamp: string;
}

export interface DetectorEngine {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  analyze(text: string): Promise<DetectionResult>;
}
