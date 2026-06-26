import { format, parseISO } from 'date-fns';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { type Tone, toneColors } from '@/components/ui/tones';
import { FontFamily } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Calendar-icon date block: a grey outlined "calendar" with two binding-ring
 * tabs, the day number set large in the Fraunces serif over the month. The
 * number/month take the service-area tone; the outline stays a neutral grey.
 */
export function DateBlock({ date, tone = 'neutral', size = 60 }: { date: string; tone?: Tone; size?: number }) {
  const { colors } = useTheme();
  const { fg } = toneColors(tone, colors);
  const d = parseISO(date);

  const ringH = Math.round(size * 0.18);
  const ringW = Math.max(4, Math.round(size * 0.08));
  const outline = colors.borderStrong;

  return (
    <View style={{ width: size, alignItems: 'center', paddingTop: ringH / 2 }}>
      <View
        style={{
          width: size,
          borderWidth: 2,
          borderColor: outline,
          borderRadius: Math.round(size * 0.22),
          borderCurve: 'continuous',
          backgroundColor: colors.surface,
          paddingTop: Math.round(size * 0.13),
          paddingBottom: Math.round(size * 0.09),
          alignItems: 'center',
        }}>
        <Text
          style={{
            fontFamily: FontFamily.accent,
            fontSize: Math.round(size * 0.46),
            lineHeight: Math.round(size * 0.5),
            letterSpacing: -0.5,
            color: fg,
          }}>
          {format(d, 'd')}
        </Text>
        <Text variant="overline" style={{ color: fg }}>
          {format(d, 'MMM')}
        </Text>
      </View>

      {/* Binding-ring tabs poking above the calendar top edge */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          flexDirection: 'row',
          justifyContent: 'center',
          gap: Math.round(size * 0.26),
        }}>
        <View style={{ width: ringW, height: ringH, borderRadius: ringW, backgroundColor: outline }} />
        <View style={{ width: ringW, height: ringH, borderRadius: ringW, backgroundColor: outline }} />
      </View>
    </View>
  );
}
