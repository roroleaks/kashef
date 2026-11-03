/**
 * Text segmentation utilities for the Kashef detector engine modules.
 */

export interface SegmentedParagraph {
  text: string;
  index: number;
  wordCount: number;
}

/**
 * Splits document text into clean, non-empty paragraphs.
 */
export function splitParagraphs(text: string): SegmentedParagraph[] {
  const rawParagraphs = text.split(/\n\s*\n+/);
  const result: SegmentedParagraph[] = [];

  let idx = 0;
  for (const raw of rawParagraphs) {
    const trimmed = raw.trim();
    if (trimmed.length > 0) {
      const words = trimmed.split(/\s+/).filter(Boolean).length;
      result.push({
        text: trimmed,
        index: idx++,
        wordCount: words,
      });
    }
  }

  // Fallback if no double newlines exist but text is long: split by single newline
  if (result.length <= 1 && text.includes('\n')) {
    const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 40);
    if (lines.length > 1) {
      return lines.map((l, i) => ({
        text: l,
        index: i,
        wordCount: l.split(/\s+/).filter(Boolean).length,
      }));
    }
  }

  return result;
}

/**
 * Splits text into sentences, protecting against false splits on medical/scholarly abbreviations.
 */
export function splitSentences(text: string): string[] {
  // Pre-process common scholarly/medical abbreviations to protect periods
  const protectedText = text
    .replace(/\b(Dr|Mr|Mrs|Ms|Prof|vs|eg|ie|al|approx|dept|vol|no|fig|ref)\./gi, '$1__DOT__')
    .replace(/\b([A-Z])\./g, '$1__DOT__'); // Single letter initials e.g. "R. Roshdy"

  // Split on sentence endings (. ! ?) followed by whitespace or end of string
  const rawSentences = protectedText.split(/(?<=[.?!])\s+/);

  return rawSentences
    .map((s) => s.replace(/__DOT__/g, '.').trim())
    .filter((s) => s.length > 0);
}
