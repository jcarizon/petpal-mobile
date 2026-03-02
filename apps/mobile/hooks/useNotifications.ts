import { useEffect, useRef, useState } from 'react';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import {
  registerForPushNotifications,
  addNotificationReceivedListener,
  addNotificationResponseReceivedListener,
  getDeepLinkFromNotification,
} from '../lib/notifications';
import { PushNotificationData } from '../types';

export function useNotifications() {
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();
  const router = useRouter();

  useEffect(() => {
    registerForPushNotifications().then((token) => {
      if (token) setPushToken(token);
    });

    notificationListener.current = addNotificationReceivedListener((notif) => {
      setNotification(notif);
    });

    responseListener.current = addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as PushNotificationData;
      const deepLink = getDeepLinkFromNotification(data);
      if (deepLink) {
        router.push(deepLink as Parameters<typeof router.push>[0]);
      }
    });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [router]);

  return {
    pushToken,
    notification,
  };
}
