import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/authStore';
import { Colors } from '../constants/colors';
import { ToastProvider } from '../components/ui';
import { registerForPushNotifications } from '../lib/notifications';
import { ChatFAB } from '../components/chat/ChatFAB';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000,
    },
  },
});

function RootLayoutNav() {
  const { isAuthenticated, autoLogin } = useAuthStore();


  // Initial auto-login attempt on cold start
  useEffect(() => {
    autoLogin();
  }, [autoLogin]);

  // Re-sync push token every time the user becomes authenticated
  // This covers: first login, app reopen, token rotation
  useEffect(() => {
    if (!isAuthenticated) return;

    const register = async () => {
      try {
        await registerForPushNotifications();
      } catch {
        // Non-fatal — token will sync on next app open
      }
    };

    register();
  }, [isAuthenticated]);

  return (
    <View style={styles.rootNav}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="pet" options={{ headerShown: false }} />
        <Stack.Screen name="service" options={{ headerShown: false }} />
        <Stack.Screen name="alert" options={{ headerShown: false }} />
        <Stack.Screen name="event" options={{ headerShown: false }} />
        <Stack.Screen name="notifications" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ headerShown: false }} />
        <Stack.Screen name="chat" options={{ headerShown: false }} />
        <Stack.Screen name="community" options={{ headerShown: false }} />
      </Stack>
      {isAuthenticated && <ChatFAB />}
    </View>
  );
}

function AppChrome() {
  return (
    <View style={styles.container}>
      <RootLayoutNav />
    </View>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <ToastProvider>
          <AppChrome />
        </ToastProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  rootNav: {
    flex: 1,
  },
});
