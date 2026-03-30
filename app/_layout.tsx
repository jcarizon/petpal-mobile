import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/authStore';
import { Colors } from '../constants/colors';
import { ToastProvider } from '../components/ui';
import { registerForPushNotifications } from '../lib/notifications';

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
    if (isAuthenticated) {
      registerForPushNotifications().catch((err) => {
        console.warn('Push registration failed silently:', err);
      });
      registerForPushNotifications().then((token) => {
        console.log('Push token:', token);
      });
    }
  }, [isAuthenticated]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="pet" options={{ headerShown: false }} />
      <Stack.Screen name="service" options={{ headerShown: false }} />
      <Stack.Screen name="alert" options={{ headerShown: false }} />
      <Stack.Screen name="event" options={{ headerShown: false }} />
    </Stack>
  );
}

function AppChrome() {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <View style={[styles.topHeader, { height: insets.top }]} />
      <View style={styles.content}>
        <RootLayoutNav />
      </View>
    </View>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <StatusBar style="light" backgroundColor={Colors.primary} translucent={false} />
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
  topHeader: {
    backgroundColor: Colors.primary,
  },
  content: {
    flex: 1,
  },
});