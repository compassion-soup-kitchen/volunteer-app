import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Alert, Pressable, ScrollView, Share, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ShiftHeroVideo } from '@/components/shift-hero-video';
import { Badge, Button, Card, EmptyState, Icon, type IconName, Text } from '@/components/ui';
import { FontFamily, Layout, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDuration, formatLongDate, formatTimeRange } from '@/lib/format';
import { qk } from '@/lib/query-keys';
import { useToast } from '@/providers/toast-provider';
import { cancelShiftSignup, getShiftById, signUpForShift } from '@/services/shifts-service';
import type { ActionResult } from '@/types/models';

/** The kitchen's single venue. */
const VENUE = '132 Tory Street, Te Aro, Pōneke';

/** What a volunteer can expect to do on a service shift. */
const WHAT_YOULL_DO = [
  'Serve hot kai to manuhiri with manaaki',
  'Help plate & portion meals alongside the team',
  'Tidy & reset the dining room afterwards',
];

const SPRING = { damping: 24, stiffness: 240, mass: 0.7 };

function timeOfDay(start: string): string {
  const h = Number(start.split(':')[0]);
  if (h < 12) return 'Morning';
  if (h < 17) return 'Afternoon';
  return 'Evening';
}

function hoursBetween(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return Math.max(0, eh * 60 + em - (sh * 60 + sm)) / 60;
}

/** A circular, translucent control floating over the hero. */
function HeroButton({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: 'rgba(255,255,255,0.92)',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.7 : 1,
      })}>
      <Icon name={icon} size={18} raw="#1C1815" />
    </Pressable>
  );
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
  const insets = useSafeAreaInsets();
  const { height: screenH } = useWindowDimensions();
  const toast = useToast();
  const qc = useQueryClient();

  const { data: shift, isLoading } = useQuery({ queryKey: qk.shift(id), queryFn: () => getShiftById(id) });

  // Sheet detents (the y-offset of the sheet's top edge): expanded covers the
  // hero, default reveals a band of it. There is no intermediate stop — drag
  // the sheet past the middle of the screen and it dismisses.
  const EXPANDED = insets.top + Spacing.sm;
  const DEFAULT_Y = 224;
  const DISMISS_Y = screenH * 0.5;

  const ty = useSharedValue(DEFAULT_Y);
  const startY = useSharedValue(0);

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: ty.value }] }));

  function dismiss() {
    router.back();
  }

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

  // Drag the grabber/header to move the sheet; snap to the nearer resting
  // detent, or dismiss the screen on a decisive downward pull past the middle.
  const pan = Gesture.Pan()
    .activeOffsetY([-8, 8])
    .onStart(() => {
      startY.value = ty.value;
    })
    .onUpdate((e) => {
      // eslint-disable-next-line react-hooks/immutability -- Reanimated shared-value write inside a worklet
      ty.value = Math.min(Math.max(startY.value + e.translationY, EXPANDED), screenH);
    })
    .onEnd((e) => {
      const projected = ty.value + e.velocityY * 0.12;
      // Past the middle of the screen → dismiss, no halfway stop.
      if (projected > DISMISS_Y) {
        runOnJS(dismiss)();
        return;
      }
      // Otherwise settle onto the nearer of the two resting detents.
      const mid = (EXPANDED + DEFAULT_Y) / 2;
      // eslint-disable-next-line react-hooks/immutability -- Reanimated shared-value write inside a worklet
      ty.value = withSpring(projected < mid ? EXPANDED : DEFAULT_Y, SPRING);
    });

  function confirmCancel() {
    Alert.alert('Cancel this shift?', 'Your spot will open up for another volunteer.', [
      { text: 'Keep my spot', style: 'cancel' },
      { text: 'Cancel shift', style: 'destructive', onPress: () => cancel.mutate() },
    ]);
  }

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!shift) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center' }}>
        <EmptyState
          icon="help-circle-outline"
          illustration="candle"
          title="Shift not found"
          message="This shift may have been removed."
        />
      </View>
    );
  }

  const spotsLeft = shift.capacity - shift.signupCount;
  const isSignedUp = shift.userSignupStatus === 'SIGNED_UP';
  const isFull = spotsLeft <= 0 && !isSignedUp;
  const hrs = hoursBetween(shift.startTime, shift.endTime);

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

  return (
    <View style={{ flex: 1, backgroundColor: colors.inkSurface }}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Hero — fixed behind the sheet, revealed as it is pulled down */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: Math.round(screenH * 0.74), backgroundColor: colors.inkSurface, overflow: 'hidden' }}>
        <ShiftHeroVideo />
        <View
          style={{
            position: 'absolute',
            top: insets.top + Spacing.sm,
            left: Layout.screenPadding,
            right: Layout.screenPadding,
            flexDirection: 'row',
            justifyContent: 'space-between',
          }}>
          <HeroButton icon="chevron-back" label="Back" onPress={() => router.back()} />
          <HeroButton icon="share-outline" label="Share" onPress={share} />
        </View>
      </View>

      {/* Draggable sheet */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            height: screenH,
            backgroundColor: colors.background,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            borderCurve: 'continuous',
          },
          sheetStyle,
        ]}>
        <GestureDetector gesture={pan}>
          <View style={{ paddingHorizontal: Layout.screenPadding, paddingTop: Spacing.md }}>
            <View style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: colors.borderStrong, alignSelf: 'center', marginBottom: Spacing.lg }} />
            <View style={{ width: '100%', maxWidth: Layout.maxContentWidth, alignSelf: 'center', flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: Spacing.md }}>
              <View style={{ flex: 1 }}>
                <Text variant="display">{shift.serviceArea.name}</Text>
                <Text variant="callout" color="textSecondary">
                  {timeOfDay(shift.startTime)}
                </Text>
              </View>
              {isSignedUp ? (
                <Badge label="Booked" tone="success" icon="checkmark" />
              ) : isFull ? (
                <Badge label="Full" tone="neutral" />
              ) : (
                <Badge label={`${spotsLeft} ${spotsLeft === 1 ? 'spot' : 'spots'} left`} tone="brand" />
              )}
            </View>
          </View>
        </GestureDetector>

        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: Layout.screenPadding, paddingTop: Spacing.lg, paddingBottom: insets.bottom + 120 }}>
          <View style={{ width: '100%', maxWidth: Layout.maxContentWidth, alignSelf: 'center' }}>
            <View style={{ gap: 13 }}>
              <FactRow icon="calendar-outline" value={`${formatLongDate(shift.date)} · ${formatTimeRange(shift.startTime, shift.endTime)}`} />
              <FactRow icon="location-outline" value={VENUE} />
              <FactRow icon="people-outline" value={`${shift.signupCount} of ${shift.capacity} ngā tūao signed up`} />
            </View>

            <View style={{ marginTop: Spacing.xl, gap: Spacing.md }}>
              <Text variant="overline" color="textSecondary">
                What you&apos;ll do
              </Text>
              {WHAT_YOULL_DO.map((item) => (
                <View key={item} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md }}>
                  <Icon name="checkmark" size={18} color="primary" />
                  <Text variant="callout" color="text" style={{ flex: 1 }}>
                    {item}
                  </Text>
                </View>
              ))}
            </View>

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
                <Text variant="body">{shift.notes}</Text>
              </Card>
            ) : null}

            <Text variant="caption" color="textTertiary" style={{ marginTop: Spacing.xl }}>
              Ngā mihi nui — thank you for showing up for our community.
            </Text>
          </View>
        </ScrollView>
      </Animated.View>

      {/* Sticky action */}
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          paddingHorizontal: Layout.screenPadding,
          paddingTop: Spacing.md,
          paddingBottom: insets.bottom + Spacing.md,
          backgroundColor: colors.background,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}>
        <View
          style={{
            width: '100%',
            maxWidth: Layout.maxContentWidth,
            alignSelf: 'center',
            flexDirection: 'row',
            alignItems: 'center',
            gap: Spacing.lg,
          }}>
          <View>
            <Text style={{ fontFamily: FontFamily.serif, fontSize: 16, color: colors.text }}>{formatDuration(hrs)}</Text>
            <Text variant="caption" color="textSecondary">
              time given
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            {isSignedUp ? (
              <Button
                title="Cancel my spot"
                variant="secondary"
                icon="close-circle-outline"
                loading={cancel.isPending}
                disabled={pending}
                onPress={confirmCancel}
              />
            ) : isFull ? (
              <Button title="This shift is full" variant="secondary" disabled onPress={() => {}} />
            ) : (
              <Button title="Book" icon="checkmark" loading={signUp.isPending} disabled={pending} onPress={() => signUp.mutate()} />
            )}
          </View>
        </View>
      </View>
    </View>
  );
}
