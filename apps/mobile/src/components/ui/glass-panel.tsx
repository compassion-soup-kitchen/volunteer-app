import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { type StyleProp, type ViewStyle } from 'react-native';

type GlassPanelProps = {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Adds the fluid press/morph behaviour for tappable glass (iOS 26+). */
  isInteractive?: boolean;
};

/**
 * Liquid-glass surface. Renders Apple's native glass material on iOS 26+ and
 * degrades to a frosted blur (older iOS / Android) or a translucent fill where
 * no blur is available — so the same panel reads correctly everywhere.
 *
 * Tuned for the always-dark auth backdrop, hence the dark blur tint and the
 * hairline white rim/highlight that give the glass its lit edge.
 */
export function GlassPanel({ children, style, isInteractive }: GlassPanelProps) {
  const rim: ViewStyle = {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    overflow: 'hidden',
  };

  if (isLiquidGlassAvailable()) {
    return (
      // Force dark glass regardless of system appearance — the auth backdrop is
      // always dark, and the content on it (fields, labels) is light.
      <GlassView colorScheme="dark" isInteractive={isInteractive} style={[rim, style]}>
        {children}
      </GlassView>
    );
  }

  return (
    <BlurView tint="systemThinMaterialDark" intensity={60} style={[rim, { backgroundColor: 'rgba(28,26,22,0.34)' }, style]}>
      {children}
    </BlurView>
  );
}
