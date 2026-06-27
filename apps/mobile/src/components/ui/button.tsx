import { Host } from "@expo/ui";
import {
  Button as SwiftUIButton,
  HStack,
  Image as SwiftUIImage,
  ProgressView,
  Text as SwiftUIText,
} from "@expo/ui/swift-ui";
import {
  buttonStyle,
  controlSize,
  disabled as disabledModifier,
  frame,
  tint,
} from "@expo/ui/swift-ui/modifiers";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import * as Haptics from "expo-haptics";
import {
  ActivityIndicator,
  type GestureResponderEvent,
  Pressable,
  type PressableProps,
  View,
} from "react-native";

import { type ColorTokens, Radius, Shadows, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

import { Icon, type IconName, sfSymbol } from "./icon";
import { Text } from "./text";

type Variant = "primary" | "secondary" | "ghost" | "destructive";
type Size = "md" | "lg";

export type ButtonProps = Omit<PressableProps, "children" | "style"> & {
  title: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  icon?: IconName;
  fullWidth?: boolean;
  haptic?: boolean;
};

function palette(variant: Variant, c: ColorTokens) {
  switch (variant) {
    case "primary":
      return {
        bg: c.primary,
        pressedBg: c.primaryPressed,
        fg: c.primaryForeground,
        border: "transparent",
        shadow: Shadows.primary,
      };
    case "destructive":
      return {
        bg: c.destructive,
        pressedBg: c.onDestructiveTint,
        fg: c.destructiveForeground,
        border: "transparent",
        shadow: Shadows.none,
      };
    case "secondary":
      return {
        bg: c.surface,
        pressedBg: c.surfacePressed,
        fg: c.text,
        border: c.borderStrong,
        shadow: Shadows.sm,
      };
    case "ghost":
      return {
        bg: "transparent",
        pressedBg: c.primaryTint,
        fg: c.primary,
        border: "transparent",
        shadow: Shadows.none,
      };
  }
}

/** SwiftUI button style + tint per variant — the authentic iOS 26 Liquid Glass controls. */
function swiftStyle(
  variant: Variant
): "glass" | "glassProminent" | "borderless" {
  if (variant === "primary" || variant === "destructive")
    return "glassProminent";
  if (variant === "secondary") return "glass";
  return "borderless";
}

export function Button({
  title,
  variant = "primary",
  size = "lg",
  loading = false,
  disabled = false,
  icon,
  fullWidth = true,
  haptic = true,
  onPress,
  ...rest
}: ButtonProps) {
  const { colors } = useTheme();

  function fireHaptic() {
    if (haptic && process.env.EXPO_OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }
  function handlePress(e: GestureResponderEvent) {
    fireHaptic();
    onPress?.(e);
  }

  const isDisabled = disabled || loading;

  // iOS 26: render the real SwiftUI Liquid Glass button.
  if (isLiquidGlassAvailable()) {
    const tintColor =
      variant === "destructive"
        ? colors.destructive
        : variant === "secondary"
        ? undefined
        : colors.primary;
    const h = size === "lg" ? 54 : 44;
    const modifiers = [
      buttonStyle(swiftStyle(variant)),
      controlSize(size === "lg" ? "large" : "regular"),
      ...(tintColor ? [tint(tintColor)] : []),
      disabledModifier(isDisabled),
    ];
    // Sizing must live on the button's *label*, applied before the button style —
    // a bordered/glass style sizes itself to its label's frame, so `.frame()` on
    // the button itself does nothing. Filling both axes makes the label span the
    // Host's fixed `h`, so an icon (HStack) and a text-only label resolve to the
    // same height — otherwise the taller icon label produces a taller button.
    const labelModifiers = fullWidth ? [frame({ maxWidth: Infinity, maxHeight: Infinity })] : [];

    return (
      <Host
        matchContents={!fullWidth}
        style={
          fullWidth ? { width: "100%", height: h } : { alignSelf: "flex-start" }
        }
      >
        {loading ? (
          <SwiftUIButton modifiers={modifiers} onPress={() => {}}>
            <HStack modifiers={labelModifiers}>
              <ProgressView />
            </HStack>
          </SwiftUIButton>
        ) : (
          <SwiftUIButton
            onPress={() => {
              fireHaptic();
              (onPress as (() => void) | undefined)?.();
            }}
            modifiers={modifiers}
          >
            {icon ? (
              <HStack spacing={8} modifiers={labelModifiers}>
                <SwiftUIImage systemName={sfSymbol(icon) as never} />
                <SwiftUIText>{title}</SwiftUIText>
              </HStack>
            ) : (
              <SwiftUIText modifiers={labelModifiers}>{title}</SwiftUIText>
            )}
          </SwiftUIButton>
        )}
      </Host>
    );
  }

  // Android / pre-iOS-26: solid themed button.
  const p = palette(variant, colors);
  const inert = disabled && !loading;
  const fg = inert ? colors.textTertiary : p.fg;
  const height = size === "lg" ? 54 : 44;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={handlePress}
      style={({ pressed }) => [
        {
          height,
          minHeight: 44,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: Spacing.sm,
          paddingHorizontal: Spacing.xxl,
          borderRadius: Radius.button,
          borderCurve: "continuous",
          backgroundColor: inert
            ? colors.surfaceMuted
            : pressed
            ? p.pressedBg
            : p.bg,
          borderWidth: variant === "secondary" && !inert ? 1 : 0,
          borderColor: p.border,
          boxShadow: inert || pressed ? Shadows.none : p.shadow,
          alignSelf: fullWidth ? "stretch" : "flex-start",
          opacity: loading ? 0.92 : 1,
          transform: [{ scale: pressed && !isDisabled ? 0.97 : 1 }],
        },
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={p.fg} />
      ) : (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: Spacing.sm,
          }}
        >
          {icon ? (
            <Icon name={icon} size={size === "lg" ? 20 : 18} raw={fg} />
          ) : null}
          <Text
            variant={size === "lg" ? "bodyStrong" : "label"}
            style={{ color: fg }}
          >
            {title}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
