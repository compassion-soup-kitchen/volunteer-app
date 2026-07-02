import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';

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

/**
 * Maps the Ionicons names used across the app to their nearest SF Symbol so the
 * UI renders Apple's native symbol set on iOS. Names absent from this map (e.g.
 * brand logos like `logo-google`) fall back to Ionicons everywhere.
 */
const SF_SYMBOLS: Partial<Record<IconName, string>> = {
  add: 'plus',
  'alert-circle': 'exclamationmark.circle.fill',
  'arrow-forward': 'arrow.right',
  'arrow-forward-outline': 'arrow.right',
  heart: 'heart.fill',
  'notifications-outline': 'bell',
  book: 'book.fill',
  calendar: 'calendar',
  'calendar-outline': 'calendar',
  'call-outline': 'phone',
  checkmark: 'checkmark',
  'checkmark-circle': 'checkmark.circle.fill',
  'chevron-back': 'chevron.left',
  'chevron-forward': 'chevron.right',
  'share-outline': 'square.and.arrow.up',
  close: 'xmark',
  'close-circle-outline': 'xmark.circle',
  compass: 'safari',
  'create-outline': 'square.and.pencil',
  cube: 'shippingbox.fill',
  'document-text-outline': 'doc.text',
  'eye-outline': 'eye',
  'eye-off-outline': 'eye.slash',
  'hand-left': 'hand.raised.fill',
  'heart-outline': 'heart',
  'help-circle-outline': 'questionmark.circle',
  'information-circle': 'info.circle.fill',
  leaf: 'leaf.fill',
  'location-outline': 'mappin.and.ellipse',
  'log-in-outline': 'arrow.right.square',
  'paper-plane-outline': 'paperplane',
  'log-out-outline': 'rectangle.portrait.and.arrow.right',
  medkit: 'cross.case.fill',
  people: 'person.2.fill',
  'people-outline': 'person.2',
  'person-add-outline': 'person.badge.plus',
  'person-outline': 'person',
  restaurant: 'fork.knife',
  school: 'graduationcap.fill',
  'school-outline': 'graduationcap',
  'shield-checkmark': 'checkmark.shield.fill',
  time: 'clock.fill',
  'time-outline': 'clock',
  trophy: 'trophy.fill',
};

/** The SF Symbol an icon name maps to, if any (for native systemImage usage). */
export function sfSymbol(name: IconName): string | undefined {
  return SF_SYMBOLS[name];
}

/**
 * App icon, tied to the theme. Renders the native SF Symbol on iOS and falls
 * back to Ionicons on Android / web, so there is one icon call-site everywhere.
 */
export function Icon({ name, size = 22, color = 'text', raw }: IconProps) {
  const { colors } = useTheme();
  const tint = raw ?? colors[color];

  const sf = process.env.EXPO_OS === 'ios' ? SF_SYMBOLS[name] : undefined;
  if (sf) {
    return (
      <Image
        source={`sf:${sf}`}
        tintColor={tint}
        contentFit="contain"
        style={{ width: size, height: size }}
        accessibilityIgnoresInvertColors
      />
    );
  }

  return <Ionicons name={name} size={size} color={tint} />;
}
