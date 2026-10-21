import { StatusBar } from 'expo-status-bar';
import { type ReactNode } from 'react';
import { KeyboardAvoidingView, ScrollView, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, ReduceMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Kowhaiwhai, Wordmark } from '@/components/brand';
import { Text } from '@/components/ui';
import { Duration, Layout, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** How far the first card rises into the ink masthead, breaking the seam. */
const CARD_OVERLAP = 44;

const enter = (delay: number) =>
  FadeInDown.duration(Duration.slow).delay(delay).reduceMotion(ReduceMotion.System);

export type AuthScreenProps = {
  /** Te Reo welcome above the title, e.g. "Nau mai, haere mai" */
  overline: string;
  title: string;
  subtitle?: string;
  /** The form card first (it overlaps the masthead), then anything below it */
  children: ReactNode;
};

/**
 * The one layout every sign-in, sign-up and recovery screen shares: an ink
 * masthead (the mission-quote panel language at full bleed, with a Pūaroha-red
 * kōwhaiwhai trace flowing off the edge, the wordmark and a serif welcome set
 * like an editorial cover), then the paper page, whose first card breaks the
 * seam, and a colophon pinned to the foot on tall screens.
 */
export function AuthScreen({ overline, title, subtitle, children }: AuthScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* The masthead is ink in both themes, so the status bar is always light.
          Each auth screen sets it, so popping back to one keeps it right. */}
      <StatusBar style="light" />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + Spacing.xl }}>
          <View
            style={{
              backgroundColor: colors.inkBleed,
              paddingTop: insets.top + Spacing.xxl,
              paddingBottom: Spacing.huge + CARD_OVERLAP,
              paddingHorizontal: Layout.screenPadding,
              overflow: 'hidden',
            }}>
            <Kowhaiwhai
              width={width * 0.92}
              tint={colors.primary}
              opacity={0.26}
              style={{ position: 'absolute', top: -Spacing.xxxl, right: -width * 0.3 }}
            />
            <Animated.View
              entering={FadeIn.duration(Duration.slow).reduceMotion(ReduceMotion.System)}
              style={{ width: '100%', maxWidth: Layout.maxContentWidth, alignSelf: 'center', gap: Spacing.xxxl }}>
              <Wordmark height={28} color="onInk" />
              <View style={{ gap: Spacing.sm }}>
                <Text variant="overline" color="onInkMuted">
                  {overline}
                </Text>
                <Text variant="titleXl" color="onInk" style={{ maxWidth: 320 }}>
                  {title}
                </Text>
                {subtitle ? (
                  <Text variant="body" color="onInkMuted" style={{ maxWidth: 340 }}>
                    {subtitle}
                  </Text>
                ) : null}
              </View>
            </Animated.View>
          </View>

          <View
            style={{
              flex: 1,
              marginTop: -CARD_OVERLAP,
              paddingHorizontal: Layout.screenPadding,
              width: '100%',
              maxWidth: Layout.maxContentWidth,
              alignSelf: 'center',
              gap: Spacing.xl,
            }}>
            <Animated.View entering={enter(80)} style={{ gap: Spacing.xl }}>
              {children}
            </Animated.View>

            {/* Colophon - pinned to the foot of the page on tall screens */}
            <View style={{ flex: 1 }} />
            <Animated.View entering={enter(200)}>
              <Text variant="caption" color="textTertiary" center>
                Te Pūaroha · Compassion Soup Kitchen · Pōneke Wellington
              </Text>
            </Animated.View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

/** A quiet "Question? Action" line that moves between the auth screens. */
export function AuthSwitch({ prompt, children }: { prompt: string; children: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
      <Text variant="callout" color="textSecondary">
        {prompt}
      </Text>
      {children}
    </View>
  );
}
