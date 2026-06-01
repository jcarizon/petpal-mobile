import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, Animated, PanResponder, TouchableOpacity,
  Image, ScrollView, Dimensions, Modal, FlatList, GestureResponderEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Heart, X, ChevronLeft, ChevronDown, Check, PawPrint } from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import { usePawMatchStore } from '../../store/pawmatchStore';
import { usePetStore } from '../../store/petStore';
import { MatchMode, Pet, PawMatchProfile, SwipeResult } from '../../types';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_W * 0.22;
const CARD_H = SCREEN_H * 0.55;

export default function SwipeScreen() {
  const { mode, petId: paramPetId } = useLocalSearchParams<{ mode: MatchMode; petId?: string }>();
  const router = useRouter();
  const { candidates, fetchCandidates, swipe, profiles } = usePawMatchStore();
  const { pets } = usePetStore();

  // Pets that have an active profile for this mode
  const eligiblePets = pets.filter((pet) =>
    (profiles[pet.id] ?? []).some((p) => p.mode === mode && p.isActive)
  );

  const [activePetId, setActivePetId] = useState<string | null>(
    paramPetId ?? eligiblePets[0]?.id ?? null
  );
  const [pickerVisible, setPickerVisible] = useState(false);
  const [matchResult, setMatchResult] = useState<SwipeResult | null>(null);
  const [showMatch, setShowMatch] = useState(false);

  // When eligible pets load after profiles resolve, set first if none selected
  useEffect(() => {
    if (!activePetId && eligiblePets.length > 0) {
      setActivePetId(eligiblePets[0].id);
    }
  }, [eligiblePets.length]);

  const activePet = pets.find((p) => p.id === activePetId) ?? null;
  const callerProfile = activePetId
    ? (profiles[activePetId] ?? []).find((p) => p.mode === mode && p.isActive) ?? null
    : null;

  // Initialize animation refs and data BEFORE useEffects
  const position = useRef(new Animated.ValueXY()).current;
  const swipeHintOpacity = useRef(new Animated.Value(1)).current;
  const hasInteracted = useRef(false);
  const cardTilt = useRef(new Animated.Value(0)).current;

  const cards = candidates[mode] ?? [];
  const topCard = cards[0];

  const rotation = position.x.interpolate({ inputRange: [-SCREEN_W, SCREEN_W], outputRange: ['-20deg', '20deg'] });
  const likeOpacity = position.x.interpolate({ inputRange: [0, SCREEN_W * 0.25], outputRange: [0, 1], extrapolate: 'clamp' });
  const nopeOpacity = position.x.interpolate({ inputRange: [-SCREEN_W * 0.25, 0], outputRange: [1, 0], extrapolate: 'clamp' });

  useEffect(() => {
    if (activePetId && mode) fetchCandidates(activePetId, mode);
  }, [activePetId, mode]);

  // Swipe hint animation - pulse to indicate user can swipe
  useEffect(() => {
    if (cards.length > 0 && !hasInteracted.current) {
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
  }, [cards.length, swipeHintOpacity]);

  // Tilt animation - show the card can be tilted
  useEffect(() => {
    if (cards.length > 0 && !hasInteracted.current) {
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
  }, [cardTilt, cards.length]);

  const resetPosition = useCallback(() => {
    Animated.spring(position, {
      toValue: { x: 0, y: 0 },
      useNativeDriver: false,
      speed: 20,
      bounciness: 8,
    }).start();
  }, [position]);

  const completeSwipe = useCallback(
    (direction: 'LIKE' | 'PASS') => {
      Animated.timing(position, {
        toValue: { x: direction === 'LIKE' ? SCREEN_W * 1.5 : -SCREEN_W * 1.5, y: 20 },
        duration: 250,
        useNativeDriver: false,
      }).start(async () => {
        position.setValue({ x: 0, y: 0 });
        if (!topCard || !callerProfile) return;
        const result = await swipe(callerProfile.id, topCard.id, mode, direction);
        if (result.matched) {
          setMatchResult(result);
          setShowMatch(true);
        }
      });
    },
    [position, topCard, callerProfile, mode, swipe]
  );

  const handlePanResponderMove = useCallback(
    (_: GestureResponderEvent, gesture: { dx: number; dy: number }) => {
      if (!hasInteracted.current) {
        hasInteracted.current = true;
        Animated.timing(swipeHintOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: false,
        }).start();
      }
      position.setValue({ x: gesture.dx, y: gesture.dy * 0.15 });
    },
    [position, swipeHintOpacity]
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dx) > 8 || Math.abs(gesture.dy) > 8,
        onPanResponderMove: handlePanResponderMove,
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dx > SWIPE_THRESHOLD) {
            completeSwipe('LIKE');
            return;
          }
          if (gesture.dx < -SWIPE_THRESHOLD) {
            completeSwipe('PASS');
            return;
          }
          resetPosition();
        },
      }),
    [handlePanResponderMove, completeSwipe, resetPosition]
  );

  // No active profile for this mode
  if (eligiblePets.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()}>
            <ChevronLeft size={26} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.modeLabel}>{mode}</Text>
          <View style={{ width: 26 }} />
        </View>
        <View style={styles.empty}>
          <PawPrint size={52} color={Colors.neutral300} />
          <Text style={styles.emptyTitle}>No pets set up for {mode}</Text>
          <Text style={styles.emptySub}>
            Go to a pet's profile and enable {mode} under PawMatch to start swiping
          </Text>
          <TouchableOpacity style={styles.goBackBtn} onPress={() => router.back()}>
            <Text style={styles.goBackBtnText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!topCard && cards.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <TopBar
          mode={mode}
          activePet={activePet}
          eligiblePets={eligiblePets}
          onBack={() => router.back()}
          onOpenPicker={() => setPickerVisible(true)}
        />
        <View style={styles.empty}>
          <Heart size={52} color={Colors.neutral300} />
          <Text style={styles.emptyTitle}>No more candidates nearby</Text>
          <Text style={styles.emptySub}>Check back later or expand your search radius in your profile settings</Text>
          <TouchableOpacity style={styles.goBackBtn} onPress={() => fetchCandidates(activePetId!, mode)}>
            <Text style={styles.goBackBtnText}>Refresh</Text>
          </TouchableOpacity>
        </View>
        <PetPicker visible={pickerVisible} pets={eligiblePets} selectedId={activePetId} onSelect={(id) => { setActivePetId(id); setPickerVisible(false); }} onClose={() => setPickerVisible(false)} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <TopBar
        mode={mode}
        activePet={activePet}
        eligiblePets={eligiblePets}
        onBack={() => router.back()}
        onOpenPicker={() => eligiblePets.length > 1 && setPickerVisible(true)}
      />

      <View style={styles.stack}>
        {cards.slice(1, 3).map((card, i) => (
          <View key={card.id} style={[styles.card, { top: 8 + i * 6, transform: [{ scale: 0.95 - i * 0.03 }], zIndex: -i }]}>
            <CardContent profile={card} />
          </View>
        ))}

        {topCard && (
          <Animated.View
            {...panResponder.panHandlers}
            style={[
              styles.card,
              {
                transform: [
                  { translateX: position.x },
                  { translateY: position.y },
                  { rotate: rotation },
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
            <Animated.View style={[styles.overlay, styles.overlayLike, { opacity: likeOpacity }]}>
              <Text style={[styles.overlayText, { color: '#22C55E' }]}>LIKE</Text>
            </Animated.View>
            <Animated.View style={[styles.overlay, styles.overlayNope, { opacity: nopeOpacity }]}>
              <Text style={[styles.overlayText, { color: Colors.error }]}>NOPE</Text>
            </Animated.View>
            <CardContent profile={topCard} />
          </Animated.View>
        )}

        {/* Swipe hint indicator */}
        {cards.length > 0 && (
          <Animated.View style={[styles.swipeHint, { opacity: swipeHintOpacity }]}>
            <Text style={styles.swipeHintText}>Swipe left or right</Text>
          </Animated.View>
        )}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.nopeBtn}
          onPress={() => {
            if (!hasInteracted.current) {
              hasInteracted.current = true;
              Animated.timing(swipeHintOpacity, {
                toValue: 0,
                duration: 300,
                useNativeDriver: false,
              }).start();
            }
            completeSwipe('PASS');
          }}
        >
          <X size={28} color={Colors.error} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.likeBtn}
          onPress={() => {
            if (!hasInteracted.current) {
              hasInteracted.current = true;
              Animated.timing(swipeHintOpacity, {
                toValue: 0,
                duration: 300,
                useNativeDriver: false,
              }).start();
            }
            completeSwipe('LIKE');
          }}
        >
          <Heart size={28} color="#fff" fill="#fff" />
        </TouchableOpacity>
      </View>

      <PetPicker
        visible={pickerVisible}
        pets={eligiblePets}
        selectedId={activePetId}
        onSelect={(id) => { setActivePetId(id); setPickerVisible(false); }}
        onClose={() => setPickerVisible(false)}
      />

      <Modal visible={showMatch} transparent animationType="fade">
        <View style={styles.matchOverlay}>
          <Text style={styles.matchTitle}>It's a Match!</Text>
          <Text style={styles.matchSub}>
            {matchResult?.petAName} and {matchResult?.petBName} connected 🐾
          </Text>
          <View style={styles.matchBtns}>
            <TouchableOpacity
              style={styles.msgBtn}
              onPress={() => { setShowMatch(false); if (matchResult?.matchId) router.push({ pathname: '/pawmatch/[matchId]/chat', params: { matchId: matchResult.matchId } }); }}
            >
              <Text style={styles.msgBtnText}>Send a message</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowMatch(false)}>
              <Text style={styles.keepSwipingText}>Keep swiping</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── TopBar ───────────────────────────────────────────────────────────────────

function TopBar({ mode, activePet, eligiblePets, onBack, onOpenPicker }: {
  mode: MatchMode; activePet: Pet | null; eligiblePets: Pet[];
  onBack: () => void; onOpenPicker: () => void;
}) {
  return (
    <View style={styles.topBar}>
      <TouchableOpacity onPress={onBack}>
        <ChevronLeft size={26} color={Colors.textPrimary} />
      </TouchableOpacity>

      <TouchableOpacity style={styles.petSelector} onPress={onOpenPicker} disabled={eligiblePets.length <= 1}>
        {activePet?.avatarUrl
          ? <Image source={{ uri: activePet.avatarUrl }} style={styles.petSelectorAvatar} />
          : <View style={[styles.petSelectorAvatar, { backgroundColor: Colors.primaryBg, justifyContent: 'center', alignItems: 'center' }]}>
              <PawPrint size={14} color={Colors.primary} />
            </View>
        }
        <Text style={styles.petSelectorName}>{activePet?.name ?? '—'}</Text>
        {eligiblePets.length > 1 && <ChevronDown size={14} color={Colors.textSecondary} />}
      </TouchableOpacity>

      <Text style={styles.modeLabel}>{mode}</Text>
    </View>
  );
}

// ─── PetPicker bottom sheet ───────────────────────────────────────────────────

function PetPicker({ visible, pets, selectedId, onSelect, onClose }: {
  visible: boolean; pets: Pet[]; selectedId: string | null;
  onSelect: (id: string) => void; onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={StyleSheet.absoluteFill}>
        <TouchableOpacity style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.4)' }]} activeOpacity={1} onPress={onClose} />
        <View style={styles.pickerSheet}>
          <View style={styles.pickerHandle} />
          <Text style={styles.pickerTitle}>Swiping as</Text>
          <FlatList
            data={pets}
            keyExtractor={(p) => p.id}
            renderItem={({ item }) => (
              <TouchableOpacity style={[styles.pickerItem, item.id === selectedId && styles.pickerItemSelected]} onPress={() => onSelect(item.id)}>
                {item.avatarUrl
                  ? <Image source={{ uri: item.avatarUrl }} style={styles.pickerAvatar} />
                  : <View style={[styles.pickerAvatar, { backgroundColor: Colors.primaryBg, justifyContent: 'center', alignItems: 'center' }]}>
                      <PawPrint size={18} color={Colors.primary} />
                    </View>
                }
                <View style={{ flex: 1 }}>
                  <Text style={[styles.pickerItemName, item.id === selectedId && { color: Colors.primary }]}>{item.name}</Text>
                  {item.breed && <Text style={styles.pickerItemBreed}>{item.breed}</Text>}
                </View>
                {item.id === selectedId && <Check size={18} color={Colors.primary} />}
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: Colors.border, marginLeft: 68 }} />}
          />
        </View>
      </View>
    </Modal>
  );
}

// ─── Card content ─────────────────────────────────────────────────────────────

function CardContent({ profile }: { profile: PawMatchProfile }) {
  const photo = profile.pet?.avatarUrl ?? (Array.isArray(profile.pet?.photos) ? profile.pet.photos[0]?.url : undefined);
  const name = profile.pet?.name ?? 'Unknown';
  const breed = profile.pet?.breed ?? profile.pet?.species ?? '';
  const city = profile.pet?.owner?.city ?? '';

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 16 }}>
      {photo
        ? <Image source={{ uri: photo }} style={styles.cardPhoto} resizeMode="cover" />
        : <View style={[styles.cardPhoto, { backgroundColor: Colors.primaryBg, justifyContent: 'center', alignItems: 'center' }]}>
            <Heart size={48} color={Colors.primary} />
          </View>
      }
      <View style={styles.cardBody}>
        <Text style={styles.cardName}>{name}</Text>
        <Text style={styles.cardBreed}>{breed}{city ? `  ·  ${city}` : ''}</Text>
        {profile.bio && <Text style={styles.cardBio}>{profile.bio}</Text>}
        <View style={styles.badgesRow}>
          {profile.isVaccinated && <Pill label="Vaccinated" color={Colors.success} />}
          {profile.adoptionFee !== undefined && <Pill label={profile.adoptionFee === 0 ? 'Free' : `₱${profile.adoptionFee}`} color="#7C3AED" />}
          {profile.preferredSize && profile.preferredSize !== 'any' && <Pill label={profile.preferredSize} color={Colors.info} />}
          {profile.energyLevel && profile.energyLevel !== 'any' && <Pill label={profile.energyLevel + ' energy'} color={Colors.warning} />}
        </View>
      </View>
    </ScrollView>
  );
}

function Pill({ label, color }: { label: string; color: string }) {
  return (
    <View style={[styles.pill, { backgroundColor: color + '20' }]}>
      <Text style={[styles.pillText, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  petSelector: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.surface, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6, elevation: 1 },
  petSelectorAvatar: { width: 26, height: 26, borderRadius: 13 },
  petSelectorName: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  modeLabel: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, minWidth: 64, textAlign: 'right' },

  stack: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: {
    position: 'absolute', width: SCREEN_W - 32, height: CARD_H,
    borderRadius: 20, backgroundColor: Colors.surface, overflow: 'hidden',
    elevation: 4, shadowColor: Colors.neutral900, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 12,
  },
  cardPhoto: { width: '100%', height: CARD_H * 0.6 },
  cardBody: { padding: 16 },
  cardName: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary },
  cardBreed: { fontSize: 14, color: Colors.textSecondary, marginTop: 2 },
  cardBio: { fontSize: 13, color: Colors.textSecondary, marginTop: 8, lineHeight: 18 },
  badgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  pillText: { fontSize: 12, fontWeight: '600' },

  overlay: { position: 'absolute', top: 24, zIndex: 10, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8, borderWidth: 3 },
  overlayLike: { left: 16, borderColor: '#22C55E' },
  overlayNope: { right: 16, borderColor: Colors.error },
  overlayText: { fontSize: 20, fontWeight: '900', letterSpacing: 2 },

  swipeHint: { position: 'absolute', bottom: 16, alignSelf: 'center', backgroundColor: Colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  swipeHintText: { fontSize: 12, fontWeight: '600', color: '#fff' },

  actions: { flexDirection: 'row', justifyContent: 'center', gap: 40, paddingBottom: 80, paddingTop: 16 },
  nopeBtn: { width: 60, height: 60, borderRadius: 30, backgroundColor: Colors.surface, justifyContent: 'center', alignItems: 'center', elevation: 3, shadowColor: Colors.neutral900, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6 },
  likeBtn: { width: 68, height: 68, borderRadius: 34, backgroundColor: Colors.error, justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: Colors.error, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8 },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center' },
  emptySub: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  goBackBtn: { marginTop: 8, backgroundColor: Colors.primary, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  goBackBtnText: { color: '#fff', fontWeight: '700' },

  // Pet picker
  pickerSheet: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 12, maxHeight: SCREEN_H * 0.6 },
  pickerHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.neutral300, alignSelf: 'center', marginBottom: 12 },
  pickerTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, paddingHorizontal: 20, marginBottom: 8 },
  pickerItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, gap: 14 },
  pickerItemSelected: { backgroundColor: Colors.primaryBg },
  pickerAvatar: { width: 44, height: 44, borderRadius: 22 },
  pickerItemName: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  pickerItemBreed: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },

  // Match overlay
  matchOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.88)', justifyContent: 'center', alignItems: 'center', padding: 32 },
  matchTitle: { fontSize: 30, fontWeight: '900', color: '#fff', textAlign: 'center', marginBottom: 8 },
  matchSub: { fontSize: 16, color: 'rgba(255,255,255,0.85)', textAlign: 'center', marginBottom: 32 },
  matchBtns: { gap: 16, alignItems: 'center' },
  msgBtn: { backgroundColor: Colors.primary, borderRadius: 14, paddingHorizontal: 32, paddingVertical: 14 },
  msgBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  keepSwipingText: { color: 'rgba(255,255,255,0.7)', fontSize: 15, fontWeight: '600' },
});
