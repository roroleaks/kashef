import mammoth from 'mammoth';

/**
 * Extracts raw body text from an in-memory DOCX buffer.
 * Processes purely in memory without saving to disk.
 */
export async function extractFromDocx(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    const text = result.value.replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n\n').trim();

    if (!text) {
      throw new Error('NO_TEXT_FOUND: The uploaded DOCX file contains no readable text content.');
    }

    return text;
  } catch (err: unknown) {
    if (err instanceof Error && err.message.startsWith('NO_TEXT_FOUND')) {
      throw err;
    }
    throw new Error(
      `DOCX_PARSE_ERROR: Failed to parse .docx file: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}
