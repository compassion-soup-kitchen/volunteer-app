import { View } from 'react-native';

import { serviceAreaMeta } from '@/components/meta';
import { Card, Divider, Icon, IconChip, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { formatLongDate, formatTimeRange, relativeDay } from '@/lib/format';
import type { RosterShift } from '@/types/models';

/** The dashboard hero card: the volunteer's very next rostered shift. */
export function NextShiftCard({ shift, onPress }: { shift: RosterShift; onPress: () => void }) {
  const area = serviceAreaMeta(shift.serviceArea.id);

  return (
    <Card onPress={onPress} accessibilityLabel={`Your next shift, ${relativeDay(shift.date)}`} style={{ gap: Spacing.lg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
        <IconChip icon={area.icon} tone={area.tone} size={52} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="overline" color="primary">
            Tō rōhita · Your next shift
          </Text>
          <Text variant="title">{relativeDay(shift.date)}</Text>
          <Text variant="caption" color="textSecondary">
            {formatLongDate(shift.date)}
          </Text>
        </View>
      </View>

      <Divider />

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

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 2 }}>
        <Text variant="label" color="primary">
          View shift details
        </Text>
        <Icon name="chevron-forward" size={16} color="primary" />
      </View>
    </Card>
  );
}
