import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { PawPrint, Plus } from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import { usePawMatchStore } from '../../store/pawmatchStore';
import { usePetStore } from '../../store/petStore';
import api from '../../lib/api';

const RING_SIZE = 64;

type StoryItem =
  | { type: 'own' }
  | { type: 'match'; petId: string; pet: { name: string; avatarUrl?: string | null; photos?: { url: string }[] } };

export function MatchStories() {
  const router = useRouter();
  const { matches, fetchMatches } = usePawMatchStore();
  const { pets, fetchPets } = usePetStore();

  // Ensure own data is loaded regardless of which tab is active
  useEffect(() => {
    fetchPets();
  }, []);

  useEffect(() => {
    if (pets.length > 0) {
      pets.forEach((pet) => fetchMatches(pet.id));
    }
  }, [pets.length]);

  // null = still loading (don't flash the row away while the request is in flight)
  const [activePetIds, setActivePetIds] = useState<Set<string> | null>(null);

  const myPetIds = new Set(pets.map((p) => p.id));

  // Build matched-pet candidates — one circle per unique other-side pet
  const seen = new Set<string>();
  const allMatchedPets: Array<{ type: 'match'; petId: string; pet: { name: string; avatarUrl?: string | null; photos?: { url: string }[] } }> =
    matches
      .filter((m) => m.isActive)
      .flatMap((m) => {
        const other = myPetIds.has(m.profileA.petId) ? m.profileB : m.profileA;
        if (!other?.pet || seen.has(other.petId)) return [];
        seen.add(other.petId);
        return [{ type: 'match' as const, petId: other.petId, pet: other.pet }];
      });

  // Query story-ring for ALL petIds (own + matched) in one call.
  // This avoids depending on petStore.diaries which may not be loaded outside pet detail.
  useEffect(() => {
    if (pets.length === 0) {
      // No pets yet, but still ready to show the add pet circle
      setActivePetIds(new Set());
      return;
    }

    const ownIds = pets.map((p) => p.id);
    const matchedIds = allMatchedPets.map((m) => m.petId);
    const allIds = [...new Set([...ownIds, ...matchedIds])];

    api.get(`/pets/diary/story-ring?petIds=${allIds.join(',')}`)
      .then((res) => setActivePetIds(new Set(res.data?.data ?? [])))
      .catch(() => setActivePetIds(new Set()));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pets.length, matches.length]);

  if (activePetIds === null) return null; // loading — suppress row until we know

  // Show "Add first pet" paw if no pets yet
  if (pets.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.list}>
          <TouchableOpacity
            style={styles.item}
            onPress={() => router.push('/pet/add')}
            activeOpacity={0.8}
          >
            <View style={[styles.ring, { borderColor: Colors.primary }]}>
              <Plus size={32} color={Colors.primary} />
            </View>
            <Text style={[styles.name, styles.addPetName]} numberOfLines={1}>Add Pet</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const ownHasActiveStory = pets.some((p) => activePetIds.has(p.id));
  const matchItems: StoryItem[] = allMatchedPets.filter((m) => activePetIds.has(m.petId));

  // Always show "Your Story" for discoverability, even if no active stories yet
  // Only hide if there are no matched stories either
  const data: StoryItem[] = [
    { type: 'own' as const },  // Always show "Your Story"
    ...matchItems,
  ];

  const firstPet = pets[0];
  const extraPets = pets.length - 1;

  return (
    <View style={styles.container}>
      <FlatList
        data={data}
        keyExtractor={(item) => item.type === 'own' ? '__own__' : item.petId}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          if (item.type === 'own') {
            return (
              <TouchableOpacity
                style={styles.item}
                onPress={() => router.push({ pathname: '/pawmatch/story/own', params: { context: 'circles' } })}
                activeOpacity={0.8}
              >
                <View style={[styles.ring, { borderColor: Colors.primary }]}>
                  {firstPet.avatarUrl ? (
                    <Image source={{ uri: firstPet.avatarUrl }} style={styles.avatar} />
                  ) : (
                    <PawPrint size={36} color={Colors.primary} />
                  )}
                  {extraPets > 0 && (
                    <View style={styles.extraBadge}>
                      <Text style={styles.extraBadgeText}>+{extraPets}</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.name, styles.ownName]} numberOfLines={1}>Your Story</Text>
              </TouchableOpacity>
            );
          }

          const avatarUrl = item.pet.avatarUrl ?? item.pet.photos?.[0]?.url;
          return (
            <TouchableOpacity
              style={styles.item}
              onPress={() => router.push({ pathname: '/pawmatch/story/[petId]', params: { petId: item.petId, context: 'circles' } })}
              activeOpacity={0.8}
            >
              <View style={[styles.ring, { borderColor: Colors.error }]}>
                {avatarUrl ? (
                  <Image source={{ uri: avatarUrl }} style={styles.avatar} />
                ) : (
                  <PawPrint size={36} color={Colors.primary} />
                )}
              </View>
              <Text style={styles.name} numberOfLines={1}>{item.pet.name}</Text>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  list: { paddingHorizontal: 12, paddingVertical: 10, gap: 16 },
  item: { alignItems: 'center', width: RING_SIZE + 8 },
  ring: {
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    padding: 2,
    borderWidth: 2.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: { width: RING_SIZE - 8, height: RING_SIZE - 8, borderRadius: (RING_SIZE - 8) / 2 },
  extraBadge: {
    position: 'absolute', bottom: 0, right: 0,
    backgroundColor: Colors.primary, borderRadius: 10,
    minWidth: 20, height: 20,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 4, borderWidth: 2, borderColor: Colors.surface,
    zIndex: 20,
  },
  extraBadgeText: { fontSize: 9, fontWeight: '800', color: '#fff' },
  name: {
    fontSize: 11, fontWeight: '600', color: Colors.textSecondary,
    marginTop: 8, maxWidth: RING_SIZE + 8, textAlign: 'center',
  },
  ownName: { color: Colors.primary, fontWeight: '700' },
  addPetName: { color: Colors.primary, fontWeight: '700' },
});
