import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { savePushToken } from './storage';
import { PushNotificationData } from '../types';
import api from './api';

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
    const token = (await Notifications.getExpoPushTokenAsync()).data;

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
    }

    return token;
  } catch (error) {
    console.error('Error registering for push notifications:', error);
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
      return data.id ? `/alert/${data.id}` : '/community';
    case 'reminder':
      return data.id ? `/pet/${data.id}` : '/pets';
    case 'badge':
      return '/profile';
    case 'sighting':
      return data.id ? `/alert/${data.id}` : '/community';
    default:
      return null;
  }
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