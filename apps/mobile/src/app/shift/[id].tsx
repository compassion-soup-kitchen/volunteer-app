import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Alert, Pressable, Share, View } from 'react-native';

import { CapacityMeter, availability } from '@/components/capacity-meter';
import { Badge, Button, Card, EmptyState, Icon, type IconName, SheetBody, Text } from '@/components/ui';
import { FontFamily, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatLongDate, formatTimeRange } from '@/lib/format';
import { qk } from '@/lib/query-keys';
import { useToast } from '@/providers/toast-provider';
import { cancelShiftSignup, getShiftById, signUpForShift } from '@/services/shifts-service';
import type { ActionResult } from '@/types/models';

/** The kitchen's single venue. */
const VENUE = '132 Tory Street, Te Aro, Pōneke';

function timeOfDay(start: string): string {
  const h = Number(start.split(':')[0]);
  if (h < 12) return 'Morning';
  if (h < 17) return 'Afternoon';
  return 'Evening';
}

/** An overlapping stack of volunteer avatars (anonymous tints) + a count. */
function AvatarStack({ count }: { count: number }) {
  const { colors } = useTheme();
  const tints = [
    { bg: colors.navyTint, fg: colors.onNavyTint },
    { bg: colors.successTint, fg: colors.onSuccessTint },
    { bg: colors.warningTint, fg: colors.onWarningTint },
  ];
  const overflow = count > 4;
  const circles = overflow ? 3 : Math.min(count, 4);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
      <View style={{ flexDirection: 'row' }}>
        {Array.from({ length: circles }).map((_, i) => {
          const t = tints[i % tints.length];
          return (
            <View
              key={i}
              style={{
                width: 34,
                height: 34,
                borderRadius: 17,
                backgroundColor: t.bg,
                borderWidth: 2,
                borderColor: colors.background,
                marginLeft: i === 0 ? 0 : -9,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Icon name="person" size={15} raw={t.fg} />
            </View>
          );
        })}
        {overflow ? (
          <View
            style={{
              width: 34,
              height: 34,
              borderRadius: 17,
              backgroundColor: colors.primary,
              borderWidth: 2,
              borderColor: colors.background,
              marginLeft: -9,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Text style={{ color: colors.primaryForeground, fontFamily: FontFamily.textBold, fontSize: 11 }}>
              +{count - 3}
            </Text>
          </View>
        ) : null}
      </View>
      <Text variant="caption" color="textSecondary">
        {count} signed up
      </Text>
    </View>
  );
}

function FactRow({ icon, value }: { icon: IconName; value: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
      <Icon name={icon} size={19} color="primary" />
      <Text variant="callout" color="text" style={{ flex: 1 }}>
        {value}
      </Text>
    </View>
  );
}

export default function ShiftDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const toast = useToast();
  const qc = useQueryClient();

  const { data: shift, isLoading } = useQuery({ queryKey: qk.shift(id), queryFn: () => getShiftById(id) });

  function afterMutation(result: ActionResult, successMessage: string) {
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(successMessage);
    qc.invalidateQueries({ queryKey: qk.shift(id) });
    qc.invalidateQueries({ queryKey: qk.shiftsAll });
    qc.invalidateQueries({ queryKey: qk.dashboard });
  }

  const signUp = useMutation({
    mutationFn: () => signUpForShift(id),
    onSuccess: (res) => afterMutation(res, "You're on the roster — ka pai!"),
  });

  const cancel = useMutation({
    mutationFn: () => cancelShiftSignup(id),
    onSuccess: (res) => afterMutation(res, 'Your spot has been released.'),
  });

  const pending = signUp.isPending || cancel.isPending;

  function confirmCancel() {
    Alert.alert('Cancel this shift?', 'Your spot will open up for another volunteer.', [
      { text: 'Keep my spot', style: 'cancel' },
      { text: 'Cancel shift', style: 'destructive', onPress: () => cancel.mutate() },
    ]);
  }

  // A fixed height keeps the fit-to-contents sheet from collapsing while we wait.
  if (isLoading) {
    return (
      <View style={{ height: 280, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!shift) {
    return (
      <View style={{ minHeight: 320, backgroundColor: colors.background, justifyContent: 'center' }}>
        <EmptyState
          icon="help-circle-outline"
          illustration="candle"
          title="Shift not found"
          message="This shift may have been removed."
        />
      </View>
    );
  }

  const { left: spotsLeft, full, scarce } = availability(shift.signupCount, shift.capacity);
  const isSignedUp = shift.userSignupStatus === 'SIGNED_UP';
  const isFull = full && !isSignedUp;
  const onLeave = Boolean(shift.onLeave) && !isSignedUp;

  async function share() {
    if (!shift) return;
    try {
      await Share.share({
        message: `I'm volunteering: ${shift.serviceArea.name} on ${formatLongDate(shift.date)}, ${formatTimeRange(shift.startTime, shift.endTime)} at the Compassion Soup Kitchen.`,
      });
    } catch {
      // user dismissed the share sheet
    }
  }

  const footer = isSignedUp ? (
    <Button
      title="Cancel my spot"
      variant="secondary"
      icon="close-circle-outline"
      loading={cancel.isPending}
      disabled={pending}
      onPress={confirmCancel}
    />
  ) : onLeave ? (
    <Button title="Change my leave" variant="secondary" icon="airplane-outline" onPress={() => router.push('/leave')} />
  ) : isFull ? (
    <Button title="This shift is full" variant="secondary" disabled onPress={() => {}} />
  ) : (
    <Button title="Book" icon="checkmark" loading={signUp.isPending} disabled={pending} onPress={() => signUp.mutate()} />
  );

  return (
    <SheetBody footer={footer}>
      {/* Title + share */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: Spacing.md }}>
        <View style={{ flex: 1 }}>
          <Text variant="display">{shift.serviceArea.name}</Text>
          <Text variant="callout" color="textSecondary">
            {timeOfDay(shift.startTime)}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Share"
          hitSlop={12}
          onPress={share}
          style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, paddingTop: 4 })}>
          <Icon name="share-outline" size={24} color="primary" />
        </Pressable>
      </View>

      <View style={{ marginTop: Spacing.md }}>
        {isSignedUp ? (
          <Badge label="Booked" tone="success" icon="checkmark" />
        ) : onLeave ? (
          <Badge label="You're on leave" tone="warning" icon="airplane-outline" />
        ) : isFull ? (
          <Badge label="Full" tone="neutral" />
        ) : (
          <Badge
            label={scarce ? `Only ${spotsLeft} left` : `${spotsLeft} spots left`}
            tone="brand"
          />
        )}
      </View>

      {/* Facts */}
      <View style={{ gap: 13, marginTop: Spacing.xl }}>
        <FactRow icon="calendar-outline" value={`${formatLongDate(shift.date)} · ${formatTimeRange(shift.startTime, shift.endTime)}`} />
        <FactRow icon="location-outline" value={VENUE} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
          <Icon name="people-outline" size={19} color="primary" />
          <Text variant="callout" color="text" style={{ flex: 1 }}>
            {`${shift.signupCount} of ${shift.capacity} ngā tūao signed up`}
          </Text>
          <CapacityMeter taken={shift.signupCount} capacity={shift.capacity} size={9} />
        </View>
      </View>

      {/* What the mahi is - the area's own description, as staff wrote it */}
      {shift.serviceArea.description ? (
        <View style={{ marginTop: Spacing.xl, gap: Spacing.sm }}>
          <Text variant="overline" color="textSecondary">
            About this mahi
          </Text>
          <Text variant="callout" color="text">
            {shift.serviceArea.description}
          </Text>
        </View>
      ) : null}

      {/* Who's coming */}
      {shift.signupCount > 0 ? (
        <View style={{ marginTop: Spacing.xl }}>
          <AvatarStack count={shift.signupCount} />
        </View>
      ) : null}

      {shift.notes ? (
        <Card muted style={{ gap: 6, marginTop: Spacing.xl }}>
          <Text variant="label" color="textSecondary">
            Notes from the team
          </Text>
          <Text variant="body">
            {shift.notes}
          </Text>
        </Card>
      ) : null}
    </SheetBody>
  );
}
