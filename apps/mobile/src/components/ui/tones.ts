import { type ColorTokens } from '@/constants/theme';

/** Semantic accent tones shared by badges, icon chips and stat blocks. */
export type Tone = 'brand' | 'success' | 'warning' | 'navy' | 'accent' | 'neutral' | 'ink';

export function toneColors(tone: Tone, c: ColorTokens): { bg: string; fg: string } {
  switch (tone) {
    case 'brand':
      return { bg: c.primaryTint, fg: c.onPrimaryTint };
    case 'ink':
      return { bg: c.inkSurface, fg: c.onInk };
    case 'success':
      return { bg: c.successTint, fg: c.onSuccessTint };
    case 'warning':
      return { bg: c.warningTint, fg: c.onWarningTint };
    case 'navy':
      return { bg: c.navyTint, fg: c.onNavyTint };
    case 'accent':
      return { bg: c.accentTint, fg: c.onAccentTint };
    case 'neutral':
      return { bg: c.surfaceMuted, fg: c.textSecondary };
  }
}
