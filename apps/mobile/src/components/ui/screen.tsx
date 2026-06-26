import { type ReactNode } from 'react';
import { RefreshControl, ScrollView, type StyleProp, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  contentStyle?: StyleProp<ViewStyle>;
};

/**
 * Standard screen wrapper: themed paper background, deterministic safe-area
 * insets, a comfortable max reading width centred on large screens, and
 * optional pull-to-refresh.
 */
export function Screen({
  children,
  scroll = true,
  refreshing,
  onRefresh,
  gap = Spacing.lg,
  insetTop = true,
  bottomInset = 0,
  contentStyle,
}: ScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const paddingTop = (insetTop ? insets.top : 0) + Spacing.sm;
  const paddingBottom = Spacing.huge + bottomInset;

  const column = (
    <View style={[{ width: '100%', maxWidth: Layout.maxContentWidth, alignSelf: 'center', gap }, contentStyle]}>
      {children}
    </View>
  );

  if (!scroll) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, paddingTop, paddingHorizontal: Layout.screenPadding }}>
        {column}
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
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
}
