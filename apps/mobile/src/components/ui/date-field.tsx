import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { Icon } from './icon';
import { Text } from './text';

export type DateFieldProps = {
  label: string;
  /** ISO `YYYY-MM-DD`, or empty when unset. */
  value: string;
  onChange: (iso: string) => void;
  placeholder?: string;
  minimumDate?: Date;
  maximumDate?: Date;
  error?: string;
  hint?: string;
};

/** ISO `YYYY-MM-DD` → local Date (constructed from parts to avoid a UTC day shift). */
function isoToDate(iso: string): Date | null {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function dateToIso(date: Date): string {
  const y = date.getFullYear();
  const mo = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${mo}-${d}`;
}

export function formatDateNZ(iso: string): string | null {
  const date = isoToDate(iso);
  if (!date) return null;
  return date.toLocaleDateString('en-NZ', { day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * A date input in the TextField's clothes, backed by the native picker
 * (SwiftUI wheels on iOS, the Material date dialog on Android) via
 * `@expo/ui`. Supports an empty "not set" state, which the raw native
 * pickers don't.
 */
export function DateField({
  label,
  value,
  onChange,
  placeholder = 'Select a date',
  minimumDate,
  maximumDate,
  error,
  hint,
}: DateFieldProps) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);

  const isIOS = process.env.EXPO_OS === 'ios';
  const selected = isoToDate(value);
  const display = value ? formatDateNZ(value) : null;
  // What the wheels/dialog start on when nothing is set yet.
  const initial = selected ?? maximumDate ?? new Date();

  const borderColor = error ? colors.destructive : open ? colors.ring : colors.border;

  return (
    <View style={{ gap: 6 }}>
      <Text variant="label">{label}</Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityValue={{ text: display ?? 'No date selected' }}
        onPress={() => setOpen((o) => !o)}
        style={{
          minHeight: 50,
          flexDirection: 'row',
          alignItems: 'center',
          gap: Spacing.sm,
          borderWidth: 1.5,
          borderColor,
          borderRadius: Radius.md,
          borderCurve: 'continuous',
          backgroundColor: colors.surface,
          paddingHorizontal: Spacing.md,
        }}>
        <Text variant="body" color={display ? 'text' : 'textTertiary'} style={{ flex: 1 }}>
          {display ?? placeholder}
        </Text>
        {value ? (
          <Pressable
            onPress={() => {
              onChange('');
              setOpen(false);
            }}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={`Clear ${label}`}>
            <Icon name="close-circle-outline" size={20} color="textSecondary" />
          </Pressable>
        ) : (
          <Icon name="calendar-outline" size={20} color="textSecondary" />
        )}
      </Pressable>

      {open ? (
        isIOS ? (
          // iOS: native wheels expand inline under the field.
          <View
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: Radius.md,
              borderCurve: 'continuous',
              backgroundColor: colors.surface,
              paddingVertical: Spacing.xs,
            }}>
            <DateTimePicker
              mode="date"
              display="spinner"
              value={initial}
              minimumDate={minimumDate}
              maximumDate={maximumDate}
              accentColor={colors.primary}
              locale="en_NZ"
              onValueChange={(_event, date) => onChange(dateToIso(date))}
            />
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                // Confirm whatever the wheels rest on, even if never scrolled.
                if (!value) onChange(dateToIso(initial));
                setOpen(false);
              }}
              hitSlop={8}
              style={({ pressed }) => ({
                alignSelf: 'center',
                paddingVertical: Spacing.sm,
                paddingHorizontal: Spacing.xl,
                opacity: pressed ? 0.55 : 1,
              })}>
              <Text variant="label" color="accent">
                Done
              </Text>
            </Pressable>
          </View>
        ) : (
          // Android: the Material date dialog opens on mount; unmount on close.
          <DateTimePicker
            mode="date"
            value={initial}
            minimumDate={minimumDate}
            maximumDate={maximumDate}
            accentColor={colors.primary}
            onValueChange={(_event, date) => {
              onChange(dateToIso(date));
              setOpen(false);
            }}
            onDismiss={() => setOpen(false)}
          />
        )
      ) : null}

      {error ? (
        <Text variant="caption" color="destructive" role="alert">
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
