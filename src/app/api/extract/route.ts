import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { extractFromDocx } from '@/lib/extractors/docx';
import { extractFromPdf } from '@/lib/extractors/pdf';
import { extractFromUrl } from '@/lib/extractors/url';
import { MAX_FILE_SIZE_BYTES, validateExtractedText } from '@/lib/extractors/utils';
import { extractRateLimiter, getClientIp } from '@/lib/rate-limiter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ExtractPayloadSchema = z.object({
  url: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
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
          message: `Rate limit exceeded. Maximum ${rateLimitResult.limit} requests per minute allowed.`,
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
    const MAX_JSON_BODY_BYTES = 2 * 1024 * 1024; // 2 MB limit for JSON

    if (contentType.includes('application/json') && contentLength > MAX_JSON_BODY_BYTES) {
      return NextResponse.json(
        { error: 'PAYLOAD_TOO_LARGE', message: 'JSON body exceeds 2 MB limit.' },
        { status: 413, headers: rateLimitHeaders }
      );
    }

    let extractedText = '';
    let source = '';

    if (contentType.includes('application/json')) {
      const rawBody = await req.json().catch(() => null);
      const parseResult = ExtractPayloadSchema.safeParse(rawBody);

      if (!parseResult.success || !parseResult.data.url) {
        return NextResponse.json(
          {
            error: 'INVALID_REQUEST',
            message: 'JSON payload must contain a valid "url" field.',
          },
          { status: 400, headers: rateLimitHeaders }
        );
      }

      source = `url:${parseResult.data.url}`;
      extractedText = await extractFromUrl(parseResult.data.url);
    } else if (contentType.includes('multipart/form-data')) {
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
          { error: 'NO_FILE', message: 'No file found in the "file" field.' },
          { status: 400, headers: rateLimitHeaders }
        );
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json(
          {
            error: 'FILE_TOO_LARGE',
            message: `File size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds 10 MB limit.`,
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

    return NextResponse.json(
      {
        success: true,
        source,
        text: extractedText,
        wordCount: validation.wordCount,
        language: validation.language,
        isEnglish: validation.isEnglish,
        warning: validation.message,
      },
      { status: 200, headers: rateLimitHeaders }
    );
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    const status = err.message.startsWith('SSRF_BLOCKED')
      ? 403
      : err.message.startsWith('FETCH_TIMEOUT') || err.message.startsWith('FILE_TOO_LARGE')
      ? 422
      : 500;

    return NextResponse.json(
      {
        error: 'EXTRACTION_FAILED',
        message: err.message || 'Text extraction failed.',
      },
      { status }
    );
  }
}
