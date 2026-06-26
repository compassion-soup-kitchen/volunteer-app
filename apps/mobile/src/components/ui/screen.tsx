import { type ReactNode } from 'react';
import { RefreshControl, ScrollView, type StyleProp, useWindowDimensions, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Kowhaiwhai } from '@/components/brand';
import { Layout, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ScreenProps = {
  children: ReactNode;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  /** Gap between direct children of the content column */
  gap?: number;
  /** Pad for the top safe area — true for header-less tab screens, false under a native header */
  insetTop?: boolean;
  /** Extra bottom padding (e.g. to clear a sticky footer) */
  bottomInset?: number;
  /** Float a large, faint kōwhaiwhai motif behind the page (hero screens) */
  motif?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
};

/**
 * Standard screen wrapper: themed paper background, deterministic safe-area
 * insets, a comfortable max reading width centred on large screens, and
 * optional pull-to-refresh. Pass `motif` to bleed a soft kōwhaiwhai watermark
 * off the top-right, echoing the marketing site's editorial pages.
 */
export function Screen({
  children,
  scroll = true,
  refreshing,
  onRefresh,
  gap = Spacing.xxxl,
  insetTop = true,
  bottomInset = 0,
  motif = false,
  contentStyle,
}: ScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const paddingTop = (insetTop ? insets.top : 0) + Spacing.sm;
  // Clear the home indicator AND the floating native tab bar (which overlays content on iOS 26).
  const paddingBottom = insets.bottom + Spacing.huge + Spacing.md + bottomInset;

  const column = (
    <View style={[{ width: '100%', maxWidth: Layout.maxContentWidth, alignSelf: 'center', gap }, contentStyle]}>
      {children}
    </View>
  );

  // A fixed, faint kōwhaiwhai bleeding off the upper-right edge, behind content.
  const watermark = motif ? (
    <Kowhaiwhai
      width={width * 0.86}
      tint={colors.borderStrong}
      opacity={0.5}
      style={{ position: 'absolute', top: insets.top + Spacing.huge, right: -width * 0.3 }}
    />
  ) : null;

  if (!scroll) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, paddingTop, paddingHorizontal: Layout.screenPadding }}>
        {watermark}
        {column}
      </View>
    );
  }

  const list = (
    <ScrollView
      style={{ backgroundColor: motif ? 'transparent' : colors.background }}
      contentInsetAdjustmentBehavior="never"
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingTop, paddingBottom, paddingHorizontal: Layout.screenPadding }}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={Boolean(refreshing)}
            onRefresh={onRefresh}
            progressViewOffset={insetTop ? insets.top : 0}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        ) : undefined
      }>
      {column}
    </ScrollView>
  );

  if (!motif) return list;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {watermark}
      {list}
    </View>
  );
}
