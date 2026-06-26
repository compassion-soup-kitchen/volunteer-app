import { View } from 'react-native';

import { serviceAreaMeta } from '@/components/meta';
import { Card, Icon, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { formatLongDate, formatTimeRange, relativeDay } from '@/lib/format';
import type { RosterShift } from '@/types/models';

/** The dashboard hero card: the volunteer's very next rostered shift. */
export function NextShiftCard({ shift, onPress }: { shift: RosterShift; onPress: () => void }) {
  const area = serviceAreaMeta(shift.serviceArea.id);

  return (
    <Card
      onPress={onPress}
      elevated
      accessibilityLabel={`Your next shift, ${relativeDay(shift.date)}`}
      style={{ gap: Spacing.lg }}>
      <View style={{ gap: 3 }}>
        <Text variant="overline" color="primary">
          Tō rōhita · Your next shift
        </Text>
        <Text variant="titleXl">{formatLongDate(shift.date)}</Text>
      </View>

      <View style={{ gap: Spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Icon name={area.icon} size={16} color="textSecondary" />
          <Text variant="bodyStrong">{shift.serviceArea.name}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Icon name="time-outline" size={16} color="textSecondary" />
          <Text variant="body" color="textSecondary">
            {formatTimeRange(shift.startTime, shift.endTime)}
          </Text>
        </View>
        {shift.notes ? (
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
            <Icon name="document-text-outline" size={16} color="textSecondary" />
            <Text variant="body" color="textSecondary" style={{ flex: 1 }}>
              {shift.notes}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 1 }}>
        <Text variant="label" color="accent">
          View shift details
        </Text>
        <Icon name="chevron-forward" size={16} color="accent" />
      </View>
    </Card>
  );
}
