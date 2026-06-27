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
   * A full-bleed hero rendered behind the content. It stays pinned to the top of
   * the screen (fixed/parallax) while the content sheet scrolls up and over it,
   * rather than scrolling away with the page. See HomeVideoHeader.
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

  // Track the live scroll offset so a hero `header` can be counter-translated and
  // stay pinned to the top while the content sheet scrolls over it.
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollOffset = useScrollViewOffset(scrollRef);
  const [headerHeight, setHeaderHeight] = useState(0);

  // Pinned hero: counter-translate by the distance scrolled from rest so it reads
  // as a fixed/parallax backdrop. The native-tabs scroll view carries a top
  // content inset equal to the safe area, so its resting offset is `-insets.top`;
  // adding it back makes the transform 0 at rest and grows as the page scrolls.
  const heroStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scrollOffset.value + insets.top }],
  }));

  const paddingTop = (insetTop ? insets.top : 0) + Spacing.sm;
  // Clear the home indicator AND the floating native tab bar (which overlays content on iOS 26).
  const paddingBottom = insets.bottom + Spacing.huge + Spacing.md + bottomInset;

  const column = (
    <View style={[{ width: '100%', maxWidth: Layout.maxContentWidth, alignSelf: 'center', gap }, contentStyle]}>
      {children}
    </View>
  );

  // Horizontal gutters + top spacing live on this wrapper. With a hero `header`
  // the sheet must be opaque so it occludes the pinned backdrop as it scrolls
  // over it; otherwise it rides on the themed paper canvas as before.
  const padded = (
    <View
      style={{
        paddingTop: header ? Spacing.xl : paddingTop,
        paddingHorizontal: Layout.screenPadding,
        backgroundColor: header ? colors.background : undefined,
      }}>
      {column}
    </View>
  );

  // A pinned hero sits behind the content layer; everything below it flows after
  // its layout footprint, and the transform keeps it visually fixed on screen.
  const pinnedHeader = header ? (
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
        {pinnedHeader}
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
      {pinnedHeader}
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
