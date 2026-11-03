import { z } from 'zod';

/**
 * Detection status labels conforming strictly to Kashef design tokens and specification.
 */
export const DetectionLabelSchema = z.enum([
  'Likely human',
  'Mixed / uncertain',
  'Likely AI-assisted',
  'Insufficient evidence',
]);
export type DetectionLabel = z.infer<typeof DetectionLabelSchema>;

/**
 * Signal indication direction.
 */
export const SignalDirectionSchema = z.enum(['human', 'ai', 'neutral']);
export type SignalDirection = z.infer<typeof SignalDirectionSchema>;

/**
 * Individual evidence signal returned by detection engines.
 */
export const SignalEvidenceSchema = z.object({
  name: z.string(),
  value: z.union([z.number(), z.string()]),
  direction: SignalDirectionSchema,
  reason: z.string(),
  benchmark: z.string().optional(),
  provisionalScore: z.number().min(0).max(1).optional(),
});
export type SignalEvidence = z.infer<typeof SignalEvidenceSchema>;

/**
 * Per-paragraph analysis breakdown.
 */
export const ParagraphAnalysisSchema = z.object({
  text: z.string(),
  index: z.number(),
  wordCount: z.number(),
  score: z.tuple([z.number().min(0).max(1), z.number().min(0).max(1)]),
  label: DetectionLabelSchema,
  signals: z.array(SignalEvidenceSchema),
});
export type ParagraphAnalysis = z.infer<typeof ParagraphAnalysisSchema>;

/**
 * Main Detection Result schema validated via Zod.
 * Scores are strictly 0.0 - 1.0 probability ranges [low, high].
 */
export const DetectionResultSchema = z.object({
  score: z.tuple([z.number().min(0).max(1), z.number().min(0).max(1)]),
  label: DetectionLabelSchema,
  confidence: z.number().min(0).max(1),
  evidence: z.array(SignalEvidenceSchema),
  paragraphs: z.array(ParagraphAnalysisSchema),
  limitations: z.array(z.string()),
  engineId: z.string().optional(),
  timestamp: z.string().optional(),
});
export type DetectionResult = z.infer<typeof DetectionResultSchema>;

/**
 * Interface for modular, interchangeable detection engines.
 */
export interface DetectorEngine {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  analyze(text: string): Promise<DetectionResult>;
}
