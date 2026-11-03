import { extractText } from 'unpdf';

/**
 * Extracts digital text layer from an in-memory PDF buffer using unpdf.
 * If the PDF has no digital text layer (e.g. scanned image), throws NO_TEXT_LAYER.
 * Purely in-memory: no files are written to disk.
 */
export async function extractFromPdf(buffer: Buffer): Promise<string> {
  try {
    const uint8 = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    const { text } = await extractText(uint8, { mergePages: true });
    const rawString = typeof text === 'string' ? text : Array.isArray(text) ? (text as string[]).join('\n\n') : '';
    const cleanText = rawString
      .replace(/[ \t]+/g, ' ')
      .replace(/\n\s*\n+/g, '\n\n')
      .trim();

    // Check if any actual words exist in the text layer
    const words = cleanText.split(/\s+/).filter((w: string) => w.length > 0);

    if (words.length < 5) {
      throw new Error(
        'NO_TEXT_LAYER: No extractable text layer found in PDF (document appears to be a scanned image). OCR text recognition is out of scope.'
      );
    }

    return cleanText;
  } catch (err: unknown) {
    if (err instanceof Error && err.message.startsWith('NO_TEXT_LAYER')) {
      throw err;
    }
    throw new Error(
      `PDF_PARSE_ERROR: Failed to parse .pdf document: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}
