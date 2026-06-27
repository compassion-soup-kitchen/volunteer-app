import { Pressable, View } from 'react-native';

import { CapacityMeter, availability, spotsLabel } from '@/components/capacity-meter';
import { Badge, Button, Card, Icon, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { formatTimeRange } from '@/lib/format';

export type BrowseShiftCardProps = {
  areaName: string;
  startTime: string;
  endTime: string;
  signupCount: number;
  capacity: number;
  /** Single-venue label shown beside the time (the kitchen at Tory Street). */
  location?: string;
  signedUp: boolean;
  booking?: boolean;
  /** Open the full shift detail. */
  onPress: () => void;
  /** One-tap sign-up from the list. */
  onBook: () => void;
};

/**
 * One open shift in the browse timeline. Reads top-down by what a volunteer
 * decides on: the area (serif), then when and where, then how many spots are
 * left (seat meter + urgency-coloured label). The action sits to the right —
 * a native SwiftUI (Liquid Glass on iOS 26) Book button for open shifts, a calm
 * "Booked" or "Full" marker otherwise.
 *
 * The tap-to-detail surface and the Book button are siblings (not nested), so
 * the native button owns its own touches and never double-fires navigation.
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
  const { full, scarce } = availability(signupCount, capacity);
  const isFull = full && !signedUp;

  return (
    <Card style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.lg }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${areaName}, ${formatTimeRange(startTime, endTime)}, ${spotsLabel(signupCount, capacity)}`}
        onPress={onPress}
        style={({ pressed }) => ({ flex: 1, gap: Spacing.sm, opacity: pressed || isFull ? 0.6 : 1 })}>
        <Text variant="heading" numberOfLines={1}>
          {areaName}
        </Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Icon name="time-outline" size={14} color="textTertiary" />
          <Text variant="caption" color="textSecondary">
            {formatTimeRange(startTime, endTime)}
          </Text>
          <Text variant="caption" color="textTertiary">
            ·
          </Text>
          <Icon name="location-outline" size={14} color="textTertiary" />
          <Text variant="caption" color="textSecondary">
            {location}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: 2 }}>
          <CapacityMeter taken={signupCount} capacity={capacity} />
          <Text
            variant="caption"
            weight="bold"
            color={signedUp ? 'success' : isFull ? 'textTertiary' : scarce ? 'primary' : 'textSecondary'}>
            {signedUp ? "You're in" : spotsLabel(signupCount, capacity)}
          </Text>
        </View>
      </Pressable>

      <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
        {signedUp ? (
          <Badge label="Booked" tone="success" icon="checkmark" />
        ) : isFull ? (
          <Badge label="Full" tone="neutral" />
        ) : (
          <Button title="Book" size="md" fullWidth={false} loading={booking} onPress={onBook} />
        )}
      </View>
    </Card>
  );
}
