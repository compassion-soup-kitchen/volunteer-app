import { format, parseISO } from 'date-fns';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';

/**
 * The shared date treatment used across every shift/schedule card: the weekday
 * in Pūaroha red over the day number set in the Newsreader serif. Pair it with
 * a full-height vertical hairline divider in the card to match the handoff.
 */
export function DateBlock({ date }: { date: string }) {
  const d = parseISO(date);
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', minWidth: 36 }}>
      <Text variant="overline" color="primary" style={{ fontSize: 11, letterSpacing: 0.6 }}>
        {format(d, 'EEE')}
      </Text>
      <Text variant="title">{format(d, 'd')}</Text>
    </View>
  );
}
