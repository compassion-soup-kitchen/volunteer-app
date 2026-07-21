import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  authRateLimits,
  checkRateLimit,
  clearRateLimits,
} from "@/lib/rate-limit";

describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-21T00:00:00Z"));
    clearRateLimits();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows attempts under the limit", () => {
    for (let i = 0; i < 3; i++) {
      expect(checkRateLimit("k", { limit: 3, windowMs: 60_000 })).toEqual({
        allowed: true,
        retryAfterSeconds: 0,
      });
    }
  });

  it("blocks once the limit is reached and reports when to retry", () => {
    checkRateLimit("k", { limit: 2, windowMs: 60_000 });
    checkRateLimit("k", { limit: 2, windowMs: 60_000 });

    expect(checkRateLimit("k", { limit: 2, windowMs: 60_000 })).toEqual({
      allowed: false,
      retryAfterSeconds: 60,
    });

    vi.advanceTimersByTime(30_000);
    expect(checkRateLimit("k", { limit: 2, windowMs: 60_000 })).toEqual({
      allowed: false,
      retryAfterSeconds: 30,
    });
  });

  it("frees a slot once the oldest attempt slides out of the window", () => {
    checkRateLimit("k", { limit: 2, windowMs: 60_000 });
    vi.advanceTimersByTime(10_000);
    checkRateLimit("k", { limit: 2, windowMs: 60_000 });

    // 61s after the first attempt: the first slot has expired, second hasn't.
    vi.advanceTimersByTime(51_000);
    expect(checkRateLimit("k", { limit: 2, windowMs: 60_000 }).allowed).toBe(
      true
    );
    // Budget is full again (attempts at t+10s and t+61s remain in window).
    expect(checkRateLimit("k", { limit: 2, windowMs: 60_000 }).allowed).toBe(
      false
    );
  });

  it("does not let blocked attempts extend the lockout", () => {
    checkRateLimit("k", { limit: 1, windowMs: 60_000 });
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit("k", { limit: 1, windowMs: 60_000 }).allowed).toBe(
        false
      );
      vi.advanceTimersByTime(10_000);
    }
    // 51s of blocked retries later, the original attempt expires on schedule.
    vi.advanceTimersByTime(10_000);
    expect(checkRateLimit("k", { limit: 1, windowMs: 60_000 }).allowed).toBe(
      true
    );
  });

  it("tracks keys independently", () => {
    checkRateLimit("a", { limit: 1, windowMs: 60_000 });
    expect(checkRateLimit("a", { limit: 1, windowMs: 60_000 }).allowed).toBe(
      false
    );
    expect(checkRateLimit("b", { limit: 1, windowMs: 60_000 }).allowed).toBe(
      true
    );
  });

  it("starts a fresh window after everything expires", () => {
    checkRateLimit("k", { limit: 2, windowMs: 60_000 });
    checkRateLimit("k", { limit: 2, windowMs: 60_000 });
    expect(checkRateLimit("k", { limit: 2, windowMs: 60_000 }).allowed).toBe(
      false
    );

    vi.advanceTimersByTime(120_000);
    expect(checkRateLimit("k", { limit: 2, windowMs: 60_000 })).toEqual({
      allowed: true,
      retryAfterSeconds: 0,
    });
  });
});

describe("authRateLimits", () => {
  it("keeps the agreed budgets for the auth surface", () => {
    expect(authRateLimits.login).toEqual({
      limit: 10,
      windowMs: 15 * 60 * 1000,
    });
    expect(authRateLimits.register).toEqual({
      limit: 5,
      windowMs: 60 * 60 * 1000,
    });
    expect(authRateLimits.passwordResetRequest).toEqual({
      limit: 3,
      windowMs: 60 * 60 * 1000,
    });
  });
});
