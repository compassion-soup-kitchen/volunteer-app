import { describe, expect, it, vi } from 'vitest';

import { isSafeToReloadAfter, RESUME_RELOAD_AFTER_MS, versionLabel } from './updates';

// Hoisted above the import above. `src/lib/updates` derives IS_OTA_MANAGED from
// these at import time; the values stand in for Expo Go (enabled, but no
// channel). The helpers under test take the flag as an argument, so they are
// exercised in both states regardless.
vi.mock('expo-updates', () => ({ isEnabled: true, channel: null }));

describe('isSafeToReloadAfter', () => {
  it('refuses a glance away', () => {
    expect(isSafeToReloadAfter(0)).toBe(false);
    expect(isSafeToReloadAfter(30_000)).toBe(false);
  });

  it('allows exactly the threshold', () => {
    expect(isSafeToReloadAfter(RESUME_RELOAD_AFTER_MS)).toBe(true);
  });

  it('refuses one millisecond short of it', () => {
    expect(isSafeToReloadAfter(RESUME_RELOAD_AFTER_MS - 1)).toBe(false);
  });

  it('allows a long absence', () => {
    expect(isSafeToReloadAfter(RESUME_RELOAD_AFTER_MS * 100)).toBe(true);
  });
});

describe('versionLabel', () => {
  const embedded = { isEmbeddedLaunch: true, createdAt: new Date('2026-07-30T00:00:00Z') };
  const updated = { isEmbeddedLaunch: false, createdAt: new Date('2026-07-30T00:00:00Z') };

  it('names the version alone for the bundle that shipped in the build', () => {
    expect(versionLabel('1.0.0', embedded, true)).toBe('Version 1.0.0');
  });

  it('adds the publish date once an update is running', () => {
    expect(versionLabel('1.0.0', updated, true)).toBe('Version 1.0.0 · updated 30 Jul');
  });

  it('stays quiet about updates in development and Expo Go', () => {
    // The trap this guards: both report a non-embedded launch with a createdAt,
    // so without the flag the line would claim an update that never happened.
    expect(versionLabel('1.0.0', updated, false)).toBe('Version 1.0.0');
  });

  it('omits the date when there is no createdAt', () => {
    expect(versionLabel('1.0.0', { isEmbeddedLaunch: false }, true)).toBe('Version 1.0.0');
    expect(versionLabel('1.0.0', { isEmbeddedLaunch: false, createdAt: null }, true)).toBe(
      'Version 1.0.0',
    );
  });

  it('falls back to a dash when the app config has no version', () => {
    expect(versionLabel(undefined, embedded, true)).toBe('Version —');
  });
});
