/**
 * In-memory sliding window rate limiter for API endpoints.
 *
 * Defaults:
 * - Window: 60 seconds (1 minute)
 * - Max Requests: 20 requests per IP per window
 *
 * Multi-instance Behavior:
 * This rate limiter stores state in process memory.
 * - Single instance: Strictly limits each client IP to 20 requests/min.
 * - Horizontal scaling / Multi-instance: Each instance maintains an independent window.
 *   An IP distributing requests across N instances can make up to N * 20 requests/min.
 * - Distributed environments (Serverless / Multi-container clusters): For strict global
 *   enforcement across instances, integrate an external store (e.g., Upstash Redis)
 *   or an API gateway / edge proxy (Cloudflare, NGINX).
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

  constructor(options: { windowMs?: number; maxRequests?: number } = {}) {
    this.windowMs = options.windowMs ?? 60_000; // 1 minute
    this.maxRequests = options.maxRequests ?? 20; // 20 requests/min
  }

  public check(key: string): RateLimitResult {
    const now = Date.now();
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
   * Periodically purges stale entries to prevent memory leaks.
   */
  public purgeStale(): void {
    const windowStart = Date.now() - this.windowMs;
    for (const [key, record] of this.store.entries()) {
      record.timestamps = record.timestamps.filter((ts) => ts > windowStart);
      if (record.timestamps.length === 0) {
        this.store.delete(key);
      }
    }
  }

  public reset(): void {
    this.store.clear();
  }
}

// Global default rate limiter instance for extraction endpoints
export const extractRateLimiter = new MemoryRateLimiter({
  windowMs: 60_000,
  maxRequests: 20,
});
