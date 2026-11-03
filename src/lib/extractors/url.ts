import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import { validateUrlForSSRF } from './ssrf';

const MAX_URL_BYTES = 10 * 1024 * 1024; // 10 MB limit
const FETCH_TIMEOUT_MS = 8000; // 8 seconds timeout
const MAX_REDIRECTS = 5; // Redirect cap

/**
 * Server-side URL fetcher and article extractor with strict SSRF re-validation on every redirect.
 * Processes purely in volatile memory.
 */
export async function extractFromUrl(initialUrl: string): Promise<string> {
  let currentUrl = await validateUrlForSSRF(initialUrl);
  let redirectCount = 0;
  let finalResponse: Response | null = null;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    while (redirectCount <= MAX_REDIRECTS) {
      let response: Response;
      try {
        response = await fetch(currentUrl.toString(), {
          method: 'GET',
          signal: controller.signal,
          redirect: 'manual', // Manual redirect to validate every target hop for SSRF
          headers: {
            'User-Agent':
              'Kashef-Bot/1.0 (+https://github.com/roroleaks/kashef; academic research document reader)',
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
        });
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') {
          throw new Error('TIMEOUT: URL fetch timed out after 8 seconds.');
        }
        throw new Error(
          `FETCH_FAILED: Unable to fetch URL: ${err instanceof Error ? err.message : String(err)}`
        );
      }

      // Handle HTTP redirects (301, 302, 303, 307, 308)
      if (
        response.status === 301 ||
        response.status === 302 ||
        response.status === 303 ||
        response.status === 307 ||
        response.status === 308
      ) {
        redirectCount++;
        if (redirectCount > MAX_REDIRECTS) {
          throw new Error(
            `REDIRECT_LIMIT_EXCEEDED: Exceeded maximum allowed redirects (${MAX_REDIRECTS}).`
          );
        }

        const location = response.headers.get('location');
        if (!location) {
          throw new Error('INVALID_REDIRECT: Server returned redirect status without Location header.');
        }

        // Resolve redirect URL (handles relative paths like /articles/123)
        const nextUrlString = new URL(location, currentUrl).toString();

        // Re-validate SSRF on EVERY redirect destination before fetching
        currentUrl = await validateUrlForSSRF(nextUrlString);
        continue;
      }

      if (!response.ok) {
        throw new Error(
          `HTTP_ERROR: Target server responded with status ${response.status} (${response.statusText}).`
        );
      }

      finalResponse = response;
      break;
    }

    if (!finalResponse) {
      throw new Error('NO_RESPONSE: Failed to receive response from server.');
    }

    // Stream and enforce 10 MB limit
    const body = finalResponse.body;
    if (!body) {
      throw new Error('EMPTY_RESPONSE: Target server returned an empty body.');
    }

    const reader = body.getReader();
    const chunks: Uint8Array[] = [];
    let totalBytes = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        totalBytes += value.length;
        if (totalBytes > MAX_URL_BYTES) {
          controller.abort();
          throw new Error('SIZE_EXCEEDED: The web page exceeds the maximum allowed size limit of 10 MB.');
        }
        chunks.push(value);
      }
    }

    const totalBuffer = Buffer.concat(chunks);
    const html = totalBuffer.toString('utf-8');

    // Extract article content
    const dom = new JSDOM(html, { url: currentUrl.toString() });
    const doc = dom.window.document;

    // Remove boilerplate elements
    const removeElements = doc.querySelectorAll(
      'script, style, nav, footer, header, noscript, iframe, svg, aside'
    );
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
  } finally {
    clearTimeout(timeoutId);
  }
}
