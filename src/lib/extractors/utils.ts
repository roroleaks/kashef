import { franc } from 'franc-min';

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
 * Language detector using franc-min (ISO 639-3).
 * Returns 'eng' for English, 'arb' for Arabic, etc.
 */
export function detectLanguage(text: string): { language: string; isEnglish: boolean } {
  const code = franc(text);
  const isEnglish = code === 'eng';
  return { language: code, isEnglish };
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
      : `Detected language (${language}) is not English. Kashef Phase 1 analysis is calibrated for English text. Arabic language support is planned for a later phase.`,
  };
}
