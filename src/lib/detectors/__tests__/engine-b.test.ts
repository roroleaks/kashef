import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { engineB, isEngineBConfigured } from '../engine-b';
import { engineA } from '../engine-a';
import { combineResults } from '../combiner';
import { DetectionResultSchema } from '../types';

const SAMPLE_HUMAN_TEXT = `
The history of obstetrics reflects a continuous transition from intuitive traditional midwifery
to evidence-based perinatal medicine. Over past centuries, maternal and neonatal morbidity were
ubiquitous hazards associated with childbirth. The introduction of sterile surgical techniques,
blood banking, and modern pharmacotherapy dramatically reduced intrapartum mortality worldwide.
In contemporary clinical environments, computerized fetal heart rate monitoring and obstetric
ultrasonography provide real-time diagnostic insights during labor. Clinicians now evaluate
complex maternal-fetal interactions with precision, balancing conservative management against
timely surgical intervention. Nevertheless, geographic and socioeconomic disparities persist in
maternal outcomes across both developed and developing regions. Comprehensive clinical guidelines
must incorporate localized healthcare infrastructure while maintaining rigorous international
standards of maternal healthcare. Recent advances in automated decision support systems have
demonstrated notable efficacy in standardizing risk stratification protocols across busy maternity
units. By analyzing cardiotocography data in tandem with maternal vital signs, these platforms assist
labor ward teams in recognizing early physiological deterioration. Continuous professional training
and adherence to multi-disciplinary care pathways remain essential cornerstones for safeguarding
maternal well-being throughout gestation, labor, and the crucial postpartum recovery window.
`.repeat(2).trim(); // Ensure > 250 words

describe('Step 4: Engine B — Server-Side LLM Classifier', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    delete process.env.GEMINI_API_KEY;
    delete process.env.OPENAI_API_KEY;
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('rejects documents below the 250-word minimum with Insufficient evidence', async () => {
    const shortText = 'This is a short sample document with far too few words to be evaluated.';
    const result = await engineB.analyze(shortText);

    expect(result.label).toBe('Insufficient evidence');
    expect(result.score).toEqual([0.0, 1.0]);
    expect(result.confidence).toBe(0.1);
    expect(result.evidence[0].name).toBe('document_length');
    expect(result.limitations.some((l) => l.includes('too short'))).toBe(true);
    expect(() => DetectionResultSchema.parse(result)).not.toThrow();
  });

  it('returns unconfigured status when no API keys are present', async () => {
    expect(isEngineBConfigured()).toBe(false);

    const result = await engineB.analyze(SAMPLE_HUMAN_TEXT);

    expect(result.label).toBe('Insufficient evidence');
    expect(result.score).toEqual([0.0, 1.0]);
    expect(result.confidence).toBe(0.1);
    expect(result.evidence[0].name).toBe('engine_b_status');
    expect(result.limitations.some((l) => l.includes('API key not configured'))).toBe(true);
    expect(() => DetectionResultSchema.parse(result)).not.toThrow();
  });

  it('successfully invokes Gemini API and returns validated structured DetectionResult', async () => {
    process.env.GEMINI_API_KEY = 'test-gemini-key';
    expect(isEngineBConfigured()).toBe(true);

    const mockLlmResponse = {
      score: [0.15, 0.32],
      label: 'Likely human',
      confidence: 0.82,
      signals: [
        {
          name: 'semantic_predictability',
          value: 'low',
          direction: 'human',
          reason: 'Prose demonstrates authentic clinical terminology and varied rhetorical style.',
        },
        {
          name: 'rhetorical_patterns',
          value: 'moderate',
          direction: 'neutral',
          reason: 'Balanced paragraph structure with natural domain transitions.',
        },
        {
          name: 'stylistic_voice',
          value: 'high',
          direction: 'human',
          reason: 'Strong authorial voice typical of medical academic syntheses.',
        },
      ],
      paragraphs: [
        {
          index: 0,
          score: [0.15, 0.30],
          label: 'Likely human',
          reason: 'Authentic phrasing and historical context.',
        },
      ],
      limitations: ['Evaluation based on server-side zero-retention analysis.'],
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: JSON.stringify(mockLlmResponse) }],
            },
          },
        ],
      }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await engineB.analyze(SAMPLE_HUMAN_TEXT);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const fetchCallUrl = mockFetch.mock.calls[0][0] as string;
    expect(fetchCallUrl).toContain('generativelanguage.googleapis.com');
    expect(fetchCallUrl).toContain('test-gemini-key');

    expect(result.engineId).toBe('engine-b-llm');
    expect(result.label).toBe('Likely human');
    expect(result.score).toEqual([0.15, 0.32]);
    expect(result.confidence).toBe(0.82);
    expect(result.evidence.length).toBe(3);
    expect(result.evidence[0].name).toBe('semantic_predictability');
    expect(result.evidence[0].direction).toBe('human');
    expect(() => DetectionResultSchema.parse(result)).not.toThrow();
  });

  it('successfully invokes OpenAI-compatible API when OPENAI_API_KEY is configured', async () => {
    process.env.OPENAI_API_KEY = 'test-openai-key';
    expect(isEngineBConfigured()).toBe(true);

    const mockLlmResponse = {
      score: [0.72, 0.88],
      label: 'Likely AI-assisted',
      confidence: 0.78,
      signals: [
        {
          name: 'semantic_predictability',
          value: 'high',
          direction: 'ai',
          reason: 'Uniform information density and stereotypical transition phrasing.',
        },
        {
          name: 'rhetorical_patterns',
          value: 'high',
          direction: 'ai',
          reason: 'Repetitive introductory clauses and synthetic symmetry.',
        },
      ],
      paragraphs: [
        {
          index: 0,
          score: [0.70, 0.85],
          label: 'Likely AI-assisted',
          reason: 'Generic structure with low perplexity.',
        },
      ],
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify(mockLlmResponse),
            },
          },
        ],
      }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await engineB.analyze(SAMPLE_HUMAN_TEXT);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const fetchCallUrl = mockFetch.mock.calls[0][0] as string;
    expect(fetchCallUrl).toContain('api.openai.com');

    expect(result.label).toBe('Likely AI-assisted');
    expect(result.score).toEqual([0.72, 0.88]);
    expect(result.evidence[0].direction).toBe('ai');
    expect(() => DetectionResultSchema.parse(result)).not.toThrow();
  });

  it('handles API errors (HTTP 500) gracefully and provides fallback result with limitation', async () => {
    process.env.GEMINI_API_KEY = 'test-gemini-key';

    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error from upstream provider',
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await engineB.analyze(SAMPLE_HUMAN_TEXT);

    expect(result.label).toBe('Insufficient evidence');
    expect(result.score).toEqual([0.0, 1.0]);
    expect(result.confidence).toBe(0.1);
    expect(result.limitations.some((l) => l.includes('Engine B call failed'))).toBe(true);
    expect(() => DetectionResultSchema.parse(result)).not.toThrow();
  });

  it('handles network timeouts or abort errors gracefully', async () => {
    process.env.GEMINI_API_KEY = 'test-gemini-key';

    const mockFetch = vi.fn().mockRejectedValue(new Error('The operation was aborted due to timeout.'));
    vi.stubGlobal('fetch', mockFetch);

    const result = await engineB.analyze(SAMPLE_HUMAN_TEXT);

    expect(result.label).toBe('Insufficient evidence');
    expect(result.limitations.some((l) => l.includes('timeout') || l.includes('aborted'))).toBe(true);
    expect(() => DetectionResultSchema.parse(result)).not.toThrow();
  });

  it('handles malformed JSON from LLM gracefully', async () => {
    process.env.GEMINI_API_KEY = 'test-gemini-key';

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: 'This is not JSON at all: {"broken json...' }],
            },
          },
        ],
      }),
    });
    vi.stubGlobal('fetch', mockFetch);

    await expect(engineB.analyze(SAMPLE_HUMAN_TEXT)).rejects.toThrow('MALFORMED_LLM_OUTPUT');
  });

  it('combines Engine A and Engine B cleanly via multi-engine combiner', async () => {
    process.env.GEMINI_API_KEY = 'test-gemini-key';

    const mockLlmResponse = {
      score: [0.18, 0.35],
      label: 'Likely human',
      confidence: 0.85,
      signals: [
        {
          name: 'semantic_predictability',
          value: 'low',
          direction: 'human',
          reason: 'High lexical burstiness and varied syntactic clauses.',
        },
      ],
      paragraphs: [
        {
          index: 0,
          score: [0.18, 0.35],
          label: 'Likely human',
          reason: 'Natural academic prose.',
        },
      ],
    };

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [
            {
              content: { parts: [{ text: JSON.stringify(mockLlmResponse) }] },
            },
          ],
        }),
      })
    );

    const [resA, resB] = await Promise.all([
      engineA.analyze(SAMPLE_HUMAN_TEXT),
      engineB.analyze(SAMPLE_HUMAN_TEXT),
    ]);

    const combined = combineResults([resA, resB]);

    expect(['Likely human', 'Mixed / uncertain']).toContain(combined.label);
    expect(combined.confidence).toBeGreaterThan(0.5);
    expect(combined.evidence.some((e) => e.name === 'semantic_predictability')).toBe(true);
    expect(combined.evidence.some((e) => e.name === 'sentence_length_variance')).toBe(true);
    expect(() => DetectionResultSchema.parse(combined)).not.toThrow();
  });
});
