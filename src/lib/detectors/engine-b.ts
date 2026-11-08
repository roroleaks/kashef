import { z } from 'zod';
import {
  DetectorEngine,
  DetectionResult,
  DetectionResultSchema,
  DetectionLabel,
  SignalEvidence,
  ParagraphAnalysis,
} from './types';
import { splitParagraphs, tokenizeWords } from './utils';
import { THRESHOLDS } from './config/thresholds';

/**
 * Zod schema enforcing the structured JSON schema expected from LLM classification calls.
 */
const LLMRawSignalSchema = z.object({
  name: z.string(),
  value: z.union([z.number(), z.string()]),
  direction: z.enum(['human', 'ai', 'neutral']),
  reason: z.string(),
  benchmark: z.string().optional(),
});

const LLMRawParagraphSchema = z.object({
  index: z.number().int().nonnegative().optional(),
  score: z.tuple([z.number().min(0).max(1), z.number().min(0).max(1)]),
  label: z.enum(['Likely human', 'Mixed / uncertain', 'Likely AI-assisted', 'Insufficient evidence']).optional(),
  reason: z.string().optional(),
});

const LLMResponseSchema = z.object({
  score: z.tuple([z.number().min(0).max(1), z.number().min(0).max(1)]),
  label: z.enum(['Likely human', 'Mixed / uncertain', 'Likely AI-assisted', 'Insufficient evidence']),
  confidence: z.number().min(0).max(1),
  signals: z.array(LLMRawSignalSchema),
  paragraphs: z.array(LLMRawParagraphSchema).optional(),
  limitations: z.array(z.string()).optional(),
});

export type LLMResponse = z.infer<typeof LLMResponseSchema>;

/**
 * Checks if Engine B has a supported API key configured in environment variables.
 */
export function isEngineBConfigured(): boolean {
  return Boolean(
    (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0) ||
    (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim().length > 0)
  );
}

/**
 * System prompt instructing the LLM classifier to evaluate probabilistic authorship markers.
 */
const SYSTEM_PROMPT = `You are a specialized linguistic forensics classifier for Kashef (كاشف).
Your objective is to evaluate whether a text exhibits hallmarks of AI language model generation or human authorship.

Epistemological Requirements:
1. Never produce single hard verdicts or binary 0/1 assertions. Output a realistic probability range [low, high] where:
   - 0.00 to 0.40 indicates Likely human
   - 0.35 to 0.65 indicates Mixed / uncertain (heavy editing, hybrid prose, or conflicting indicators)
   - 0.60 to 1.00 indicates Likely AI-assisted
   - Insufficient evidence if text lacks substantive evaluatable content.
2. Evaluate specific qualitative and structural dimensions:
   - "semantic_predictability": Uniformity of information density and absence of idiosyncratic authorial digressions.
   - "rhetorical_patterns": Formulaic introductions/conclusions, excessive balanced clauses, sycophantic hedging, or generic listicle transitions.
   - "stylistic_voice": Authentic personal voice, colloquial domain phrasing, and authentic irregularity vs homogeneous smooth prose.
3. For paragraphs, provide an estimated score range and brief reason.
4. Output MUST strictly be valid JSON conforming to this format:
{
  "score": [0.20, 0.35],
  "label": "Likely human",
  "confidence": 0.75,
  "signals": [
    {
      "name": "semantic_predictability",
      "value": "low",
      "direction": "human",
      "reason": "Text features authentic domain-specific phrasing and unexpected structural turns."
    },
    {
      "name": "rhetorical_patterns",
      "value": "moderate",
      "direction": "neutral",
      "reason": "Balanced argument structure with occasional standard transition markers."
    },
    {
      "name": "stylistic_voice",
      "value": "high",
      "direction": "human",
      "reason": "Distinctive personal authorial voice with natural irregularity."
    }
  ],
  "paragraphs": [
    {
      "index": 0,
      "score": [0.20, 0.35],
      "label": "Likely human",
      "reason": "Natural phrasing and uneven sentence cadences."
    }
  ],
  "limitations": [
    "LLM classification is probabilistic and sensitive to genre conventions."
  ]
}`;

/**
 * Calls Google Gemini REST API using zero-data-retention parameters.
 */
async function callGemini(apiKey: string, text: string, timeoutMs = 10000): Promise<string> {
  const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `${SYSTEM_PROMPT}\n\nAnalyze the following text strictly and output the required JSON:\n\n"""\n${text}\n"""`,
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Gemini API returned status ${res.status}: ${errText.slice(0, 120)}`);
    }

    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };

    const textOutput = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textOutput) {
      throw new Error('Gemini API returned empty candidate response.');
    }

    return textOutput;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Calls OpenAI-compatible API endpoint using zero-data-retention parameters.
 */
async function callOpenAI(apiKey: string, text: string, timeoutMs = 10000): Promise<string> {
  const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const url = `${baseUrl.replace(/\/+$/, '')}/chat/completions`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Analyze the following text strictly and output the required JSON:\n\n"""\n${text}\n"""` },
        ],
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`OpenAI API returned status ${res.status}: ${errText.slice(0, 120)}`);
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const textOutput = data?.choices?.[0]?.message?.content;
    if (!textOutput) {
      throw new Error('OpenAI API returned empty message content.');
    }

    return textOutput;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * ENGINE B: Server-Side Language Model Classifier
 * Strictly server-side execution. Ephemeral in-memory analysis with zero logging or disk persistence.
 */
export const engineB: DetectorEngine = {
  id: 'engine-b-llm',
  name: 'Engine B — Language Model Evaluation',
  description:
    'Server-side LLM zero-data-retention evaluation of rhetorical markers, semantic predictability, and machine artifacts.',

  async analyze(text: string): Promise<DetectionResult> {
    const totalWords = tokenizeWords(text);

    // Below document-level minimum: return Insufficient evidence
    if (totalWords.length < THRESHOLDS.minDocumentWords.value) {
      const result: DetectionResult = {
        score: [0.0, 1.0],
        label: 'Insufficient evidence',
        confidence: 0.1,
        evidence: [
          {
            name: 'document_length',
            value: totalWords.length,
            direction: 'neutral',
            reason: `Document contains ${totalWords.length} words, below the minimum threshold of ${THRESHOLDS.minDocumentWords.value} words.`,
            benchmark: `>= ${THRESHOLDS.minDocumentWords.value} words required`,
          },
        ],
        paragraphs: splitParagraphs(text).map((p) => ({
          text: p.text,
          index: p.index,
          wordCount: p.wordCount,
          score: [0.0, 1.0],
          label: 'Insufficient evidence',
          signals: [
            {
              name: 'insufficient_text',
              value: p.wordCount,
              direction: 'neutral',
              reason: 'Insufficient text: document below overall minimum length threshold.',
            },
          ],
        })),
        limitations: [
          'Document is too short for reliable language model analysis.',
          'Minimum 250 words required.',
        ],
        engineId: this.id,
        timestamp: new Date().toISOString(),
      };
      return DetectionResultSchema.parse(result);
    }

    // Check if an API key is configured
    const geminiKey = process.env.GEMINI_API_KEY?.trim();
    const openaiKey = process.env.OPENAI_API_KEY?.trim();

    if (!geminiKey && !openaiKey) {
      // Unconfigured fallback
      const result: DetectionResult = {
        score: [0.0, 1.0],
        label: 'Insufficient evidence',
        confidence: 0.1,
        evidence: [
          {
            name: 'engine_b_status',
            value: 'unconfigured',
            direction: 'neutral',
            reason: 'Engine B is unconfigured. Set GEMINI_API_KEY or OPENAI_API_KEY to activate server-side LLM evaluation.',
          },
        ],
        paragraphs: splitParagraphs(text).map((p) => ({
          text: p.text,
          index: p.index,
          wordCount: p.wordCount,
          score: [0.0, 1.0],
          label: 'Insufficient evidence',
          signals: [],
        })),
        limitations: [
          'Engine B API key not configured on server.',
          'Relying exclusively on Engine A statistical proxies.',
        ],
        engineId: this.id,
        timestamp: new Date().toISOString(),
      };
      return DetectionResultSchema.parse(result);
    }

    // Call LLM provider
    let rawOutput = '';
    const limitations: string[] = [
      'Engine B evaluations are generated by a zero-data-retention server-side language model.',
      'Results are probabilistic estimations and should not be used as definitive proof.',
    ];

    try {
      if (geminiKey) {
        rawOutput = await callGemini(geminiKey, text);
      } else if (openaiKey) {
        rawOutput = await callOpenAI(openaiKey, text);
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      // Clean fallback if API fails or times out
      const result: DetectionResult = {
        score: [0.0, 1.0],
        label: 'Insufficient evidence',
        confidence: 0.1,
        evidence: [
          {
            name: 'llm_call_status',
            value: 'failed_or_timed_out',
            direction: 'neutral',
            reason: `Engine B invocation failed: ${errMsg.slice(0, 100)}`,
          },
        ],
        paragraphs: splitParagraphs(text).map((p) => ({
          text: p.text,
          index: p.index,
          wordCount: p.wordCount,
          score: [0.0, 1.0],
          label: 'Insufficient evidence',
          signals: [],
        })),
        limitations: [
          `Engine B call failed (${errMsg.slice(0, 80)}). Automatic fallback applied.`,
        ],
        engineId: this.id,
        timestamp: new Date().toISOString(),
      };
      return DetectionResultSchema.parse(result);
    }

    // Parse and validate LLM JSON
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(rawOutput);
    } catch {
      throw new Error('MALFORMED_LLM_OUTPUT: LLM returned invalid non-JSON output.');
    }

    const validated = LLMResponseSchema.parse(parsedJson);

    // Build paragraph breakdown aligned with document paragraphs
    const docParagraphs = splitParagraphs(text);
    const paragraphs: ParagraphAnalysis[] = docParagraphs.map((p, idx) => {
      const llmPara = validated.paragraphs?.find((lp) => lp.index === idx) || validated.paragraphs?.[idx];
      const pWords = tokenizeWords(p.text);

      if (pWords.length < THRESHOLDS.minParagraphWords.value) {
        return {
          text: p.text,
          index: p.index,
          wordCount: pWords.length,
          score: [0.0, 1.0] as [number, number],
          label: 'Insufficient evidence' as DetectionLabel,
          signals: [
            {
              name: 'insufficient_text',
              value: pWords.length,
              direction: 'neutral' as const,
              reason: 'Insufficient text: paragraph below 25-word evaluation threshold.',
            },
          ],
        };
      }

      const pScore = llmPara?.score || validated.score;
      const pLabel = (llmPara?.label as DetectionLabel) || validated.label;

      return {
        text: p.text,
        index: p.index,
        wordCount: pWords.length,
        score: pScore,
        label: pLabel,
        signals: llmPara?.reason
          ? [
              {
                name: 'paragraph_evaluation',
                value: pLabel,
                direction: pLabel === 'Likely AI-assisted' ? 'ai' : pLabel === 'Likely human' ? 'human' : 'neutral',
                reason: llmPara.reason,
              },
            ]
          : [],
      };
    });

    if (validated.limitations && validated.limitations.length > 0) {
      limitations.push(...validated.limitations);
    }

    const detectionResult: DetectionResult = {
      score: validated.score,
      label: validated.label,
      confidence: validated.confidence,
      evidence: validated.signals.map((s): SignalEvidence => ({
        name: s.name,
        value: s.value,
        direction: s.direction,
        reason: s.reason,
        benchmark: s.benchmark,
      })),
      paragraphs,
      limitations,
      engineId: this.id,
      timestamp: new Date().toISOString(),
    };

    return DetectionResultSchema.parse(detectionResult);
  },
};
