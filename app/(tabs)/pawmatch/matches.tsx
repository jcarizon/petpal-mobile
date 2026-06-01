import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MessageCircle, Heart, ChevronLeft } from 'lucide-react-native';
import { Colors } from '../../../constants/colors';
import { usePawMatchStore } from '../../../store/pawmatchStore';
import { usePetStore } from '../../../store/petStore';
import { PawMatch, MatchMode } from '../../../types';

const MODE_TABS: { label: string; mode: MatchMode | 'ALL' }[] = [
  { label: 'All', mode: 'ALL' },
  { label: 'Breed', mode: 'BREED' },
  { label: 'Adopt', mode: 'ADOPT' },
  { label: 'Playdate', mode: 'PLAYDATE' },
];

export default function MatchesScreen() {
  const router = useRouter();
  const { pets } = usePetStore();
  const { matches, fetchMatches, isLoading } = usePawMatchStore();
  const [activeTab, setActiveTab] = useState<MatchMode | 'ALL'>('ALL');

  const selectedPet = pets[0];

  useEffect(() => {
    if (selectedPet) fetchMatches(selectedPet.id);
  }, [selectedPet?.id]);

  const uniqueMatches = [...new Map(matches.map((m) => [m.id, m])).values()];
  const filtered = uniqueMatches.filter((m) => m.isActive && (activeTab === 'ALL' || m.mode === activeTab));

  const getOtherProfile = (match: PawMatch) => {
    if (!selectedPet) return match.profileB;
    return match.profileA.petId === selectedPet.id ? match.profileB : match.profileA;
  };

  const getLastMessage = (match: PawMatch) => {
    const msgs = match.conversation?.messages ?? [];
    return msgs[msgs.length - 1];
  };

  const renderItem = ({ item }: { item: PawMatch }) => {
    const other = getOtherProfile(item);
    const lastMsg = getLastMessage(item);
    const avatarUrl = other.pet?.avatarUrl ?? other.pet?.photos?.[0]?.url;
    const petName = other.pet?.name ?? 'Unknown Pet';
    const ownerName = other.pet?.owner?.name ?? '';

    return (
      <TouchableOpacity
        style={styles.matchRow}
        onPress={() => router.push({ pathname: '/pawmatch/[matchId]/chat', params: { matchId: item.id } })}
        activeOpacity={0.85}
      >
        <View style={styles.avatarWrap}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Heart size={20} color={Colors.primary} />
            </View>
          )}
          <View style={[styles.modeDot, { backgroundColor: getModeColor(item.mode) }]} />
        </View>
        <View style={styles.matchInfo}>
          <Text style={styles.petName}>{petName}</Text>
          <Text style={styles.ownerName}>{ownerName}</Text>
          {lastMsg ? (
            <Text style={styles.lastMsg} numberOfLines={1}>
              {lastMsg.content ?? 'Sent a photo'}
            </Text>
          ) : (
            <Text style={styles.noMsg}>Say hello!</Text>
          )}
        </View>
        <View style={styles.matchRight}>
          <View style={[styles.modePill, { backgroundColor: getModeColor(item.mode) + '20' }]}>
            <Text style={[styles.modePillText, { color: getModeColor(item.mode) }]}>{item.mode}</Text>
          </View>
          <MessageCircle size={18} color={Colors.neutral400} style={{ marginTop: 6 }} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <ChevronLeft size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Matches</Text>
      </View>

      <View style={styles.tabRow}>
        {MODE_TABS.map(({ label, mode }) => (
          <TouchableOpacity
            key={mode}
            style={[styles.tab, activeTab === mode && styles.tabActive]}
            onPress={() => setActiveTab(mode)}
          >
            <Text style={[styles.tabText, activeTab === mode && styles.tabTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(m) => m.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Heart size={40} color={Colors.neutral300} />
            <Text style={styles.emptyText}>No matches yet</Text>
            <Text style={styles.emptySubtext}>Start swiping to find connections</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

function getModeColor(mode: MatchMode) {
  if (mode === 'BREED') return Colors.error;
  if (mode === 'ADOPT') return '#7C3AED';
  return '#0891B2';
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, gap: 4 },
  backBtn: { padding: 4 },
  title: { fontSize: 26, fontWeight: '800', color: Colors.textPrimary },
  tabRow: { flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 8, gap: 8 },
  tab: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: Colors.neutral100 },
  tabActive: { backgroundColor: Colors.primary },
  tabText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  tabTextActive: { color: '#fff' },
  list: { paddingHorizontal: 16, paddingBottom: 100 },
  matchRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface,
    borderRadius: 14, padding: 14, marginBottom: 10,
    elevation: 1, shadowColor: Colors.neutral900, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4,
  },
  avatarWrap: { position: 'relative', marginRight: 12 },
  avatar: { width: 52, height: 52, borderRadius: 26 },
  avatarPlaceholder: { backgroundColor: Colors.primaryBg, justifyContent: 'center', alignItems: 'center' },
  modeDot: { position: 'absolute', bottom: 0, right: 0, width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: Colors.surface },
  matchInfo: { flex: 1 },
  petName: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  ownerName: { fontSize: 12, color: Colors.textSecondary },
  lastMsg: { fontSize: 13, color: Colors.textSecondary, marginTop: 3 },
  noMsg: { fontSize: 13, color: Colors.primary, marginTop: 3 },
  matchRight: { alignItems: 'flex-end' },
  modePill: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  modePillText: { fontSize: 11, fontWeight: '700' },
  empty: { alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 8 },
  emptyText: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  emptySubtext: { fontSize: 14, color: Colors.textSecondary },
});
