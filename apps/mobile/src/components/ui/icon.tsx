import { Ionicons } from '@expo/vector-icons';

import { type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type IconName = keyof typeof Ionicons.glyphMap;

export type IconProps = {
  name: IconName;
  size?: number;
  /** Semantic theme colour token */
  color?: ThemeColor;
  /** Escape hatch for a literal colour (e.g. a foreground on a coloured fill) */
  raw?: string;
};

/** Vector icon (Ionicons) tied to the theme. One icon family across the app. */
export function Icon({ name, size = 22, color = 'text', raw }: IconProps) {
  const { colors } = useTheme();
  return <Ionicons name={name} size={size} color={raw ?? colors[color]} />;
}
