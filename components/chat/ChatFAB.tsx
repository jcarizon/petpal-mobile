import React, { useEffect } from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { MessageCircle } from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import { useChatStore } from '../../store/chatStore';
import { usePawMatchStore } from '../../store/pawmatchStore';
import { usePetStore } from '../../store/petStore';

export function ChatFAB() {
  const router   = useRouter();
  const pathname = usePathname();
  const { unreadTotal, fetchUnreadCount } = useChatStore();
  const { matches } = usePawMatchStore();
  const { pets } = usePetStore();

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  // Show only on the 4 main tabs
  const ALLOWED = ['/', '/pets', '/services', '/me'];
  if (!ALLOWED.includes(pathname)) return null;

  // Count PawMatch conversations where the last message was sent by the OTHER party
  // and hasn't been read yet (readAt === null)
  const myPetIds = new Set(pets.map((p) => p.id));
  const pmUnread = matches.filter((m) => {
    if (!m.isActive) return false;
    const lastMsg = m.conversation?.messages?.slice(-1)[0];
    if (!lastMsg) return false;
    // Unread if: sent by the other pet AND readAt is null
    return !myPetIds.has(lastMsg.senderPetId) && !lastMsg.readAt;
  }).length;

  // Single unified count: community unread + PawMatch unread
  const totalUnread = unreadTotal + pmUnread;

  return (
    <TouchableOpacity
      style={styles.fab}
      onPress={() => router.push('/chat')}
      activeOpacity={0.85}
    >
      <MessageCircle size={24} color={Colors.surface} strokeWidth={1.8} />
      {totalUnread > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{totalUnread > 99 ? '99+' : totalUnread}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 96,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 50,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: Colors.surface,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.surface,
  },
});
