import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Layout, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type SheetBodyProps = {
  children: ReactNode;
  /** Pinned below the scrolling content - the sheet's one action (Book, Register…). */
  footer?: ReactNode;
};

/**
 * The body of a `fitToContents` form sheet. Short content sizes the sheet to
 * itself as before; content taller than the screen (a long pānui, large
 * Dynamic Type) scrolls inside the sheet instead of being clipped, and the
 * footer action stays on screen either way.
 */
export function SheetBody({ children, footer }: SheetBodyProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    // `maxHeight` hands the sheet's capped height down, so the ScrollView
    // (which shrinks but never grows) gets a bound once the content outgrows it.
    <View style={{ backgroundColor: colors.background, maxHeight: '100%' }}>
      <ScrollView
        style={{ flexGrow: 0 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: Layout.screenPadding,
          paddingTop: Spacing.xxxl,
          paddingBottom: footer ? Spacing.xl : insets.bottom + Spacing.xxl,
        }}>
        <View style={{ width: '100%', maxWidth: Layout.maxContentWidth, alignSelf: 'center' }}>{children}</View>
      </ScrollView>

      {footer ? (
        <View
          style={{
            paddingHorizontal: Layout.screenPadding,
            paddingTop: Spacing.md,
            paddingBottom: insets.bottom + Spacing.md,
            borderTopWidth: 1,
            borderTopColor: colors.border,
          }}>
          <View style={{ width: '100%', maxWidth: Layout.maxContentWidth, alignSelf: 'center' }}>{footer}</View>
        </View>
      ) : null}
    </View>
  );
}
