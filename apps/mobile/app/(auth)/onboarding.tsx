import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/colors';
import { Button } from '../../components/ui/Button';
import { setOnboardingComplete } from '../../lib/storage';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    key: 'health',
    emoji: '🏥',
    title: 'Track Your Pet\'s Health',
    description:
      'Monitor vaccinations, vet visits, and health records all in one place. Get smart suggestions based on your pet\'s breed and age.',
    bgColor: Colors.primaryBg,
    textColor: Colors.primary,
  },
  {
    key: 'services',
    emoji: '📍',
    title: 'Find Nearby Services',
    description:
      'Discover trusted vets, groomers, pet shops, and parks near you. Read real reviews and get directions instantly.',
    bgColor: Colors.secondaryBg,
    textColor: Colors.secondary,
  },
  {
    key: 'community',
    emoji: '🤝',
    title: 'Community Alerts',
    description:
      'Help reunite lost pets with their families. Post sightings, share alerts, and build a caring pet community.',
    bgColor: '#EFF6FF',
    textColor: Colors.info,
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
      setCurrentIndex((prev) => prev + 1);
    } else {
      handleGetStarted();
    }
  };

  const handleGetStarted = async () => {
    await setOnboardingComplete();
    router.replace('/(auth)/login');
  };

  const handleSkip = async () => {
    await setOnboardingComplete();
    router.replace('/(auth)/login');
  };

  return (
    <View style={styles.container}>
      {/* Skip button */}
      <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.key}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / width);
          setCurrentIndex(index);
        }}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            <View style={[styles.emojiContainer, { backgroundColor: item.bgColor }]}>
              <Text style={styles.emoji}>{item.emoji}</Text>
            </View>
            <Text style={[styles.title, { color: item.textColor }]}>{item.title}</Text>
            <Text style={styles.description}>{item.description}</Text>
          </View>
        )}
      />

      {/* Dots indicator */}
      <View style={styles.dotsContainer}>
        {SLIDES.map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              index === currentIndex && styles.activeDot,
            ]}
          />
        ))}
      </View>

      {/* Action button */}
      <View style={styles.buttonContainer}>
        {currentIndex < SLIDES.length - 1 ? (
          <Button title="Next" variant="primary" onPress={handleNext} fullWidth size="lg" />
        ) : (
          <Button
            title="Get Started"
            variant="primary"
            onPress={handleGetStarted}
            fullWidth
            size="lg"
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  skipButton: {
    position: 'absolute',
    top: 56,
    right: 24,
    zIndex: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  skipText: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: 80,
    gap: 20,
  },
  emojiContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emoji: {
    fontSize: 64,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 34,
  },
  description: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    paddingVertical: 24,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.neutral300,
  },
  activeDot: {
    width: 24,
    backgroundColor: Colors.primary,
  },
  buttonContainer: {
    paddingHorizontal: 24,
    paddingBottom: 48,
  },
});
