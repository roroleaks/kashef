import {
  DetectionResult,
  DetectionResultSchema,
  DetectionLabel,
  ParagraphAnalysis,
  SignalEvidence,
} from './types';
import { THRESHOLDS } from './config/thresholds';

/**
 * Combines multiple detector engine outputs into a consolidated probabilistic assessment.
 *
 * Disagreement & Range Widening:
 * When engines agree, the combined range is focused and confidence is high.
 * When engines disagree, the combined score range is explicitly WIDENED to span the full
 * envelope [min(low), max(high)], confidence is penalized proportionally to the variance,
 * and the label transitions to 'Mixed / uncertain'.
 *
 * Robust Handling of Insufficient Evidence:
 * If one engine returns 'Insufficient evidence' while another engine provides decisive analysis,
 * the decisive engine's output is preserved and the insufficient engine is excluded with an
 * explanatory limitation note.
 */
export function combineResults(results: DetectionResult[]): DetectionResult {
  if (!results || results.length === 0) {
    throw new Error('NO_RESULTS_TO_COMBINE: At least one engine result is required.');
  }

  // Single engine result requires no merging
  if (results.length === 1) {
    return DetectionResultSchema.parse(results[0]);
  }

  // Check for paragraph segmentation differences across engines
  const minParas = Math.min(...results.map((r) => r.paragraphs.length));
  const maxParas = Math.max(...results.map((r) => r.paragraphs.length));
  const paragraphDiscrepancyWarning =
    maxParas - minParas > 1
      ? 'Engines produced different paragraph segmentations; paragraph-level combination may be unreliable.'
      : null;

  // Filter out engines that returned 'Insufficient evidence'
  const decisiveResults = results.filter((r) => r.label !== 'Insufficient evidence');

  // If ALL engines returned insufficient evidence, return unified insufficient result
  if (decisiveResults.length === 0) {
    const limitationsSet = new Set<string>();
    for (const r of results) {
      for (const lim of r.limitations) {
        limitationsSet.add(lim);
      }
    }
    if (paragraphDiscrepancyWarning) {
      limitationsSet.add(paragraphDiscrepancyWarning);
    }

    const insufficientResult: DetectionResult = {
      score: [0.0, 1.0],
      label: 'Insufficient evidence',
      confidence: 0.1,
      evidence: results[0].evidence,
      paragraphs: results[0].paragraphs,
      limitations: Array.from(limitationsSet),
      engineId: `ensemble(${results.map((r) => r.engineId || 'unknown').join('+')})`,
      timestamp: new Date().toISOString(),
    };
    return DetectionResultSchema.parse(insufficientResult);
  }

  // If only one decisive engine remains, carry its analysis with notes on excluded engines
  if (decisiveResults.length === 1) {
    const single = decisiveResults[0];
    const excludedCount = results.length - 1;
    const limitations = [
      ...single.limitations,
      `${excludedCount} engine(s) returned insufficient evidence and were excluded from the combination.`,
    ];
    if (paragraphDiscrepancyWarning) {
      limitations.push(paragraphDiscrepancyWarning);
    }

    const singleResult: DetectionResult = {
      ...single,
      limitations: Array.from(new Set(limitations)),
      engineId: `ensemble(${results.map((r) => r.engineId || 'unknown').join('+')})`,
      timestamp: new Date().toISOString(),
    };
    return DetectionResultSchema.parse(singleResult);
  }

  // 1. Compute overall bounding range across decisive engines
  const allLows = decisiveResults.map((r) => r.score[0]);
  const allHighs = decisiveResults.map((r) => r.score[1]);

  const minLow = Math.min(...allLows);
  const maxHigh = Math.max(...allHighs);

  // Measure disagreement across decisive engines
  const midpoints = decisiveResults.map((r) => (r.score[0] + r.score[1]) / 2);
  const avgMidpoint = midpoints.reduce((a, b) => a + b, 0) / midpoints.length;
  const maxDisagreement = Math.max(...midpoints) - Math.min(...midpoints);

  // Widen range based on engine disagreement
  const combinedScore: [number, number] = [
    Math.round(minLow * 100) / 100,
    Math.round(maxHigh * 100) / 100,
  ];

  // 2. Penalize confidence proportionally when engines diverge
  const avgConfidence = decisiveResults.reduce((a, r) => a + r.confidence, 0) / decisiveResults.length;
  const disagreementPenalty = maxDisagreement * 0.6;
  const combinedConfidence = Math.max(
    0.2,
    Math.round((avgConfidence - disagreementPenalty) * 100) / 100
  );

  // 3. Derive combined status label
  let combinedLabel: DetectionLabel;
  const tiers = THRESHOLDS.scoreTiers.value;

  if (maxDisagreement >= 0.25 || (combinedScore[0] < 0.45 && combinedScore[1] > 0.55)) {
    // Widened range due to disagreement falls into Mixed / uncertain
    combinedLabel = 'Mixed / uncertain';
  } else if (avgMidpoint <= tiers.likelyHumanMax && combinedScore[1] <= 0.45) {
    combinedLabel = 'Likely human';
  } else if (avgMidpoint >= tiers.likelyAiMin && combinedScore[0] >= 0.55) {
    combinedLabel = 'Likely AI-assisted';
  } else {
    combinedLabel = 'Mixed / uncertain';
  }

  // 4. Merge evidence signals from all engines preserving per-engine perspectives
  const combinedEvidence: SignalEvidence[] = [];
  const seenSignals = new Set<string>();

  for (const r of results) {
    const enginePrefix = r.engineId || 'unknown';
    for (const ev of r.evidence) {
      const key = `${enginePrefix}:${ev.name}:${ev.direction}`;
      if (!seenSignals.has(key)) {
        seenSignals.add(key);
        combinedEvidence.push({
          ...ev,
          name: ev.name,
        });
      }
    }
  }

  // 5. Merge paragraphs by index
  const paragraphCount = Math.max(...results.map((r) => r.paragraphs.length));
  const combinedParagraphs: ParagraphAnalysis[] = [];

  for (let idx = 0; idx < paragraphCount; idx++) {
    const matchingParas = decisiveResults
      .map((r) => r.paragraphs[idx])
      .filter((p): p is ParagraphAnalysis => p !== undefined && p.label !== 'Insufficient evidence');

    if (matchingParas.length === 0) {
      // Fallback to any matching paragraph if none were decisive
      const fallbackParas = results
        .map((r) => r.paragraphs[idx])
        .filter((p): p is ParagraphAnalysis => p !== undefined);
      if (fallbackParas.length > 0) {
        combinedParagraphs.push(fallbackParas[0]);
      }
      continue;
    }

    const pLows = matchingParas.map((p) => p.score[0]);
    const pHighs = matchingParas.map((p) => p.score[1]);
    const pMinLow = Math.min(...pLows);
    const pMaxHigh = Math.max(...pHighs);

    const pMidpoint = (pMinLow + pMaxHigh) / 2;
    let pLabel: DetectionLabel;

    if (pMaxHigh - pMinLow >= 0.35 || (pMinLow < 0.45 && pMaxHigh > 0.55)) {
      pLabel = 'Mixed / uncertain';
    } else if (pMidpoint <= tiers.likelyHumanMax && pMaxHigh <= 0.45) {
      pLabel = 'Likely human';
    } else if (pMidpoint >= tiers.likelyAiMin && pMinLow >= 0.55) {
      pLabel = 'Likely AI-assisted';
    } else {
      pLabel = 'Mixed / uncertain';
    }

    const pSignals: SignalEvidence[] = [];
    const seenParaSignals = new Set<string>();
    for (const p of matchingParas) {
      for (const sig of p.signals) {
        const sigKey = `${sig.name}:${sig.direction}`;
        if (!seenParaSignals.has(sigKey)) {
          seenParaSignals.add(sigKey);
          pSignals.push(sig);
        }
      }
    }

    combinedParagraphs.push({
      text: matchingParas[0].text,
      index: idx,
      wordCount: matchingParas[0].wordCount,
      score: [Math.round(pMinLow * 100) / 100, Math.round(pMaxHigh * 100) / 100],
      label: pLabel,
      signals: pSignals,
    });
  }

  // 6. Merge and deduplicate limitations
  const limitationsSet = new Set<string>();
  for (const r of results) {
    for (const lim of r.limitations) {
      limitationsSet.add(lim);
    }
  }

  if (results.length > decisiveResults.length) {
    const excludedCount = results.length - decisiveResults.length;
    limitationsSet.add(
      `${excludedCount} engine(s) returned insufficient evidence and were excluded from the combination.`
    );
  }

  if (paragraphDiscrepancyWarning) {
    limitationsSet.add(paragraphDiscrepancyWarning);
  }

  if (maxDisagreement >= 0.25) {
    limitationsSet.add(
      `Engine disagreement: Detection engines produced divergent probability estimates (disagreement spread: ${(maxDisagreement * 100).toFixed(0)}%). The range was broadened to capture inter-model uncertainty.`
    );
  }

  const combinedResult: DetectionResult = {
    score: combinedScore,
    label: combinedLabel,
    confidence: combinedConfidence,
    evidence: combinedEvidence,
    paragraphs: combinedParagraphs,
    limitations: Array.from(limitationsSet),
    engineId: `ensemble(${results.map((r) => r.engineId || 'unknown').join('+')})`,
    timestamp: new Date().toISOString(),
  };

  return DetectionResultSchema.parse(combinedResult);
}
