/**
 * Headless component that wires up push notifications:
 *
 * - registers the device's Expo push token with the API once a volunteer
 *   is signed in (asking for permission on first run), and
 * - opens the screen a notification points at (`data.url`) when tapped,
 *   covering both cold starts and taps while the app is running.
 *
 * Remote push needs a real device and, on Android, a development build —
 * simulators and Expo Go quietly skip registration.
 */

import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { router, type Href } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

import { useAuth } from '@/providers/auth-provider';
import { USE_MOCK } from '@/services/client';
import { registerPushToken } from '@/services/push-service';

// Show pushes as banners while the app is in the foreground.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function obtainPushToken(): Promise<string | null> {
  if (!Device.isDevice) return null;

  if (Platform.OS === 'android') {
    // The channel must exist before the Android 13+ permission prompt.
    await Notifications.setNotificationChannelAsync('default', {
      name: 'General',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  let { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') {
    ({ status } = await Notifications.requestPermissionsAsync());
  }
  if (status !== 'granted') return null;

  const projectId: string | undefined =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) return null;

  const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
  return data;
}

export function PushNotifications() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const lastResponse = Notifications.useLastNotificationResponse();
  const handledResponseId = useRef<string | null>(null);

  useEffect(() => {
    if (!userId || USE_MOCK) return;
    let active = true;
    obtainPushToken()
      .then((token) => {
        if (!active || !token) return;
        return registerPushToken(token, Platform.OS === 'ios' ? 'ios' : 'android');
      })
      .catch(() => {
        // No push support here (simulator, Expo Go on Android) — carry on.
      });
    return () => {
      active = false;
    };
  }, [userId]);

  useEffect(() => {
    if (!lastResponse) return;
    const id = lastResponse.notification.request.identifier;
    if (handledResponseId.current === id) return;
    handledResponseId.current = id;

    const url = lastResponse.notification.request.content.data?.url;
    if (typeof url === 'string' && url.startsWith('/')) {
      router.push(url as Href);
    }
  }, [lastResponse]);

  return null;
}
