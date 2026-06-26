import { useState } from 'react';
import { Pressable, TextInput, type TextInputProps, View } from 'react-native';

import { Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { Icon } from './icon';
import { Text } from './text';

export type TextFieldProps = TextInputProps & {
  label: string;
  error?: string;
  hint?: string;
  /** Render as a password field with a show/hide toggle */
  secure?: boolean;
};

export function TextField({ label, error, hint, secure, style, onFocus, onBlur, multiline, ...rest }: TextFieldProps) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(Boolean(secure));

  const borderColor = error ? colors.destructive : focused ? colors.ring : colors.border;

  return (
    <View style={{ gap: 6 }}>
      <Text variant="label">{label}</Text>
      <View style={{ justifyContent: 'center' }}>
        <TextInput
          style={[
            {
              minHeight: multiline ? 104 : 50,
              borderWidth: 1.5,
              borderColor,
              borderRadius: Radius.md,
              borderCurve: 'continuous',
              backgroundColor: colors.surface,
              paddingHorizontal: Spacing.md,
              paddingTop: multiline ? Spacing.md : 0,
              paddingRight: secure ? 46 : Spacing.md,
              color: colors.text,
              fontSize: Typography.body.fontSize,
              textAlignVertical: multiline ? 'top' : 'center',
            },
            style,
          ]}
          placeholderTextColor={colors.textTertiary}
          secureTextEntry={hidden}
          multiline={multiline}
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
            <Icon name={hidden ? 'eye-outline' : 'eye-off-outline'} size={20} color="textSecondary" />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text variant="caption" color="destructive">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption" color="textTertiary">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}
