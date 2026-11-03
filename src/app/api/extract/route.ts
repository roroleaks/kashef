import { NextRequest, NextResponse } from 'next/server';
import { extractFromDocx } from '@/lib/extractors/docx';
import { extractFromPdf } from '@/lib/extractors/pdf';
import { extractFromUrl } from '@/lib/extractors/url';
import { MAX_FILE_SIZE_BYTES, validateExtractedText } from '@/lib/extractors/utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';
    let extractedText = '';
    let source = '';

    // A. URL JSON Payload: { "url": "https://..." }
    if (contentType.includes('application/json')) {
      const body = await req.json().catch(() => null);
      if (!body || typeof body.url !== 'string' || !body.url.trim()) {
        return NextResponse.json(
          { error: 'INVALID_REQUEST', message: 'Missing or invalid "url" parameter in request body.' },
          { status: 400 }
        );
      }

      source = `url:${body.url.trim()}`;
      extractedText = await extractFromUrl(body.url.trim());
    } 
    // B. File Upload via multipart/form-data
    else if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData().catch(() => null);
      if (!formData) {
        return NextResponse.json(
          { error: 'INVALID_REQUEST', message: 'Malformed multipart form data.' },
          { status: 400 }
        );
      }

      const file = formData.get('file');
      if (!file || !(file instanceof File)) {
        return NextResponse.json(
          { error: 'NO_FILE', message: 'No file found in the "file" form field.' },
          { status: 400 }
        );
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json(
          {
            error: 'FILE_TOO_LARGE',
            message: `File size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds maximum allowed limit of 10 MB.`,
          },
          { status: 413 }
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
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        {
          error: 'UNSUPPORTED_MEDIA_TYPE',
          message: 'Expected Content-Type to be multipart/form-data or application/json.',
        },
        { status: 415 }
      );
    }

    // Validate extracted text word count and language
    const validation = validateExtractedText(extractedText);
    if (!validation.valid) {
      return NextResponse.json(
        {
          error: 'INSUFFICIENT_TEXT',
          message: validation.message,
          wordCount: validation.wordCount,
        },
        { status: 422 }
      );
    }

    // Ephemeral response: return extracted text in-memory to the client session
    return NextResponse.json({
      success: true,
      text: extractedText,
      wordCount: validation.wordCount,
      language: validation.language,
      isEnglish: validation.isEnglish,
      warning: validation.message,
      source,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);

    // Map known extraction errors to proper HTTP statuses
    if (message.startsWith('SSRF_BLOCKED')) {
      return NextResponse.json({ error: 'SSRF_BLOCKED', message }, { status: 403 });
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
      { error: 'EXTRACTION_FAILED', message: `Text extraction failed: ${message}` },
      { status: 500 }
    );
  }
}
