/**
 * Text segmentation utilities for the Kashef detector engine modules.
 */

export interface SegmentedParagraph {
  text: string;
  index: number;
  wordCount: number;
}

/**
 * Minimum line length required to treat single newline separated lines as distinct paragraphs
 * during fallback. Lines shorter than 20 chars are typically list markers, headers, or whitespace,
 * unless terminated by terminal sentence punctuation.
 */
export const MIN_FALLBACK_LINE_LENGTH = 20;

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
    const lines = text
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length >= MIN_FALLBACK_LINE_LENGTH || (l.length >= 10 && /[.?!]$/.test(l)));
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
  // 1. Protect multi-dot abbreviations (e.g. e.g., i.e., Ph.D., U.S., M.D., B.A., M.A., M.S., U.S.A.)
  let protectedText = text.replace(
    /\b(Ph\.D|U\.S|M\.D|B\.A|M\.A|M\.S|e\.g|i\.e|U\.S\.A)\./gi,
    (m) => m.replace(/\./g, '__DOT__')
  );

  // Protect periods immediately preceding parenthetical exemplars e.g. "oranges. i.e. citrus"
  protectedText = protectedText.replace(/\.\s+(?=(?:i__DOT__e__DOT__|e__DOT__g__DOT__|ie|eg)\b)/gi, '__DOT__ ');

  // 2. Protect single-dot scholarly/medical/honorific/corporate abbreviations
  protectedText = protectedText.replace(
    /\b(Dr|Mr|Mrs|Ms|Prof|vs|eg|ie|al|approx|dept|vol|no|fig|ref|Jr|Sr|St|Mt|etc|cf|pp|Inc|Ltd|Co|No|Ph|MD|BA|MA|MS|PhD)\./gi,
    '$1__DOT__'
  );

  // 3. Protect initials (e.g., "R. Roshdy", "J. K. Rowling")
  // Must NOT protect standalone letters ending sentences, e.g. "got an A. The next day."
  protectedText = protectedText.replace(
    /(?<!\b[a-z]+\s+)\b([A-Z])\.(?=\s+[A-Z])/g,
    '$1__DOT__'
  );

  // 4. Split on sentence endings (. ! ?) followed by optional closing quotes/parens and whitespace
  const rawSentences = protectedText.split(/(?<=[.?!]['"’”\)]*)\s+/);

  return rawSentences
    .map((s) => s.replace(/__DOT__/g, '.').trim())
    .filter((s) => s.length > 0);
}
