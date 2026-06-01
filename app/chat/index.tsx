import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, MessageCircle, Heart, PawPrint } from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import { useChatStore } from '../../store/chatStore';
import { usePawMatchStore } from '../../store/pawmatchStore';
import { usePetStore } from '../../store/petStore';
import { useAuthStore } from '../../store/authStore';
import { ChatConversation, PawMatch } from '../../types';
import { formatRelativeDate } from '../../lib/utils';
import { MatchStories } from '../../components/pawmatch/MatchStories';

const TABS = [
  { key: 'all',      label: 'All'      },
  { key: 'sent',     label: 'Sent'     },
  { key: 'requests', label: 'Requests' },
  { key: 'matches',  label: 'Matches'  },
] as const;

type Role = typeof TABS[number]['key'];

export default function ChatListScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { conversations, fetchConversations, acceptConversation, declineConversation, isLoading } = useChatStore();
  const { matches, fetchMatches } = usePawMatchStore();
  const { pets, fetchPets } = usePetStore();

  const [activeTab, setActiveTab] = useState<Role>('all');
  const [refreshing, setRefreshing] = useState(false);

  const myPetIds = new Set(pets.map((p) => p.id));

  const load = useCallback(() => {
    if (activeTab !== 'matches') {
      fetchConversations(activeTab as 'all' | 'sent' | 'requests');
    }
  }, [fetchConversations, activeTab]);

  useEffect(() => { fetchPets(); }, []);

  useEffect(() => {
    load();
    if (activeTab === 'matches') {
      pets.forEach((pet) => fetchMatches(pet.id));
    }
  }, [load, activeTab]);

  const handleRefresh = async () => {
    setRefreshing(true);
    if (activeTab === 'matches') {
      for (const pet of pets) await fetchMatches(pet.id);
    } else {
      await fetchConversations(activeTab as 'all' | 'sent' | 'requests');
    }
    setRefreshing(false);
  };

  // ── Community chat helpers ───────────────────────────────────────────────

  const otherParty = (c: ChatConversation) =>
    user?.id === c.initiatorId
      ? { id: c.recipientId, name: c.recipientName }
      : { id: c.initiatorId, name: c.initiatorName };

  const statusColor = (s: string) =>
    s === 'ACTIVE' ? Colors.primary : s === 'DECLINED' ? Colors.error : Colors.secondary;

  const statusLabel = (s: string) =>
    s === 'ACTIVE' ? 'Active' : s === 'DECLINED' ? 'Declined' : 'Pending';

  const renderConvItem = ({ item }: { item: ChatConversation }) => {
    const other = otherParty(item);
    const isPendingRecipient = item.status === 'PENDING' && item.recipientId === user?.id;

    return (
      <TouchableOpacity style={styles.row} activeOpacity={0.75} onPress={() => router.push(`/chat/${item.id}`)}>
        <View style={styles.rowAvatar}>
          <Text style={styles.rowAvatarText}>{(other.name ?? '?').charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.rowBody}>
          <View style={styles.rowTop}>
            <Text style={styles.rowName} numberOfLines={1}>{other.name}</Text>
            <Text style={styles.rowTime}>
              {item.lastMessageAt ? formatRelativeDate(new Date(item.lastMessageAt)) : formatRelativeDate(new Date(item.createdAt))}
            </Text>
          </View>
          <Text style={styles.rowAlert} numberOfLines={1}>Re: {item.alertTitle}</Text>
          <View style={styles.rowBottom}>
            <Text style={styles.rowPreview} numberOfLines={1}>{item.lastMessage ?? 'No messages yet'}</Text>
            <View style={[styles.statusPill, { backgroundColor: statusColor(item.status) + '20' }]}>
              <Text style={[styles.statusText, { color: statusColor(item.status) }]}>{statusLabel(item.status)}</Text>
            </View>
          </View>
          {item.unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{item.unreadCount}</Text>
            </View>
          )}
        </View>
        {isPendingRecipient && (
          <View style={styles.requestActions}>
            <TouchableOpacity style={styles.acceptBtn} onPress={async (e) => { e.stopPropagation(); await acceptConversation(item.id); load(); }}>
              <Text style={styles.acceptBtnText}>Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.declineBtn} onPress={async (e) => { e.stopPropagation(); await declineConversation(item.id); load(); }}>
              <Text style={styles.declineBtnText}>Decline</Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // ── PawMatch chat helpers ────────────────────────────────────────────────

  const uniqueMatches = [...new Map(matches.map((m) => [m.id, m])).values()].filter((m) => m.isActive);

  const getOtherProfile = (m: PawMatch) =>
    myPetIds.has(m.profileA.petId) ? m.profileB : m.profileA;

  const renderMatchItem = ({ item }: { item: PawMatch }) => {
    const other = getOtherProfile(item);
    const lastMsg = item.conversation?.messages?.slice(-1)[0];
    const avatarUrl = other.pet?.avatarUrl ?? other.pet?.photos?.[0]?.url;
    const petName = other.pet?.name ?? 'Unknown';
    const ownerName = other.pet?.owner?.name ?? '';

    const modeColor = item.mode === 'BREED' ? Colors.error : item.mode === 'ADOPT' ? '#7C3AED' : '#0891B2';

    return (
      <TouchableOpacity
        style={styles.row}
        activeOpacity={0.75}
        onPress={() => router.push({ pathname: '/pawmatch/[matchId]/chat', params: { matchId: item.id } })}
      >
        <View style={styles.matchAvatarWrap}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.matchAvatar} />
          ) : (
            <View style={[styles.matchAvatar, styles.matchAvatarFallback]}>
              <PawPrint size={18} color={Colors.primary} />
            </View>
          )}
          <View style={[styles.modeDot, { backgroundColor: modeColor }]} />
        </View>
        <View style={styles.rowBody}>
          <View style={styles.rowTop}>
            <Text style={styles.rowName} numberOfLines={1}>{petName}</Text>
            {lastMsg && <Text style={styles.rowTime}>{formatRelativeDate(new Date(lastMsg.createdAt))}</Text>}
          </View>
          <Text style={styles.rowAlert} numberOfLines={1}>{ownerName}</Text>
          <Text style={styles.rowPreview} numberOfLines={1}>
            {lastMsg?.content ?? 'Say hello! 🐾'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chats</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Match story circles */}
      <MatchStories />

      {/* Tabs */}
      <View style={styles.tabsRow}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab, activeTab === t.key && styles.tabActive]}
            onPress={() => setActiveTab(t.key)}
          >
            {t.key === 'matches' && (
              <Heart size={12} color={activeTab === t.key ? Colors.primary : Colors.textSecondary} style={{ marginRight: 3 }} />
            )}
            <Text style={[styles.tabLabel, activeTab === t.key && styles.tabLabelActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'matches' ? (
        <FlatList
          data={uniqueMatches}
          keyExtractor={(m) => m.id}
          renderItem={renderMatchItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />}
          contentContainerStyle={uniqueMatches.length === 0 ? styles.emptyContainer : styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Heart size={48} color={Colors.neutral300} />
              <Text style={styles.emptyTitle}>No matches yet</Text>
              <Text style={styles.emptySub}>Start swiping in PawMatch to find connections</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(c) => c.id}
          renderItem={renderConvItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />}
          contentContainerStyle={conversations.length === 0 ? styles.emptyContainer : styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <MessageCircle size={48} color={Colors.neutral300} />
              <Text style={styles.emptyTitle}>No chats yet</Text>
              <Text style={styles.emptySub}>
                {activeTab === 'requests' ? 'No pending chat requests.' : 'Start a chat from an alert interest.'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: Colors.background },
  header:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: Colors.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  backBtn:         { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.neutral100, alignItems: 'center', justifyContent: 'center' },
  headerTitle:     { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  tabsRow:         { flexDirection: 'row', backgroundColor: Colors.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  tab:             { flex: 1, flexDirection: 'row', paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  tabActive:       { borderBottomWidth: 2, borderBottomColor: Colors.primary },
  tabLabel:        { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  tabLabelActive:  { color: Colors.primary },
  list:            { paddingBottom: 40 },
  emptyContainer:  { flex: 1 },
  separator:       { height: StyleSheet.hairlineWidth, backgroundColor: Colors.border, marginLeft: 72 },

  row:             { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: Colors.surface, gap: 12 },
  rowAvatar:       { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primaryBg, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  rowAvatarText:   { fontSize: 18, fontWeight: '700', color: Colors.primary },
  rowBody:         { flex: 1, gap: 3 },
  rowTop:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowName:         { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, flex: 1 },
  rowTime:         { fontSize: 11, color: Colors.neutral400, flexShrink: 0 },
  rowAlert:        { fontSize: 12, color: Colors.textSecondary, fontStyle: 'italic' },
  rowBottom:       { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowPreview:      { flex: 1, fontSize: 13, color: Colors.textSecondary },
  statusPill:      { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  statusText:      { fontSize: 11, fontWeight: '600' },
  unreadBadge:     { position: 'absolute', top: 0, right: 0, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  unreadText:      { fontSize: 10, fontWeight: '700', color: Colors.surface },
  requestActions:  { flexDirection: 'column', gap: 6, justifyContent: 'center' },
  acceptBtn:       { backgroundColor: Colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  acceptBtnText:   { fontSize: 12, fontWeight: '700', color: Colors.surface },
  declineBtn:      { backgroundColor: Colors.neutral100, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  declineBtnText:  { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },

  matchAvatarWrap:    { position: 'relative', flexShrink: 0 },
  matchAvatar:        { width: 44, height: 44, borderRadius: 22 },
  matchAvatarFallback:{ backgroundColor: Colors.primaryBg, alignItems: 'center', justifyContent: 'center' },
  modeDot:            { position: 'absolute', bottom: 0, right: 0, width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: Colors.surface },

  empty:           { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, paddingTop: 80, gap: 10 },
  emptyTitle:      { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  emptySub:        { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
});
