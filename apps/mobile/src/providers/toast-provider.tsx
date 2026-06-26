import * as Haptics from 'expo-haptics';
import { createContext, type ReactNode, use, useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Layout, Radius, Shadows, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ToastTone = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}

interface ToastApi {
  show: (message: string, tone?: ToastTone) => void;
  success: (message: string) => void;
  error: (message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastItem | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((message: string, tone: ToastTone = 'info') => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ id: Date.now(), message, tone });
    if (process.env.EXPO_OS === 'ios') {
      Haptics.notificationAsync(
        tone === 'error'
          ? Haptics.NotificationFeedbackType.Error
          : Haptics.NotificationFeedbackType.Success,
      ).catch(() => {});
    }
    timer.current = setTimeout(() => setToast(null), 3200);
  }, []);

  const api = useMemo<ToastApi>(
    () => ({ show, success: (m) => show(m, 'success'), error: (m) => show(m, 'error') }),
    [show],
  );

  return (
    <ToastContext value={api}>
      {children}
      {toast ? <ToastView item={toast} onDismiss={() => setToast(null)} /> : null}
    </ToastContext>
  );
}

function ToastView({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const accent =
    item.tone === 'error' ? colors.destructive : item.tone === 'success' ? colors.success : colors.navy;
  const iconName = item.tone === 'error' ? 'alert-circle' : item.tone === 'success' ? 'checkmark-circle' : 'information-circle';

  return (
    <View
      pointerEvents="box-none"
      style={{ position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center', paddingTop: insets.top + Spacing.sm, paddingHorizontal: Layout.screenPadding }}>
      <Animated.View entering={FadeInUp.duration(220)} exiting={FadeOutUp.duration(160)} style={{ width: '100%', maxWidth: Layout.maxContentWidth }}>
        <Pressable
          accessibilityRole="alert"
          onPress={onDismiss}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: Spacing.sm,
            backgroundColor: colors.surface,
            borderRadius: Radius.lg,
            borderCurve: 'continuous',
            borderWidth: 1,
            borderColor: colors.border,
            borderLeftWidth: 4,
            borderLeftColor: accent,
            paddingVertical: Spacing.md,
            paddingHorizontal: Spacing.lg,
            boxShadow: Shadows.lg,
          }}>
          <Icon name={iconName} size={22} raw={accent} />
          <Text variant="callout" style={{ flex: 1 }}>
            {item.message}
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

export function useToast(): ToastApi {
  const ctx = use(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}
