import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, BellOff, Smartphone, Mail, MessageSquare, AlertCircle, RefreshCw, Bell, Megaphone, Eye, Award, Heart, Zap, Star, CheckCircle, Sparkles, ShieldCheck, MessageCircle } from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import { Loading } from '../../components/ui/Loading';
import { useNotificationStore } from '../../store/notificationStore';
import { NotificationLog, NotificationChannel, PushNotificationData } from '../../types';
import { inferNotificationType } from '../../lib/notifications';

export default function NotificationsScreen() {
  const router = useRouter();
  const { notifications, isLoading, error, hasMore, fetchNotifications } = useNotificationStore();

  useEffect(() => {
    fetchNotifications(true);
  }, [fetchNotifications]);

  const handleRefresh = useCallback(() => {
    fetchNotifications(true);
  }, [fetchNotifications]);

  const handleLoadMore = useCallback(() => {
    if (hasMore && !isLoading) fetchNotifications();
  }, [hasMore, isLoading, fetchNotifications]);

  const initialLoad = isLoading && notifications.length === 0 && !error;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={20} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={{ width: 36 }} />
      </View>

      {initialLoad ? (
        <Loading fullScreen />
      ) : error ? (
        <View style={styles.errorState}>
          <AlertCircle size={44} color={Colors.error} />
          <Text style={styles.errorTitle}>Could not load notifications</Text>
          <Text style={styles.errorMsg}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={handleRefresh}>
            <RefreshCw size={14} color={Colors.textInverse} />
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={notifications.length === 0 ? styles.emptyContainer : styles.list}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={handleRefresh}
              tintColor={Colors.primary}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <BellOff size={48} color={Colors.neutral300} />
              <Text style={styles.emptyTitle}>No notifications yet</Text>
              <Text style={styles.emptySub}>
                Notifications for sightings, interests, badges, and more will appear here.
              </Text>
            </View>
          }
          ListFooterComponent={
            hasMore && notifications.length > 0 ? (
              <View style={styles.footer}>
                <Loading size="small" />
              </View>
            ) : null
          }
          renderItem={({ item }) => <NotificationItem item={item} router={router} />}
        />
      )}
    </SafeAreaView>
  );
}

// ── Item ──────────────────────────────────────────────

function NotificationItem({ item, router }: { item: NotificationLog; router: ReturnType<typeof useRouter> }) {
  const timeLabel = formatTime(item.createdAt);
  const { icon, iconBg } = resolveNotificationMeta(item);
  const route = getNotificationRoute(item);

  return (
    <TouchableOpacity
      style={styles.item}
      activeOpacity={0.7}
      onPress={() => { if (route) router.push(route as Parameters<typeof router.push>[0]); }}
    >
      <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
        {icon}
      </View>
      <View style={styles.itemContent}>
        <View style={styles.itemTopRow}>
          <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.itemTime}>{timeLabel}</Text>
        </View>
        <Text style={styles.itemBody} numberOfLines={2}>{item.body}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ── Helpers ───────────────────────────────────────────

type NotifMeta = { icon: React.ReactNode; iconBg: string };

const NOTIFICATION_TYPE_META: Record<PushNotificationData['type'], NotifMeta> = {
  reminder:         { icon: <Bell          size={16} color="#10B981" />, iconBg: '#ECFDF5' },
  alert:            { icon: <Megaphone     size={16} color="#EF4444" />, iconBg: '#FEF2F2' },
  sighting:         { icon: <Eye           size={16} color="#F59E0B" />, iconBg: '#FFFBEB' },
  badge:            { icon: <Award         size={16} color="#8B5CF6" />, iconBg: '#F5F3FF' },
  interest:         { icon: <Heart         size={16} color="#EC4899" />, iconBg: '#FDF2F8' },
  level_up:         { icon: <Zap           size={16} color="#F59E0B" />, iconBg: '#FFFBEB' },
  review:           { icon: <Star          size={16} color="#3B82F6" />, iconBg: '#EFF6FF' },
  service_verified: { icon: <CheckCircle   size={16} color="#10B981" />, iconBg: '#ECFDF5' },
  welcome:          { icon: <Sparkles      size={16} color="#6366F1" />, iconBg: '#EEF2FF' },
  role_change:      { icon: <ShieldCheck   size={16} color="#6366F1" />, iconBg: '#EEF2FF' },
  chat_request:     { icon: <MessageCircle size={16} color="#10B981" />, iconBg: '#ECFDF5' },
  chat_message:     { icon: <MessageCircle size={16} color="#10B981" />, iconBg: '#ECFDF5' },
  chat_accepted:    { icon: <MessageCircle size={16} color="#10B981" />, iconBg: '#ECFDF5' },
};

function channelMeta(channel: NotificationChannel): NotifMeta {
  switch (channel) {
    case 'PUSH':  return { icon: <Smartphone   size={16} color={Colors.primary} />, iconBg: Colors.primaryBg };
    case 'EMAIL': return { icon: <Mail         size={16} color="#3B82F6" />,        iconBg: '#EFF6FF' };
    case 'SMS':   return { icon: <MessageSquare size={16} color="#8B5CF6" />,       iconBg: '#F5F3FF' };
  }
}

function getNotificationRoute(item: NotificationLog): string {
  const type = item.type ?? inferNotificationType(item.title, item.body);
  switch (type) {
    case 'chat_request':
    case 'chat_message':
    case 'chat_accepted':
      return '/chat';
    case 'alert':
    case 'sighting':
    case 'interest':
      return '/(tabs)';
    case 'reminder':
      return '/(tabs)/pets';
    case 'badge':
    case 'level_up':
    case 'welcome':
    case 'role_change':
      return '/(tabs)/me';
    case 'review':
    case 'service_verified':
      return '/(tabs)/services';
    default:
      return '/(tabs)';
  }
}

function resolveNotificationMeta(item: NotificationLog): NotifMeta {
  const type = item.type ?? inferNotificationType(item.title, item.body);
  if (type) return NOTIFICATION_TYPE_META[type];
  return channelMeta(item.channel);
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}

// ── Styles ────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.neutral100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  list: {
    paddingTop: 8,
    paddingBottom: 40,
  },
  emptyContainer: {
    flex: 1,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
    marginLeft: 72,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: Colors.surface,
  },
  itemFailed: {
    opacity: 0.6,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 2,
  },
  itemContent: {
    flex: 1,
    gap: 3,
  },
  itemTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  itemTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  itemTime: {
    fontSize: 11,
    color: Colors.textSecondary,
    flexShrink: 0,
    marginTop: 1,
  },
  itemBody: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  failedBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FEF2F2',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 4,
  },
  failedText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.error,
  },
  errorState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 10,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  errorMsg: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textInverse,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingTop: 80,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  emptySub: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});
