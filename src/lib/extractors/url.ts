import http from 'node:http';
import https from 'node:https';
import type { LookupAddress, LookupOptions } from 'node:dns';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import { validateUrlForSSRF, ValidatedTarget } from './ssrf';

export const MAX_URL_BYTES = 10 * 1024 * 1024; // 10 MB limit
export const FETCH_TIMEOUT_MS = 8000; // 8 seconds timeout
export const MAX_REDIRECTS = 3; // Strict 3-hop redirect cap

interface HttpResponseResult {
  statusCode: number;
  headers: http.IncomingHttpHeaders;
  body: Buffer;
}

/**
 * Performs a network GET request strictly pinned to a validated IP address.
 * Prevents DNS rebinding (TOCTOU) by ensuring the socket connects directly
 * to the verified IP while transmitting the intended Host and TLS SNI headers.
 */
function fetchWithPinnedIp(
  target: ValidatedTarget,
  timeoutMs: number = FETCH_TIMEOUT_MS
): Promise<HttpResponseResult> {
  return new Promise((resolve, reject) => {
    const isHttps = target.url.protocol === 'https:';
    const client = isHttps ? https : http;
    const port = target.url.port ? parseInt(target.url.port, 10) : isHttps ? 443 : 80;

    const req = client.request(
      {
        protocol: target.url.protocol,
        hostname: target.url.hostname,
        port,
        path: target.url.pathname + target.url.search,
        method: 'GET',
        headers: {
          Host: target.url.host,
          'User-Agent':
            'Kashef-Bot/1.0 (+https://github.com/roroleaks/kashef; academic text evaluation bot)',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        lookup: (
          _hostname: string,
          options:
            | LookupOptions
            | ((err: NodeJS.ErrnoException | null, address: string, family: number) => void),
          callback: (
            err: NodeJS.ErrnoException | null,
            address: string | LookupAddress[],
            family?: number
          ) => void
        ) => {
          // Custom lookup pinning the socket directly to the validated IP
          if (typeof options === 'function') {
            options(null, target.pinnedIp, target.family);
          } else if (options && typeof options === 'object' && options.all) {
            callback(null, [{ address: target.pinnedIp, family: target.family }]);
          } else {
            callback(null, target.pinnedIp, target.family);
          }
        },
        timeout: timeoutMs,
      },
      (res) => {
        const chunks: Buffer[] = [];
        let totalBytes = 0;

        res.on('data', (chunk: Buffer) => {
          totalBytes += chunk.length;
          if (totalBytes > MAX_URL_BYTES) {
            req.destroy(
              new Error('SIZE_EXCEEDED: The web page exceeds the maximum allowed size limit of 10 MB.')
            );
            return;
          }
          chunks.push(chunk);
        });

        res.on('end', () => {
          resolve({
            statusCode: res.statusCode || 200,
            headers: res.headers,
            body: Buffer.concat(chunks),
          });
        });
      }
    );

    req.on('timeout', () => {
      req.destroy(new Error(`TIMEOUT: URL fetch timed out after ${timeoutMs / 1000} seconds.`));
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.end();
  });
}

/**
 * Server-side URL fetcher and article extractor with strict SSRF re-validation on every redirect,
 * connection IP-pinning, 8s timeout, 10 MB size limit, and 3-redirect cap.
 * Processes purely in volatile memory. Text is never persisted to disk or logs.
 */
export async function extractFromUrl(initialUrl: string): Promise<string> {
  let currentTarget: ValidatedTarget = await validateUrlForSSRF(initialUrl);
  let redirectCount = 0;
  let finalResponse: HttpResponseResult | null = null;

  while (redirectCount <= MAX_REDIRECTS) {
    let response: HttpResponseResult;
    try {
      response = await fetchWithPinnedIp(currentTarget, FETCH_TIMEOUT_MS);
    } catch (err: unknown) {
      if (err instanceof Error && err.message.startsWith('TIMEOUT')) {
        throw err;
      }
      if (err instanceof Error && err.message.startsWith('SIZE_EXCEEDED')) {
        throw err;
      }
      throw new Error(
        `FETCH_FAILED: Unable to fetch URL: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    // Handle HTTP redirects (301, 302, 303, 307, 308)
    if (
      response.statusCode === 301 ||
      response.statusCode === 302 ||
      response.statusCode === 303 ||
      response.statusCode === 307 ||
      response.statusCode === 308
    ) {
      redirectCount++;
      if (redirectCount > MAX_REDIRECTS) {
        throw new Error(
          `REDIRECT_LIMIT_EXCEEDED: Exceeded maximum allowed redirects (${MAX_REDIRECTS}).`
        );
      }

      const location = response.headers.location;
      if (!location) {
        throw new Error('INVALID_REDIRECT: Server returned redirect status without Location header.');
      }

      // Resolve redirect destination (relative or absolute)
      const nextUrlString = new URL(location, currentTarget.url).toString();

      // Strict SSRF re-validation and IP repinning on EVERY redirect hop
      currentTarget = await validateUrlForSSRF(nextUrlString);
      continue;
    }

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw new Error(`HTTP_ERROR: Target server responded with status ${response.statusCode}.`);
    }

    finalResponse = response;
    break;
  }

  if (!finalResponse) {
    throw new Error('NO_RESPONSE: Failed to receive response from server.');
  }

  const html = finalResponse.body.toString('utf-8');

  // Extract article content with Readability & jsdom
  const dom = new JSDOM(html, { url: currentTarget.url.toString() });
  const doc = dom.window.document;

  // Remove boilerplate noise elements
  const removeElements = doc.querySelectorAll(
    'script, style, nav, footer, header, noscript, iframe, svg, aside, form'
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
}
