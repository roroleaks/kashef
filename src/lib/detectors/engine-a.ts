import {
  DetectorEngine,
  DetectionResult,
  DetectionResultSchema,
  SignalEvidence,
  ParagraphAnalysis,
  DetectionLabel,
} from './types';
import { THRESHOLDS } from './config/thresholds';
import { splitParagraphs, splitSentences, tokenizeWords } from './utils';

const COMMON_FUNCTION_WORDS = new Set([
  'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i', 'it', 'for', 'not', 'on',
  'with', 'he', 'as', 'you', 'do', 'at', 'this', 'but', 'his', 'by', 'from', 'they', 'we',
  'say', 'her', 'she', 'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their',
  'what', 'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me', 'when',
  'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know', 'take', 'people', 'into',
  'year', 'your', 'good', 'some', 'could', 'them', 'see', 'other', 'than', 'then', 'now',
  'look', 'only', 'come', 'its', 'over', 'think', 'also', 'back', 'after', 'use', 'two',
  'how', 'our', 'work', 'first', 'well', 'way', 'even', 'new', 'want', 'because', 'any',
  'these', 'give', 'day', 'most', 'us', 'between', 'during', 'through', 'under', 'such',
]);

/**
 * Computes sentence-length variance (burstiness indicator).
 * Returns -1 sentinel if text has fewer than 2 sentences, preventing false AI classifications.
 */
function computeSentenceLengthVariance(text: string): { variance: number; mean: number } {
  const sentences = splitSentences(text);
  if (sentences.length < 2) {
    return { variance: -1, mean: tokenizeWords(text).length };
  }

  const lengths = sentences.map((s) => tokenizeWords(s).length).filter((len) => len > 0);
  if (lengths.length < 2) {
    return { variance: -1, mean: lengths[0] || 0 };
  }

  const mean = lengths.reduce((acc, val) => acc + val, 0) / lengths.length;
  const variance =
    lengths.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / (lengths.length - 1);

  return { variance: Math.round(variance * 100) / 100, mean: Math.round(mean * 10) / 10 };
}

/**
 * Computes Moving-Average Type-Token Ratio (MATTR) with window=50 for length invariance
 * when words.length > 100, or standard TTR for short passages.
 */
function computeTypeTokenRatio(words: string[]): number {
  if (words.length === 0) return 0;
  if (words.length <= 100) {
    const unique = new Set(words);
    return Math.round((unique.size / words.length) * 1000) / 1000;
  }
  const windowSize = 50;
  let ttrSum = 0;
  const numWindows = words.length - windowSize + 1;
  for (let i = 0; i < numWindows; i++) {
    const windowWords = words.slice(i, i + windowSize);
    const uniqueInWindow = new Set(windowWords).size;
    ttrSum += uniqueInWindow / windowSize;
  }
  return Math.round((ttrSum / numWindows) * 1000) / 1000;
}

/**
 * Computes length-normalized hapax legomena rate (hapax count normalized per effective document length, capped at 500 words)
 * to counteract Zipfian vocabulary saturation in longer documents.
 */
function computeHapaxRate(words: string[]): number {
  if (words.length === 0) return 0;
  const counts = new Map<string, number>();
  for (const w of words) {
    counts.set(w, (counts.get(w) || 0) + 1);
  }

  let hapaxCount = 0;
  for (const count of counts.values()) {
    if (count === 1) hapaxCount++;
  }

  const effectiveLength = Math.min(words.length, 500);
  return Math.round((hapaxCount / effectiveLength) * 1000) / 1000;
}

/**
 * Computes N-Gram repetition rate for trigrams (repeated trigrams / total trigrams).
 */
function computeNgramRepetition(words: string[], n: number = 3): number {
  if (words.length < n + 1) return 0;
  const totalNgrams = words.length - n + 1;
  const seen = new Set<string>();
  let duplicates = 0;

  for (let i = 0; i <= words.length - n; i++) {
    const gram = words.slice(i, i + n).join(' ');
    if (seen.has(gram)) {
      duplicates++;
    } else {
      seen.add(gram);
    }
  }

  return Math.round((duplicates / totalNgrams) * 1000) / 1000;
}

/**
 * Computes punctuation diversity and frequency per token.
 */
function computePunctuationProfile(text: string, tokenCount: number): { diversity: number; count: number } {
  if (tokenCount === 0) return { diversity: 0, count: 0 };
  // Count expressive/rhetorical punctuation: semicolons, colons, em-dashes, brackets, question marks
  const expressiveMarks = text.match(/[;:\u2014\u2013()[\]?!]/g) || [];
  const diversity = Math.round((expressiveMarks.length / tokenCount) * 10000) / 10000;
  return { diversity, count: expressiveMarks.length };
}

/**
 * Computes function word density.
 */
function computeFunctionWordDensity(words: string[]): number {
  if (words.length === 0) return 0;
  const fwCount = words.filter((w) => COMMON_FUNCTION_WORDS.has(w)).length;
  return Math.round((fwCount / words.length) * 1000) / 1000;
}

/**
 * Evaluates statistical signals and calculates signal evidence and AI probability contributor.
 * Uses weighted combination reflecting empirical signal reliability.
 */
function extractStatisticalSignals(text: string, words: string[]): {
  signals: SignalEvidence[];
  compositeScore: number;
} {
  const signals: SignalEvidence[] = [];
  const signalScores: { score: number; weight: number }[] = [];

  // 1. Sentence-length variance (Burstiness, weight: 1.0 - strongest single stylometric signal)
  const { variance } = computeSentenceLengthVariance(text);
  const vHuman = THRESHOLDS.sentenceLengthVariance.value.humanThreshold;
  const vAi = THRESHOLDS.sentenceLengthVariance.value.aiThreshold;
  if (variance === -1) {
    signals.push({
      name: 'sentence_length_variance',
      value: -1,
      direction: 'neutral',
      reason: 'Insufficient sentence diversity to compute variance (single-sentence document).',
      benchmark: '>= 2 sentences required to compute burstiness',
      provisionalScore: 0.5,
    });
    signalScores.push({ score: 0.5, weight: 1.0 });
  } else if (variance >= vHuman) {
    signals.push({
      name: 'sentence_length_variance',
      value: variance,
      direction: 'human',
      reason: `High sentence-length variance (${variance}) indicates natural human syntactic burstiness.`,
      benchmark: `> ${vHuman} suggests human variation; < ${vAi} suggests machine pacing`,
      provisionalScore: 0.2,
    });
    signalScores.push({ score: 0.2, weight: 1.0 });
  } else if (variance <= vAi) {
    signals.push({
      name: 'sentence_length_variance',
      value: variance,
      direction: 'ai',
      reason: `Low sentence-length variance (${variance}) indicates uniform machine-generated sentence lengths.`,
      benchmark: `> ${vHuman} suggests human variation; < ${vAi} suggests machine pacing`,
      provisionalScore: 0.8,
    });
    signalScores.push({ score: 0.8, weight: 1.0 });
  } else {
    signals.push({
      name: 'sentence_length_variance',
      value: variance,
      direction: 'neutral',
      reason: `Moderate sentence-length variance (${variance}) falls within the mixed transition range.`,
      benchmark: `> ${vHuman} suggests human variation; < ${vAi} suggests machine pacing`,
      provisionalScore: 0.5,
    });
    signalScores.push({ score: 0.5, weight: 1.0 });
  }

  // 2. Type-Token Ratio (Lexical Diversity with MATTR, weight: 0.8)
  const ttr = computeTypeTokenRatio(words);
  const ttrHuman = THRESHOLDS.typeTokenRatio.value.humanThreshold;
  const ttrAi = THRESHOLDS.typeTokenRatio.value.aiThreshold;
  if (ttr >= ttrHuman) {
    signals.push({
      name: 'type_token_ratio',
      value: ttr,
      direction: 'human',
      reason: `High vocabulary richness (TTR: ${ttr}) reflects wide lexical selection.`,
      benchmark: `> ${ttrHuman} suggests diverse vocabulary; < ${ttrAi} suggests repetition`,
      provisionalScore: 0.25,
    });
    signalScores.push({ score: 0.25, weight: 0.8 });
  } else if (ttr <= ttrAi) {
    signals.push({
      name: 'type_token_ratio',
      value: ttr,
      direction: 'ai',
      reason: `Constrained vocabulary diversity (TTR: ${ttr}) reflects recurrent lexical patterns.`,
      benchmark: `> ${ttrHuman} suggests diverse vocabulary; < ${ttrAi} suggests repetition`,
      provisionalScore: 0.75,
    });
    signalScores.push({ score: 0.75, weight: 0.8 });
  } else {
    signals.push({
      name: 'type_token_ratio',
      value: ttr,
      direction: 'neutral',
      reason: `Moderate vocabulary diversity (TTR: ${ttr}).`,
      benchmark: `> ${ttrHuman} suggests diverse vocabulary; < ${ttrAi} suggests repetition`,
      provisionalScore: 0.5,
    });
    signalScores.push({ score: 0.5, weight: 0.8 });
  }

  // 3. Hapax Rate (Length-normalized unique single-use words, weight: 0.8)
  const hapax = computeHapaxRate(words);
  const hHuman = THRESHOLDS.hapaxRate.value.humanThreshold;
  const hAi = THRESHOLDS.hapaxRate.value.aiThreshold;
  if (hapax >= hHuman) {
    signals.push({
      name: 'hapax_legomena_rate',
      value: hapax,
      direction: 'human',
      reason: `High single-occurrence word frequency (${hapax}) reflects creative, idiosyncratic word usage.`,
      benchmark: `> ${hHuman} suggests natural Zipf distribution; < ${hAi} suggests common-token convergence`,
      provisionalScore: 0.25,
    });
    signalScores.push({ score: 0.25, weight: 0.8 });
  } else if (hapax <= hAi) {
    signals.push({
      name: 'hapax_legomena_rate',
      value: hapax,
      direction: 'ai',
      reason: `Low single-occurrence rate (${hapax}) indicates preference for high-probability general vocabulary.`,
      benchmark: `> ${hHuman} suggests natural Zipf distribution; < ${hAi} suggests common-token convergence`,
      provisionalScore: 0.75,
    });
    signalScores.push({ score: 0.75, weight: 0.8 });
  } else {
    signals.push({
      name: 'hapax_legomena_rate',
      value: hapax,
      direction: 'neutral',
      reason: `Moderate single-occurrence word rate (${hapax}).`,
      benchmark: `> ${hHuman} suggests natural Zipf distribution; < ${hAi} suggests common-token convergence`,
      provisionalScore: 0.5,
    });
    signalScores.push({ score: 0.5, weight: 0.8 });
  }

  // 4. N-Gram Repetition (3-gram duplicates, weight: 1.0)
  const ngramRep = computeNgramRepetition(words, 3);
  const ngHuman = THRESHOLDS.ngramRepetition.value.humanThreshold;
  const ngAi = THRESHOLDS.ngramRepetition.value.aiThreshold;
  if (ngramRep >= ngAi) {
    signals.push({
      name: 'ngram_repetition',
      value: ngramRep,
      direction: 'ai',
      reason: `Elevated 3-gram repetition (${ngramRep}) indicates recycled transition templates.`,
      benchmark: `< ${ngHuman} indicates unique phrasing; > ${ngAi} indicates formulaic transitions`,
      provisionalScore: 0.8,
    });
    signalScores.push({ score: 0.8, weight: 1.0 });
  } else if (ngramRep <= ngHuman) {
    signals.push({
      name: 'ngram_repetition',
      value: ngramRep,
      direction: 'human',
      reason: `Low 3-gram repetition (${ngramRep}) reflects varied, unformulaic phrasing.`,
      benchmark: `< ${ngHuman} indicates unique phrasing; > ${ngAi} indicates formulaic transitions`,
      provisionalScore: 0.2,
    });
    signalScores.push({ score: 0.2, weight: 1.0 });
  } else {
    signals.push({
      name: 'ngram_repetition',
      value: ngramRep,
      direction: 'neutral',
      reason: `Moderate phrase repetition (${ngramRep}).`,
      benchmark: `< ${ngHuman} indicates unique phrasing; > ${ngAi} indicates formulaic transitions`,
      provisionalScore: 0.5,
    });
    signalScores.push({ score: 0.5, weight: 1.0 });
  }

  // 5. Punctuation Profile (Diversity & frequency, weight: 0.6)
  const punct = computePunctuationProfile(text, words.length);
  const puncHuman = THRESHOLDS.punctuationDiversity.value.humanThreshold;
  const puncAi = THRESHOLDS.punctuationDiversity.value.aiThreshold;
  if (punct.diversity >= puncHuman) {
    signals.push({
      name: 'punctuation_profile',
      value: punct.diversity,
      direction: 'human',
      reason: `Diverse expressive punctuation marks (${punct.count} marks, ${punct.diversity} per token) indicate human rhetorical rhythm.`,
      benchmark: `> ${puncHuman} suggests diverse rhetorical markers; < ${puncAi} indicates flat punctuation`,
      provisionalScore: 0.3,
    });
    signalScores.push({ score: 0.3, weight: 0.6 });
  } else if (punct.diversity <= puncAi) {
    signals.push({
      name: 'punctuation_profile',
      value: punct.diversity,
      direction: 'ai',
      reason: `Monotone punctuation profile (${punct.count} expressive marks) with sparse rhetorical cadence.`,
      benchmark: `> ${puncHuman} suggests diverse rhetorical markers; < ${puncAi} indicates flat punctuation`,
      provisionalScore: 0.7,
    });
    signalScores.push({ score: 0.7, weight: 0.6 });
  } else {
    signals.push({
      name: 'punctuation_profile',
      value: punct.diversity,
      direction: 'neutral',
      reason: `Standard punctuation distribution (${punct.diversity} per token).`,
      benchmark: `> ${puncHuman} suggests diverse rhetorical markers; < ${puncAi} indicates flat punctuation`,
      provisionalScore: 0.5,
    });
    signalScores.push({ score: 0.5, weight: 0.6 });
  }

  // 6. Function Word Profile (Calibrated disjoint bands, weight: 0.5)
  const fwDensity = computeFunctionWordDensity(words);
  const roundedFw = Math.round(fwDensity * 100) / 100;
  const aiRange = THRESHOLDS.functionWordDensity.value.aiTypicalRange;
  const humanRange = THRESHOLDS.functionWordDensity.value.humanRange;

  if (roundedFw < humanRange[0] || roundedFw > humanRange[1]) {
    signals.push({
      name: 'function_word_profile',
      value: fwDensity,
      direction: 'neutral',
      reason: `Function word density (${fwDensity}) falls outside typical distribution bands (< ${humanRange[0]} or > ${humanRange[1]}).`,
      benchmark: `Human range: [${humanRange[0]}, ${humanRange[1]}]; AI typical: [${aiRange[0]}, ${aiRange[1]}]`,
      provisionalScore: 0.5,
    });
    signalScores.push({ score: 0.5, weight: 0.5 });
  } else if (roundedFw >= aiRange[0] && roundedFw <= aiRange[1]) {
    signals.push({
      name: 'function_word_profile',
      value: fwDensity,
      direction: 'ai',
      reason: `Function word density (${fwDensity}) aligns closely with typical language model token distributions (42%–48%).`,
      benchmark: `Machine text frequently clusters between ${aiRange[0]} and ${aiRange[1]}`,
      provisionalScore: 0.65,
    });
    signalScores.push({ score: 0.65, weight: 0.5 });
  } else {
    signals.push({
      name: 'function_word_profile',
      value: fwDensity,
      direction: 'human',
      reason: `Function word density (${fwDensity}) departs from tight model averages, demonstrating authorial variability.`,
      benchmark: `Human range: [${humanRange[0]}, ${humanRange[1]}]; AI typical: [${aiRange[0]}, ${aiRange[1]}]`,
      provisionalScore: 0.35,
    });
    signalScores.push({ score: 0.35, weight: 0.5 });
  }

  // Composite weighted average of signal scores reflecting empirical signal reliability
  const totalWeight = signalScores.reduce((acc, s) => acc + s.weight, 0);
  const compositeScore =
    totalWeight > 0
      ? signalScores.reduce((acc, s) => acc + s.score * s.weight, 0) / totalWeight
      : 0.5;

  return { signals, compositeScore: Math.round(compositeScore * 1000) / 1000 };
}

/**
 * Maps probability range to tiered classification label according to design tokens.
 */
function deriveTierLabel(low: number, high: number): DetectionLabel {
  const midpoint = (low + high) / 2;
  const tiers = THRESHOLDS.scoreTiers.value;

  if (midpoint <= tiers.likelyHumanMax && high <= 0.45) {
    return 'Likely human';
  }
  if (midpoint >= tiers.likelyAiMin && low >= 0.55) {
    return 'Likely AI-assisted';
  }
  return 'Mixed / uncertain';
}

/**
 * ENGINE A: Statistical Language Proxies (Purely heuristic, in-memory, zero model calls)
 */
export const engineA: DetectorEngine = {
  id: 'engine-a-statistical',
  name: 'Engine A — Statistical Linguistic Proxies',
  description:
    'Heuristic multi-signal analyzer evaluating sentence-length burstiness, lexical diversity, hapax rate, n-gram repetition, and function word distributions.',

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
            reason: `Document contains ${totalWords.length} words, which is below the minimum threshold of ${THRESHOLDS.minDocumentWords.value} words required for statistical stability.`,
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
          'Document is too short for reliable statistical stylometry.',
          'Provisional thresholds require at least 250 words to avoid small-sample volatility.',
        ],
        engineId: this.id,
        timestamp: new Date().toISOString(),
      };
      return DetectionResultSchema.parse(result);
    }

    // 1. Compute document-level signals
    const { signals, compositeScore } = extractStatisticalSignals(text, totalWords);

    // 2. Establish probabilistic range [low, high] with calibrated ±0.08 margin of uncertainty for document level
    const margin = 0.08;
    const scoreLow = Math.max(0.0, Math.round((compositeScore - margin) * 100) / 100);
    const scoreHigh = Math.min(1.0, Math.round((compositeScore + margin) * 100) / 100);
    const scoreRange: [number, number] = [scoreLow, scoreHigh];

    const label = deriveTierLabel(scoreLow, scoreHigh);
    const confidence = Math.min(0.85, Math.max(0.4, 1.0 - (scoreHigh - scoreLow)));

    // 3. Process paragraphs individually
    const rawParagraphs = splitParagraphs(text);
    const minParaWords = THRESHOLDS.minParagraphWords.value;

    const paragraphs: ParagraphAnalysis[] = rawParagraphs.map((p) => {
      const pWords = tokenizeWords(p.text);

      if (pWords.length < minParaWords) {
        return {
          text: p.text,
          index: p.index,
          wordCount: pWords.length,
          score: [0.0, 1.0] as [number, number],
          label: 'Insufficient evidence' as DetectionLabel,
          signals: [
            {
              name: 'paragraph_length',
              value: pWords.length,
              direction: 'neutral' as const,
              reason: `Insufficient text: paragraph has ${pWords.length} words (minimum ${minParaWords} required for paragraph-level analysis).`,
              benchmark: `>= ${minParaWords} words required`,
            },
          ],
        };
      }

      const pExtraction = extractStatisticalSignals(p.text, pWords);
      // Paragraph level uses wider ±0.10 margin due to smaller token sample sizes and higher statistical variance
      const pLow = Math.max(0.0, Math.round((pExtraction.compositeScore - 0.1) * 100) / 100);
      const pHigh = Math.min(1.0, Math.round((pExtraction.compositeScore + 0.1) * 100) / 100);

      return {
        text: p.text,
        index: p.index,
        wordCount: pWords.length,
        score: [pLow, pHigh] as [number, number],
        label: deriveTierLabel(pLow, pHigh),
        signals: pExtraction.signals,
      };
    });

    // 4. Construct final contract and validate via Zod schema
    const result: DetectionResult = {
      score: scoreRange,
      label,
      confidence: Math.round(confidence * 100) / 100,
      evidence: signals,
      paragraphs,
      limitations: [
        'Heuristic statistical proxies only: statistical variance does not prove or disprove AI generation.',
        'Provisional thresholds: calibrated on preliminary stylometry literature, not clinically or forensically validated.',
        'Known failure cases: formal academic prose, non-native English (ESL), heavily edited AI text, or short texts can trigger false signals.',
        'Probabilistic indicator: must never be the sole basis for disciplinary or academic integrity determinations.',
      ],
      engineId: this.id,
      timestamp: new Date().toISOString(),
    };

    return DetectionResultSchema.parse(result);
  },
};
