import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, Switch, TouchableOpacity,
  ScrollView, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ExpoNotifications from 'expo-notifications';
import { ArrowLeft, Bell, MessageCircle, AlertTriangle, Heart, Clock, Shield, Star } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../../constants/colors';
import { useNotificationStore } from '../../store/notificationStore';
import { Loading } from '../../components/ui/Loading';
import { formatRelativeDate } from '../../lib/utils';
import { inferNotificationType } from '../../lib/notifications';
import { NotificationLog } from '../../types';

// ── Per-type toggle keys ──────────────────────────────────────────────────────
const PREF_KEY = 'pawrok_notif_prefs';

const NOTIF_TYPES = [
  { key: 'alerts',    icon: <AlertTriangle size={18} color="#EF4444" />, label: 'Lost & Found Alerts',  sub: 'Nearby lost/found pet reports'   },
  { key: 'reminders', icon: <Clock         size={18} color="#10B981" />, label: 'Pet Reminders',        sub: 'Vaccinations, vet visits & more' },
  { key: 'adoption',  icon: <Heart         size={18} color="#8B5CF6" />, label: 'Adoption & Playmate',  sub: 'Adoption interest & playdate requests' },
  { key: 'chat',      icon: <MessageCircle size={18} color="#10B981" />, label: 'Chat Messages',        sub: 'Direct messages from other users' },
  { key: 'badges',    icon: <Shield        size={18} color="#F59E0B" />, label: 'Badges & Level Ups',   sub: 'XP awards and achievement unlocks' },
  { key: 'review',    icon: <Star          size={18} color="#F59E0B" />, label: 'Service Reviews',      sub: 'New reviews on your service listings' },
] as const;

type PrefKey = typeof NOTIF_TYPES[number]['key'];

const DEFAULT_PREFS: Record<PrefKey, boolean> = {
  alerts: true, reminders: true, adoption: true, chat: true, badges: true, review: true,
};

function typeToKey(n: NotificationLog): PrefKey | null {
  const t = n.type ?? inferNotificationType(n.title, n.body);
  if (!t) return null;
  if (t === 'alert' || t === 'sighting')                              return 'alerts';
  if (t === 'reminder')                                               return 'reminders';
  if (t === 'interest')                                               return 'adoption';
  if (t === 'chat_request' || t === 'chat_message' || t === 'chat_accepted') return 'chat';
  if (t === 'badge' || t === 'level_up')                              return 'badges';
  if (t === 'review' || t === 'service_verified')                     return 'review';
  return null;
}

export default function NotificationSettingsScreen() {
  const router = useRouter();
  const { notifications, fetchNotifications, isLoading } = useNotificationStore();
  const [pushGranted, setPushGranted] = useState<boolean | null>(null);
  const [prefs, setPrefs]             = useState<Record<PrefKey, boolean>>(DEFAULT_PREFS);

  useEffect(() => {
    fetchNotifications(true);

    ExpoNotifications.getPermissionsAsync().then(({ status }) => {
      setPushGranted(status === 'granted');
    });

    AsyncStorage.getItem(PREF_KEY).then((raw) => {
      if (raw) {
        try { setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(raw) }); } catch { /* ignore */ }
      }
    });
  }, [fetchNotifications]);

  const togglePref = async (key: PrefKey, value: boolean) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    await AsyncStorage.setItem(PREF_KEY, JSON.stringify(next));
  };

  const openSettings = () => Linking.openSettings();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notification Settings</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Push permission status */}
        <View style={styles.group}>
          <View style={styles.groupHeader}>
            <Bell size={14} color={Colors.primary} />
            <Text style={styles.groupTitle}>Push Notifications</Text>
          </View>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: pushGranted ? Colors.success : Colors.error }]} />
            <Text style={styles.statusText}>
              {pushGranted === null ? 'Checking…' : pushGranted ? 'Enabled' : 'Disabled — tap to enable'}
            </Text>
            {pushGranted === false && (
              <TouchableOpacity onPress={openSettings} style={styles.openSettingsBtn}>
                <Text style={styles.openSettingsBtnText}>Open Settings</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Per-type toggles */}
        <View style={styles.group}>
          <View style={styles.groupHeader}>
            <Bell size={14} color={Colors.primary} />
            <Text style={styles.groupTitle}>Notification Types</Text>
          </View>
          {NOTIF_TYPES.map((t, i) => (
            <View key={t.key} style={[styles.toggleRow, i < NOTIF_TYPES.length - 1 && styles.toggleRowBorder]}>
              <View style={styles.toggleIcon}>{t.icon}</View>
              <View style={styles.toggleInfo}>
                <Text style={styles.toggleLabel}>{t.label}</Text>
                <Text style={styles.toggleSub}>{t.sub}</Text>
              </View>
              <Switch
                value={prefs[t.key]}
                onValueChange={(v) => togglePref(t.key, v)}
                trackColor={{ false: Colors.neutral200, true: Colors.primaryBg }}
                thumbColor={prefs[t.key] ? Colors.primary : Colors.neutral400}
              />
            </View>
          ))}
          <Text style={styles.prefNote}>
            These preferences are stored on this device only. They filter what appears in your notification tray — all notifications are still delivered by the server.
          </Text>
        </View>

        {/* Notification history */}
        <View style={styles.group}>
          <View style={styles.groupHeader}>
            <Bell size={14} color={Colors.primary} />
            <Text style={styles.groupTitle}>Recent Notifications</Text>
          </View>
          {isLoading && notifications.length === 0 ? (
            <Loading size="small" />
          ) : notifications.length === 0 ? (
            <Text style={styles.emptyHistory}>No notifications yet.</Text>
          ) : (
            notifications.slice(0, 20).map((n) => {
              const prefKey = typeToKey(n);
              const muted = prefKey ? !prefs[prefKey] : false;
              return (
                <View key={n.id} style={[styles.historyItem, muted && styles.historyItemMuted]}>
                  <View style={styles.historyTop}>
                    <Text style={styles.historyTitle} numberOfLines={1}>{n.title}</Text>
                    <Text style={styles.historyTime}>{formatRelativeDate(new Date(n.createdAt))}</Text>
                  </View>
                  <Text style={styles.historyBody} numberOfLines={2}>{n.body}</Text>
                  <View style={styles.historyMeta}>
                    <Text style={[styles.historyChannel, n.status === 'FAILED' && styles.historyChannelFailed]}>
                      {n.channel} · {n.status}
                    </Text>
                    {muted && <Text style={styles.historyMutedLabel}>muted</Text>}
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:           { flex: 1, backgroundColor: Colors.background },
  header:              { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: Colors.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  backBtn:             { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.neutral100, alignItems: 'center', justifyContent: 'center' },
  headerTitle:         { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  content:             { padding: 16, gap: 20, paddingBottom: 40 },
  group:               { backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  groupHeader:         { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  groupTitle:          { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  statusRow:           { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  statusDot:           { width: 10, height: 10, borderRadius: 5 },
  statusText:          { flex: 1, fontSize: 14, color: Colors.textPrimary },
  openSettingsBtn:     { backgroundColor: Colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  openSettingsBtnText: { fontSize: 12, fontWeight: '700', color: Colors.surface },
  toggleRow:           { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 12 },
  toggleRowBorder:     { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  toggleIcon:          { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.neutral50, alignItems: 'center', justifyContent: 'center' },
  toggleInfo:          { flex: 1, gap: 2 },
  toggleLabel:         { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  toggleSub:           { fontSize: 12, color: Colors.textSecondary },
  prefNote:            { fontSize: 11, color: Colors.neutral400, padding: 14, lineHeight: 16 },
  emptyHistory:        { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', padding: 20 },
  historyItem:         { padding: 14, gap: 4, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  historyItemMuted:    { opacity: 0.5 },
  historyTop:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  historyTitle:        { flex: 1, fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  historyTime:         { fontSize: 11, color: Colors.neutral400, flexShrink: 0 },
  historyBody:         { fontSize: 12, color: Colors.textSecondary, lineHeight: 17 },
  historyMeta:         { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  historyChannel:      { fontSize: 11, color: Colors.neutral400, textTransform: 'uppercase' },
  historyChannelFailed:{ color: Colors.error },
  historyMutedLabel:   { fontSize: 10, fontWeight: '700', color: Colors.warning, backgroundColor: '#FFF8E1', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
});
