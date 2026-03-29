import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/colors';
import { useAuthStore } from '../../store/authStore';
import { isOnboardingComplete } from '../../lib/storage';

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
        <Text style={styles.logo}>🐾</Text>
        <Text style={styles.appName}>PetPal</Text>
        <Text style={styles.tagline}>Your pet's health companion</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    gap: 8,
  },
  logo: {
    fontSize: 80,
    marginBottom: 8,
  },
  appName: {
    fontSize: 40,
    fontWeight: '800',
    color: Colors.textInverse,
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
  },
});
