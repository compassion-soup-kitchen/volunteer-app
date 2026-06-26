import { Image } from 'expo-image';
import { type StyleProp, type ImageStyle } from 'react-native';

import { type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Hand-painted brushstroke marks from the Compassion brand, prepared as alpha
 * masks so they can be tinted to any theme colour via `tintColor`.
 */
const sources = {
  aotearoa: require('../../../assets/brand/illustrations/aotearoa.png'),
  book: require('../../../assets/brand/illustrations/book.png'),
  cafe: require('../../../assets/brand/illustrations/cafe.png'),
  candle: require('../../../assets/brand/illustrations/candle.png'),
  coffee: require('../../../assets/brand/illustrations/coffee.png'),
  dove: require('../../../assets/brand/illustrations/dove.png'),
  give: require('../../../assets/brand/illustrations/give.png'),
  heart: require('../../../assets/brand/illustrations/heart.png'),
  icecream: require('../../../assets/brand/illustrations/icecream.png'),
  korero: require('../../../assets/brand/illustrations/korero.png'),
  kowhai: require('../../../assets/brand/illustrations/kowhai.png'),
  prayer: require('../../../assets/brand/illustrations/prayer.png'),
  rata: require('../../../assets/brand/illustrations/rata-flower.png'),
  tree: require('../../../assets/brand/illustrations/tree.png'),
} as const;

export type IllustrationName = keyof typeof sources;

/** Portrait brushstroke art (width / height). */
const RATIO = 376 / 500;

export function Illustration({
  name,
  height = 120,
  color = 'primary',
  tint,
  style,
}: {
  name: IllustrationName;
  /** Bounding height; width is derived from the art's aspect ratio. */
  height?: number;
  color?: ThemeColor;
  /** Literal colour override (wins over `color`). */
  tint?: string;
  style?: StyleProp<ImageStyle>;
}) {
  const { colors } = useTheme();
  return (
    <Image
      source={sources[name]}
      tintColor={tint ?? colors[color]}
      contentFit="contain"
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={[{ width: height * RATIO, height }, style]}
    />
  );
}
