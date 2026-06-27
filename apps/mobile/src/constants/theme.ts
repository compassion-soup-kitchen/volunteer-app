/**
 * Design tokens for the Compassion / Te Pūaroha volunteer app.
 *
 * Single source of truth for colour, type, spacing, radius and elevation.
 *
 * The system is an editorial, mission-forward reading of the Compassion
 * Aotearoa brand: the Pūaroha red set on a warm "paper" canvas, with a deep
 * cocoa ink, soft taupe support tones and crisp hairline borders. The voice is
 * Newsreader — a literary serif — on the big titles and figures, over Hanken
 * Grotesk for all UI and body text: warm and human, never clinical or
 * corporate. Te Reo Māori is woven through the product.
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
    /** App canvas — warm cream "paper" */
    background: '#FBF7F2',
    /** A faint warm well, for inset / alternating zones and control tracks */
    backgroundSunken: '#F0E9E1',
    /** Raised surfaces: cards, sheets, inputs — clean white on the cream canvas */
    surface: '#ffffff',
    /** Quietly recessed surfaces and fills (progress tracks, bar charts) */
    surfaceMuted: '#F0E9E1',
    /** Pressed / selected surface */
    surfacePressed: '#ECE4DC',

    /** Primary text — deep cocoa "ink" */
    text: '#1C1815',
    /** Secondary / supporting text — warm taupe */
    textSecondary: '#8A7F76',
    /** Tertiary / hints, timestamps, inactive */
    textTertiary: '#A89D94',

    border: '#ECE4DC',
    borderStrong: '#E0D6CB',

    /** Brand red — Pūaroha */
    primary: '#E4002B',
    primaryForeground: '#ffffff',
    /** Pressed / inked brand red */
    primaryPressed: '#B80022',
    /** Soft red wash for active states and brand badges */
    primaryTint: '#FCEBED',
    onPrimaryTint: '#B80022',

    /** Warm taupe — quiet secondary (dark-on-light chips, avatars) */
    navy: '#5E5347',
    navyForeground: '#ffffff',
    navyTint: '#EDE6DD',
    onNavyTint: '#5E5347',

    /** Accent == the single brand red: links and inline actions read as Pūaroha */
    accent: '#E4002B',
    accentForeground: '#ffffff',
    accentTint: '#FCEBED',
    onAccentTint: '#B80022',

    success: '#1B7A4B',
    successForeground: '#ffffff',
    successTint: '#E7F3EC',
    onSuccessTint: '#176B41',

    warning: '#B26A00',
    warningForeground: '#ffffff',
    warningTint: '#F7ECD6',
    onWarningTint: '#7A4900',

    /** Danger — a deep oxblood, kept clearly distinct from the affirmative brand red */
    destructive: '#99161B',
    destructiveForeground: '#ffffff',
    destructiveTint: '#F7E4E2',
    onDestructiveTint: '#7C1014',

    /** Deep "ink" surface — dark feature cards (quote hero, stat strips) */
    inkSurface: '#1C1815',
    onInk: '#FBF7F2',
    onInkMuted: 'rgba(251,247,242,0.66)',

    /** Focus ring */
    ring: '#E4002B',
    /** Modal / sheet scrim */
    scrim: 'rgba(28,24,21,0.5)',

    /** Report / chart ramp — red → ochre → taupe → green → stone */
    chart1: '#E4002B',
    chart2: '#C8761F',
    chart3: '#5E5347',
    chart4: '#1B7A4B',
    chart5: '#C3B7AC',
  },
  dark: {
    /** A warm, near-black cocoa — the cream palette inverted, never cold */
    background: '#171310',
    backgroundSunken: '#0F0C09',
    surface: '#241F1A',
    surfaceMuted: '#2F2922',
    surfacePressed: '#3A332A',

    text: '#FBF7F2',
    textSecondary: '#B7AC9F',
    textTertiary: '#8A7F72',

    border: 'rgba(255,255,255,0.11)',
    borderStrong: 'rgba(255,255,255,0.18)',

    primary: '#FF3355',
    primaryForeground: '#ffffff',
    primaryPressed: '#E4002B',
    primaryTint: 'rgba(255,51,85,0.18)',
    onPrimaryTint: '#FF94A4',

    navy: '#C9BCAC',
    navyForeground: '#1C1815',
    navyTint: 'rgba(201,188,172,0.16)',
    onNavyTint: '#D8CDBE',

    accent: '#FF3355',
    accentForeground: '#ffffff',
    accentTint: 'rgba(255,51,85,0.18)',
    onAccentTint: '#FF94A4',

    success: '#56B585',
    successForeground: '#0A2318',
    successTint: 'rgba(86,181,133,0.18)',
    onSuccessTint: '#8ADCAE',

    warning: '#E0A44C',
    warningForeground: '#241803',
    warningTint: 'rgba(224,164,76,0.18)',
    onWarningTint: '#F1C489',

    destructive: '#FF6A72',
    destructiveForeground: '#1a1814',
    destructiveTint: 'rgba(255,106,114,0.18)',
    onDestructiveTint: '#FF9AA1',

    inkSurface: '#0F0C09',
    onInk: '#FBF7F2',
    onInkMuted: 'rgba(251,247,242,0.66)',

    ring: '#FF3355',
    scrim: 'rgba(0,0,0,0.62)',

    chart1: '#FF3355',
    chart2: '#E0A44C',
    chart3: '#C9BCAC',
    chart4: '#56B585',
    chart5: '#8A7F72',
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
 * Newsreader (loaded via `@expo-google-fonts/newsreader`) is the editorial
 * serif voice on the big titles, card headings and figures — literary and warm.
 * Hanken Grotesk carries every UI control and body string for clean native
 * legibility.
 *
 * With custom fonts in React Native, `fontWeight` is not reliably synthesised —
 * each weight must reference its own loaded family. These names map 1:1 to the
 * fonts registered in `app/_layout.tsx`.
 */
export const FontFamily = {
  /** Serif display — Newsreader, the editorial title & numeral voice */
  serif: 'Newsreader_500Medium',
  serifRegular: 'Newsreader_400Regular',
  serifSemiBold: 'Newsreader_600SemiBold',
  serifItalic: 'Newsreader_400Regular_Italic',
  /** Back-compat aliases used across the kit (now resolved onto the new families) */
  accent: 'Newsreader_500Medium',
  display: 'HankenGrotesk_700Bold',
  displaySemiBold: 'HankenGrotesk_600SemiBold',
  displayBold: 'HankenGrotesk_700Bold',
  /** Text / UI — Hanken Grotesk */
  text: 'HankenGrotesk_400Regular',
  textMedium: 'HankenGrotesk_500Medium',
  textSemiBold: 'HankenGrotesk_600SemiBold',
  textBold: 'HankenGrotesk_700Bold',
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
  // Editorial titles & headings — Newsreader serif. Tight, literary, never shouty.
  titleXl: { fontSize: 33, lineHeight: 37, fontFamily: FontFamily.serif, letterSpacing: -0.3 },
  display: { fontSize: 25, lineHeight: 30, fontFamily: FontFamily.serif, letterSpacing: -0.2 },
  title: { fontSize: 22, lineHeight: 28, fontFamily: FontFamily.serif, letterSpacing: -0.2 },
  heading: { fontSize: 18, lineHeight: 23, fontFamily: FontFamily.serif, letterSpacing: -0.1 },
  // Text — Hanken Grotesk
  subheading: { fontSize: 16, lineHeight: 22, fontFamily: FontFamily.textSemiBold, letterSpacing: -0.1 },
  body: { fontSize: 15, lineHeight: 22, fontFamily: FontFamily.text },
  bodyStrong: { fontSize: 15, lineHeight: 22, fontFamily: FontFamily.textSemiBold },
  callout: { fontSize: 14, lineHeight: 20, fontFamily: FontFamily.textMedium },
  label: { fontSize: 14, lineHeight: 18, fontFamily: FontFamily.textSemiBold },
  caption: { fontSize: 13, lineHeight: 18, fontFamily: FontFamily.textMedium },
  overline: { fontSize: 12, lineHeight: 16, fontFamily: FontFamily.textSemiBold, letterSpacing: 1, textTransform: 'uppercase' },
  // Data — Newsreader for big figures, system mono for fine print
  stat: { fontSize: 22, lineHeight: 24, fontFamily: FontFamily.serif, letterSpacing: -0.2, fontVariant: ['tabular-nums'] },
  statLg: { fontSize: 48, lineHeight: 50, fontFamily: FontFamily.serif, letterSpacing: -0.6, fontVariant: ['tabular-nums'] },
  mono: { fontSize: 11, lineHeight: 15, fontFamily: mono, fontVariant: ['tabular-nums'] },
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
 * Generous, soft corner radii — the editorial design leans on rounded white
 * cards (16–20), pill chips/badges (11) and comfortable buttons (14). Truly
 * circular shapes (avatars, progress tracks) round via their own height.
 */
export const Radius = {
  button: 14,
  sm: 12,
  md: 13,
  lg: 16,
  xl: 20,
  pill: 11,
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
/*  The design is border-led; elevation stays soft and restrained.            */
/* -------------------------------------------------------------------------- */

export const Shadows = {
  none: 'none',
  sm: '0px 1px 2px rgba(28,18,12,0.05)',
  md: '0px 6px 20px -10px rgba(28,18,12,0.12)',
  lg: '0px 24px 50px -24px rgba(28,18,12,0.18)',
  /** For the single hero CTA per screen — a soft brand glow, not a heavy halo */
  primary: '0px 10px 24px -12px rgba(228,0,43,0.35)',
} as const;

export const Duration = {
  fast: 150,
  base: 220,
  slow: 320,
} as const;
