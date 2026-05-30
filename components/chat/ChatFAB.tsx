import React, { useEffect } from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { MessageCircle } from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import { useChatStore } from '../../store/chatStore';

export function ChatFAB() {
  const router   = useRouter();
  const pathname = usePathname();
  const { unreadTotal, fetchUnreadCount } = useChatStore();

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  // Hide on all chat screens
  if (pathname.startsWith('/chat')) return null;

  return (
    <TouchableOpacity
      style={styles.fab}
      onPress={() => router.push('/chat')}
      activeOpacity={0.85}
    >
      <MessageCircle size={24} color={Colors.surface} strokeWidth={1.8} />
      {unreadTotal > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{unreadTotal > 99 ? '99+' : unreadTotal}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 96,   // above the floating tab bar (bottom:16 + height:64 + 16 gap)
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
