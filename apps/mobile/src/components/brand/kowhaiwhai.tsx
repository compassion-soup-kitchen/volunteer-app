import { type StyleProp, View, type ViewStyle } from 'react-native';

import KowhaiwhaiSvg from '../../../assets/brand/kowhaiwhai.svg';
import { type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Aspect ratio of the Waretini kōwhaiwhai motif (width / height). */
const RATIO = 748.3 / 631.9;

/**
 * The Waretini kōwhaiwhai (Māori scroll motif) from the Compassion brand,
 * tinted via `color`. Used as a soft decorative watermark behind hero
 * surfaces — pass a low `opacity`. Non-interactive and hidden from a11y.
 */
export function Kowhaiwhai({
  width = 220,
  color = 'primary',
  tint,
  opacity = 0.06,
  style,
}: {
  width?: number;
  color?: ThemeColor;
  tint?: string;
  opacity?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  const c = tint ?? colors[color];
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ opacity }, style]}>
      <KowhaiwhaiSvg width={width} height={width / RATIO} color={c} />
    </View>
  );
}
