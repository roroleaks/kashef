import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import { validateUrlForSSRF } from './ssrf';

const MAX_URL_RESPONSE_BYTES = 5 * 1024 * 1024; // 5 MB
const FETCH_TIMEOUT_MS = 10000; // 10 seconds

/**
 * Server-side URL fetcher and readability article extractor with strict SSRF & size limits.
 * Ephemeral processing: never writes content to disk.
 */
export async function extractFromUrl(rawUrl: string): Promise<string> {
  // 1. SSRF & Scheme validation
  const validUrl = await validateUrlForSSRF(rawUrl);

  // 2. Fetch with 10s timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(validUrl.toString(), {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Kashef-Bot/1.0 (+https://github.com/roroleaks/kashef; academic research document reader)',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('TIMEOUT: URL fetch timed out after 10 seconds.');
    }
    throw new Error(`FETCH_FAILED: Unable to fetch URL: ${err instanceof Error ? err.message : String(err)}`);
  }

  if (!response.ok) {
    clearTimeout(timeoutId);
    throw new Error(`HTTP_ERROR: Target server responded with status ${response.status} (${response.statusText}).`);
  }

  // 3. Enforce 5 MB maximum size limit while streaming response
  const body = response.body;
  if (!body) {
    clearTimeout(timeoutId);
    throw new Error('EMPTY_RESPONSE: Target server returned an empty body.');
  }

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        totalBytes += value.length;
        if (totalBytes > MAX_URL_RESPONSE_BYTES) {
          controller.abort();
          throw new Error('SIZE_EXCEEDED: The web page exceeds the maximum allowed size limit of 5 MB.');
        }
        chunks.push(value);
      }
    }
  } finally {
    clearTimeout(timeoutId);
  }

  // Merge bytes into string
  const totalBuffer = Buffer.concat(chunks);
  const html = totalBuffer.toString('utf-8');

  // 4. Extract main article with jsdom & Readability
  const dom = new JSDOM(html, { url: validUrl.toString() });
  const doc = dom.window.document;

  // Clean script, style, nav, and iframe elements
  const removeElements = doc.querySelectorAll('script, style, nav, footer, header, noscript, iframe, svg');
  removeElements.forEach((el) => el.remove());

  const readerEngine = new Readability(doc);
  const article = readerEngine.parse();

  const extractedText = (article?.textContent || doc.body.textContent || '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n\n')
    .trim();

  if (!extractedText) {
    throw new Error('NO_TEXT_FOUND: Could not extract readable article text from the provided URL.');
  }

  return extractedText;
}
