import { useState } from 'react';
import { Pressable, TextInput, type TextInputProps, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Radius, Spacing, Typography } from '@/constants/theme';

/** Light-on-glass palette — fixed for the always-dark auth backdrop. */
const GLASS = {
  label: 'rgba(255,255,255,0.92)',
  text: '#ffffff',
  placeholder: 'rgba(255,255,255,0.5)',
  fill: 'rgba(255,255,255,0.1)',
  fillFocused: 'rgba(255,255,255,0.16)',
  border: 'rgba(255,255,255,0.22)',
  borderFocused: 'rgba(255,255,255,0.6)',
  icon: 'rgba(255,255,255,0.7)',
} as const;

export type AuthGlassFieldProps = TextInputProps & {
  label: string;
  /** Render as a password field with a show/hide toggle. */
  secure?: boolean;
};

/**
 * Text field tuned to sit inside the liquid-glass auth card: translucent fill,
 * hairline white rim and light text, so it reads on the dark video backdrop
 * regardless of the app's light/dark theme.
 */
export function AuthGlassField({ label, secure, style, onFocus, onBlur, ...rest }: AuthGlassFieldProps) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(Boolean(secure));

  return (
    <View style={{ gap: 6 }}>
      <Text variant="label" style={{ color: GLASS.label }}>
        {label}
      </Text>
      <View style={{ justifyContent: 'center' }}>
        <TextInput
          style={[
            {
              minHeight: 50,
              borderWidth: 1,
              borderColor: focused ? GLASS.borderFocused : GLASS.border,
              borderRadius: Radius.md,
              borderCurve: 'continuous',
              backgroundColor: focused ? GLASS.fillFocused : GLASS.fill,
              paddingHorizontal: Spacing.md,
              paddingRight: secure ? 46 : Spacing.md,
              color: GLASS.text,
              fontSize: Typography.body.fontSize,
            },
            style,
          ]}
          placeholderTextColor={GLASS.placeholder}
          secureTextEntry={hidden}
          selectionColor="#ffffff"
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...rest}
        />
        {secure ? (
          <Pressable
            onPress={() => setHidden((h) => !h)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
            style={{ position: 'absolute', right: 12 }}>
            <Icon name={hidden ? 'eye-outline' : 'eye-off-outline'} size={20} raw={GLASS.icon} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
