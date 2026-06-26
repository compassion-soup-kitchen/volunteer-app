/**
 * Design tokens for the Compassion / Te Pūaroha volunteer app.
 *
 * Single source of truth for colour, type, spacing, radius and elevation.
 *
 * The system is drawn directly from the Compassion Aotearoa brand
 * (compassion.org.nz): the Pūaroha red, Aubert navy and a sky-blue accent, set
 * on warm "paper" backgrounds with a green-tinted ink. Recessed surfaces lean
 * subtly green-grey to echo the brand's green-paper. The display voice is
 * Bricolage Grotesque (the marketing site's headline face) over DM Sans for
 * text — bold, warm and editorial, never clinical or corporate. Te Reo Māori is
 * woven through the product.
 *
 * Colours are defined per theme (light/dark) with matching keys so the
 * `useTheme()` hook can return a flat, fully-typed palette. Every foreground /
 * background pairing here targets WCAG AA (4.5:1 body, 3:1 large/UI).
 */

import { Platform } from 'react-native';

/* -------------------------------------------------------------------------- */
/*  Colour                                                                     */
/* -------------------------------------------------------------------------- */

const palette = {
  light: {
    /** App canvas — warm "paper" cream */
    background: '#f6f3ec',
    /** A faint green-grey well, for inset / alternating zones */
    backgroundSunken: '#e9ebe4',
    /** Raised surfaces: cards, sheets, inputs — crisp white floats on the paper */
    surface: '#ffffff',
    /** Quietly recessed surfaces and fills (faint green-grey) */
    surfaceMuted: '#edeee7',
    /** Pressed / selected surface */
    surfacePressed: '#e3e6dd',

    /** Primary text — warm green-black "ink" */
    text: '#23231d',
    /** Secondary / supporting text */
    textSecondary: '#6a655a',
    /** Tertiary / hints, timestamps */
    textTertiary: '#736b5c',

    border: '#e7e1d4',
    borderStrong: '#d6cfbe',

    /** Brand red — Pūaroha */
    primary: '#de0832',
    primaryForeground: '#ffffff',
    /** Pressed brand red */
    primaryPressed: '#c00a2d',
    /** Soft red wash for active states and brand badges */
    primaryTint: '#fce7eb',
    onPrimaryTint: '#ad0826',

    /** Aubert navy — secondary brand */
    navy: '#293e6b',
    navyForeground: '#ffffff',
    navyTint: '#e6eaf3',
    onNavyTint: '#243559',

    /** Sky blue — brand accent (links, info, highlights). AA-safe as text. */
    accent: '#0077cc',
    accentForeground: '#ffffff',
    accentTint: '#e0f0fc',
    onAccentTint: '#006bbb',

    success: '#2e7d52',
    successForeground: '#ffffff',
    successTint: '#e2f0e8',
    onSuccessTint: '#1f5f3c',

    warning: '#b26a00',
    warningForeground: '#ffffff',
    warningTint: '#f7ecd6',
    onWarningTint: '#7a4900',

    /** Danger — a deep oxblood, kept clearly distinct from the affirmative brand red */
    destructive: '#99161b',
    destructiveForeground: '#ffffff',
    destructiveTint: '#f9e3e2',
    onDestructiveTint: '#7c1014',

    /** Focus ring */
    ring: '#0077cc',
    /** Modal / sheet scrim */
    scrim: 'rgba(35,35,29,0.5)',

    /** Report / chart ramp — red → navy → blue → green → amber */
    chart1: '#de0832',
    chart2: '#293e6b',
    chart3: '#0077cc',
    chart4: '#2e7d52',
    chart5: '#e0922e',
  },
  dark: {
    background: '#181611',
    backgroundSunken: '#100e0a',
    surface: '#26231b',
    surfaceMuted: '#302b22',
    surfacePressed: '#3a342a',

    text: '#f3efe5',
    textSecondary: '#b4ab9b',
    textTertiary: '#8e8676',

    border: 'rgba(255,255,255,0.13)',
    borderStrong: 'rgba(255,255,255,0.20)',

    primary: '#e22847',
    primaryForeground: '#ffffff',
    primaryPressed: '#c41f3b',
    primaryTint: 'rgba(226,40,71,0.20)',
    onPrimaryTint: '#ff8e9f',

    navy: '#8098d6',
    navyForeground: '#0c1226',
    navyTint: 'rgba(128,152,214,0.18)',
    onNavyTint: '#b3c2e8',

    accent: '#3aabff',
    accentForeground: '#06243a',
    accentTint: 'rgba(58,171,255,0.18)',
    onAccentTint: '#8fcdff',

    success: '#54b585',
    successForeground: '#08231a',
    successTint: 'rgba(84,181,133,0.18)',
    onSuccessTint: '#88daad',

    warning: '#e0a44c',
    warningForeground: '#241803',
    warningTint: 'rgba(224,164,76,0.18)',
    onWarningTint: '#f1c489',

    destructive: '#ff6a72',
    destructiveForeground: '#1a1814',
    destructiveTint: 'rgba(255,106,114,0.18)',
    onDestructiveTint: '#ff9aa1',

    ring: '#3aabff',
    scrim: 'rgba(0,0,0,0.62)',

    chart1: '#e22847',
    chart2: '#8098d6',
    chart3: '#3aabff',
    chart4: '#54b585',
    chart5: '#e0a44c',
  },
} as const;

export const Colors = palette;
export type ThemeName = keyof typeof palette;
/** Flat palette shape (values widened to string so light/dark are interchangeable). */
export type ColorTokens = { [K in keyof (typeof palette)['light']]: string };
export type ThemeColor = keyof ColorTokens;

/* -------------------------------------------------------------------------- */
/*  Typography                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Bricolage Grotesque (loaded via `@expo-google-fonts/bricolage-grotesque`)
 * carries the brand's bold, warm, editorial display voice — the same face used
 * across compassion.org.nz, where headings sit at the ExtraBold (800) weight.
 * DM Sans handles all UI/body text for clean native legibility.
 *
 * With custom fonts in React Native, `fontWeight` is not reliably synthesised —
 * each weight must reference its own loaded family. These names map 1:1 to the
 * fonts registered in `app/_layout.tsx`.
 */
export const FontFamily = {
  /** Display — Bricolage Grotesque */
  display: 'BricolageGrotesque_700Bold',
  displaySemiBold: 'BricolageGrotesque_600SemiBold',
  displayBold: 'BricolageGrotesque_800ExtraBold',
  /** Text — DM Sans */
  text: 'DMSans_400Regular',
  textMedium: 'DMSans_500Medium',
  textSemiBold: 'DMSans_600SemiBold',
  textBold: 'DMSans_700Bold',
} as const;

const mono = Platform.select({ ios: 'ui-monospace', android: 'monospace', default: 'monospace' });

export type TypographyVariant =
  | 'display'
  | 'titleXl'
  | 'title'
  | 'heading'
  | 'subheading'
  | 'body'
  | 'bodyStrong'
  | 'callout'
  | 'label'
  | 'caption'
  | 'overline'
  | 'stat'
  | 'statLg'
  | 'mono';

type TextStyleToken = {
  fontSize: number;
  lineHeight: number;
  fontFamily: string;
  letterSpacing?: number;
  textTransform?: 'uppercase' | 'none';
  fontVariant?: ('tabular-nums' | 'lining-nums')[];
};

export const Typography: Record<TypographyVariant, TextStyleToken> = {
  // Display — Bricolage Grotesque, ExtraBold for the headline punch (line-heights snapped to a 4pt grid)
  display: { fontSize: 36, lineHeight: 40, fontFamily: FontFamily.displayBold, letterSpacing: -0.8 },
  titleXl: { fontSize: 28, lineHeight: 32, fontFamily: FontFamily.displayBold, letterSpacing: -0.6 },
  title: { fontSize: 22, lineHeight: 28, fontFamily: FontFamily.displayBold, letterSpacing: -0.4 },
  heading: { fontSize: 18, lineHeight: 24, fontFamily: FontFamily.displaySemiBold, letterSpacing: -0.2 },
  // Text — DM Sans
  subheading: { fontSize: 16, lineHeight: 22, fontFamily: FontFamily.textSemiBold, letterSpacing: -0.1 },
  body: { fontSize: 16, lineHeight: 24, fontFamily: FontFamily.text },
  bodyStrong: { fontSize: 16, lineHeight: 24, fontFamily: FontFamily.textSemiBold },
  callout: { fontSize: 15, lineHeight: 20, fontFamily: FontFamily.textMedium },
  label: { fontSize: 14, lineHeight: 18, fontFamily: FontFamily.textSemiBold },
  caption: { fontSize: 13, lineHeight: 18, fontFamily: FontFamily.textMedium },
  overline: { fontSize: 12, lineHeight: 16, fontFamily: FontFamily.textBold, letterSpacing: 1.1, textTransform: 'uppercase' },
  // Data — Bricolage for big stats, system mono for fine print
  stat: { fontSize: 30, lineHeight: 34, fontFamily: FontFamily.display, letterSpacing: -0.6, fontVariant: ['tabular-nums'] },
  statLg: { fontSize: 42, lineHeight: 46, fontFamily: FontFamily.displayBold, letterSpacing: -1.2, fontVariant: ['tabular-nums'] },
  mono: { fontSize: 13, lineHeight: 18, fontFamily: mono, fontVariant: ['tabular-nums'] },
};

/* -------------------------------------------------------------------------- */
/*  Spacing, radius, layout                                                    */
/* -------------------------------------------------------------------------- */

/** 4pt rhythm. */
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
} as const;

/**
 * Corner radii. Even progression so nested shapes feel concentric:
 * inputs/chips-of-icons md(14), standard cards lg(18), hero cards xl(24),
 * buttons / pills / badges pill.
 */
export const Radius = {
  sm: 12,
  md: 14,
  lg: 18,
  xl: 24,
  pill: 999,
} as const;

export const Layout = {
  /** Comfortable reading width; centred on large screens. */
  maxContentWidth: 560,
  screenPadding: 20,
  /** Minimum interactive hit area. */
  minTouchTarget: 44,
} as const;

/* -------------------------------------------------------------------------- */
/*  Elevation (CSS boxShadow — never legacy RN shadow props)                   */
/*  Warm-tinted shadows so cards feel like paper on paper, not cold glass.     */
/* -------------------------------------------------------------------------- */

export const Shadows = {
  none: 'none',
  sm: '0px 1px 2px rgba(43,33,18,0.05)',
  md: '0px 4px 14px rgba(43,33,18,0.07)',
  lg: '0px 14px 34px rgba(43,33,18,0.10)',
  /** For the single hero CTA per screen — a soft brand glow, not a heavy halo */
  primary: '0px 8px 20px rgba(222,8,50,0.22)',
} as const;

export const Duration = {
  fast: 150,
  base: 220,
  slow: 320,
} as const;
