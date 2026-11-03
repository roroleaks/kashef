import { describe, it, expect } from 'vitest';
import { validateUrlForSSRF } from '../ssrf';
import { countWords, detectLanguage, validateExtractedText, MIN_WORD_COUNT } from '../utils';

describe('Step 1: SSRF Guardrails', () => {
  it('blocks loopback IPv4 addresses', async () => {
    await expect(validateUrlForSSRF('http://127.0.0.1/admin')).rejects.toThrow('SSRF_BLOCKED');
    await expect(validateUrlForSSRF('http://127.0.0.5:8080')).rejects.toThrow('SSRF_BLOCKED');
  });

  it('blocks localhost hostname aliases', async () => {
    await expect(validateUrlForSSRF('http://localhost')).rejects.toThrow('SSRF_BLOCKED');
    await expect(validateUrlForSSRF('http://app.localhost:3000')).rejects.toThrow('SSRF_BLOCKED');
    await expect(validateUrlForSSRF('http://service.internal')).rejects.toThrow('SSRF_BLOCKED');
  });

  it('blocks RFC 1918 private IPv4 ranges', async () => {
    // 10.0.0.0/8
    await expect(validateUrlForSSRF('http://10.0.0.1/api')).rejects.toThrow('SSRF_BLOCKED');
    // 172.16.0.0/12
    await expect(validateUrlForSSRF('http://172.16.0.1')).rejects.toThrow('SSRF_BLOCKED');
    await expect(validateUrlForSSRF('http://172.31.255.255')).rejects.toThrow('SSRF_BLOCKED');
    // 192.168.0.0/16
    await expect(validateUrlForSSRF('http://192.168.1.1/router')).rejects.toThrow('SSRF_BLOCKED');
  });

  it('blocks cloud metadata link-local address (169.254.169.254)', async () => {
    await expect(validateUrlForSSRF('http://169.254.169.254/latest/meta-data/')).rejects.toThrow(
      'SSRF_BLOCKED'
    );
  });

  it('blocks loopback and local IPv6 addresses', async () => {
    await expect(validateUrlForSSRF('http://[::1]/')).rejects.toThrow('SSRF_BLOCKED');
    await expect(validateUrlForSSRF('http://[fc00::1]/')).rejects.toThrow('SSRF_BLOCKED');
    await expect(validateUrlForSSRF('http://[fe80::1]/')).rejects.toThrow('SSRF_BLOCKED');
  });

  it('rejects unsupported non-HTTP schemes', async () => {
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

describe('Step 1: Text Word Count & Language Validation', () => {
  it('accurately counts words', () => {
    const sample = '  This is a   clean test phrase with exactly ten words here. ';
    expect(countWords(sample)).toBe(11);
  });

  it('rejects documents with fewer than 250 words', () => {
    const shortText = 'Only forty words here. '.repeat(4);
    const result = validateExtractedText(shortText);
    expect(result.valid).toBe(false);
    expect(result.wordCount).toBeLessThan(MIN_WORD_COUNT);
    expect(result.message).toContain('minimum of 250 words');
  });

  it('accepts documents with 250 or more words', () => {
    const words = Array(255).fill('academic').join(' ');
    const result = validateExtractedText(words);
    expect(result.valid).toBe(true);
    expect(result.wordCount).toBe(255);
    expect(result.isEnglish).toBe(true);
  });

  it('detects English vs Arabic and unsupported languages', () => {
    const enText = 'This is an academic study evaluating medical language models across clinical benchmarks.';
    expect(detectLanguage(enText).isEnglish).toBe(true);

    const arText = 'هذا نموذج لغوي متقدم في الذكاء الاصطناعي لتحليل النصوص والوثائق العلمية والطبية بدقة عالية.';
    const arDetect = detectLanguage(arText.repeat(5));
    expect(arDetect.language).toBe('ar');
    expect(arDetect.isEnglish).toBe(false);
  });
});
