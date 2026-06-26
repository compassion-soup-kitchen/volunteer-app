/**
 * Resolves the active colour palette from the system colour scheme.
 *
 * Usage: `const { colors, isDark } = useTheme();`
 * Learn more: https://docs.expo.dev/guides/color-schemes/
 */

import { Colors, type ColorTokens, type ThemeName } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export type Theme = {
  colors: ColorTokens;
  scheme: ThemeName;
  isDark: boolean;
};

export function useTheme(): Theme {
  const scheme = useColorScheme();
  const name: ThemeName = scheme === 'dark' ? 'dark' : 'light';
  return { colors: Colors[name], scheme: name, isDark: name === 'dark' };
}
