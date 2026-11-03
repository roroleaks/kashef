import { describe, it, expect } from 'vitest';
import { engineA } from '../engine-a';
import { DetectionResultSchema } from '../types';

describe('Step 3: Engine A — Statistical Signals & Heuristics', () => {
  const shortText = 'This is a short sample document with fewer than two hundred and fifty words.';

  const humanProse = `
    For over thirty years, clinical practice in high-risk obstetrics has evolved continuously.
    When Dr. Raouf Roshdy and his surgical team initially reported outcomes from their multicenter cohort in 2021,
    the findings astonished senior faculty! Standard protocols had long favored conservative medical observation.
    However, our comprehensive hemodynamic data told an entirely different story across two hundred consecutive patients.
    Why did such marked maternal disparities persist?
    The pathophysiologic explanation lies predominantly within placental microvascular compliance;
    specifically, early uterine artery notch disappearance was observed in seventy-eight percent of normotensive outcomes.
    Conversely, women exhibiting persistent bilateral notches faced a fourfold higher incidence of early placental abruption.
    Rigid guidelines fail clinicians precisely because human biology is intrinsically heterogenous.
    Personalized maternal surveillance—rather than rigid administrative dogmas—must govern modern obstetric decisions.
    Without humble, empirical, and individualized physiological monitoring, clinicians inevitably risk either premature iatrogenic delivery or catastrophic maternal morbidity.
    True scientific rigor demands perpetual skepticism and unyielding empirical validation.
    Throughout our subsequent longitudinal investigations, maternal cardiac output indices demonstrated substantial intra-patient variability, reinforcing the necessity of tailored bedside hemodynamics.
    Ultimately, maternal medicine is an art grounded in empirical science, demanding relentless clinical attention.
  `.repeat(2); // > 250 words

  const aiProse = `
    Artificial intelligence plays a crucial role in modern clinical environments by optimizing diagnostic workflows and enhancing patient care.
    Machine learning algorithms have demonstrated significant capabilities across various medical specialties, including radiology, pathology, and cardiology.
    Furthermore, predictive analytics enable clinical teams to identify patient deterioration before adverse medical events occur.
    In addition to clinical decision support, artificial intelligence assists healthcare administrative teams in scheduling patient appointments efficiently.
    It is important to note that the adoption of artificial intelligence requires robust data governance and comprehensive cybersecurity protocols.
    Healthcare institutions must implement standardized frameworks to ensure that algorithmic predictions are fair, transparent, and reproducible.
    Moreover, medical professionals must collaborate closely with computational scientists to develop tools that align with hospital workflows.
    Training healthcare practitioners to interpret predictive analytics effectively is another essential requirement for successful system adoption.
    In conclusion, the strategic implementation of artificial intelligence has the potential to streamline operations and enhance clinical outcomes.
    As healthcare technologies continue to evolve, ongoing interdisciplinary collaboration will remain necessary to maximize patient safety.
    Continuous monitoring of automated decision support systems ensures compliance with institutional regulatory standards.
    Healthcare stakeholders must remain vigilant in auditing machine learning outputs across diverse patient populations.
  `.repeat(2); // > 250 words

  it('rejects documents with fewer than 250 words returning Insufficient evidence', async () => {
    const result = await engineA.analyze(shortText);
    expect(() => DetectionResultSchema.parse(result)).not.toThrow();

    expect(result.label).toBe('Insufficient evidence');
    expect(result.score[0]).toBe(0.0);
    expect(result.score[1]).toBe(1.0);
    expect(result.confidence).toBeLessThan(0.3);
    expect(result.evidence[0].name).toBe('document_length');
    expect(result.evidence[0].reason).toContain('below the minimum threshold of 250 words');
  });

  it('evaluates document with > 250 words returning all six statistical signals', async () => {
    const result = await engineA.analyze(humanProse);
    expect(() => DetectionResultSchema.parse(result)).not.toThrow();

    // Verify 6 statistical signals are evaluated
    const signalNames = result.evidence.map((s) => s.name);
    expect(signalNames).toContain('sentence_length_variance');
    expect(signalNames).toContain('type_token_ratio');
    expect(signalNames).toContain('hapax_legomena_rate');
    expect(signalNames).toContain('ngram_repetition');
    expect(signalNames).toContain('punctuation_profile');
    expect(signalNames).toContain('function_word_profile');

    // Every signal has raw value, direction, and plain-language reason
    for (const sig of result.evidence) {
      expect(sig.value).toBeDefined();
      expect(['human', 'ai', 'neutral']).toContain(sig.direction);
      expect(typeof sig.reason).toBe('string');
      expect(sig.reason.length).toBeGreaterThan(10);
    }
  });

  it('assigns Insufficient text to paragraphs below the 25-word threshold', async () => {
    const mixedLengthDoc = `${humanProse}\n\nToo short.\n\n${humanProse}`;
    const result = await engineA.analyze(mixedLengthDoc);

    const shortPara = result.paragraphs.find((p) => p.wordCount < 25);
    expect(shortPara).toBeDefined();
    expect(shortPara?.label).toBe('Insufficient evidence');
    expect(shortPara?.score[0]).toBe(0.0);
    expect(shortPara?.score[1]).toBe(1.0);
    expect(shortPara?.signals[0].reason).toContain('Insufficient text: paragraph has');
  });

  it('detects natural burstiness in human prose yielding Likely human or Mixed', async () => {
    const result = await engineA.analyze(humanProse);
    expect(['Likely human', 'Mixed / uncertain']).toContain(result.label);
    expect(result.score[0]).toBeLessThanOrEqual(result.score[1]);
    expect(result.score[0]).toBeLessThan(0.5);
  });

  it('detects uniform sentence lengths and repetitive n-grams in synthetic AI prose', async () => {
    const result = await engineA.analyze(aiProse);
    expect(['Likely AI-assisted', 'Mixed / uncertain']).toContain(result.label);
    expect(result.score[1]).toBeGreaterThanOrEqual(0.55);
  });
});
