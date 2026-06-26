import { type StyleProp, View, type ViewStyle } from 'react-native';

import WordmarkSvg from '../../../assets/brand/wordmark.svg';
import { type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Intrinsic dimensions of the official Compassion wordmark artwork. */
const NATIVE_WIDTH = 431.7;
const NATIVE_HEIGHT = 43.5;
/** Aspect ratio of the official Compassion wordmark (width / height). */
const RATIO = NATIVE_WIDTH / NATIVE_HEIGHT;

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
      <WordmarkSvg
        height={height}
        width={height * RATIO}
        viewBox={`0 0 ${NATIVE_WIDTH} ${NATIVE_HEIGHT}`}
        color={colors[color]}
      />
    </View>
  );
}
