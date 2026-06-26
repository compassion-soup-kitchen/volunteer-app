import { View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

import { Text } from './text';
import { type Tone, toneColors } from './tones';

export type AvatarProps = {
  name: string;
  size?: number;
  tone?: Tone;
};

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('');
}

export function Avatar({ name, size = 44, tone = 'navy' }: AvatarProps) {
  const { colors } = useTheme();
  const { bg, fg } = toneColors(tone, colors);
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={name}
      style={{ width: size, height: size, borderRadius: 999, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Text variant="body" style={{ color: fg, fontWeight: '700', fontSize: Math.round(size * 0.36), lineHeight: Math.round(size * 0.4) }}>
        {initialsOf(name) || '★'}
      </Text>
    </View>
  );
}
