import { View } from 'react-native';

import { Card, Icon, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatShiftDate, formatTimeRange, relativeDay } from '@/lib/format';

export type RosterShiftPillProps = {
  areaName: string;
  date: string;
  startTime: string;
  endTime: string;
  onPress: () => void;
};

/**
 * A compact card for the volunteer's own booked shifts, shown in the horizontal
 * rail at the top of the Shifts tab. A red mission rail and a relative-day
 * eyebrow ("TOMORROW") answer the first question a volunteer has — "when am I
 * next on?" — before they browse for more.
 */
export function RosterShiftPill({ areaName, date, startTime, endTime, onPress }: RosterShiftPillProps) {
  const { colors } = useTheme();

  return (
    <Card
      onPress={onPress}
      padding={0}
      accessibilityLabel={`Your booked shift: ${areaName}, ${relativeDay(date)}, ${formatTimeRange(startTime, endTime)}`}
      style={{ width: 244, flexDirection: 'row', alignItems: 'stretch', overflow: 'hidden' }}>
      <View style={{ width: 4, backgroundColor: colors.primary }} />
      <View style={{ flex: 1, padding: Spacing.lg, gap: 5 }}>
        <Text variant="overline" color="primary">
          {relativeDay(date)}
        </Text>
        <Text variant="heading" numberOfLines={1}>
          {areaName}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Icon name="time-outline" size={13} color="textTertiary" />
          <Text variant="caption" color="textSecondary" numberOfLines={1}>
            {formatShiftDate(date)} · {formatTimeRange(startTime, endTime)}
          </Text>
        </View>
      </View>
    </Card>
  );
}
