import {
  HankenGrotesk_400Regular,
  HankenGrotesk_500Medium,
  HankenGrotesk_600SemiBold,
  HankenGrotesk_700Bold,
  useFonts,
} from '@expo-google-fonts/hanken-grotesk';
import {
  Newsreader_400Regular,
  Newsreader_400Regular_Italic,
  Newsreader_500Medium,
  Newsreader_600SemiBold,
} from '@expo-google-fonts/newsreader';
import { QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { type ReactNode, useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Colors, type ThemeName } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { queryClient } from '@/lib/query-client';
import { AuthProvider, useAuth } from '@/providers/auth-provider';
import { ToastProvider } from '@/providers/toast-provider';

SplashScreen.preventAutoHideAsync();

function buildNavTheme(scheme: ThemeName) {
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const c = Colors[scheme];
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: c.primary,
      background: c.background,
      card: c.surface,
      text: c.text,
      border: c.border,
      notification: c.primary,
    },
  };
}

function RootNavigator() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTitleStyle: { color: colors.text },
        headerTintColor: colors.primary,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
      }}>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="shift/[id]"
        options={{
          headerShown: false,
          presentation: 'formSheet',
          sheetGrabberVisible: true,
          sheetCornerRadius: 28,
          sheetAllowedDetents: 'fitToContents',
        }}
      />
      <Stack.Screen name="schedule" options={{ title: 'My schedule' }} />
      <Stack.Screen name="onboarding" options={{ title: 'Welcome' }} />
      <Stack.Screen name="profile/edit" options={{ title: 'Edit profile', presentation: 'modal' }} />
    </Stack>
  );
}

function ThemedRoot({ children }: { children: ReactNode }) {
  const { scheme, isDark } = useTheme();
  return (
    <ThemeProvider value={buildNavTheme(scheme)}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {children}
    </ThemeProvider>
  );
}

/** Holds the native splash until both fonts and the restored session are ready. */
function SplashGate({ fontsReady, children }: { fontsReady: boolean; children: ReactNode }) {
  const { initializing } = useAuth();
  const ready = fontsReady && !initializing;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;
  return <>{children}</>;
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    // Serif — Newsreader (editorial titles, headings & figures)
    Newsreader_400Regular,
    Newsreader_400Regular_Italic,
    Newsreader_500Medium,
    Newsreader_600SemiBold,
    // Text / UI — Hanken Grotesk
    HankenGrotesk_400Regular,
    HankenGrotesk_500Medium,
    HankenGrotesk_600SemiBold,
    HankenGrotesk_700Bold,
  });
  // Render once fonts load, or fall back to system fonts if they fail.
  const fontsReady = loaded || Boolean(error);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <ThemedRoot>
              <ToastProvider>
                <SplashGate fontsReady={fontsReady}>
                  <RootNavigator />
                </SplashGate>
              </ToastProvider>
            </ThemedRoot>
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
