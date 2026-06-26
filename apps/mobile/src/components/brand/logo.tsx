import { type StyleProp, View, type ViewStyle } from 'react-native';

import LogoSvg from '../../../assets/brand/logo.svg';

/**
 * The Compassion heart-koru logo mark. Self-coloured (brand red koru + grey
 * curl), so it renders the same on any surface — size it via `size`.
 */
export function Logo({ size = 40, style }: { size?: number; style?: StyleProp<ViewStyle> }) {
  return (
    <View accessibilityRole="image" accessibilityLabel="Compassion" style={style}>
      <LogoSvg width={size} height={size} viewBox="0 0 40 40" />
    </View>
  );
}
