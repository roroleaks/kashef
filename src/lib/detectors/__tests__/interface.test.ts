import { describe, it, expect, beforeEach } from 'vitest';
import {
  registerEngine,
  getDetector,
  listEngines,
  analyze,
  splitParagraphs,
  splitSentences,
  DetectorEngine,
  DetectionResult,
} from '../index';

describe('Step 2: Detector Interface Contract & Orchestration', () => {
  const mockEngine: DetectorEngine = {
    id: 'mock-engine',
    name: 'Mock Test Engine',
    description: 'A mock engine for interface compliance testing',
    analyze: async (text: string): Promise<DetectionResult> => {
      const paragraphs = splitParagraphs(text);
      return {
        score: [60, 75],
        label: 'mixed_uncertain',
        confidence: 0.85,
        evidence: [
          {
            name: 'mock_signal',
            value: 0.72,
            benchmark: '> 0.65 suggests AI influence',
            description: 'Mock evidence indicator for contract validation',
            scoreContribution: 0.5,
          },
        ],
        paragraphs: paragraphs.map((p) => ({
          text: p.text,
          index: p.index,
          wordCount: p.wordCount,
          score: [55, 70],
          label: 'mixed_uncertain',
          signals: [],
        })),
        limitations: 'Mock evaluation solely for test harness verification.',
        engineUsed: 'mock-engine',
        timestamp: new Date().toISOString(),
      };
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

  it('executes analyze(text) returning the required contract shape', async () => {
    const sampleText =
      'First paragraph discussing clinical AI models.\n\nSecond paragraph evaluating diagnostic accuracy.';
    const result = await analyze(sampleText, 'mock-engine');

    // Score range
    expect(Array.isArray(result.score)).toBe(true);
    expect(result.score.length).toBe(2);
    expect(result.score[0]).toBeLessThanOrEqual(result.score[1]);

    // Label and confidence
    expect(['likely_human', 'mixed_uncertain', 'likely_ai']).toContain(result.label);
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);

    // Evidence array
    expect(Array.isArray(result.evidence)).toBe(true);
    expect(result.evidence.length).toBeGreaterThan(0);
    expect(result.evidence[0]).toHaveProperty('name');
    expect(result.evidence[0]).toHaveProperty('value');
    expect(result.evidence[0]).toHaveProperty('description');

    // Paragraph breakdown
    expect(Array.isArray(result.paragraphs)).toBe(true);
    expect(result.paragraphs.length).toBe(2);
    expect(result.paragraphs[0]).toHaveProperty('score');
    expect(result.paragraphs[0]).toHaveProperty('signals');

    // Required disclaimer and limitations
    expect(typeof result.limitations).toBe('string');
    expect(result.engineUsed).toBe('mock-engine');
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
