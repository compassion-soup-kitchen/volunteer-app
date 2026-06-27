import { Pressable, View } from 'react-native';

import { DateBlock } from '@/components/date-block';
import { serviceAreaMeta } from '@/components/meta';
import { type BadgeTone, Icon, type IconName, Text, toneColors } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
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

/** Cardless, tappable shift summary used in the dashboard lists. */
export function ShiftCard({ areaId, areaName, date, startTime, endTime, badge, meta, notes, onPress }: ShiftCardProps) {
  const { colors } = useTheme();
  const area = serviceAreaMeta(areaId);
  const statusColor = badge ? toneColors(badge.tone, colors).fg : undefined;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${areaName}, ${formatTimeRange(startTime, endTime)}`}
      onPress={onPress}
      style={({ pressed }) => ({ gap: Spacing.sm, opacity: pressed ? 0.6 : 1 })}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.lg }}>
        <DateBlock date={date} />
        <View style={{ width: 1, alignSelf: 'stretch', backgroundColor: colors.border }} />

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

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
          {badge ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              {badge.icon ? <Icon name={badge.icon} size={13} raw={statusColor} /> : null}
              <Text variant="caption" weight="bold" style={{ color: statusColor }}>
                {badge.label}
              </Text>
            </View>
          ) : null}
          {onPress ? <Icon name="chevron-forward" size={18} color="textTertiary" /> : null}
        </View>
      </View>

      {notes ? (
        <Text variant="caption" color="textSecondary" numberOfLines={2}>
          {notes}
        </Text>
      ) : null}
    </Pressable>
  );
}
