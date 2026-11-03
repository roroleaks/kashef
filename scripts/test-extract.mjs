import assert from 'node:assert';
import { validateUrlForSSRF } from '../src/lib/extractors/ssrf.js';
import { validateExtractedText, countWords } from '../src/lib/extractors/utils.js';

console.log('--- Testing Step 1: Input Pipeline & SSRF Protection ---');

async function testSSRF() {
  const blockedUrls = [
    'http://localhost',
    'http://127.0.0.1:8000',
    'http://127.0.0.1',
    'http://10.0.0.1',
    'http://192.168.1.1',
    'http://172.16.0.1',
    'http://169.254.169.254',
    'http://[::1]',
    'ftp://example.com/file.txt',
    'file:///etc/passwd',
  ];

  for (const url of blockedUrls) {
    try {
      await validateUrlForSSRF(url);
      assert.fail(`Expected URL to be blocked: ${url}`);
    } catch (err) {
      assert(err.message.includes('SSRF_BLOCKED') || err.message.includes('UNSUPPORTED_PROTOCOL') || err.message.includes('INVALID_URL'));
      console.log(`  ✓ Successfully blocked unsafe URL: ${url} -> ${err.message.split(':')[0]}`);
    }
  }

  // Valid public URL
  const valid = await validateUrlForSSRF('https://example.com');
  assert.strictEqual(valid.hostname, 'example.com');
  console.log('  ✓ Public URL passed: https://example.com');
}

function testWordCount() {
  const shortText = 'This text is far too short to analyze accurately by any probabilistic linguistic detector.';
  const valShort = validateExtractedText(shortText);
  assert.strictEqual(valShort.valid, false);
  assert(valShort.message.includes('minimum of 250 words'));
  console.log(`  ✓ Short text correctly rejected (${valShort.wordCount} words < 250): "${valShort.message.slice(0, 60)}..."`);

  // Generate 260 words
  const longText = Array(260).fill('linguistic').join(' ');
  const valLong = validateExtractedText(longText);
  assert.strictEqual(valLong.valid, true);
  assert.strictEqual(valLong.wordCount, 260);
  console.log(`  ✓ Valid text accepted with ${valLong.wordCount} words.`);
}

async function run() {
  await testSSRF();
  testWordCount();
  console.log('--- All Step 1 Pipeline Tests Passed! ---');
}

run().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
