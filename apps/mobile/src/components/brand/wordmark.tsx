import { type StyleProp, View, type ViewStyle } from 'react-native';

import WordmarkSvg from '../../../assets/brand/wordmark.svg';
import { type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Aspect ratio of the official Compassion wordmark (width / height). */
const RATIO = 431.7 / 43.5;

/**
 * The official Compassion wordmark. The koru mark stays brand-red; the
 * "Compassion" lettering follows the theme via `color` so it reads on light
 * and dark canvases alike.
 */
export function Wordmark({
  height = 26,
  color = 'text',
  style,
}: {
  height?: number;
  color?: ThemeColor;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  return (
    <View accessibilityRole="image" accessibilityLabel="Compassion" style={style}>
      <WordmarkSvg height={height} width={height * RATIO} color={colors[color]} />
    </View>
  );
}
