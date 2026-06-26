import { Text as RNText, type TextProps } from 'react-native';

import { type ThemeColor, Typography, type TypographyVariant } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type TextComponentProps = TextProps & {
  variant?: TypographyVariant;
  color?: ThemeColor;
  center?: boolean;
};

/**
 * Themed text. Pick a typographic `variant` (display/title/body/label…) and a
 * semantic `color` token — never hardcode font sizes or hex values in screens.
 */
export function Text({
  variant = 'body',
  color = 'text',
  center,
  style,
  ...rest
}: TextComponentProps) {
  const { colors } = useTheme();
  return (
    <RNText
      style={[Typography[variant], { color: colors[color] }, center && { textAlign: 'center' }, style]}
      {...rest}
    />
  );
}
