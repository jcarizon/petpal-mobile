import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, Image, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, MessageCircle, PawPrint } from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import { useChatStore } from '../../store/chatStore';
import { usePawMatchStore } from '../../store/pawmatchStore';
import { usePetStore } from '../../store/petStore';
import { useAuthStore } from '../../store/authStore';
import { ChatConversation, PawMatch, UnifiedConversation, ChatBadge } from '../../types';
import { formatRelativeDate } from '../../lib/utils';
import { MatchStories } from '../../components/pawmatch/MatchStories';
import { UserAvatarBox } from '../../components/ui/UserAvatarBox';

// ── Badge config ─────────────────────────────────────────────────────────────

const BADGE_CONFIG: Record<ChatBadge, { label: string; color: string; bg: string }> = {
  LOST:     { label: 'LOST',     color: '#EF4444', bg: '#FEF2F2' },
  FOUND:    { label: 'FOUND',    color: '#10B981', bg: '#ECFDF5' },
  BREED:    { label: 'BREED',    color: '#E11D48', bg: '#FFF1F2' },
  ADOPT:    { label: 'ADOPT',    color: '#7C3AED', bg: '#F5F3FF' },
  PLAYDATE: { label: 'PLAY',     color: '#0891B2', bg: '#E0F2FE' },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'all',      label: 'All'      },
  { key: 'requests', label: 'Requests' },
  { key: 'sent',     label: 'Sent'     },
] as const;
type TabKey = typeof TABS[number]['key'];

function BadgePill({ badge }: { badge: ChatBadge }) {
  const cfg = BADGE_CONFIG[badge];
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
      <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function ChatListScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { conversations, fetchConversations, acceptConversation, declineConversation } = useChatStore();
  const { matches, fetchMatches, acceptAdoptionRequest, declineAdoptionRequest } = usePawMatchStore();
  const { pets, fetchPets } = usePetStore();

  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [refreshing, setRefreshing] = useState(false);

  const myPetIds = new Set(pets.map((p) => p.id));

  useEffect(() => { fetchPets(); }, []);

  useEffect(() => {
    fetchConversations('all');
    pets.forEach((p) => fetchMatches(p.id));
  }, [pets.length]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchConversations('all'),
      ...pets.map((p) => fetchMatches(p.id)),
    ]);
    setRefreshing(false);
  };

  // ── Normalise ──────────────────────────────────────────────────────────────

  const communityItems: UnifiedConversation[] = conversations.map((c: ChatConversation) => {
    const isInitiator = c.initiatorId === user?.id;
    const other = isInitiator
      ? { name: c.recipientName, avatar: undefined }
      : { name: c.initiatorName, avatar: undefined };
    const badge: ChatBadge = (c as any).alertType === 'FOUND' ? 'FOUND' : 'LOST';
    return {
      id: c.id,
      kind: 'community',
      badge,
      status: c.status,
      otherPersonName: other.name,
      subtitle: c.alertTitle ? `Re: ${c.alertTitle}` : 'Community alert',
      lastMessage: c.lastMessage ?? undefined,
      lastMessageAt: c.lastMessageAt ?? c.createdAt,
      unreadCount: c.unreadCount,
      isInitiator,
    };
  });

  const pawmatchItems: UnifiedConversation[] = (
    [...new Map(matches.map((m: PawMatch) => [m.id, m])).values()]
      .filter((m: PawMatch) => m.isActive)
  ).map((m: PawMatch) => {
    const otherProfile = myPetIds.has(m.profileA.petId) ? m.profileB : m.profileA;
    const isInitiator = myPetIds.has(m.profileA.petId); // profileA is the one who initiated
    const lastMsg = m.conversation?.messages?.slice(-1)[0];
    const badge = m.mode as ChatBadge;
    const convStatus = (m.conversation as any)?.status ?? 'ACTIVE';
    return {
      id: m.id, // matchId
      conversationId: m.conversation?.id,
      kind: 'pawmatch',
      badge,
      status: convStatus,
      otherPersonName: otherProfile?.pet?.owner?.name ?? otherProfile?.pet?.name ?? 'Unknown',
      otherPersonAvatarUrl: otherProfile?.pet?.avatarUrl,
      subtitle: `${otherProfile?.pet?.name ?? '—'} · ${m.mode}`,
      lastMessage: lastMsg?.content ?? undefined,
      lastMessageAt: lastMsg?.createdAt ?? m.createdAt,
      unreadCount: 0,
      isInitiator,
    };
  });

  const allItems: UnifiedConversation[] = [...communityItems, ...pawmatchItems]
    .sort((a, b) => new Date(b.lastMessageAt ?? 0).getTime() - new Date(a.lastMessageAt ?? 0).getTime());

  const filtered = allItems.filter((item) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'requests') {
      return item.status === 'PENDING' && !item.isInitiator;
    }
    if (activeTab === 'sent') {
      return item.isInitiator;
    }
    return true;
  });

  // ── Handlers ───────────────────────────────────────────────────────────────

  const openChat = (item: UnifiedConversation) => {
    if (item.kind === 'community') {
      router.push({ pathname: '/chat/[conversationId]', params: { conversationId: item.id, kind: 'community' } });
    } else {
      router.push({ pathname: '/chat/[conversationId]', params: { conversationId: item.id, kind: 'pawmatch' } });
    }
  };

  const handleAccept = useCallback(async (item: UnifiedConversation) => {
    try {
      if (item.kind === 'community') {
        await acceptConversation(item.id);
        fetchConversations('all');
      } else if (item.conversationId) {
        await acceptAdoptionRequest(item.conversationId);
      }
    } catch {
      Alert.alert('Error', 'Could not accept the request.');
    }
  }, [acceptConversation, acceptAdoptionRequest]);

  const handleDecline = useCallback(async (item: UnifiedConversation) => {
    Alert.alert('Decline', 'Are you sure you want to decline?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Decline', style: 'destructive',
        onPress: async () => {
          try {
            if (item.kind === 'community') {
              await declineConversation(item.id);
              fetchConversations('all');
            } else if (item.conversationId) {
              await declineAdoptionRequest(item.conversationId);
            }
          } catch {
            Alert.alert('Error', 'Could not decline the request.');
          }
        },
      },
    ]);
  }, [declineConversation, declineAdoptionRequest]);

  // ── Render row ─────────────────────────────────────────────────────────────

  const renderItem = ({ item }: { item: UnifiedConversation }) => {
    const isPendingRecipient = item.status === 'PENDING' && !item.isInitiator;
    const isDeclined = item.status === 'DECLINED';

    return (
      <TouchableOpacity style={styles.row} activeOpacity={0.75} onPress={() => openChat(item)}>
        <UserAvatarBox avatarUrl={item.otherPersonAvatarUrl} name={item.otherPersonName} size={46} />

        <View style={styles.rowBody}>
          <View style={styles.rowTop}>
            <View style={styles.rowTitleRow}>
              <BadgePill badge={item.badge} />
              <Text style={styles.rowName} numberOfLines={1}>{item.otherPersonName}</Text>
            </View>
            <Text style={styles.rowTime}>
              {item.lastMessageAt ? formatRelativeDate(new Date(item.lastMessageAt)) : ''}
            </Text>
          </View>
          <Text style={styles.rowSub} numberOfLines={1}>{item.subtitle}</Text>
          <Text
            style={[styles.rowPreview, isDeclined && styles.rowPreviewDeclined]}
            numberOfLines={1}
          >
            {isDeclined
              ? 'Request declined'
              : item.status === 'PENDING' && item.isInitiator
              ? 'Waiting for response…'
              : item.lastMessage ?? 'Say hello! 🐾'}
          </Text>
        </View>

        {item.unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>{item.unreadCount}</Text>
          </View>
        )}

        {isPendingRecipient && (
          <View style={styles.requestBtns}>
            <TouchableOpacity style={styles.acceptBtn} onPress={() => handleAccept(item)}>
              <Text style={styles.acceptBtnText}>Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.declineBtn} onPress={() => handleDecline(item)}>
              <Text style={styles.declineBtnText}>Decline</Text>
            </TouchableOpacity>
          </View>
        )}
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

      <MatchStories />

      <View style={styles.tabsRow}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab, activeTab === t.key && styles.tabActive]}
            onPress={() => setActiveTab(t.key)}
          >
            <Text style={[styles.tabLabel, activeTab === t.key && styles.tabLabelActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => `${item.kind}-${item.id}`}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />}
        contentContainerStyle={filtered.length === 0 ? styles.emptyContainer : styles.list}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <MessageCircle size={48} color={Colors.neutral300} />
            <Text style={styles.emptyTitle}>No chats yet</Text>
            <Text style={styles.emptySub}>
              {activeTab === 'requests'
                ? 'No pending requests'
                : 'Start chatting from an alert or a PawMatch'}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: Colors.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.neutral100, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  tabsRow: { flexDirection: 'row', backgroundColor: Colors.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: Colors.primary },
  tabLabel: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  tabLabelActive: { color: Colors.primary },
  list: { paddingBottom: 40 },
  emptyContainer: { flex: 1 },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: Colors.border, marginLeft: 72 },
  row: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: Colors.surface, gap: 12 },
  rowBody: { flex: 1, gap: 2 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  rowName: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, flexShrink: 1 },
  rowTime: { fontSize: 11, color: Colors.neutral400, flexShrink: 0 },
  rowSub: { fontSize: 12, color: Colors.textSecondary, fontStyle: 'italic' },
  rowPreview: { fontSize: 13, color: Colors.textSecondary },
  rowPreviewDeclined: { color: Colors.error, fontStyle: 'italic' },
  badge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.3 },
  unreadBadge: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  unreadText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  requestBtns: { flexDirection: 'column', gap: 6, justifyContent: 'center' },
  acceptBtn: { backgroundColor: Colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  acceptBtnText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  declineBtn: { backgroundColor: Colors.neutral100, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  declineBtnText: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, paddingTop: 80, gap: 10 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  emptySub: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
});
