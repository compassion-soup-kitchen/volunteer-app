import type { ReactNode } from 'react';
import { ScrollView, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Layout, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** What iOS keeps visible above a fully expanded form sheet. */
const SHEET_TOP_GAP = 10;

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
  const { height } = useWindowDimensions();
  // The tallest a form sheet gets: the screen less the status bar and the
  // strip of the screen behind that iOS leaves showing above the sheet.
  const maxHeight = height - insets.top - SHEET_TOP_GAP;

  return (
    // A fit-to-contents sheet sizes itself from this view, so the cap has to
    // be a number: a percentage has nothing to resolve against, and the
    // ScrollView collapses. Under the cap the ScrollView (which shrinks but
    // never grows) is exactly as tall as its content.
    <View style={{ backgroundColor: colors.background, maxHeight }}>
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
