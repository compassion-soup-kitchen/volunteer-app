// The core `config` alone, not all of `zod`: this file is in every page's
// entry bundle. Classic `zod` reads the same global config.
import { config } from "zod/v4/core";

// Zod compiles fast validators with `new Function` when it can, and finds out
// by trying once. Under the page CSP (no 'unsafe-eval', see
// src/lib/content-security-policy.ts) that probe throws - Zod catches it and
// falls back - but the browser still reports a script-src violation. Turning
// the JIT off in the browser skips the probe. The server is unaffected: this
// file only runs client-side, before the app becomes interactive.
config({ jitless: true });
