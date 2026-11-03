export const MIN_WORD_COUNT = 250;
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export interface ValidationResult {
  valid: boolean;
  wordCount: number;
  language: string;
  isEnglish: boolean;
  message?: string;
}

/**
 * Counts words accurately across whitespace and punctuation.
 */
export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Simple, fast heuristic language detector checking for standard Latin/English tokens vs non-Latin.
 */
export function detectLanguage(text: string): { language: string; isEnglish: boolean } {
  // Check for Arabic characters
  const arabicRegex = /[\u0600-\u06FF]/g;
  const arabicMatches = text.match(arabicRegex);
  if (arabicMatches && arabicMatches.length > 50) {
    return { language: 'ar', isEnglish: false };
  }

  // Count Latin characters vs others
  const latinMatches = text.match(/[A-Za-z]/g) || [];
  const totalLetters = text.match(/\p{L}/gu) || [];

  if (totalLetters.length > 0 && latinMatches.length / totalLetters.length > 0.8) {
    return { language: 'en', isEnglish: true };
  }

  return { language: 'und', isEnglish: false };
}

/**
 * Validates text against minimum word count and language support.
 */
export function validateExtractedText(text: string): ValidationResult {
  const wordCount = countWords(text);
  const { language, isEnglish } = detectLanguage(text);

  if (wordCount < MIN_WORD_COUNT) {
    return {
      valid: false,
      wordCount,
      language,
      isEnglish,
      message: `Document text contains only ${wordCount} words. Kashef requires a minimum of ${MIN_WORD_COUNT} words for reliable statistical and linguistic analysis.`,
    };
  }

  return {
    valid: true,
    wordCount,
    language,
    isEnglish,
    message: isEnglish
      ? undefined
      : `Detected language (${language.toUpperCase()}) is currently unsupported. Analysis is optimized for English; Arabic language support is planned for a later phase.`,
  };
}
