import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { savePushToken } from './storage';
import { PushNotificationData } from '../types';
import api from './api';
import Constants from 'expo-constants';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Syncs the token to the backend — call this after login and on app open
export async function syncPushTokenToBackend(token: string): Promise<void> {
  try {
    await api.put('/auth/profile', { expoPushToken: token });
  } catch (error) {
    // Non-fatal — token will sync on next open
    console.warn('Failed to sync push token to backend:', error);
  }
}

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.warn('Push notifications require a physical device');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('Permission not granted for push notifications');
    return null;
  }

  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    if (!projectId) {
      console.warn('Push notifications: no EAS projectId configured — skipping token registration.');
      return null;
    }

    // Wrap in a 10-second timeout so a slow/unavailable Expo service never blocks the app
    const tokenResult = await Promise.race([
      Notifications.getExpoPushTokenAsync({ projectId }),
      new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error('Push token request timed out')), 10_000)
      ),
    ]);

    if (!tokenResult) return null;
    const token = (tokenResult as Awaited<ReturnType<typeof Notifications.getExpoPushTokenAsync>>).data;

    // Save locally
    await savePushToken(token);

    // Sync to backend immediately
    await syncPushTokenToBackend(token);

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#10B981',
      });

      await Notifications.setNotificationChannelAsync('alerts', {
        name: 'Lost & Found Alerts',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#EF4444',
      });

      await Notifications.setNotificationChannelAsync('reminders', {
        name: 'Pet Reminders',
        importance: Notifications.AndroidImportance.DEFAULT,
        lightColor: '#10B981',
      });

      await Notifications.setNotificationChannelAsync('adoption', {
        name: 'Adoption Alerts',
        importance: Notifications.AndroidImportance.DEFAULT,
        lightColor: '#8B5CF6',
      });

      await Notifications.setNotificationChannelAsync('playmate', {
        name: 'Playmate Requests',
        importance: Notifications.AndroidImportance.DEFAULT,
        lightColor: '#F59E0B',
      });
    }

    return token;
  } catch (error) {
    // Non-fatal: Expo push service may be temporarily unavailable (503),
    // the device may be offline, or the app may be running in Expo Go
    // without a production build. The token will sync on the next app open.
    console.warn('Push notifications: token registration skipped —', (error as Error).message ?? error);
    return null;
  }
}

export function addNotificationReceivedListener(
  handler: (notification: Notifications.Notification) => void
): Notifications.Subscription {
  return Notifications.addNotificationReceivedListener(handler);
}

export function addNotificationResponseReceivedListener(
  handler: (response: Notifications.NotificationResponse) => void
): Notifications.Subscription {
  return Notifications.addNotificationResponseReceivedListener(handler);
}

export function getDeepLinkFromNotification(
  data: PushNotificationData
): string | null {
  switch (data.type) {
    case 'alert':
      return data.id ? `/alert/${data.id}` : '/';
    case 'reminder':
      return data.id ? `/pet/${data.id}` : '/pets';
    case 'badge':
      return '/profile';
    case 'sighting':
      return data.id ? `/alert/${data.id}` : '/';
    case 'interest':
      return data.id ? `/alert/${data.id}` : '/';
    case 'level_up':
    case 'badge':
      return '/(tabs)/me';
    case 'review':
    case 'service_verified':
      return data.id ? `/service/${data.id}` : '/(tabs)/services';
    case 'role_change':
    case 'welcome':
      return '/(tabs)/me';
    case 'chat_request':
    case 'chat_message':
    case 'chat_accepted':
      return data.conversationId ? `/chat/${data.conversationId}` : '/chat';
    default:
      return null;
  }
}

export function inferNotificationType(
  title: string,
  body: string
): PushNotificationData['type'] | undefined {
  const text = `${title} ${body}`.toLowerCase();
  // Chat — check before generic patterns to avoid false matches
  if (text.includes('chat request') || title.includes('💬 New'))   return 'chat_request';
  if (text.includes('chat accepted') || title.includes('✅ Chat'))  return 'chat_accepted';
  if (title.startsWith('💬'))                                        return 'chat_message';
  if (text.includes('⏰') || text.includes('reminder'))             return 'reminder';
  if (text.includes('sighting'))                                     return 'sighting';
  if (text.includes('lost') || text.includes('found') || text.includes('alert')) return 'alert';
  if (text.includes('badge') || text.includes('🏆'))                return 'badge';
  if (text.includes('interest') || text.includes('❤'))              return 'interest';
  if (text.includes('level'))                                        return 'level_up';
  if (text.includes('review'))                                       return 'review';
  if (text.includes('verified'))                                     return 'service_verified';
  if (text.includes('welcome'))                                      return 'welcome';
  if (text.includes('role'))                                         return 'role_change';
  return undefined;
}

export async function scheduleLocalNotification(
  title: string,
  body: string,
  trigger: Notifications.NotificationTriggerInput,
  data?: Record<string, unknown>
): Promise<string> {
  return Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: data ?? {},
      sound: true,
    },
    trigger,
  });
}

export async function cancelScheduledNotification(identifier: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(identifier);
}

export async function cancelAllScheduledNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}