import { View } from 'react-native';

import { DateBlock } from '@/components/date-block';
import { serviceAreaMeta } from '@/components/meta';
import { Badge, type BadgeTone, Card, Icon, type IconName, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { formatTimeRange } from '@/lib/format';

export type ShiftCardProps = {
  areaId: string;
  areaName: string;
  date: string;
  startTime: string;
  endTime: string;
  badge?: { label: string; tone: BadgeTone; icon?: IconName };
  meta?: string;
  notes?: string | null;
  onPress?: () => void;
};

/** Tappable shift summary used in the dashboard and the shifts browser. */
export function ShiftCard({ areaId, areaName, date, startTime, endTime, badge, meta, notes, onPress }: ShiftCardProps) {
  const area = serviceAreaMeta(areaId);

  return (
    <Card onPress={onPress} accessibilityLabel={`${areaName}, ${formatTimeRange(startTime, endTime)}`} style={{ gap: Spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
        <DateBlock date={date} tone={area.tone} />

        <View style={{ flex: 1, gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Icon name={area.icon} size={16} color="textSecondary" />
            <Text variant="heading" numberOfLines={1} style={{ flex: 1 }}>
              {areaName}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Icon name="time-outline" size={14} color="textTertiary" />
            <Text variant="caption" color="textSecondary">
              {formatTimeRange(startTime, endTime)}
            </Text>
          </View>
          {meta ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Icon name="people-outline" size={14} color="textTertiary" />
              <Text variant="caption" color="textSecondary">
                {meta}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={{ alignItems: 'flex-end', gap: Spacing.sm }}>
          {badge ? <Badge label={badge.label} tone={badge.tone} icon={badge.icon} /> : null}
          {onPress ? <Icon name="chevron-forward" size={18} color="textTertiary" /> : null}
        </View>
      </View>

      {notes ? (
        <Text variant="caption" color="textSecondary" numberOfLines={2}>
          {notes}
        </Text>
      ) : null}
    </Card>
  );
}
