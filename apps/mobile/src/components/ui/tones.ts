import { type ColorTokens } from '@/constants/theme';

/** Semantic accent tones shared by badges, icon chips and stat blocks. */
export type Tone = 'brand' | 'success' | 'warning' | 'navy' | 'neutral';

export function toneColors(tone: Tone, c: ColorTokens): { bg: string; fg: string } {
  switch (tone) {
    case 'brand':
      return { bg: c.primaryTint, fg: c.onPrimaryTint };
    case 'success':
      return { bg: c.successTint, fg: c.onSuccessTint };
    case 'warning':
      return { bg: c.warningTint, fg: c.onWarningTint };
    case 'navy':
      return { bg: c.navyTint, fg: c.onNavyTint };
    case 'neutral':
      return { bg: c.surfaceMuted, fg: c.textSecondary };
  }
}
