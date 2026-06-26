/**
 * Design tokens for the Compassion / Te Pūaroha volunteer app.
 *
 * Single source of truth for colour, type, spacing, radius and elevation.
 * Mirrors the brand system used by the web app (`apps/web/src/app/globals.css`):
 * Pūaroha red, Aubert navy, green-tinted paper, warm ink. Te Reo Māori is woven
 * through the product, and the tone is warm and human - never clinical.
 *
 * Colours are defined per theme (light/dark) with matching keys so the
 * `useTheme()` hook can return a flat, fully-typed palette.
 */

import { Platform } from 'react-native';

import '@/global.css';

/* -------------------------------------------------------------------------- */
/*  Colour                                                                     */
/* -------------------------------------------------------------------------- */

const palette = {
  light: {
    /** App background — green-tinted off-white "paper" */
    background: '#f1f3f1',
    /** Raised surfaces: cards, sheets, inputs */
    surface: '#ffffff',
    /** Quietly recessed surfaces and fills */
    surfaceMuted: '#e8ebe8',
    /** Pressed / selected surface */
    surfacePressed: '#dfe3df',

    /** Primary text — warm green-black "ink" */
    text: '#272b27',
    /** Secondary / supporting text */
    textSecondary: '#5b605b',
    /** Tertiary / hints, timestamps */
    textTertiary: '#868c86',

    border: '#e2e4e2',
    borderStrong: '#d0d3d0',

    /** Brand red */
    primary: '#de0832',
    primaryForeground: '#ffffff',
    /** Soft red wash for active states and brand badges */
    primaryTint: '#fbe6eb',
    onPrimaryTint: '#a8071f',

    navy: '#293e6b',
    navyForeground: '#ffffff',
    navyTint: '#e7ebf3',
    onNavyTint: '#293e6b',

    success: '#2e7d52',
    successTint: '#e2f0e8',
    onSuccessTint: '#1f5f3c',

    warning: '#b26a00',
    warningTint: '#f6ebd9',
    onWarningTint: '#7a4900',

    destructive: '#a8071f',
    destructiveForeground: '#ffffff',

    /** Focus ring */
    ring: '#293e6b',
    /** Modal / sheet scrim */
    scrim: 'rgba(39,43,39,0.45)',
  },
  dark: {
    background: '#16181a',
    surface: '#212422',
    surfaceMuted: '#2b2f2c',
    surfacePressed: '#343935',

    text: '#f1f3f1',
    textSecondary: '#a7aba5',
    textTertiary: '#7d827c',

    border: 'rgba(255,255,255,0.12)',
    borderStrong: 'rgba(255,255,255,0.18)',

    primary: '#f0335a',
    primaryForeground: '#ffffff',
    primaryTint: 'rgba(240,51,90,0.18)',
    onPrimaryTint: '#ff8095',

    navy: '#6e86c2',
    navyForeground: '#0d1326',
    navyTint: 'rgba(110,134,194,0.20)',
    onNavyTint: '#aebfe4',

    success: '#4ea379',
    successTint: 'rgba(78,163,121,0.20)',
    onSuccessTint: '#7fd3a6',

    warning: '#d99a3c',
    warningTint: 'rgba(217,154,60,0.20)',
    onWarningTint: '#f0c489',

    destructive: '#ff5a6e',
    destructiveForeground: '#1a1c1a',

    ring: '#6e86c2',
    scrim: 'rgba(0,0,0,0.6)',
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
 * Fraunces (loaded via `@expo-google-fonts/fraunces`) carries the brand's
 * editorial, human voice for display and titles. UI text uses the platform
 * system sans for native legibility; data uses a tabular monospace.
 *
 * If Fraunces fails to load, React Native gracefully falls back to the system
 * serif, so referencing these family names is always safe.
 */
export const FontFamily = {
  displayRegular: 'Fraunces_400Regular',
  displayMedium: 'Fraunces_500Medium',
  displaySemiBold: 'Fraunces_600SemiBold',
  displayBold: 'Fraunces_700Bold',
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
  fontFamily?: string;
  fontWeight?: '400' | '500' | '600' | '700';
  letterSpacing?: number;
  textTransform?: 'uppercase' | 'none';
  fontVariant?: ('tabular-nums' | 'lining-nums')[];
};

export const Typography: Record<TypographyVariant, TextStyleToken> = {
  display: { fontSize: 34, lineHeight: 39, fontFamily: FontFamily.displaySemiBold, letterSpacing: -0.5 },
  titleXl: { fontSize: 28, lineHeight: 33, fontFamily: FontFamily.displaySemiBold, letterSpacing: -0.3 },
  title: { fontSize: 22, lineHeight: 28, fontFamily: FontFamily.displaySemiBold, letterSpacing: -0.2 },
  heading: { fontSize: 18, lineHeight: 24, fontWeight: '600', letterSpacing: -0.1 },
  subheading: { fontSize: 16, lineHeight: 22, fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400' },
  bodyStrong: { fontSize: 16, lineHeight: 24, fontWeight: '600' },
  callout: { fontSize: 15, lineHeight: 21, fontWeight: '500' },
  label: { fontSize: 14, lineHeight: 18, fontWeight: '600' },
  caption: { fontSize: 13, lineHeight: 17, fontWeight: '500' },
  overline: { fontSize: 12, lineHeight: 16, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  stat: { fontSize: 30, lineHeight: 34, fontWeight: '700', letterSpacing: -0.5, fontVariant: ['tabular-nums'] },
  statLg: { fontSize: 40, lineHeight: 44, fontWeight: '700', letterSpacing: -1, fontVariant: ['tabular-nums'] },
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

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  pill: 999,
} as const;

export const Layout = {
  /** Comfortable reading width; centred on large screens. */
  maxContentWidth: 560,
  screenPadding: 20,
} as const;

/* -------------------------------------------------------------------------- */
/*  Elevation (CSS boxShadow — never legacy RN shadow props)                   */
/* -------------------------------------------------------------------------- */

export const Shadows = {
  none: 'none',
  sm: '0px 1px 2px rgba(39,43,39,0.06)',
  md: '0px 2px 8px rgba(39,43,39,0.08)',
  lg: '0px 8px 24px rgba(39,43,39,0.10)',
  /** For coloured/branded raised CTAs */
  primary: '0px 6px 18px rgba(222,8,50,0.28)',
} as const;

export const Duration = {
  fast: 150,
  base: 220,
  slow: 320,
} as const;
