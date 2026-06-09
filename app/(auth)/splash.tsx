import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/colors';
import { useAuthStore } from '../../store/authStore';
import { isOnboardingComplete } from '../../lib/storage';
import { PawRokLogo } from '../../components/ui/PawRokLogo';

export default function SplashScreen() {
  const router = useRouter();
  const { isAuthenticated, autoLogin } = useAuthStore();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    // Animate logo in
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    // After 500ms delay, navigate
    const timer = setTimeout(async () => {
      const loggedIn = await autoLogin();
      if (loggedIn) {
        router.replace('/(tabs)');
      } else {
        const onboarded = await isOnboardingComplete();
        if (onboarded) {
          router.replace('/(auth)/login');
        } else {
          router.replace('/(auth)/onboarding');
        }
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [autoLogin, router, isAuthenticated]);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <PawRokLogo size={140} />
        <Text style={styles.appName}>PawRok</Text>
        <Text style={styles.tagline}>Your pet's health companion</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    gap: 12,
  },
  appName: {
    fontSize: 40,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
});
