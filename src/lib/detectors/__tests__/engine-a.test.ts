import { describe, it, expect } from 'vitest';
import { engineA } from '../engine-a';
import { DetectionResultSchema } from '../types';
import { splitSentences, splitParagraphs } from '../utils';

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

  // 260+ words Arabic medical document
  const arabicParagraph =
    'تعتبر إدارة ارتفاع ضغط الدم أثناء الحمل من أهم التحديات السريرية التي تواجه أطباء النساء والتوليد في مختلف أنحاء العالم. يتطلب التشخيص الدقيق مراقبة مستمرة للعلامات الحيوية وتحديد وظائف الكبد والكلى بدقة متناهية لتفادي حدوث مضاعفات خطيرة للأم والجنين. وقد أثبتت الدراسات الحديثة أن استخدام كبريتات المغنيسيوم يساهم بشكل فعال في الوقاية من التشنجات النفاسية لدى الحوامل المصابات بحالات شديدة من تسمم الحمل. كما أن التدخل المبكر لتنظيم ضغط الدم يقلل من مخاطر النزيف الدماغي والانفصال المبكر للمشيمة، مما يضمن سلامة الأم والمولود ويحسن النتائج السريرية على المدى الطويل في جميع المراكز الطبية المتخصصة.';
  const arabicLongDoc = `${arabicParagraph} ${arabicParagraph} ${arabicParagraph}`; // ~270 words

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

    const signalNames = result.evidence.map((s) => s.name);
    expect(signalNames).toContain('sentence_length_variance');
    expect(signalNames).toContain('type_token_ratio');
    expect(signalNames).toContain('hapax_legomena_rate');
    expect(signalNames).toContain('ngram_repetition');
    expect(signalNames).toContain('punctuation_profile');
    expect(signalNames).toContain('function_word_profile');

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

  // GROUP A: Unicode Tokenizer Tests
  it('A2: parses 260+ word Arabic document without dropping tokens and returns active analysis', async () => {
    const result = await engineA.analyze(arabicLongDoc);
    expect(() => DetectionResultSchema.parse(result)).not.toThrow();
    // Must NOT be treated as 0 words or insufficient text
    expect(result.label).not.toBe('Insufficient evidence');
    const docLengthSignal = result.evidence.find((e) => e.name === 'document_length');
    expect(docLengthSignal).toBeUndefined(); // Passes word count threshold
    expect(result.score[0]).toBeGreaterThanOrEqual(0);
    expect(result.score[1]).toBeLessThanOrEqual(1);
  });

  it('A3: retains Arabic tokens in mixed English+Arabic document (> 300 words)', async () => {
    const mixedDoc = `${humanProse} بالإضافة إلى ذلك فإن التشخيص السريري الدقيق يمثل ركنا أساسيا في الرعاية الصحية الحديثة.`;
    const result = await engineA.analyze(mixedDoc);
    expect(() => DetectionResultSchema.parse(result)).not.toThrow();
    expect(result.label).not.toBe('Insufficient evidence');
  });

  // GROUP B: Sentence Splitter Tests
  it('B1: correctly splits sentence abbreviations and quote boundaries', () => {
    // 1. Saint and Mount abbreviations
    const s1 = splitSentences('St. Louis is a city. Mt. Everest is a mountain.');
    expect(s1).toEqual(['St. Louis is a city.', 'Mt. Everest is a mountain.']);

    // 2. Multi-dot abbreviations protected (expected: 1 sentence, not split after abbreviations)
    const s2 = splitSentences('e.g. apples, oranges. i.e. citrus fruits.');
    expect(s2).toEqual(['e.g. apples, oranges. i.e. citrus fruits.']);

    // 3. Period inside closing quotes
    const s3 = splitSentences('He said "hello." Then he left.');
    expect(s3).toEqual(['He said "hello."', 'Then he left.']);

    // 4. Sentence ending with single capital letter grade
    const s4 = splitSentences('She got an A. The next day.');
    expect(s4).toEqual(['She got an A.', 'The next day.']);

    // 5. Junior and Senior
    const s5 = splitSentences('Jr. Smith arrived. Sr. Jones left.');
    expect(s5).toEqual(['Jr. Smith arrived.', 'Sr. Jones left.']);

    // 6. Latin scholarly abbreviations (etc., cf.)
    const s6 = splitSentences('etc. and so on. cf. the reference.');
    expect(s6).toEqual(['etc. and so on.', 'cf. the reference.']);

    // 7. Corporate designations (Inc., Ltd.)
    const s7 = splitSentences('Inc. announced profits. Ltd. closed.');
    expect(s7).toEqual(['Inc. announced profits.', 'Ltd. closed.']);

    // 8. Decimal numbers preserved without breaking sentence boundary
    const s8 = splitSentences('The p-value was 0.04. Significant!');
    expect(s8).toEqual(['The p-value was 0.04.', 'Significant!']);
  });

  // GROUP C: Paragraph Splitter Fallback
  it('C2: splits single newline separated lines into separate paragraphs', () => {
    const paras = splitParagraphs('Short line one.\nShort line two.\nShort line three.');
    expect(paras.length).toBe(3);
    expect(paras[0].text).toBe('Short line one.');
    expect(paras[1].text).toBe('Short line two.');
    expect(paras[2].text).toBe('Short line three.');
  });

  // GROUP D: Engine A Logic Fixes
  it('D1: single-sentence document (>250 words) returns neutral variance signal instead of false AI classification', async () => {
    // A single continuous sentence with 260 words
    const words = Array(260).fill('clinical').join(' ') + '.';
    const result = await engineA.analyze(words);
    const varSignal = result.evidence.find((e) => e.name === 'sentence_length_variance');
    expect(varSignal).toBeDefined();
    expect(varSignal?.direction).toBe('neutral');
    expect(varSignal?.provisionalScore).toBe(0.5);
    expect(varSignal?.reason).toContain('Insufficient sentence diversity');
  });

  it('D2: function word density at 0.419 and 0.421 evaluate consistently', async () => {
    // Both 0.419 and 0.421 round to 0.42 and land in the typical AI range
    const fwWordsA = Array(419).fill('the');
    const contentWordsA = Array(581).fill('hospital');
    const docA = [...fwWordsA, ...contentWordsA].join(' ') + '.';

    const fwWordsB = Array(421).fill('the');
    const contentWordsB = Array(579).fill('hospital');
    const docB = [...fwWordsB, ...contentWordsB].join(' ') + '.';

    const resA = await engineA.analyze(docA);
    const resB = await engineA.analyze(docB);

    const fwSigA = resA.evidence.find((e) => e.name === 'function_word_profile');
    const fwSigB = resB.evidence.find((e) => e.name === 'function_word_profile');

    expect(fwSigA?.value).toBe(0.419);
    expect(fwSigB?.value).toBe(0.421);
    expect(fwSigA?.direction).toBe('ai');
    expect(fwSigB?.direction).toBe('ai');
    expect(fwSigA?.direction).toBe(fwSigB?.direction);
  });
});
