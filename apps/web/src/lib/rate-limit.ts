/**
 * In-memory sliding-window rate limiter.
 *
 * The app runs as a single long-lived Node process (one Docker container,
 * not serverless), so per-process memory is an accurate global view of
 * traffic. If we ever scale to multiple containers this must move to a
 * shared store (Postgres or Redis).
 *
 * Each key holds the timestamps of its allowed attempts inside the current
 * window. Expired timestamps are pruned on access, and a periodic sweep
 * drops buckets that have gone fully stale so the Map can't grow unbounded.
 */

export type RateLimitOptions = {
  /** Maximum allowed attempts per window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
};

export type RateLimitResult = {
  allowed: boolean;
  /** Seconds until the next attempt would be allowed. 0 when allowed. */
  retryAfterSeconds: number;
};

type Bucket = {
  /** Timestamps (ms) of allowed attempts, oldest first. */
  timestamps: number[];
  windowMs: number;
};

const buckets = new Map<string, Bucket>();

const SWEEP_INTERVAL_MS = 60_000;
let lastSweepAt = 0;

/** Drop buckets whose newest attempt has aged out of its own window. */
function sweep(now: number): void {
  for (const [key, bucket] of buckets) {
    const newest = bucket.timestamps[bucket.timestamps.length - 1];
    if (newest === undefined || newest + bucket.windowMs <= now) {
      buckets.delete(key);
    }
  }
}

/**
 * Records an attempt for `key` and reports whether it is within budget.
 * Blocked attempts do not consume budget, so a caller who keeps retrying
 * is allowed back in as soon as the oldest allowed attempt leaves the window.
 */
export function checkRateLimit(
  key: string,
  { limit, windowMs }: RateLimitOptions
): RateLimitResult {
  const now = Date.now();

  if (now - lastSweepAt >= SWEEP_INTERVAL_MS) {
    lastSweepAt = now;
    sweep(now);
  }

  const cutoff = now - windowMs;
  const bucket = buckets.get(key);
  const recent = bucket
    ? bucket.timestamps.filter((t) => t > cutoff)
    : [];

  if (recent.length >= limit) {
    buckets.set(key, { timestamps: recent, windowMs });
    const retryAfterMs = recent[0] + windowMs - now;
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)),
    };
  }

  recent.push(now);
  buckets.set(key, { timestamps: recent, windowMs });
  return { allowed: true, retryAfterSeconds: 0 };
}

/**
 * Shared budgets for the auth surface. Web server actions and the mobile
 * `/api/v1/auth/*` routes use the same key prefixes (`login:`, `register:`,
 * `password-reset:`, `email-verify:` + normalized email) so an attacker
 * can't double their budget by switching clients.
 */
export const authRateLimits = {
  login: { limit: 10, windowMs: 15 * 60 * 1000 },
  register: { limit: 5, windowMs: 60 * 60 * 1000 },
  passwordResetRequest: { limit: 3, windowMs: 60 * 60 * 1000 },
  verificationResend: { limit: 3, windowMs: 60 * 60 * 1000 },
} as const satisfies Record<string, RateLimitOptions>;

/**
 * Budgets for self-service account changes. Keyed by user id (`password-change:`
 * + id) rather than email: these actions already sit behind a session, and the
 * budget should follow the account being changed.
 */
export const accountRateLimits = {
  passwordChange: { limit: 5, windowMs: 15 * 60 * 1000 },
} as const satisfies Record<string, RateLimitOptions>;

/** Test helper — empties every bucket so tests can't leak into each other. */
export function clearRateLimits(): void {
  buckets.clear();
  lastSweepAt = 0;
}
