import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { DetectorEngine, DetectionResult } from '../src/lib/detectors/types';

export const LabeledSampleSchema = z.object({
  id: z.string(),
  label: z.enum(['human', 'ai', 'mixed']),
  source: z.string(),
  notes: z.string(),
  text: z.string().min(1),
});
export type LabeledSample = z.infer<typeof LabeledSampleSchema>;

export interface EvaluationMetrics {
  sampleCount: number;
  syntheticCount: number;
  humanCount: number;
  mixedCount: number;
  accuracy: number;
  accuracyConfidenceInterval: [number, number]; // 95% Wilson score interval
  falsePositiveRate: number; // Human classified as AI
  falsePositiveCount: number;
  falseNegativeRate: number; // AI classified as Human
  falseNegativeCount: number;
  isSmallSampleSize: boolean;
  reliabilityCaveat: string;
}

export interface SampleEvaluationResult {
  sample: LabeledSample;
  result: DetectionResult;
  predictedClass: 'human' | 'ai' | 'mixed';
  isCorrect: boolean;
}

export interface EngineEvaluationReport {
  engineId: string;
  metrics: EvaluationMetrics;
  details: SampleEvaluationResult[];
}

/**
 * Computes Wilson score 95% confidence interval for a proportion.
 */
function computeWilsonInterval(successes: number, total: number): [number, number] {
  if (total === 0) return [0, 0];
  const zVal = 1.96; // 95% confidence
  const p = successes / total;
  const denominator = 1 + (zVal * zVal) / total;
  const center = (p + (zVal * zVal) / (2 * total)) / denominator;
  const spread =
    (zVal * Math.sqrt((p * (1 - p)) / total + (zVal * zVal) / (4 * total * total))) /
    denominator;

  const low = Math.max(0, Math.round((center - spread) * 1000) / 1000);
  const high = Math.min(1, Math.round((center + spread) * 1000) / 1000);
  return [low, high];
}

/**
 * Maps DetectionLabel to evaluation ground-truth class.
 */
function labelToClass(label: string): 'human' | 'ai' | 'mixed' {
  if (label === 'Likely human') return 'human';
  if (label === 'Likely AI-assisted') return 'ai';
  return 'mixed';
}

/**
 * Ingests all labeled JSON sample files from eval/data directory.
 */
export function loadEvaluationSamples(dataDir?: string): LabeledSample[] {
  const targetDir = dataDir || path.resolve(process.cwd(), 'eval', 'data');
  if (!fs.existsSync(targetDir)) {
    return [];
  }

  const files = fs.readdirSync(targetDir).filter((f) => f.endsWith('.json'));
  const samples: LabeledSample[] = [];

  for (const file of files) {
    const raw = fs.readFileSync(path.join(targetDir, file), 'utf-8');
    const parsed = JSON.parse(raw);
    samples.push(LabeledSampleSchema.parse(parsed));
  }

  return samples;
}

/**
 * Executes evaluation harness on a detector engine.
 */
export async function evaluateEngine(
  engine: DetectorEngine,
  samples: LabeledSample[]
): Promise<EngineEvaluationReport> {
  const details: SampleEvaluationResult[] = [];

  let correctCount = 0;
  let falsePositiveCount = 0;
  let totalHumanSamples = 0;
  let falseNegativeCount = 0;
  let totalAiSamples = 0;
  let syntheticCount = 0;
  let humanCount = 0;
  let mixedCount = 0;

  for (const sample of samples) {
    if (sample.source.includes('synthetic')) syntheticCount++;
    if (sample.label === 'human') humanCount++;
    if (sample.label === 'ai') totalAiSamples++;
    if (sample.label === 'mixed') mixedCount++;

    const result = await engine.analyze(sample.text);
    const predicted = labelToClass(result.label);
    const isCorrect = predicted === sample.label;

    if (isCorrect) correctCount++;

    if (sample.label === 'human') {
      totalHumanSamples++;
      if (predicted === 'ai') {
        falsePositiveCount++;
      }
    }

    if (sample.label === 'ai') {
      if (predicted === 'human') {
        falseNegativeCount++;
      }
    }

    details.push({
      sample,
      result,
      predictedClass: predicted,
      isCorrect,
    });
  }

  const total = samples.length;
  const accuracy = total > 0 ? Math.round((correctCount / total) * 1000) / 1000 : 0;
  const fpr = totalHumanSamples > 0 ? Math.round((falsePositiveCount / totalHumanSamples) * 1000) / 1000 : 0;
  const fnr = totalAiSamples > 0 ? Math.round((falseNegativeCount / totalAiSamples) * 1000) / 1000 : 0;

  const isSmallSampleSize = total < 30;
  const reliabilityCaveat = isSmallSampleSize
    ? `CAVEAT: Small sample size (N = ${total} < 30). Performance metrics and confidence intervals are not statistically reliable. Synthetic samples must not be interpreted as real-world clinical accuracy.`
    : 'Statistical metrics calculated with sample size N >= 30.';

  const metrics: EvaluationMetrics = {
    sampleCount: total,
    syntheticCount,
    humanCount,
    mixedCount,
    accuracy,
    accuracyConfidenceInterval: computeWilsonInterval(correctCount, total),
    falsePositiveRate: fpr,
    falsePositiveCount,
    falseNegativeRate: fnr,
    falseNegativeCount,
    isSmallSampleSize,
    reliabilityCaveat,
  };

  return {
    engineId: engine.id,
    metrics,
    details,
  };
}
