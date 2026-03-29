import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  RefreshControl,
  Animated,
  PanResponder,
  Dimensions,
  Image,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PawPrint, Plus, ChevronRight, HeartPulse, Stethoscope } from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import { EmptyState } from '../../components/ui/EmptyState';
import { Loading } from '../../components/ui/Loading';
import { usePetStore } from '../../store/petStore';
import { calculateAge } from '../../lib/utils';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 40;
const SWIPE_THRESHOLD = width * 0.22;

export default function PetsScreen() {
  const router = useRouter();
  const { pets, fetchPets, isLoading } = usePetStore();
  const [refreshing, setRefreshing] = React.useState(false);
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const pan = React.useRef(new Animated.ValueXY()).current;

  const topPet = pets.length > 0 ? pets[currentIndex % pets.length] : null;
  const nextPet = pets.length > 1 ? pets[(currentIndex + 1) % pets.length] : null;

  const swipeRightOpacity = pan.x.interpolate({
    inputRange: [0, SWIPE_THRESHOLD * 0.55, SWIPE_THRESHOLD],
    outputRange: [0, 0.6, 1],
    extrapolate: 'clamp',
  });

  const swipeLeftOpacity = pan.x.interpolate({
    inputRange: [-SWIPE_THRESHOLD, -SWIPE_THRESHOLD * 0.55, 0],
    outputRange: [1, 0.6, 0],
    extrapolate: 'clamp',
  });

  const topCardScale = pan.x.interpolate({
    inputRange: [-width, 0, width],
    outputRange: [0.975, 1, 0.975],
    extrapolate: 'clamp',
  });

  const nextCardScale = pan.x.interpolate({
    inputRange: [-SWIPE_THRESHOLD, 0, SWIPE_THRESHOLD],
    outputRange: [0.97, 0.94, 0.97],
    extrapolate: 'clamp',
  });

  const nextCardOpacity = pan.x.interpolate({
    inputRange: [-SWIPE_THRESHOLD, 0, SWIPE_THRESHOLD],
    outputRange: [0.55, 0.4, 0.55],
    extrapolate: 'clamp',
  });

  const resetPosition = React.useCallback(() => {
    Animated.spring(pan, {
      toValue: { x: 0, y: 0 },
      useNativeDriver: false,
      speed: 20,
      bounciness: 8,
    }).start();
  }, [pan]);

  const completeSwipe = React.useCallback(
    (direction: -1 | 1) => {
      Animated.timing(pan, {
        toValue: { x: direction * width * 1.2, y: 20 },
        duration: 180,
        useNativeDriver: false,
      }).start(() => {
        pan.setValue({ x: 0, y: 0 });
        if (pets.length > 0) {
          setCurrentIndex((prev) => (prev + 1) % pets.length);
        }
      });
    },
    [pan, pets.length]
  );

  const panResponder = React.useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dx) > 8 || Math.abs(gesture.dy) > 8,
        onPanResponderMove: (_, gesture) => {
          pan.setValue({ x: gesture.dx, y: gesture.dy * 0.15 });
        },
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dx > SWIPE_THRESHOLD) {
            completeSwipe(1);
            return;
          }
          if (gesture.dx < -SWIPE_THRESHOLD) {
            completeSwipe(-1);
            return;
          }
          resetPosition();
        },
      }),
    [completeSwipe, pan, resetPosition]
  );

  useEffect(() => {
    fetchPets();
  }, [fetchPets]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchPets();
    setRefreshing(false);
  };

  if (isLoading && pets.length === 0) {
    return <Loading fullScreen />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>My Pets</Text>
      </View>

      {pets.length === 0 ? (
        <EmptyState
          iconNode={<PawPrint size={54} color={Colors.textSecondary} />}
          title="No pets yet"
          description="Add your first pet to start tracking their health."
          actionLabel="Add Pet"
          onAction={() => router.push('/pet/add')}
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.deckWrap}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />
          }
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.deckHint}>Swipe left or right to browse your pets</Text>

          <View style={styles.deckArea}>
            {nextPet && (
              <Animated.View
                style={[
                  styles.nextCard,
                  {
                    opacity: nextCardOpacity,
                    transform: [{ scale: nextCardScale }, { translateY: 10 }],
                  },
                ]}
              >
                {nextPet.photoUrl ? (
                  <Image
                    source={{ uri: nextPet.photoUrl }}
                    style={styles.nextCardPhoto}
                  />
                ) : (
                  <View style={styles.nextCardPhotoPlaceholder}>
                    <Text style={styles.nextCardPhotoEmoji}>
                      {nextPet.type === 'dog' ? '🐕' : nextPet.type === 'cat' ? '🐈' : '🐾'}
                    </Text>
                  </View>
                )}
              </Animated.View>
            )}

            {topPet && (
              <Animated.View
                {...panResponder.panHandlers}
                style={[
                  styles.topCard,
                  {
                    transform: [
                      { translateX: pan.x },
                      { translateY: pan.y },
                      { scale: topCardScale },
                      {
                        rotate: pan.x.interpolate({
                          inputRange: [-width, 0, width],
                          outputRange: ['-12deg', '0deg', '12deg'],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <View style={styles.photoLargeWrap}>
                  <Animated.View
                    style={[
                      styles.swipeLabel,
                      styles.swipeLabelLeft,
                      { opacity: swipeLeftOpacity },
                    ]}
                  >
                    <Text style={[styles.swipeLabelText, styles.swipeLabelTextLeft]}>NEXT</Text>
                  </Animated.View>
                  <Animated.View
                    style={[
                      styles.swipeLabel,
                      styles.swipeLabelRight,
                      { opacity: swipeRightOpacity },
                    ]}
                  >
                    <Text style={[styles.swipeLabelText, styles.swipeLabelTextRight]}>LIKE</Text>
                  </Animated.View>
                  {topPet.photoUrl ? (
                    <Image source={{ uri: topPet.photoUrl }} style={styles.photoLarge} />
                  ) : (
                    <View style={styles.photoLargePlaceholder}>
                      <Text style={styles.photoLargeEmoji}>
                        {topPet.type === 'dog' ? '🐕' : topPet.type === 'cat' ? '🐈' : '🐾'}
                      </Text>
                    </View>
                  )}
                  <View style={styles.healthBadge}>
                    <HeartPulse size={14} color={Colors.textInverse} />
                    <Text style={styles.healthBadgeText}>{topPet.healthScore ?? 100}</Text>
                  </View>
                </View>

                <View style={styles.detailsWrap}>
                  <Text style={styles.petName}>{topPet.name}</Text>
                  <Text style={styles.petMeta}>{topPet.breed ?? topPet.type}</Text>
                  <View style={styles.metaRow}>
                    {topPet.birthDate ? <Text style={styles.metaText}>{calculateAge(topPet.birthDate)}</Text> : <Text style={styles.metaText}>Age unknown</Text>}
                    <Text style={styles.metaDot}>•</Text>
                    <Text style={styles.metaText}>{topPet.weight ? `${topPet.weight} kg` : 'No weight'}</Text>
                  </View>
                </View>

                <View style={styles.cardActions}>
                  <Pressable
                    style={({ pressed }) => [styles.secondaryAction, pressed && styles.pressedScale]}
                    onPress={() => router.push(`/pet/${topPet.id}/record/add`)}
                  >
                    <Stethoscope size={16} color={Colors.primary} />
                    <Text style={styles.secondaryActionText}>Add Record</Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [styles.primaryAction, pressed && styles.pressedScale]}
                    onPress={() => router.push(`/pet/${topPet.id}`)}
                  >
                    <Text style={styles.primaryActionText}>View Details</Text>
                    <ChevronRight size={16} color={Colors.textInverse} />
                  </Pressable>
                </View>
              </Animated.View>
            )}
          </View>
        </ScrollView>
      )}

      {/* FAB */}
      <Pressable
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
        onPress={() => router.push('/pet/add')}
      >
        <Plus size={24} color={Colors.textInverse} />
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  deckWrap: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 124,
  },
  deckHint: {
    textAlign: 'center',
    color: Colors.textSecondary,
    fontSize: 13,
    marginBottom: 16,
  },
  deckArea: {
    alignItems: 'center',
    minHeight: 560,
    justifyContent: 'center',
  },
  nextCard: {
    position: 'absolute',
    width: CARD_WIDTH - 20,
    height: 510,
    borderRadius: 26,
    backgroundColor: Colors.surface,
    opacity: 0.4,
    transform: [{ scale: 0.94 }, { translateY: 10 }],
    overflow: 'hidden',
  },
  nextCardPhoto: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  nextCardPhotoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextCardPhotoEmoji: {
    fontSize: 64,
  },
  topCard: {
    width: CARD_WIDTH,
    minHeight: 520,
    borderRadius: 26,
    backgroundColor: Colors.surface,
    overflow: 'hidden',
    shadowColor: Colors.neutral900,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 8,
  },
  photoLargeWrap: {
    width: '100%',
    height: 330,
    backgroundColor: Colors.neutral100,
    position: 'relative',
  },
  swipeLabel: {
    position: 'absolute',
    top: 18,
    zIndex: 3,
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 5,
    backgroundColor: 'rgba(17, 24, 39, 0.28)',
  },
  swipeLabelLeft: {
    left: 16,
    transform: [{ rotate: '-14deg' }],
    borderColor: Colors.error,
  },
  swipeLabelRight: {
    right: 16,
    transform: [{ rotate: '14deg' }],
    borderColor: Colors.success,
  },
  swipeLabelText: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  swipeLabelTextLeft: {
    color: Colors.error,
  },
  swipeLabelTextRight: {
    color: Colors.success,
  },
  photoLarge: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  photoLargePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryBg,
  },
  photoLargeEmoji: {
    fontSize: 72,
  },
  healthBadge: {
    position: 'absolute',
    right: 14,
    top: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  healthBadgeText: {
    color: Colors.textInverse,
    fontSize: 12,
    fontWeight: '800',
  },
  detailsWrap: {
    paddingHorizontal: 16,
    paddingTop: 14,
    gap: 4,
  },
  petName: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  petMeta: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 2,
  },
  metaText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  metaDot: {
    color: Colors.neutral300,
    fontSize: 13,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 16,
  },
  secondaryAction: {
    flex: 1,
    minHeight: 42,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: 12,
    backgroundColor: Colors.primaryBg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  secondaryActionText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  primaryAction: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  primaryActionText: {
    color: Colors.textInverse,
    fontSize: 13,
    fontWeight: '700',
  },
  pressedScale: {
    transform: [{ scale: 0.98 }],
  },
  fab: {
    position: 'absolute',
    bottom: 28,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  fabPressed: {
    transform: [{ scale: 0.95 }],
  },
});
