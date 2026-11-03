import { describe, it, expect, beforeEach } from 'vitest';
import {
  registerEngine,
  getDetector,
  listEngines,
  analyze,
  splitParagraphs,
  splitSentences,
  combineResults,
  DetectorEngine,
  DetectionResult,
  DetectionResultSchema,
} from '../index';

describe('Step 2: Detector Interface Contract & Zod Validation', () => {
  const mockEngine: DetectorEngine = {
    id: 'mock-engine',
    name: 'Mock Test Engine',
    description: 'A mock engine for interface compliance testing',
    analyze: async (text: string): Promise<DetectionResult> => {
      const paragraphs = splitParagraphs(text);
      const result: DetectionResult = {
        score: [0.6, 0.75],
        label: 'Mixed / uncertain',
        confidence: 0.85,
        evidence: [
          {
            name: 'mock_signal',
            value: 0.72,
            direction: 'ai',
            reason: 'Mock evidence indicator for contract validation',
            benchmark: '> 0.65 suggests AI influence',
            provisionalScore: 0.7,
          },
        ],
        paragraphs: paragraphs.map((p) => ({
          text: p.text,
          index: p.index,
          wordCount: p.wordCount,
          score: [0.55, 0.7] as [number, number],
          label: 'Mixed / uncertain',
          signals: [],
        })),
        limitations: ['Mock evaluation solely for test harness verification.'],
        engineId: 'mock-engine',
        timestamp: new Date().toISOString(),
      };
      return DetectionResultSchema.parse(result);
    },
  };

  beforeEach(() => {
    registerEngine(mockEngine);
  });

  it('registers and retrieves modular detector engines by id', () => {
    const detector = getDetector('mock-engine');
    expect(detector).toBeDefined();
    expect(detector.id).toBe('mock-engine');
    expect(detector.name).toBe('Mock Test Engine');
  });

  it('lists registered engines correctly', () => {
    const list = listEngines();
    expect(list.some((e) => e.id === 'mock-engine')).toBe(true);
  });

  it('executes analyze(text) returning contract shape validated by Zod', async () => {
    const sampleText =
      'First paragraph discussing clinical AI models.\n\nSecond paragraph evaluating diagnostic accuracy.';
    const result = await analyze(sampleText, 'mock-engine');

    // Schema validation
    expect(() => DetectionResultSchema.parse(result)).not.toThrow();

    // 0.0 - 1.0 probability score range
    expect(Array.isArray(result.score)).toBe(true);
    expect(result.score.length).toBe(2);
    expect(result.score[0]).toBeGreaterThanOrEqual(0);
    expect(result.score[1]).toBeLessThanOrEqual(1);
    expect(result.score[0]).toBeLessThanOrEqual(result.score[1]);

    // Label and confidence
    expect([
      'Likely human',
      'Mixed / uncertain',
      'Likely AI-assisted',
      'Insufficient evidence',
    ]).toContain(result.label);
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);

    // Evidence array
    expect(Array.isArray(result.evidence)).toBe(true);
    expect(result.evidence.length).toBeGreaterThan(0);
    expect(result.evidence[0]).toHaveProperty('name');
    expect(result.evidence[0]).toHaveProperty('value');
    expect(result.evidence[0]).toHaveProperty('direction');
    expect(result.evidence[0]).toHaveProperty('reason');

    // Paragraph breakdown
    expect(Array.isArray(result.paragraphs)).toBe(true);
    expect(result.paragraphs.length).toBe(2);
    expect(result.paragraphs[0]).toHaveProperty('score');
    expect(result.paragraphs[0]).toHaveProperty('signals');

    // Limitations array
    expect(Array.isArray(result.limitations)).toBe(true);
    expect(result.limitations.length).toBeGreaterThan(0);
  });

  it('accurately segments paragraphs preserving order and indices', () => {
    const text = 'Paragraph One text.\n\nParagraph Two text.\n\n\nParagraph Three text.';
    const paras = splitParagraphs(text);
    expect(paras.length).toBe(3);
    expect(paras[0].index).toBe(0);
    expect(paras[0].text).toBe('Paragraph One text.');
    expect(paras[1].index).toBe(1);
    expect(paras[2].index).toBe(2);
  });

  it('protects scholarly/medical abbreviations during sentence segmentation', () => {
    const text =
      'Dr. Raouf Roshdy published a trial vs. standard therapy. The p-value was approx. 0.04. Live birth rate increased!';
    const sentences = splitSentences(text);
    expect(sentences.length).toBe(3);
    expect(sentences[0]).toContain('Dr. Raouf Roshdy');
    expect(sentences[0]).toContain('vs. standard therapy.');
    expect(sentences[1]).toContain('approx. 0.04.');
  });
});

describe('Step 2: Multi-Engine Combiner & Range Widening', () => {
  const concordantResultA: DetectionResult = {
    score: [0.7, 0.85],
    label: 'Likely AI-assisted',
    confidence: 0.8,
    evidence: [
      {
        name: 'burstiness',
        value: 18.2,
        direction: 'ai',
        reason: 'Low variance in sentence lengths',
      },
    ],
    paragraphs: [
      {
        text: 'Sample paragraph text.',
        index: 0,
        wordCount: 30,
        score: [0.65, 0.8],
        label: 'Likely AI-assisted',
        signals: [],
      },
    ],
    limitations: ['Statistical heuristic limitation.'],
    engineId: 'engine-a',
    timestamp: new Date().toISOString(),
  };

  const concordantResultB: DetectionResult = {
    score: [0.72, 0.88],
    label: 'Likely AI-assisted',
    confidence: 0.82,
    evidence: [
      {
        name: 'perplexity',
        value: 12.4,
        direction: 'ai',
        reason: 'Low cross-entropy loss',
      },
    ],
    paragraphs: [
      {
        text: 'Sample paragraph text.',
        index: 0,
        wordCount: 30,
        score: [0.7, 0.85],
        label: 'Likely AI-assisted',
        signals: [],
      },
    ],
    limitations: ['Model classifier limitation.'],
    engineId: 'engine-b',
    timestamp: new Date().toISOString(),
  };

  const divergentResultHuman: DetectionResult = {
    score: [0.15, 0.35],
    label: 'Likely human',
    confidence: 0.78,
    evidence: [
      {
        name: 'burstiness',
        value: 52.0,
        direction: 'human',
        reason: 'High natural variance in sentence lengths',
      },
    ],
    paragraphs: [
      {
        text: 'Sample paragraph text.',
        index: 0,
        wordCount: 30,
        score: [0.15, 0.35],
        label: 'Likely human',
        signals: [],
      },
    ],
    limitations: ['Stylometric proxy heuristic.'],
    engineId: 'engine-a',
    timestamp: new Date().toISOString(),
  };

  it('returns unified consensus range when engines agree', () => {
    const combined = combineResults([concordantResultA, concordantResultB]);
    expect(() => DetectionResultSchema.parse(combined)).not.toThrow();

    expect(combined.score[0]).toBe(0.7);
    expect(combined.score[1]).toBe(0.88);
    expect(combined.label).toBe('Likely AI-assisted');
    expect(combined.confidence).toBeGreaterThan(0.7);
    expect(combined.evidence.length).toBe(2);
    expect(combined.limitations.length).toBe(2);
  });

  it('widens the score range and penalizes confidence when engines disagree', () => {
    const combined = combineResults([divergentResultHuman, concordantResultA]);
    expect(() => DetectionResultSchema.parse(combined)).not.toThrow();

    // Range must widen to encompass both extremes: [0.15, 0.85]
    expect(combined.score[0]).toBe(0.15);
    expect(combined.score[1]).toBe(0.85);

    // Label must transition to 'Mixed / uncertain'
    expect(combined.label).toBe('Mixed / uncertain');

    // Confidence must be penalized due to inter-model disagreement
    expect(combined.confidence).toBeLessThan(concordantResultA.confidence);

    // Limitations must include engine disagreement warning
    expect(
      combined.limitations.some((lim) => lim.includes('Engine disagreement'))
    ).toBe(true);
  });

  it('merges paragraph breakdowns preserving paragraph indices', () => {
    const combined = combineResults([divergentResultHuman, concordantResultA]);
    expect(combined.paragraphs.length).toBe(1);
    expect(combined.paragraphs[0].index).toBe(0);
    expect(combined.paragraphs[0].score[0]).toBe(0.15);
    expect(combined.paragraphs[0].score[1]).toBe(0.8);
    expect(combined.paragraphs[0].label).toBe('Mixed / uncertain');
  });
});
