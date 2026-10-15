import { View } from 'react-native';

import { Card, Icon, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { describeLeaveStatus, formatLeaveRange } from '@/lib/leave';
import type { LeaveRange } from '@/types/models';

/**
 * A quiet line about the volunteer's leave - so someone away isn't left
 * wondering where their shifts went, and someone about to go can see the
 * kitchen knows. Taps through to their leave.
 */
export function LeaveNotice({
  range,
  away,
  today,
  onPress,
}: {
  range: LeaveRange;
  /** Under way now, rather than coming up. */
  away: boolean;
  today: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const title = away ? describeLeaveStatus(range, today) : `Leave coming up · ${formatLeaveRange(range, today)}`;

  return (
    <Card
      tone="warning"
      onPress={onPress}
      accessibilityLabel={`${title}. Manage your leave`}
      style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
      <Icon name="airplane-outline" size={22} raw={colors.onWarningTint} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="bodyStrong" style={{ color: colors.onWarningTint }}>
          {title}
        </Text>
        <Text variant="caption" style={{ color: colors.onWarningTint, opacity: 0.85 }}>
          {away
            ? "You're off the roster while you're away. Back sooner? Let us know."
            : 'Shifts on those days are off your roster.'}
        </Text>
      </View>
      <Icon name="chevron-forward" size={18} raw={colors.onWarningTint} />
    </Card>
  );
}
