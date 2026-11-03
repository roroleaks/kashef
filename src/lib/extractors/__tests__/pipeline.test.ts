import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import dns from 'node:dns/promises';
import type { LookupAddress } from 'node:dns';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

import { validateUrlForSSRF, isPrivateIPv4, isPrivateIPv6 } from '../ssrf';
import { countWords, detectLanguage, validateExtractedText, MIN_WORD_COUNT } from '../utils';
import { extractFromPdf } from '../pdf';
import { extractFromDocx } from '../docx';
import { MemoryRateLimiter } from '../../rate-limiter';

describe('Phase 1.4: SSRF Guardrails & Extended IP Subnets', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('blocks loopback IPv4 addresses and numeric variants', async () => {
    await expect(validateUrlForSSRF('http://127.0.0.1/admin')).rejects.toThrow('SSRF_BLOCKED');
    await expect(validateUrlForSSRF('http://127.0.0.5:8080')).rejects.toThrow('SSRF_BLOCKED');
    // Numeric/decimal integer IP for 127.0.0.1 (2130706433)
    await expect(validateUrlForSSRF('http://2130706433/')).rejects.toThrow('SSRF_BLOCKED');
    // Hex IP for 127.0.0.1 (0x7f000001)
    await expect(validateUrlForSSRF('http://0x7f000001/')).rejects.toThrow('SSRF_BLOCKED');
    // Octal IP for 127.0.0.1 (0177.0.0.1)
    await expect(validateUrlForSSRF('http://0177.0.0.1/')).rejects.toThrow('SSRF_BLOCKED');
  });

  it('blocks 0.0.0.0/8, 100.64.0.0/10, 192.0.0.0/24, 198.18.0.0/15, multicast (224.0.0.0/4), and reserved (240.0.0.0/4)', () => {
    // 0.0.0.0/8
    expect(isPrivateIPv4('0.0.0.0')).toBe(true);
    expect(isPrivateIPv4('0.255.255.255')).toBe(true);
    // 100.64.0.0/10 (Carrier-grade NAT)
    expect(isPrivateIPv4('100.64.0.1')).toBe(true);
    expect(isPrivateIPv4('100.127.255.255')).toBe(true);
    expect(isPrivateIPv4('100.128.0.1')).toBe(false); // Outside /10
    // 192.0.0.0/24
    expect(isPrivateIPv4('192.0.0.1')).toBe(true);
    expect(isPrivateIPv4('192.0.2.1')).toBe(true); // TEST-NET-1
    expect(isPrivateIPv4('192.88.99.1')).toBe(true); // 6to4 relay
    // 198.18.0.0/15 (Benchmarking)
    expect(isPrivateIPv4('198.18.0.1')).toBe(true);
    expect(isPrivateIPv4('198.19.255.255')).toBe(true);
    expect(isPrivateIPv4('198.20.0.1')).toBe(false);
    // Multicast (224.0.0.0 - 239.255.255.255)
    expect(isPrivateIPv4('224.0.0.1')).toBe(true);
    expect(isPrivateIPv4('239.255.255.250')).toBe(true);
    // Reserved / Broadcast (240.0.0.0 - 255.255.255.255)
    expect(isPrivateIPv4('240.0.0.1')).toBe(true);
    expect(isPrivateIPv4('255.255.255.255')).toBe(true);
  });

  it('blocks localhost and internal hostname aliases', async () => {
    await expect(validateUrlForSSRF('http://localhost')).rejects.toThrow('SSRF_BLOCKED');
    await expect(validateUrlForSSRF('http://api.localhost:3000')).rejects.toThrow('SSRF_BLOCKED');
    await expect(validateUrlForSSRF('http://internal.service.local')).rejects.toThrow('SSRF_BLOCKED');
    await expect(validateUrlForSSRF('http://database.internal')).rejects.toThrow('SSRF_BLOCKED');
    await expect(validateUrlForSSRF('http://myhost.lan')).rejects.toThrow('SSRF_BLOCKED');
  });

  it('blocks RFC 1918 private IPv4 ranges', async () => {
    expect(isPrivateIPv4('10.0.0.1')).toBe(true);
    expect(isPrivateIPv4('172.16.0.1')).toBe(true);
    expect(isPrivateIPv4('192.168.1.1')).toBe(true);
    expect(isPrivateIPv4('169.254.169.254')).toBe(true);
    expect(isPrivateIPv4('8.8.8.8')).toBe(false);

    await expect(validateUrlForSSRF('http://10.0.0.1/api')).rejects.toThrow('SSRF_BLOCKED');
    await expect(validateUrlForSSRF('http://167772161/')).rejects.toThrow('SSRF_BLOCKED');
    await expect(validateUrlForSSRF('http://172.16.0.1')).rejects.toThrow('SSRF_BLOCKED');
    await expect(validateUrlForSSRF('http://172.31.255.255')).rejects.toThrow('SSRF_BLOCKED');
    await expect(validateUrlForSSRF('http://192.168.1.1/router')).rejects.toThrow('SSRF_BLOCKED');
  });

  it('blocks IPv6 loopback, ULA, link-local, NAT64, documentation, and multicast', async () => {
    // Loopback & Unspecified
    expect(isPrivateIPv6('::1')).toBe(true);
    expect(isPrivateIPv6('::')).toBe(true);
    // NAT64 (64:ff9b::/96 and 64:ff9b:1::/48)
    expect(isPrivateIPv6('64:ff9b::192.0.2.1')).toBe(true);
    expect(isPrivateIPv6('64:ff9b:1::1')).toBe(true);
    // Discard prefix (100::/64)
    expect(isPrivateIPv6('100::1')).toBe(true);
    // Documentation prefix (2001:db8::/32)
    expect(isPrivateIPv6('2001:db8::1')).toBe(true);
    // 6to4 prefix (2002::/16)
    expect(isPrivateIPv6('2002:c0a8:0101::1')).toBe(true);
    // ULA (fc00::/7)
    expect(isPrivateIPv6('fc00::1')).toBe(true);
    expect(isPrivateIPv6('fd12:3456:789a::1')).toBe(true);
    // Link-local (fe80::/10)
    expect(isPrivateIPv6('fe80::1')).toBe(true);
    // Multicast (ff00::/8)
    expect(isPrivateIPv6('ff02::1')).toBe(true);
    // Valid public IPv6
    expect(isPrivateIPv6('2607:f8b0:4006:819::200e')).toBe(false);

    await expect(validateUrlForSSRF('http://[::1]/')).rejects.toThrow('SSRF_BLOCKED');
    await expect(validateUrlForSSRF('http://[fc00::1]/')).rejects.toThrow('SSRF_BLOCKED');
    await expect(validateUrlForSSRF('http://[fe80::1]/')).rejects.toThrow('SSRF_BLOCKED');
    await expect(validateUrlForSSRF('http://[64:ff9b::1]/')).rejects.toThrow('SSRF_BLOCKED');
  });

  it('rejects unsupported protocols', async () => {
    await expect(validateUrlForSSRF('ftp://example.com/file')).rejects.toThrow('UNSUPPORTED_PROTOCOL');
    await expect(validateUrlForSSRF('file:///etc/passwd')).rejects.toThrow('UNSUPPORTED_PROTOCOL');
    await expect(validateUrlForSSRF('gopher://example.com')).rejects.toThrow('UNSUPPORTED_PROTOCOL');
  });

  it('allows valid public HTTP and HTTPS domains and returns pinned IP', async () => {
    const target = await validateUrlForSSRF('https://example.com/articles/ai-research');
    expect(target.url.hostname).toBe('example.com');
    expect(target.url.protocol).toBe('https:');
    expect(target.pinnedIp).toBeDefined();
    expect([4, 6]).toContain(target.family);
  });

  it('blocks mocked DNS answer resolving to a private IPv4 address', async () => {
    const mockRecord: LookupAddress[] = [{ address: '10.20.30.40', family: 4 }];
    vi.spyOn(dns, 'lookup').mockImplementation(
      () => Promise.resolve(mockRecord) as unknown as Promise<LookupAddress>
    );

    await expect(validateUrlForSSRF('http://fake-domain-resolving-private.com/data')).rejects.toThrow(
      'SSRF_BLOCKED: Host resolves to private/internal IPv4 address (10.20.30.40).'
    );
  });

  it('blocks mocked DNS answer resolving to a private IPv6 address', async () => {
    const mockRecord: LookupAddress[] = [{ address: '64:ff9b::127.0.0.1', family: 6 }];
    vi.spyOn(dns, 'lookup').mockImplementation(
      () => Promise.resolve(mockRecord) as unknown as Promise<LookupAddress>
    );

    await expect(validateUrlForSSRF('http://fake-ipv6-resolving-private.com/data')).rejects.toThrow(
      'SSRF_BLOCKED: Host resolves to private/internal IPv6 address (64:ff9b::127.0.0.1).'
    );
  });

  it('blocks redirect to a private address from an HTTP server', async () => {
    // Create a local test server that issues a redirect to private metadata IP
    const server = http.createServer((req, res) => {
      res.writeHead(302, { Location: 'http://169.254.169.254/latest/meta-data/' });
      res.end();
    });

    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
    const port = (server.address() as { port: number }).port;

    try {
      // Query the local server to receive the 302 redirect
      const response = await fetch(`http://127.0.0.1:${port}`, { redirect: 'manual' });
      expect(response.status).toBe(302);
      const redirectLocation = response.headers.get('location');
      expect(redirectLocation).toBe('http://169.254.169.254/latest/meta-data/');

      // Enforce that the pipeline's SSRF validator blocks the redirected destination
      await expect(validateUrlForSSRF(redirectLocation!)).rejects.toThrow('SSRF_BLOCKED');
    } finally {
      server.close();
    }
  });
});

describe('Phase 1.4: Document Fixture Extraction (.docx & .pdf)', () => {
  const fixturesDir = path.resolve(process.cwd(), 'test', 'fixtures');

  it('successfully extracts text and computes word count from sample.docx fixture', async () => {
    const docxPath = path.join(fixturesDir, 'sample.docx');
    expect(fs.existsSync(docxPath)).toBe(true);

    const buffer = fs.readFileSync(docxPath);
    const text = await extractFromDocx(buffer);

    expect(text).toContain('Antihypertensive');
    const words = countWords(text);
    expect(words).toBe(60);
  });

  it('successfully extracts text and computes word count from text-layer sample.pdf fixture', async () => {
    const pdfPath = path.join(fixturesDir, 'sample.pdf');
    expect(fs.existsSync(pdfPath)).toBe(true);

    const buffer = fs.readFileSync(pdfPath);
    const text = await extractFromPdf(buffer);

    expect(text).toContain('Kashef probabilistic AI detection');
    const words = countWords(text);
    expect(words).toBe(13);
  });

  it('throws NO_TEXT_LAYER for PDF buffers without extractable text', async () => {
    const emptyPdfBuffer = Buffer.from(
      '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n190\n%%EOF'
    );

    await expect(extractFromPdf(emptyPdfBuffer)).rejects.toThrow('NO_TEXT_LAYER');
  });
});

describe('Phase 1.4: Mocked URL Readability Article Extraction', () => {
  it('extracts main article body and strips navigation, header, and footer boilerplate', () => {
    const mockHtml = `
      <!DOCTYPE html>
      <html lang="en">
        <head><title>Clinical AI Paper</title></head>
        <body>
          <header><div class="logo">Medical News</div><nav><a href="/">Home</a><a href="/about">About</a></nav></header>
          <aside class="sidebar">Advertisements and sponsored links</aside>
          <main>
            <article>
              <h1>Deep Learning in Diagnostic Ultrasound: A Prospective Multi-Center Trial</h1>
              <p>Diagnostic ultrasonography presents unique interpretive challenges due to operator dependence and acoustic artifact variations.</p>
              <p>In this prospective clinical evaluation across five academic medical centers, convolutional neural networks demonstrated statistically significant improvements in standard plane recognition.</p>
              <p>Secondary outcomes indicated an overall sensitivity of 94.2% and specificity of 91.8% when evaluated against board-certified expert consensus.</p>
            </article>
          </main>
          <footer><p>Copyright 2026 Medical Publishing Group. All rights reserved.</p></footer>
        </body>
      </html>
    `;

    const dom = new JSDOM(mockHtml, { url: 'https://example.com/article' });
    const doc = dom.window.document;

    // Remove boilerplate elements matching url.ts pipeline
    const removeElements = doc.querySelectorAll(
      'script, style, nav, footer, header, noscript, iframe, svg, aside, form'
    );
    removeElements.forEach((el) => el.remove());

    const reader = new Readability(doc);
    const parsed = reader.parse();
    const cleanText = (parsed?.textContent || doc.body.textContent || '')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n\s*\n+/g, '\n\n')
      .trim();

    expect(cleanText).toContain('Diagnostic ultrasonography presents unique interpretive challenges');
    expect(cleanText).toContain('Deep Learning in Diagnostic Ultrasound');
    expect(cleanText).not.toContain('Medical News');
    expect(cleanText).not.toContain('Advertisements');
    expect(cleanText).not.toContain('Copyright 2026');
  });
});

describe('Phase 1.4: Word Count & Language Detection (franc-min)', () => {
  it('accurately counts words across whitespace and punctuation', () => {
    const sample = '  This is an academic integrity test verifying ten words here. ';
    expect(countWords(sample)).toBe(10);
  });

  it('rejects inputs below the 250-word threshold with clear message', () => {
    const shortText = 'Evaluating medical literature across multiple clinical trials. '.repeat(4);
    const result = validateExtractedText(shortText);
    expect(result.valid).toBe(false);
    expect(result.wordCount).toBeLessThan(MIN_WORD_COUNT);
    expect(result.message).toContain('minimum of 250 words');
  });

  it('accepts documents with 250 or more words', () => {
    const paragraph =
      'Artificial intelligence in clinical medicine requires robust validation, comprehensive statistical verification, and transparent evidence reporting. ';
    const longText = paragraph.repeat(20);
    const result = validateExtractedText(longText);
    expect(result.valid).toBe(true);
    expect(result.wordCount).toBeGreaterThanOrEqual(MIN_WORD_COUNT);
    expect(result.isEnglish).toBe(true);
  });

  it('uses franc-min to identify English and warn on unsupported languages', () => {
    const enText =
      'This study evaluates the performance and safety of autonomous clinical decision support algorithms across diverse patient populations in multicenter hospitals.';
    const enDetect = detectLanguage(enText);
    expect(enDetect.language).toBe('eng');
    expect(enDetect.isEnglish).toBe(true);

    const arText =
      'يهدف هذا البحث إلى تقييم دقة خوارزميات الذكاء الاصطناعي في تحليل البيانات السريرية ودعم القرار الطبي في المستشفيات.';
    const arDetect = detectLanguage(arText);
    expect(arDetect.language).toBe('arb');
    expect(arDetect.isEnglish).toBe(false);
  });
});

describe('Phase 1.4: In-Memory Sliding Window Rate Limiter', () => {
  it('permits requests within the window and blocks on limit exceedance', () => {
    const limiter = new MemoryRateLimiter({ windowMs: 10_000, maxRequests: 3 });
    const ip = '198.51.100.10';

    expect(limiter.check(ip).success).toBe(true);
    expect(limiter.check(ip).remaining).toBe(1);
    expect(limiter.check(ip).remaining).toBe(0);

    const blocked = limiter.check(ip);
    expect(blocked.success).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfter).toBeGreaterThan(0);
  });
});

describe('Design Tokens: WCAG AA Color Contrast Verification (>= 4.5:1)', () => {
  function srgbToLinear(c: number): number {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  }

  function getLuminance(hex: string): number {
    const clean = hex.replace('#', '');
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
  }

  function getContrastRatio(hex1: string, hex2: string): number {
    const l1 = getLuminance(hex1);
    const l2 = getLuminance(hex2);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  }

  const statusTiers = [
    { name: 'Likely Human (Light Mode)', fg: '#15803d', bg: '#ecfdf5' },
    { name: 'Likely Human (Dark Mode)', fg: '#4ade80', bg: '#072a18' },
    { name: 'Mixed (Light Mode)', fg: '#b45309', bg: '#fef3c7' },
    { name: 'Mixed (Dark Mode)', fg: '#fbbf24', bg: '#2e1d05' },
    { name: 'High AI (Light Mode)', fg: '#b91c1c', bg: '#fef2f2' },
    { name: 'High AI (Dark Mode)', fg: '#f87171', bg: '#320f13' },
  ];

  statusTiers.forEach(({ name, fg, bg }) => {
    it(`verifies ${name} satisfies WCAG AA contrast ratio (>= 4.5:1)`, () => {
      const ratio = getContrastRatio(fg, bg);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });
  });
});
