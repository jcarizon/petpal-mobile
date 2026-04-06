import React, { useEffect, useRef } from 'react';
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
  GestureResponderEvent,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PawPrint, Plus, ChevronRight, ChevronLeft, HeartPulse, Stethoscope, CalendarDays, Scale, LayoutGrid, List } from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageBanner, Badge } from '../../components/ui';
import { Loading } from '../../components/ui/Loading';
import { usePetStore } from '../../store/petStore';
import { calculateAge } from '../../lib/utils';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 40;
const SWIPE_THRESHOLD = width * 0.22;

export default function PetsScreen() {
  const router = useRouter();
  const { pets, fetchPets, healthScores, fetchHealthRecords, isLoading } = usePetStore();
  const [refreshing, setRefreshing] = React.useState(false);
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [viewMode, setViewMode] = React.useState<'cards' | 'list'>('cards');
  const pan = React.useRef(new Animated.ValueXY()).current;
  
  const swipeHintOpacity = useRef(new Animated.Value(1)).current;
  const hasInteracted = useRef(false);
  const cardTilt = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    pets.forEach(pet => {
      const existingScore = healthScores[pet.id];
      if (!existingScore || existingScore.score === null) {
        fetchHealthRecords(pet.id);
      }
    });
  }, [pets, healthScores, fetchHealthRecords]);

  const topPet = pets.length > 0 ? pets[currentIndex % pets.length] : null;
  const nextPet = pets.length > 1 ? pets[(currentIndex + 1) % pets.length] : null;
  
  const topPetScore = topPet && healthScores[topPet.id] ? healthScores[topPet.id].score : null;

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

  const isFirstLoad = useRef(true);
  useEffect(() => {
    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      fetchPets();
    }
  }, []);

  useEffect(() => {
    if (pets.length > 1 && !hasInteracted.current) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(swipeHintOpacity, {
            toValue: 0.3,
            duration: 800,
            useNativeDriver: false,
          }),
          Animated.timing(swipeHintOpacity, {
            toValue: 1,
            duration: 800,
            useNativeDriver: false,
          }),
        ])
      );
      animation.start();
      
      const hideTimer = setTimeout(() => {
        Animated.timing(swipeHintOpacity, {
          toValue: 0,
          duration: 500,
          useNativeDriver: false,
        }).start();
        animation.stop();
      }, 4000);
      
      return () => {
        animation.stop();
        clearTimeout(hideTimer);
      };
    }
  }, []);

  useEffect(() => {
    if (pets.length > 1 && !hasInteracted.current) {
      const tiltAnimation = Animated.sequence([
        Animated.timing(cardTilt, {
          toValue: 1,
          duration: 600,
          useNativeDriver: false,
        }),
        Animated.timing(cardTilt, {
          toValue: -1,
          duration: 600,
          useNativeDriver: false,
        }),
        Animated.timing(cardTilt, {
          toValue: 0,
          duration: 600,
          useNativeDriver: false,
        }),
      ]);
      
      const timer = setTimeout(() => {
        tiltAnimation.start();
        hasInteracted.current = true;
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, []);

  const handlePanResponderMove = (_: GestureResponderEvent, gesture: { dx: number; dy: number }) => {
    if (!hasInteracted.current) {
      hasInteracted.current = true;
      Animated.timing(swipeHintOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
    pan.setValue({ x: gesture.dx, y: gesture.dy * 0.15 });
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchPets();
    // Also refresh health scores
    const promises = pets.map(pet => fetchHealthRecords(pet.id));
    await Promise.all(promises);
    setRefreshing(false);
  };

  if (isLoading && pets.length === 0) {
    return <Loading fullScreen />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <PageBanner
        title="My Pets"
        subtitle="Swipe through your crew or add a new companion."
        helper={viewMode === 'cards' ? "Swipe left or right to browse your pets." : `${pets.length} pet${pets.length !== 1 ? 's' : ''}`}
        iconNode={<PawPrint size={16} color={Colors.textInverse} />}
        rightNode={
          <View style={styles.headerActions}>
            {pets.length > 1 && (
              <TouchableOpacity
                style={styles.viewToggleButton}
                onPress={() => setViewMode(viewMode === 'cards' ? 'list' : 'cards')}
              >
                {viewMode === 'cards' ? (
                  <List size={18} color={Colors.primary} />
                ) : (
                  <LayoutGrid size={18} color={Colors.primary} />
                )}
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => router.push('/pet/add')}
            >
              <Plus size={20} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        }
/>

      {pets.length === 0 ? (
        <EmptyState
          iconNode={<PawPrint size={54} color={Colors.textSecondary} />}
          title="No pets yet"
          description="Add your first pet to start tracking their health."
          actionLabel="Add Pet"
          onAction={() => router.push('/pet/add')}
        />
      ) : viewMode === 'cards' ? (
        <ScrollView
              contentContainerStyle={styles.deckWrap}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />
              }
              showsVerticalScrollIndicator={false}
              contentInsetAdjustmentBehavior="never"
            >

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
                      {
                        rotate: cardTilt.interpolate({
                          inputRange: [-1, 0, 1],
                          outputRange: ['-5deg', '0deg', '5deg'],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <View style={styles.photoLargeWrap}>
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
                    <Text style={styles.healthBadgeText}>{topPetScore ?? '--'}</Text>
                  </View>
                </View>

                <View style={styles.detailsWrap}>
                  <View style={styles.nameRow}>
                    <Text style={styles.petName}>{topPet.name}</Text>
                    {topPet.activeLostFoundAlert && topPet.activeLostFoundAlert.type === 'lost' && (
                      <Badge
                        label="LOST"
                        backgroundColor={Colors.error}
                        color={Colors.surface}
                        size="sm"
                      />
                    )}
                  </View>
                  <Text style={styles.petMeta}>{topPet.breed ?? topPet.type}</Text>
                  <View style={styles.statsRow}>
                    <View style={styles.statCard}>
                      <View style={[styles.statIconBox, { backgroundColor: '#FEF3C7' }]}>
                        <CalendarDays size={14} color={Colors.secondary} />
                      </View>
                      <Text style={styles.statCardLabel}>Age</Text>
                      <Text style={styles.statCardValue}>
                        {topPet.birthDate ? calculateAge(topPet.birthDate) : 'Unknown'}
                      </Text>
                    </View>
                    <View style={styles.statCard}>
                      <View style={[styles.statIconBox, { backgroundColor: '#E0F2FE' }]}>
                        <Scale size={14} color={Colors.info} />
                      </View>
                      <Text style={styles.statCardLabel}>Weight</Text>
                      <Text style={styles.statCardValue}>
                        {topPet.weight ? `${topPet.weight} kg` : 'Not logged'}
                      </Text>
                    </View>
                    <View style={styles.statCard}>
                      <View style={[styles.statIconBox, { backgroundColor: '#FCE7F3' }]}>
                        <PawPrint size={14} color="#EC4899" />
                      </View>
                      <Text style={styles.statCardLabel}>Type</Text>
                      <Text style={styles.statCardValue}>
                        {topPet.type ? (topPet.type === 'dog' ? 'Dog' : topPet.type === 'cat' ? 'Cat' : topPet.type) : 'Unknown'}
                      </Text>
                    </View>
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
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.gridContainer}
        >
          <View style={styles.grid}>
            {pets.map((pet) => (
              <Pressable
                key={pet.id}
                style={({ pressed }) => [styles.gridItem, pressed && styles.gridItemPressed]}
                onPress={() => router.push(`/pet/${pet.id}`)}
              >
                <View style={styles.gridImageContainer}>
                  {pet.photoUrl ? (
                    <Image source={{ uri: pet.photoUrl }} style={styles.gridImage} />
                  ) : (
                    <View style={styles.gridPlaceholder}>
                      <Text style={styles.gridEmoji}>
                        {pet.type === 'dog' ? '🐕' : pet.type === 'cat' ? '🐈' : '🐾'}
                      </Text>
                    </View>
                  )}
                  {pet.activeLostFoundAlert && pet.activeLostFoundAlert.type === 'lost' && (
                    <View style={styles.gridLostBadge}>
                      <Text style={styles.gridLostBadgeText}>LOST</Text>
                    </View>
                  )}
                  {healthScores[pet.id] && (
                    <View style={styles.gridHealthBadge}>
                      <Text style={styles.gridHealthText}>{healthScores[pet.id].score}</Text>
                    </View>
                  )}
                </View>
                <View style={styles.gridInfo}>
                  <Text style={styles.gridName} numberOfLines={1}>{pet.name}</Text>
                  <Text style={styles.gridMeta} numberOfLines={1}>
                    {pet.breed ?? (pet.type === 'dog' ? 'Dog' : pet.type === 'cat' ? 'Cat' : 'Pet')}
                    {pet.birthDate ? ` · ${calculateAge(pet.birthDate)}` : ''}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      )}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  viewToggleButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.textInverse,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.textInverse,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deckWrap: {
    paddingHorizontal: 20,
    paddingTop: 6,
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
  },
  nextCardPhotoPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.neutral100,
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
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  photoLargeWrap: {
    width: '100%',
    height: 300,
    backgroundColor: Colors.neutral100,
    position: 'relative',
  },
  bannerAction: {
    marginTop: 16,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  bannerActionText: {
    color: Colors.textInverse,
    fontWeight: '700',
    fontSize: 13,
  },
  bannerActionPressed: {
    opacity: 0.8,
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
    fontSize: 80,
  },
  healthBadge: {
    position: 'absolute',
    right: 14,
    top: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  healthBadgeText: {
    color: Colors.textInverse,
    fontSize: 13,
    fontWeight: '800',
  },
  detailsWrap: {
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 6,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  petName: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.textPrimary,
    flex: 1,
  },
  petMeta: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  metaText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  metaDot: {
    color: Colors.neutral300,
    fontSize: 13,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.neutral50,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    gap: 6,
  },
  statIconBox: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statCardLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  statCardValue: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
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
  listWrap: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 124,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    gap: 12,
  },
  listItemPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  listItemImage: {
    width: 56,
    height: 56,
    borderRadius: 12,
  },
  listItemPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: Colors.neutral100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listItemEmoji: {
    fontSize: 24,
  },
  listItemContent: {
    flex: 1,
  },
  listItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  listItemName: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  listItemBreed: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  listItemStats: {
    marginTop: 4,
  },
  listItemStat: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  gridContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 124,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridItem: {
    width: (width - 52) / 2,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: Colors.neutral900,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  gridItemPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },
  gridImageContainer: {
    width: '100%',
    height: 130,
    position: 'relative',
  },
  gridImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  gridPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.neutral100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridEmoji: {
    fontSize: 36,
  },
  gridLostBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: Colors.error,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  gridLostBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.surface,
  },
  gridInfo: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 2,
  },
  gridName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  gridMeta: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  gridHealthBadge: {
    position: 'absolute',
    top: 116,
    left: 8,
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    zIndex: 10,
  },
  gridHealthText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textInverse,
  },
});
