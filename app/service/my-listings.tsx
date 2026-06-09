import React, { useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Plus, Star, CheckCircle, Clock, ChevronRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/colors';
import { Loading } from '../../components/ui/Loading';
import api from '../../lib/api';
import { formatServiceType } from '../../lib/utils';

type MyListing = {
  id: string;
  name: string;
  type: string;
  city: string;
  averageRating: number;
  reviewCount: number;
  isVerified: boolean;
  createdAt: string;
};

const TYPE_EMOJI: Record<string, string> = {
  VET: '🏥', VETERINARY_EMERGENCY: '🚑', GROOMER: '✂️', PET_STORE: '🛍️',
  PET_HOTEL: '🏨', DAYCARE: '🌞', TRAINER: '🎓', SPA: '💆',
  SHELTER: '🏠', PHOTOGRAPHY: '📸', TRANSPORTATION: '🚗', PHARMACY: '💊',
};

export default function MyListingsScreen() {
  const router = useRouter();

  const query = useQuery({
    queryKey: ['my-listings'],
    queryFn: async () => {
      const r = await api.get<{ success: boolean; data: MyListing[] }>('/services?mine=true');
      return r.data?.data ?? [];
    },
  });

  const handleRefresh = useCallback(async () => {
    await query.refetch();
  }, [query]);

  const listings = query.data ?? [];

  // Aggregate stats across all listings
  const stats = useMemo(() => {
    if (!listings.length) return null;
    const totalReviews = listings.reduce((sum, l) => sum + l.reviewCount, 0);
    const avgRating = listings.reduce((sum, l) => sum + l.averageRating, 0) / listings.length;
    return { count: listings.length, totalReviews, avgRating };
  }, [listings]);

  const renderItem = ({ item }: { item: MyListing }) => (
    <TouchableOpacity
      style={styles.row}
      activeOpacity={0.75}
      onPress={() => router.push(`/service/${item.id}/manage`)}
    >
      <View style={styles.rowEmoji}>
        <Text style={styles.rowEmojiText}>{TYPE_EMOJI[item.type.toUpperCase()] ?? '🐾'}</Text>
      </View>
      <View style={styles.rowBody}>
        <View style={styles.rowTop}>
          <Text style={styles.rowName} numberOfLines={1}>{item.name}</Text>
          {item.isVerified && <CheckCircle size={14} color={Colors.primary} />}
        </View>
        <Text style={styles.rowType}>{formatServiceType(item.type.toLowerCase())} · {item.city}</Text>
        <View style={styles.rowMeta}>
          <Star size={12} color={Colors.secondary} />
          <Text style={styles.rowRating}>{item.averageRating.toFixed(1)}</Text>
          <Text style={styles.rowReviews}>({item.reviewCount} reviews)</Text>
          {!item.isVerified && (
            <View style={styles.pendingBadge}>
              <Clock size={10} color={Colors.warning} />
              <Text style={styles.pendingText}>Pending review</Text>
            </View>
          )}
        </View>
      </View>
      <ChevronRight size={18} color={Colors.neutral400} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Listings</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/service/create')}>
          <Plus size={20} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* ── Dashboard stats banner ── */}
      {stats && (
        <LinearGradient
          colors={[Colors.heroGradientStart, Colors.heroGradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.statsBanner}
        >
          <View style={styles.statsRow}>
            <View style={styles.statBlock}>
              <Text style={styles.statValue}>{stats.count}</Text>
              <Text style={styles.statLabel}>{stats.count === 1 ? 'Listing' : 'Listings'}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBlock}>
              <Text style={styles.statValue}>{stats.avgRating.toFixed(1)} ★</Text>
              <Text style={styles.statLabel}>Avg Rating</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBlock}>
              <Text style={styles.statValue}>{stats.totalReviews}</Text>
              <Text style={styles.statLabel}>Total Reviews</Text>
            </View>
          </View>
        </LinearGradient>
      )}

      {query.isLoading ? (
        <Loading fullScreen />
      ) : (
        <FlatList
          data={listings}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={handleRefresh} tintColor={Colors.primary} />}
          contentContainerStyle={listings.length === 0 ? styles.emptyContainer : styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🏪</Text>
              <Text style={styles.emptyTitle}>No listings yet</Text>
              <Text style={styles.emptySub}>Add your first service listing to start reaching pet owners.</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/service/create')}>
                <Plus size={16} color={Colors.surface} />
                <Text style={styles.emptyBtnText}>Create Listing</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: Colors.background },
  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: Colors.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  backBtn:        { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.neutral100, alignItems: 'center', justifyContent: 'center' },
  headerTitle:    { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  addBtn:         { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.primaryBg, alignItems: 'center', justifyContent: 'center' },

  // ── Stats banner ──
  statsBanner: { paddingHorizontal: 20, paddingVertical: 16 },
  statsRow:    { flexDirection: 'row', alignItems: 'center' },
  statBlock:   { flex: 1, alignItems: 'center', gap: 2 },
  statValue:   { fontSize: 20, fontWeight: '800', color: Colors.surface },
  statLabel:   { fontSize: 11, color: 'rgba(255,255,255,0.75)', fontWeight: '600' },
  statDivider: { width: 1, height: 36, backgroundColor: 'rgba(255,255,255,0.25)' },

  // ── List ──
  list:           { paddingBottom: 40 },
  emptyContainer: { flex: 1 },
  separator:      { height: StyleSheet.hairlineWidth, backgroundColor: Colors.border, marginLeft: 72 },

  // ── Row ──
  row:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: Colors.surface, gap: 12 },
  rowEmoji:     { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.neutral50, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  rowEmojiText: { fontSize: 22 },
  rowBody:      { flex: 1, gap: 3 },
  rowTop:       { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowName:      { flex: 1, fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  rowType:      { fontSize: 12, color: Colors.textSecondary },
  rowMeta:      { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rowRating:    { fontSize: 12, fontWeight: '700', color: Colors.textPrimary },
  rowReviews:   { fontSize: 12, color: Colors.textSecondary },
  pendingBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, marginLeft: 6, backgroundColor: '#FFF8E1', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  pendingText:  { fontSize: 10, fontWeight: '600', color: Colors.warning },

  // ── Empty state ──
  empty:        { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, paddingTop: 80, gap: 12 },
  emptyEmoji:   { fontSize: 52 },
  emptyTitle:   { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  emptySub:     { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  emptyBtn:     { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, marginTop: 4 },
  emptyBtnText: { fontSize: 14, fontWeight: '700', color: Colors.surface },
});
