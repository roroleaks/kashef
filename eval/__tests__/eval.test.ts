import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { loadEvaluationSamples, evaluateEngine, LabeledSample } from '../harness';
import { engineA } from '../../src/lib/detectors/engine-a';

describe('Evaluation Harness (/eval)', () => {
  const dataDir = path.resolve(process.cwd(), 'eval', 'data');

  it('loads labeled benchmark sample files from eval/data/*.json', () => {
    const samples = loadEvaluationSamples(dataDir);
    expect(samples.length).toBeGreaterThanOrEqual(3);

    for (const sample of samples) {
      expect(sample.id).toBeDefined();
      expect(['human', 'ai', 'mixed']).toContain(sample.label);
      expect(sample.source).toBeDefined();
      expect(sample.notes).toBeDefined();
      expect(typeof sample.text).toBe('string');
      expect(sample.text.length).toBeGreaterThan(100);
    }
  });

  it('evaluates Engine A on labeled samples and computes performance metrics', async () => {
    const samples = loadEvaluationSamples(dataDir);
    const report = await evaluateEngine(engineA, samples);

    expect(report.engineId).toBe(engineA.id);
    expect(report.metrics.sampleCount).toBe(samples.length);

    // Accuracy and interval
    expect(report.metrics.accuracy).toBeGreaterThanOrEqual(0);
    expect(report.metrics.accuracy).toBeLessThanOrEqual(1);
    expect(report.metrics.accuracyConfidenceInterval[0]).toBeGreaterThanOrEqual(0);
    expect(report.metrics.accuracyConfidenceInterval[1]).toBeLessThanOrEqual(1);

    // Rates
    expect(report.metrics.falsePositiveRate).toBeGreaterThanOrEqual(0);
    expect(report.metrics.falseNegativeRate).toBeGreaterThanOrEqual(0);

    // Small sample size caveat flag
    expect(report.metrics.isSmallSampleSize).toBe(true);
    expect(report.metrics.reliabilityCaveat).toContain('Small sample size');
    expect(report.metrics.reliabilityCaveat).toContain('not statistically reliable');

    // Details breakdown
    expect(report.details.length).toBe(samples.length);
    for (const d of report.details) {
      expect(['human', 'ai', 'mixed']).toContain(d.predictedClass);
      expect(typeof d.isCorrect).toBe('boolean');
    }
  });

  it('correctly tags synthetic samples and accounts for them', async () => {
    const samples = loadEvaluationSamples(dataDir);
    const syntheticSamples = samples.filter((s: LabeledSample) => s.source.includes('synthetic'));
    expect(syntheticSamples.length).toBeGreaterThanOrEqual(1);

    for (const s of syntheticSamples) {
      expect(s.notes).toContain('Not presented as');
    }
  });
});
