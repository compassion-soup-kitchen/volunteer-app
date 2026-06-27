import { Pressable, View } from 'react-native';

import { Button, Icon, ProgressBar, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { formatTimeRange } from '@/lib/format';

/** Morning / Afternoon / Evening from an `HH:mm` start time. */
function timeOfDay(start: string): string {
  const h = Number(start.split(':')[0]);
  if (h < 12) return 'Morning';
  if (h < 17) return 'Afternoon';
  return 'Evening';
}

export type BrowseShiftCardProps = {
  areaName: string;
  date: string;
  startTime: string;
  endTime: string;
  signupCount: number;
  capacity: number;
  /** Single-venue label shown beside the time (the kitchen at Tory Street) */
  location?: string;
  signedUp: boolean;
  booking?: boolean;
  onPress: () => void;
  onBook: () => void;
};

/**
 * The browse-and-book shift, rendered cardless on the open list: a serif title
 * with the part of day, a spots-left badge, the time and place, a capacity bar
 * and an inline Book CTA. Day groups separate these with hairline rules.
 */
export function BrowseShiftCard({
  areaName,
  startTime,
  endTime,
  signupCount,
  capacity,
  location = 'Tory St',
  signedUp,
  booking,
  onPress,
  onBook,
}: BrowseShiftCardProps) {
  const left = Math.max(0, capacity - signupCount);
  const full = left <= 0 && !signedUp;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${areaName}, ${formatTimeRange(startTime, endTime)}`}
      onPress={onPress}
      style={({ pressed }) => ({ gap: Spacing.md, opacity: pressed ? 0.6 : 1 })}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: Spacing.md }}>
        <View style={{ flex: 1 }}>
          <Text variant="heading" numberOfLines={1}>
            {areaName}
          </Text>
          <Text variant="caption" color="textSecondary">
            {timeOfDay(startTime)}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingTop: 2 }}>
          {signedUp ? (
            <>
              <Icon name="checkmark" size={13} color="success" />
              <Text variant="caption" weight="bold" color="success">
                Booked
              </Text>
            </>
          ) : full ? (
            <Text variant="caption" weight="bold" color="textTertiary">
              Full
            </Text>
          ) : (
            <Text variant="caption" weight="bold" color={left <= 3 ? 'primary' : 'textSecondary'}>
              {left} {left === 1 ? 'spot' : 'spots'} left
            </Text>
          )}
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Icon name="time-outline" size={14} color="primary" />
          <Text variant="caption" color="textSecondary">
            {formatTimeRange(startTime, endTime)}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Icon name="location-outline" size={14} color="primary" />
          <Text variant="caption" color="textSecondary">
            {location}
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
        <View style={{ flex: 1 }}>
          <ProgressBar value={capacity > 0 ? signupCount / capacity : 0} height={7} />
        </View>
        <Text variant="caption" color="textSecondary" weight="bold">
          {signupCount} / {capacity}
        </Text>
      </View>

      {signedUp ? (
        <Button title="You're booked in" variant="secondary" icon="checkmark" onPress={onPress} />
      ) : full ? (
        <Button title="Shift is full" variant="secondary" disabled onPress={() => {}} />
      ) : (
        <Button title="Book" loading={booking} onPress={onBook} />
      )}
    </Pressable>
  );
}
