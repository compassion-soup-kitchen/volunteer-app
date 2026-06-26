import { Text as RNText, type TextProps } from 'react-native';

import { FontFamily, type ThemeColor, Typography, type TypographyVariant } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** DM Sans weight families — used to add inline emphasis to text variants. */
const weightFamily = {
  regular: FontFamily.text,
  medium: FontFamily.textMedium,
  semibold: FontFamily.textSemiBold,
  bold: FontFamily.textBold,
} as const;

export type TextComponentProps = TextProps & {
  variant?: TypographyVariant;
  color?: ThemeColor;
  /**
   * Override the DM Sans weight for emphasis (e.g. a bold word inside a
   * caption). With custom fonts, `fontWeight` is not synthesised — always use
   * this instead of a raw `fontWeight` style.
   */
  weight?: keyof typeof weightFamily;
  center?: boolean;
};

/**
 * Themed text. Pick a typographic `variant` (display/title/body/label…) and a
 * semantic `color` token — never hardcode font sizes or hex values in screens.
 */
export function Text({
  variant = 'body',
  color = 'text',
  weight,
  center,
  style,
  ...rest
}: TextComponentProps) {
  const { colors } = useTheme();
  return (
    <RNText
      style={[
        Typography[variant],
        weight ? { fontFamily: weightFamily[weight] } : null,
        { color: colors[color] },
        center && { textAlign: 'center' },
        style,
      ]}
      {...rest}
    />
  );
}
