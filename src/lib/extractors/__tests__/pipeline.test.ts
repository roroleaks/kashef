import { describe, it, expect } from 'vitest';
import { validateUrlForSSRF, isPrivateIPv4, isPrivateIPv6 } from '../ssrf';
import { countWords, detectLanguage, validateExtractedText, MIN_WORD_COUNT } from '../utils';
import { extractFromPdf } from '../pdf';
import { extractFromDocx } from '../docx';

describe('Phase 1.4: SSRF Guardrails & IP Filter', () => {
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

  it('blocks localhost and internal hostname aliases', async () => {
    await expect(validateUrlForSSRF('http://localhost')).rejects.toThrow('SSRF_BLOCKED');
    await expect(validateUrlForSSRF('http://api.localhost:3000')).rejects.toThrow('SSRF_BLOCKED');
    await expect(validateUrlForSSRF('http://internal.service.local')).rejects.toThrow('SSRF_BLOCKED');
    await expect(validateUrlForSSRF('http://database.internal')).rejects.toThrow('SSRF_BLOCKED');
  });

  it('blocks RFC 1918 private IPv4 ranges', async () => {
    expect(isPrivateIPv4('10.0.0.1')).toBe(true);
    expect(isPrivateIPv4('172.16.0.1')).toBe(true);
    expect(isPrivateIPv4('192.168.1.1')).toBe(true);
    expect(isPrivateIPv4('169.254.169.254')).toBe(true);
    expect(isPrivateIPv4('8.8.8.8')).toBe(false);

    // 10.0.0.0/8
    await expect(validateUrlForSSRF('http://10.0.0.1/api')).rejects.toThrow('SSRF_BLOCKED');
    // Decimal integer for 10.0.0.1 (167772161)
    await expect(validateUrlForSSRF('http://167772161/')).rejects.toThrow('SSRF_BLOCKED');
    // 172.16.0.0/12
    await expect(validateUrlForSSRF('http://172.16.0.1')).rejects.toThrow('SSRF_BLOCKED');
    await expect(validateUrlForSSRF('http://172.31.255.255')).rejects.toThrow('SSRF_BLOCKED');
    // 192.168.0.0/16
    await expect(validateUrlForSSRF('http://192.168.1.1/router')).rejects.toThrow('SSRF_BLOCKED');
  });

  it('blocks cloud metadata link-local address (169.254.169.254) and numeric variants', async () => {
    await expect(validateUrlForSSRF('http://169.254.169.254/latest/meta-data/')).rejects.toThrow(
      'SSRF_BLOCKED'
    );
    // Decimal integer for 169.254.169.254 (2852039166)
    await expect(validateUrlForSSRF('http://2852039166/latest/')).rejects.toThrow('SSRF_BLOCKED');
  });

  it('blocks loopback, unique-local, and link-local IPv6 addresses', async () => {
    await expect(validateUrlForSSRF('http://[::1]/')).rejects.toThrow('SSRF_BLOCKED');
    await expect(validateUrlForSSRF('http://[fc00::1]/')).rejects.toThrow('SSRF_BLOCKED');
    await expect(validateUrlForSSRF('http://[fe80::1]/')).rejects.toThrow('SSRF_BLOCKED');
    // IPv4-mapped IPv6
    expect(isPrivateIPv6('::ffff:127.0.0.1')).toBe(true);
    expect(isPrivateIPv6('::ffff:10.0.0.1')).toBe(true);
    expect(isPrivateIPv6('::ffff:169.254.169.254')).toBe(true);
  });

  it('rejects unsupported protocols', async () => {
    await expect(validateUrlForSSRF('ftp://example.com/file')).rejects.toThrow('UNSUPPORTED_PROTOCOL');
    await expect(validateUrlForSSRF('file:///etc/passwd')).rejects.toThrow('UNSUPPORTED_PROTOCOL');
    await expect(validateUrlForSSRF('gopher://example.com')).rejects.toThrow('UNSUPPORTED_PROTOCOL');
  });

  it('allows valid public HTTP and HTTPS domains', async () => {
    const parsed = await validateUrlForSSRF('https://example.com/articles/ai-research');
    expect(parsed.hostname).toBe('example.com');
    expect(parsed.protocol).toBe('https:');
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

describe('Phase 1.4: In-Memory Extractors & Scanned PDF Notice', () => {
  it('throws NO_TEXT_LAYER for PDF buffers without extractable text', async () => {
    // Construct a minimal dummy PDF structure without text content stream
    const emptyPdfBuffer = Buffer.from(
      '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n190\n%%EOF'
    );

    await expect(extractFromPdf(emptyPdfBuffer)).rejects.toThrow('NO_TEXT_LAYER');
  });

  it('throws NO_TEXT_FOUND for empty docx buffer', async () => {
    // An empty/corrupt buffer
    await expect(extractFromDocx(Buffer.from(''))).rejects.toThrow();
  });
});
