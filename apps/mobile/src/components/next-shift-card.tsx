import { View } from 'react-native';

import { DateBlock } from '@/components/date-block';
import { Card, Icon, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatTimeRange, relativeDay } from '@/lib/format';
import type { RosterShift } from '@/types/models';

/**
 * The dashboard's compact "next shift" card: a red mission rail, a stacked
 * day pill (weekday over the serif date) and the shift summary — the very next
 * time the volunteer is rostered on.
 */
export function NextShiftCard({ shift, onPress }: { shift: RosterShift; onPress: () => void }) {
  const { colors } = useTheme();

  return (
    <Card
      onPress={onPress}
      padding={0}
      accessibilityLabel={`Your next shift, ${relativeDay(shift.date)}`}
      style={{ flexDirection: 'row', alignItems: 'stretch', overflow: 'hidden' }}>
      <View style={{ width: 4, backgroundColor: colors.primary }} />
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.lg, padding: Spacing.lg }}>
        <DateBlock date={shift.date} />
        <View style={{ width: 1, alignSelf: 'stretch', backgroundColor: colors.border }} />
        <View style={{ flex: 1, gap: 3 }}>
          <Text variant="subheading" numberOfLines={1}>
            {shift.serviceArea.name}
          </Text>
          <Text variant="caption" color="textSecondary" numberOfLines={1}>
            {formatTimeRange(shift.startTime, shift.endTime)}
          </Text>
        </View>
        <Icon name="chevron-forward" size={18} color="textTertiary" />
      </View>
    </Card>
  );
}
