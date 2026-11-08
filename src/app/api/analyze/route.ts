import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { extractFromDocx } from '@/lib/extractors/docx';
import { extractFromPdf } from '@/lib/extractors/pdf';
import { extractFromUrl } from '@/lib/extractors/url';
import { MAX_FILE_SIZE_BYTES, validateExtractedText } from '@/lib/extractors/utils';
import { extractRateLimiter, getClientIp } from '@/lib/rate-limiter';
import { analyze } from '@/lib/detectors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const AnalyzePayloadSchema = z.object({
  text: z.string().optional(),
  url: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    // 1. Per-IP Rate Limiting (20 requests per minute per IP, per-instance sliding window)
    const clientIp = getClientIp(req);
    const rateLimitResult = extractRateLimiter.check(clientIp);

    const rateLimitHeaders = {
      'X-RateLimit-Limit': String(rateLimitResult.limit),
      'X-RateLimit-Remaining': String(rateLimitResult.remaining),
      'X-RateLimit-Reset': String(rateLimitResult.reset),
    };

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: 'RATE_LIMIT_EXCEEDED',
          message: `Rate limit exceeded. Maximum ${rateLimitResult.limit} requests per minute allowed. Please try again in ${rateLimitResult.retryAfter} seconds.`,
        },
        {
          status: 429,
          headers: {
            ...rateLimitHeaders,
            'Retry-After': String(rateLimitResult.retryAfter || 60),
          },
        }
      );
    }

    const contentType = req.headers.get('content-type') || '';
    const contentLength = parseInt(req.headers.get('content-length') || '0', 10);
    const MAX_JSON_BODY_BYTES = 2 * 1024 * 1024; // 2 MB limit for JSON text payloads

    if (contentType.includes('application/json') && contentLength > MAX_JSON_BODY_BYTES) {
      return NextResponse.json(
        { error: 'PAYLOAD_TOO_LARGE', message: 'JSON body exceeds 2 MB limit.' },
        { status: 413, headers: rateLimitHeaders }
      );
    }

    let extractedText = '';
    let source = '';

    // 2. Process Input Based on Content-Type
    // A. JSON Payload: { "url": "..." } or { "text": "..." }
    if (contentType.includes('application/json')) {
      const rawBody = await req.json().catch(() => null);
      const parseResult = AnalyzePayloadSchema.safeParse(rawBody);

      if (!parseResult.success) {
        return NextResponse.json(
          {
            error: 'INVALID_REQUEST',
            message: parseResult.error.issues[0]?.message || 'Invalid JSON payload format.',
          },
          { status: 400, headers: rateLimitHeaders }
        );
      }

      if (parseResult.data.url) {
        source = `url:${parseResult.data.url}`;
        extractedText = await extractFromUrl(parseResult.data.url);
      } else if (parseResult.data.text) {
        source = 'pasted_text';
        extractedText = parseResult.data.text;
      } else {
        return NextResponse.json(
          {
            error: 'EMPTY_PAYLOAD',
            message: 'Please provide either a "url" or "text" in the JSON payload.',
          },
          { status: 400, headers: rateLimitHeaders }
        );
      }
    }
    // B. File Upload via multipart/form-data (.docx, .pdf)
    else if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData().catch(() => null);
      if (!formData) {
        return NextResponse.json(
          { error: 'INVALID_REQUEST', message: 'Malformed multipart form data.' },
          { status: 400, headers: rateLimitHeaders }
        );
      }

      const file = formData.get('file');
      if (!file || !(file instanceof File)) {
        return NextResponse.json(
          { error: 'NO_FILE', message: 'No file found in the "file" form field.' },
          { status: 400, headers: rateLimitHeaders }
        );
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json(
          {
            error: 'FILE_TOO_LARGE',
            message: `File size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds maximum allowed limit of 10 MB.`,
          },
          { status: 413, headers: rateLimitHeaders }
        );
      }

      source = `file:${file.name}`;
      const fileNameLower = file.name.toLowerCase();
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      if (fileNameLower.endsWith('.docx') || file.type.includes('wordprocessingml')) {
        extractedText = await extractFromDocx(buffer);
      } else if (fileNameLower.endsWith('.pdf') || file.type.includes('pdf')) {
        extractedText = await extractFromPdf(buffer);
      } else {
        return NextResponse.json(
          {
            error: 'UNSUPPORTED_FORMAT',
            message: 'Unsupported document format. Only .docx and .pdf files are accepted.',
          },
          { status: 400, headers: rateLimitHeaders }
        );
      }
    } else {
      return NextResponse.json(
        {
          error: 'UNSUPPORTED_MEDIA_TYPE',
          message: 'Expected Content-Type to be multipart/form-data or application/json.',
        },
        { status: 415, headers: rateLimitHeaders }
      );
    }

    // 3. Validate Extracted Text (Minimum 250 words, Language Detection)
    const validation = validateExtractedText(extractedText);
    if (!validation.valid) {
      return NextResponse.json(
        {
          error: 'INSUFFICIENT_TEXT',
          message: validation.message,
          wordCount: validation.wordCount,
        },
        { status: 422, headers: rateLimitHeaders }
      );
    }

    // 4. Run Modular Detection Engine (Engine A — Statistical Proxies)
    const analysis = await analyze(extractedText);

    // 5. Return In-Memory Result: Zero Disk or Log Persistence
    return NextResponse.json(
      {
        success: true,
        source,
        wordCount: validation.wordCount,
        language: validation.language,
        isEnglish: validation.isEnglish,
        warning: validation.message,
        analysis,
      },
      { headers: rateLimitHeaders }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);

    // Map known extraction errors to proper HTTP statuses
    if (message.startsWith('SSRF_BLOCKED')) {
      return NextResponse.json({ error: 'SSRF_BLOCKED', message }, { status: 403 });
    }
    if (message.startsWith('REDIRECT_LIMIT_EXCEEDED')) {
      return NextResponse.json({ error: 'REDIRECT_LIMIT_EXCEEDED', message }, { status: 400 });
    }
    if (message.startsWith('NO_TEXT_LAYER')) {
      return NextResponse.json({ error: 'NO_TEXT_LAYER', message }, { status: 422 });
    }
    if (message.startsWith('TIMEOUT')) {
      return NextResponse.json({ error: 'TIMEOUT', message }, { status: 504 });
    }
    if (message.startsWith('SIZE_EXCEEDED')) {
      return NextResponse.json({ error: 'SIZE_EXCEEDED', message }, { status: 413 });
    }
    if (message.startsWith('INVALID_URL') || message.startsWith('UNSUPPORTED_PROTOCOL')) {
      return NextResponse.json({ error: 'INVALID_URL', message }, { status: 400 });
    }

    return NextResponse.json(
      { error: 'ANALYSIS_FAILED', message: `Analysis failed: ${message}` },
      { status: 500 }
    );
  }
}
