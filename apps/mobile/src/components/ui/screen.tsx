import { type LayoutChangeEvent, type ReactNode, useState } from 'react';
import { RefreshControl, type StyleProp, useWindowDimensions, View, type ViewStyle } from 'react-native';
import Animated, { useAnimatedRef, useAnimatedStyle, useScrollViewOffset } from 'react-native-reanimated';
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
  /**
   * A full-bleed hero rendered at the top of the page. It scrolls away with the
   * content like a normal banner, but holds its position on overscroll (pull-down)
   * for a parallax effect. See HomeVideoHeader.
   */
  header?: ReactNode;
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
  header,
  contentStyle,
}: ScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  // Track the live scroll offset so a hero `header` can hold its position on
  // overscroll for a parallax effect.
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollOffset = useScrollViewOffset(scrollRef);
  const [headerHeight, setHeaderHeight] = useState(0);

  // Parallax hero: the header scrolls away with the page normally, but stays put
  // on overscroll (pull-down) so the page bounces beneath it. The native-tabs
  // scroll view carries a top content inset equal to the safe area, so its resting
  // offset is `-insets.top`; `+ insets.top` normalises that to 0 at rest.
  // `Math.min(0, …)` keeps the transform at 0 while scrolling up (the header
  // travels with the content) and only counter-translates when pulled below rest.
  const heroStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: Math.min(0, scrollOffset.value + insets.top) }],
  }));

  const paddingTop = (insetTop ? insets.top : 0) + Spacing.sm;
  // Clear the home indicator AND the floating native tab bar (which overlays content on iOS 26).
  const paddingBottom = insets.bottom + Spacing.huge + Spacing.md + bottomInset;

  const column = (
    <View style={[{ width: '100%', maxWidth: Layout.maxContentWidth, alignSelf: 'center', gap }, contentStyle]}>
      {children}
    </View>
  );

  // Horizontal gutters + top spacing live on this wrapper so an optional
  // full-bleed `header` can sit above it and run edge-to-edge.
  const padded = (
    <View style={{ paddingTop: header ? Spacing.xl : paddingTop, paddingHorizontal: Layout.screenPadding }}>
      {column}
    </View>
  );

  // The hero flows at the top of the page and scrolls away with the content; the
  // transform only holds it in place on overscroll for a parallax stretch.
  const heroHeader = header ? (
    <Animated.View
      style={heroStyle}
      onLayout={(e: LayoutChangeEvent) => setHeaderHeight(e.nativeEvent.layout.height)}>
      {header}
    </Animated.View>
  ) : null;

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
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {watermark}
        {heroHeader}
        {padded}
      </View>
    );
  }

  // Surface the refresh spinner just below a hero so it isn't hidden behind it.
  const refreshOffset = header ? insets.top + headerHeight : insetTop ? insets.top : 0;

  const list = (
    <Animated.ScrollView
      ref={scrollRef}
      style={{ backgroundColor: motif ? 'transparent' : colors.background }}
      contentInsetAdjustmentBehavior="never"
      automaticallyAdjustContentInsets={false}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom }}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={Boolean(refreshing)}
            onRefresh={onRefresh}
            progressViewOffset={refreshOffset}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        ) : undefined
      }>
      {heroHeader}
      {padded}
    </Animated.ScrollView>
  );

  if (!motif) return list;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {watermark}
      {list}
    </View>
  );
}
