import { type ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { serviceAreaMeta } from '@/components/meta';
import { Badge, Button, Card, Divider, Icon, type IconName, IconChip, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { countdownLabel, formatLongDate, formatTimeRange } from '@/lib/format';
import type { RosterShift } from '@/types/models';

/** A single labelled detail line (icon + text) inside the hero. */
function InfoLine({ icon, children }: { icon: IconName; children: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
      <Icon name={icon} size={16} color="textSecondary" />
      <Text variant="callout" color="textSecondary" style={{ flex: 1 }} numberOfLines={1}>
        {children}
      </Text>
    </View>
  );
}

export type NextShiftHeroProps = {
  shift: RosterShift;
  /** Where the volunteer needs to be — shown as a location line and used for directions. */
  location: string;
  /** How many further shifts are on the roster beyond this one. */
  extraCount?: number;
  onDetails: () => void;
  onDirections: () => void;
  onMore?: () => void;
};

/**
 * The dashboard's hero: the volunteer's very next rostered shift, lifted into a
 * prominent editorial card. Leads with an urgency countdown, anchors on the
 * service area, lays out the when / where, and offers the two actions that
 * matter on the day — open the details or get directions.
 */
export function NextShiftHero({
  shift,
  location,
  extraCount = 0,
  onDetails,
  onDirections,
  onMore,
}: NextShiftHeroProps) {
  const area = serviceAreaMeta(shift.serviceArea.id);
  const { label: countdown, imminent } = countdownLabel(shift.date);

  return (
    <Card elevated padding={Spacing.xl} style={{ gap: Spacing.lg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md }}>
        <Text variant="overline" color="primary">
          Tō rōhita · Your next shift
        </Text>
        <Badge label={countdown} tone={imminent ? 'brand' : 'neutral'} solid={imminent} icon={imminent ? 'time' : undefined} />
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.lg }}>
        <IconChip icon={area.icon} tone={area.tone} size={54} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="title" numberOfLines={1}>
            {shift.serviceArea.name}
          </Text>
          {shift.serviceArea.maori ? (
            <Text variant="caption" color="textTertiary" numberOfLines={1}>
              {shift.serviceArea.maori}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={{ gap: Spacing.sm }}>
        <InfoLine icon="calendar-outline">{formatLongDate(shift.date)}</InfoLine>
        <InfoLine icon="time-outline">{formatTimeRange(shift.startTime, shift.endTime)}</InfoLine>
        <InfoLine icon="location-outline">{location}</InfoLine>
      </View>

      <View style={{ flexDirection: 'row', gap: Spacing.md }}>
        <View style={{ flex: 1 }}>
          <Button title="Details" variant="primary" size="md" onPress={onDetails} />
        </View>
        <View style={{ flex: 1 }}>
          <Button title="Directions" variant="secondary" size="md" icon="location-outline" onPress={onDirections} />
        </View>
      </View>

      {extraCount > 0 && onMore ? (
        <View style={{ gap: Spacing.md }}>
          <Divider />
          <Pressable
            accessibilityRole="button"
            onPress={onMore}
            hitSlop={8}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              opacity: pressed ? 0.55 : 1,
            })}>
            <Text variant="label" color="textSecondary">
              {extraCount} more {extraCount === 1 ? 'shift' : 'shifts'} on your roster
            </Text>
            <Icon name="chevron-forward" size={16} color="textTertiary" />
          </Pressable>
        </View>
      ) : null}
    </Card>
  );
}
