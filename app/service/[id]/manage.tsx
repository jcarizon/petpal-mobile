import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, FlatList, Dimensions, Linking, Alert, RefreshControl, Share,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft, Edit2, Star, CheckCircle, Clock, Eye, Share2,
  MapPin, Phone, Globe, Mail, Facebook, Instagram, Trash2,
} from 'lucide-react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../../constants/colors';
import { Card } from '../../../components/ui/Card';
import { Loading } from '../../../components/ui/Loading';
import { ReviewItem } from '../../../components/services/ReviewItem';
import { RatingStars } from '../../../components/services/RatingStars';
import { useService } from '../../../hooks/useServices';
import { useToast } from '../../../components/ui';
import { formatServiceType } from '../../../lib/utils';
import api from '../../../lib/api';
import { Review } from '../../../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const DAYS_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const DAY_LABELS: Record<string, string> = {
  mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun',
};
const JS_DAY_MAP: Record<number, string> = {
  1: 'mon', 2: 'tue', 3: 'wed', 4: 'thu', 5: 'fri', 6: 'sat', 0: 'sun',
};

function isOpenNow(openingHours?: Record<string, string>): boolean | null {
  if (!openingHours) return null;
  const day   = JS_DAY_MAP[new Date().getDay()];
  const hours = openingHours[day];
  if (!hours) return false;
  const [open, close] = hours.split('-');
  if (!open || !close) return null;
  const [oh, om] = open.split(':').map(Number);
  const [ch, cm] = close.split(':').map(Number);
  const cur = new Date().getHours() * 60 + new Date().getMinutes();
  return cur >= oh * 60 + om && cur < ch * 60 + cm;
}

export default function ManageListingScreen() {
  const { id }       = useLocalSearchParams<{ id: string }>();
  const router       = useRouter();
  const queryClient  = useQueryClient();
  const { showToast } = useToast();
  const { service, isLoading, refetch } = useService(id);
  const [refreshing,  setRefreshing]  = useState(false);
  const [photoIndex,  setPhotoIndex]  = useState(0);
  const [isDeleting,  setIsDeleting]  = useState(false);

  const reviewsQuery = useQuery({
    queryKey: ['reviews', id],
    queryFn: async () => {
      const r = await api.get<{ success: boolean; data: Review[] }>(`/services/${id}/reviews`);
      return r.data?.data ?? [];
    },
    enabled: !!id,
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetch(), reviewsQuery.refetch()]);
    setRefreshing(false);
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Listing',
      'Are you sure you want to permanently delete this listing? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              await api.delete(`/services/${id}`);
              queryClient.invalidateQueries({ queryKey: ['my-listings'] });
              showToast({ type: 'success', title: 'Listing deleted' });
              router.replace('/service/my-listings');
            } catch (err) {
              showToast({ type: 'error', title: 'Delete failed', message: (err as { message?: string }).message ?? 'Please try again.' });
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  const handleShare = async () => {
    if (!service) return;
    try {
      await Share.share({
        title: service.name,
        message: `Check out ${service.name} on PawRok!\n${service.address}, ${service.city}`,
      });
    } catch {
      // share dismissed
    }
  };

  if (isLoading || !service) return <Loading fullScreen />;

  const allPhotos  = service.photos?.length ? service.photos : (service.logoUrl ? [service.logoUrl] : []);
  const openStatus = isOpenNow(service.openingHours);
  const reviews    = reviewsQuery.data ?? [];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ── Nav bar ── */}
      <View style={styles.navBar}>
        <TouchableOpacity style={styles.navBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.navTitle} numberOfLines={1}>Manage Listing</Text>
        <TouchableOpacity style={styles.navEditBtn} onPress={() => router.push(`/service/${id}/edit`)}>
          <Edit2 size={15} color={Colors.primary} />
          <Text style={styles.navEditText}>Edit</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />}
      >
        {/* ── Hero banner ── */}
        <LinearGradient
          colors={[Colors.heroGradientStart, Colors.heroGradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroBanner}
        >
          <View style={styles.heroContent}>
            <View style={styles.heroTypeBadge}>
              <Text style={styles.heroTypeBadgeText}>{formatServiceType(service.type)}</Text>
            </View>
            <Text style={styles.heroName}>{service.name}</Text>
            <Text style={styles.heroCity}>{service.address}, {service.city}</Text>
            <View style={styles.heroBadgeRow}>
              {service.isVerified ? (
                <View style={styles.verifiedPill}>
                  <CheckCircle size={12} color={Colors.primary} />
                  <Text style={styles.verifiedText}>Verified</Text>
                </View>
              ) : (
                <View style={styles.pendingPill}>
                  <Clock size={12} color={Colors.warning} />
                  <Text style={styles.pendingText}>Pending Review</Text>
                </View>
              )}
              {openStatus !== null && (
                <View style={[styles.openPill, { backgroundColor: openStatus ? 'rgba(34,197,94,0.18)' : 'rgba(239,68,68,0.18)' }]}>
                  <View style={[styles.openDot, { backgroundColor: openStatus ? Colors.success : Colors.error }]} />
                  <Text style={[styles.openText, { color: openStatus ? Colors.success : Colors.error }]}>
                    {openStatus ? 'Open Now' : 'Closed Now'}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </LinearGradient>

        {/* ── Stats row ── */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{service.rating.toFixed(1)}</Text>
            <View style={styles.statStars}>
              {[1,2,3,4,5].map((s) => (
                <Text key={s} style={[styles.statStar, { color: s <= Math.round(service.rating) ? Colors.secondary : Colors.neutral200 }]}>★</Text>
              ))}
            </View>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{service.reviewCount}</Text>
            <Text style={styles.statLabel}>Reviews</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: service.isVerified ? Colors.primary : Colors.warning }]}>
              {service.isVerified ? '✓' : '⏳'}
            </Text>
            <Text style={styles.statLabel}>{service.isVerified ? 'Verified' : 'Pending'}</Text>
          </View>
        </View>

        {/* ── Quick actions ── */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => router.push(`/service/${id}/edit`)}
          >
            <Edit2 size={18} color={Colors.primary} />
            <Text style={styles.actionBtnText}>Edit Listing</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => router.push(`/service/${id}`)}
          >
            <Eye size={18} color={Colors.primary} />
            <Text style={styles.actionBtnText}>Public View</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={handleShare}>
            <Share2 size={18} color={Colors.primary} />
            <Text style={styles.actionBtnText}>Share</Text>
          </TouchableOpacity>
        </View>

        {/* ── Photos strip ── */}
        {allPhotos.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Photos ({allPhotos.length})</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photosStrip}>
              {allPhotos.map((uri, i) => (
                <Image key={i} source={{ uri }} style={styles.photoThumb} resizeMode="cover" />
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── Contact & info ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact & Info</Text>
          <Card>
            <View style={styles.infoRow}>
              <MapPin size={15} color={Colors.textSecondary} />
              <Text style={styles.infoText}>{service.address}, {service.city}</Text>
            </View>
            {service.phone && (
              <TouchableOpacity style={styles.infoRow} onPress={() => Linking.openURL(`tel:${service.phone}`)}>
                <Phone size={15} color={Colors.primary} />
                <Text style={[styles.infoText, { color: Colors.primary }]}>{service.phone}</Text>
              </TouchableOpacity>
            )}
            {service.email && (
              <TouchableOpacity style={styles.infoRow} onPress={() => Linking.openURL(`mailto:${service.email}`)}>
                <Mail size={15} color={Colors.textSecondary} />
                <Text style={[styles.infoText, { color: Colors.primary }]}>{service.email}</Text>
              </TouchableOpacity>
            )}
            {service.website && (
              <TouchableOpacity style={styles.infoRow} onPress={() => Linking.openURL(service.website!)}>
                <Globe size={15} color={Colors.textSecondary} />
                <Text style={[styles.infoText, { color: Colors.primary }]}>{service.website}</Text>
              </TouchableOpacity>
            )}
            {service.facebook && (
              <TouchableOpacity style={styles.infoRow} onPress={() => Linking.openURL(service.facebook!)}>
                <Facebook size={15} color="#1877F2" />
                <Text style={[styles.infoText, { color: '#1877F2' }]}>Facebook</Text>
              </TouchableOpacity>
            )}
            {service.instagram && (
              <TouchableOpacity style={styles.infoRow} onPress={() => Linking.openURL(`https://instagram.com/${service.instagram!.replace('@', '')}`)}>
                <Instagram size={15} color="#E4405F" />
                <Text style={[styles.infoText, { color: '#E4405F' }]}>{service.instagram}</Text>
              </TouchableOpacity>
            )}
          </Card>
        </View>

        {/* ── Opening hours ── */}
        {service.openingHours && Object.keys(service.openingHours).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Opening Hours</Text>
            <Card>
              {DAYS_ORDER.map((day) => {
                const hours   = service.openingHours![day];
                const isToday = JS_DAY_MAP[new Date().getDay()] === day;
                return (
                  <View key={day} style={[styles.hourRow, isToday && styles.hourRowToday]}>
                    <Text style={[styles.hourDay, isToday && styles.hourDayToday]}>{DAY_LABELS[day]}</Text>
                    <Text style={[styles.hourVal, isToday && styles.hourValToday]}>{hours ?? 'Closed'}</Text>
                  </View>
                );
              })}
            </Card>
          </View>
        )}

        {/* ── Reviews ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reviews ({service.reviewCount})</Text>
          {reviewsQuery.isLoading ? (
            <Loading size="small" />
          ) : reviews.length === 0 ? (
            <Text style={styles.emptyReviews}>No reviews yet.</Text>
          ) : (
            reviews.map((review) => <ReviewItem key={review.id} review={review} />)
          )}
        </View>

        {/* ── Danger zone ── */}
        <View style={styles.section}>
          <View style={styles.dangerCard}>
            <Text style={styles.dangerTitle}>Danger Zone</Text>
            <Text style={styles.dangerDescription}>
              Permanently delete this listing. This action cannot be undone.
            </Text>
            <TouchableOpacity
              style={[styles.deleteBtn, isDeleting && styles.deleteBtnDisabled]}
              onPress={handleDelete}
              disabled={isDeleting}
            >
              <Trash2 size={16} color={Colors.surface} />
              <Text style={styles.deleteBtnText}>Delete Listing</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: Colors.background },

  // ── Nav ──
  navBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: Colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border,
  },
  navBtn:      { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.neutral100, alignItems: 'center', justifyContent: 'center' },
  navTitle:    { flex: 1, fontSize: 16, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center', marginHorizontal: 8 },
  navEditBtn:  { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: Colors.primaryBg },
  navEditText: { fontSize: 13, fontWeight: '700', color: Colors.primary },

  // ── Hero banner ──
  heroBanner: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 24,
  },
  heroContent:       { gap: 6 },
  heroTypeBadge:     { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  heroTypeBadgeText: { fontSize: 11, fontWeight: '700', color: Colors.surface, textTransform: 'uppercase', letterSpacing: 0.5 },
  heroName:          { fontSize: 22, fontWeight: '800', color: Colors.surface },
  heroCity:          { fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  heroBadgeRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  verifiedPill:  { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.surface, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 16 },
  verifiedText:  { fontSize: 11, fontWeight: '700', color: Colors.primary },
  pendingPill:   { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 16 },
  pendingText:   { fontSize: 11, fontWeight: '700', color: Colors.warning },
  openPill:      { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 16 },
  openDot:       { width: 6, height: 6, borderRadius: 3 },
  openText:      { fontSize: 11, fontWeight: '700' },

  // ── Stats row ──
  statsRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface,
    marginHorizontal: 20, marginTop: 16,
    borderRadius: 16,
    paddingVertical: 16,
    shadowColor: Colors.neutral900, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
  },
  statCard:    { flex: 1, alignItems: 'center', gap: 4 },
  statValue:   { fontSize: 22, fontWeight: '800', color: Colors.textPrimary },
  statStars:   { flexDirection: 'row' },
  statStar:    { fontSize: 12 },
  statLabel:   { fontSize: 11, color: Colors.textSecondary, fontWeight: '600' },
  statDivider: { width: 1, height: 40, backgroundColor: Colors.border },

  // ── Quick actions ──
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    marginTop: 16,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.primaryBg,
    shadowColor: Colors.neutral900, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  actionBtnText: { fontSize: 11, fontWeight: '700', color: Colors.primary },

  // ── Photos ──
  photosStrip: { gap: 10, paddingVertical: 4, paddingHorizontal: 4 },
  photoThumb:  { width: 110, height: 110, borderRadius: 12 },

  // ── Section ──
  section:      { paddingHorizontal: 20, paddingTop: 20, gap: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },

  // ── Info rows ──
  infoRow:  { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  infoText: { flex: 1, fontSize: 13, color: Colors.textPrimary, lineHeight: 18 },

  // ── Hours ──
  hourRow:       { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7, paddingHorizontal: 4 },
  hourRowToday:  { backgroundColor: Colors.primaryBg, borderRadius: 8, paddingHorizontal: 10 },
  hourDay:       { fontSize: 13, color: Colors.textSecondary, width: 40 },
  hourDayToday:  { color: Colors.primary, fontWeight: '700' },
  hourVal:       { fontSize: 13, color: Colors.textPrimary },
  hourValToday:  { color: Colors.primary, fontWeight: '700' },

  // ── Reviews ──
  emptyReviews: { textAlign: 'center', color: Colors.textSecondary, paddingVertical: 20, fontSize: 14 },

  // ── Danger zone ──
  dangerCard: {
    borderWidth: 1.5,
    borderColor: Colors.error,
    borderRadius: 14,
    padding: 16,
    gap: 10,
    backgroundColor: '#FFF5F5',
  },
  dangerTitle:       { fontSize: 14, fontWeight: '700', color: Colors.error },
  dangerDescription: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.error,
    borderRadius: 10,
    paddingVertical: 12,
  },
  deleteBtnDisabled: { opacity: 0.6 },
  deleteBtnText: { fontSize: 13, fontWeight: '700', color: Colors.surface },
});
