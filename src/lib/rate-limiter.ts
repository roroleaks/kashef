import { NextRequest } from 'next/server';

/**
 * In-Memory Sliding Window Rate Limiter.
 *
 * ARCHITECTURE & INSTANCE BEHAVIOR:
 * - Scope: Strictly PER-INSTANCE (in-memory Map).
 * - Multi-instance behavior: State is NOT shared between horizontal replicas or serverless instances.
 *   If the application is scaled to N container replicas or serverless lambdas without sticky routing,
 *   an attacker or client distributing requests across instances could make up to N * maxRequests
 *   before being throttled. For distributed environments requiring a unified global counter,
 *   swap this memory store with an external centralized cache (e.g. Upstash Redis) or enforce
 *   rate limiting at the API gateway / reverse proxy edge (e.g. Cloudflare, AWS WAF, NGINX).
 *
 * CLIENT IP & PROXY TRUST:
 * - `getClientIp()` inspects headers in order:
 *   1. Cloudflare / Edge headers: `cf-connecting-ip`
 *   2. Forwarded proxy headers: `x-real-ip`
 *   3. `x-forwarded-for` (leftmost IP)
 * - Security notice on X-Forwarded-For: Unless Kashef is deployed behind a reverse proxy that
 *   sanitizes/overwrites client headers, raw X-Forwarded-For headers can be spoofed by clients.
 *   In direct-to-internet deployments, reverse proxies MUST be configured to strip untrusted headers.
 */

interface RateLimitRecord {
  timestamps: number[];
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp in seconds
  retryAfter?: number; // Seconds until next permitted request
}

export class MemoryRateLimiter {
  private store = new Map<string, RateLimitRecord>();
  private readonly windowMs: number;
  private readonly maxRequests: number;
  private readonly cleanupIntervalMs: number;
  private lastCleanupTime: number = Date.now();

  constructor(options: { windowMs?: number; maxRequests?: number; cleanupIntervalMs?: number } = {}) {
    this.windowMs = options.windowMs ?? 60_000; // 1 minute window
    this.maxRequests = options.maxRequests ?? 20; // 20 requests per window
    this.cleanupIntervalMs = options.cleanupIntervalMs ?? 60_000; // Clean every 60s
  }

  public check(key: string): RateLimitResult {
    const now = Date.now();

    // Automatic periodic cleanup of expired entries
    if (now - this.lastCleanupTime > this.cleanupIntervalMs) {
      this.purgeStale(now);
      this.lastCleanupTime = now;
    }

    const windowStart = now - this.windowMs;

    let record = this.store.get(key);
    if (!record) {
      record = { timestamps: [] };
      this.store.set(key, record);
    }

    // Filter out timestamps older than the active sliding window
    record.timestamps = record.timestamps.filter((ts) => ts > windowStart);

    const reset = Math.ceil((now + this.windowMs) / 1000);

    if (record.timestamps.length >= this.maxRequests) {
      const oldestTimestamp = record.timestamps[0];
      const retryAfter = Math.ceil((oldestTimestamp + this.windowMs - now) / 1000);

      return {
        success: false,
        limit: this.maxRequests,
        remaining: 0,
        reset,
        retryAfter: Math.max(1, retryAfter),
      };
    }

    record.timestamps.push(now);

    return {
      success: true,
      limit: this.maxRequests,
      remaining: this.maxRequests - record.timestamps.length,
      reset,
    };
  }

  /**
   * Purges all stale entries whose timestamps have expired beyond the sliding window.
   */
  public purgeStale(now: number = Date.now()): void {
    const windowStart = now - this.windowMs;
    for (const [key, record] of this.store.entries()) {
      record.timestamps = record.timestamps.filter((ts) => ts > windowStart);
      if (record.timestamps.length === 0) {
        this.store.delete(key);
      }
    }
  }

  public getStoreSize(): number {
    return this.store.size;
  }

  public reset(): void {
    this.store.clear();
    this.lastCleanupTime = Date.now();
  }
}

/**
 * Extracts and sanitizes the client IP address from request headers.
 * Respects KASHEF_TRUST_PROXY_HEADERS environment variable (defaults to true for backward compatibility).
 * When KASHEF_TRUST_PROXY_HEADERS='false', proxy forwarding headers are ignored to prevent header-spoofing
 * or proxy misconfigurations in direct socket deployments.
 */
export function getClientIp(req: NextRequest): string {
  const trustProxy = process.env.KASHEF_TRUST_PROXY_HEADERS !== 'false';

  if (trustProxy) {
    // 1. Cloudflare / Edge header
    const cfIp = req.headers.get('cf-connecting-ip');
    if (cfIp && cfIp.trim().length > 0) {
      return cfIp.trim();
    }

    // 2. Standard single-proxy header
    const realIp = req.headers.get('x-real-ip');
    if (realIp && realIp.trim().length > 0) {
      return realIp.trim();
    }

    // 3. Multi-proxy forwarded header (leftmost IP is origin client)
    const forwardedFor = req.headers.get('x-forwarded-for');
    if (forwardedFor && forwardedFor.trim().length > 0) {
      const firstIp = forwardedFor.split(',')[0].trim();
      if (firstIp.length > 0) {
        return firstIp;
      }
    }
  }

  // Fallback for local development or direct socket connections
  return '127.0.0.1';
}

// Global default rate limiter for extraction endpoint (20 requests per minute)
export const extractRateLimiter = new MemoryRateLimiter({
  windowMs: 60_000,
  maxRequests: 20,
  cleanupIntervalMs: 60_000,
});
