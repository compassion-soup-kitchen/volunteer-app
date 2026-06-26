import { View } from 'react-native';

import { Illustration, type IllustrationName } from '@/components/brand';
import { Spacing } from '@/constants/theme';

import { Button } from './button';
import { Icon, type IconName } from './icon';
import { Text } from './text';
import { type Tone, toneColors } from './tones';
import { useTheme } from '@/hooks/use-theme';

export type EmptyStateProps = {
  icon: IconName;
  /** A brand brushstroke illustration shown in place of the icon (preferred for warmth). */
  illustration?: IllustrationName;
  title: string;
  message?: string;
  tone?: Tone;
  actionLabel?: string;
  onAction?: () => void;
};

/** Maps a tone to the theme colour used to tint a brand illustration. */
const toneTint: Record<Tone, 'primary' | 'navy' | 'success' | 'warning' | 'accent' | 'textTertiary'> = {
  brand: 'primary',
  navy: 'navy',
  success: 'success',
  warning: 'warning',
  accent: 'accent',
  neutral: 'textTertiary',
};

/** Friendly, encouraging empty state — never a blank screen. */
export function EmptyState({ icon, illustration, title, message, tone = 'neutral', actionLabel, onAction }: EmptyStateProps) {
  const { colors } = useTheme();
  const { bg, fg } = toneColors(tone, colors);
  return (
    <View style={{ alignItems: 'center', gap: Spacing.lg, paddingVertical: Spacing.xxl, paddingHorizontal: Spacing.lg }}>
      {illustration ? (
        <Illustration name={illustration} height={132} color={toneTint[tone]} style={{ opacity: 0.92 }} />
      ) : (
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 999,
            backgroundColor: bg,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Icon name={icon} size={30} raw={fg} />
        </View>
      )}
      <Text variant="heading" center>
        {title}
      </Text>
      {message ? (
        <Text variant="body" color="textSecondary" center style={{ maxWidth: 320 }}>
          {message}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <View style={{ marginTop: Spacing.xs }}>
          <Button title={actionLabel} variant="secondary" size="md" fullWidth={false} onPress={onAction} />
        </View>
      ) : null}
    </View>
  );
}
