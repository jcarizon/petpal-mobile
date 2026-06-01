import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Linking, RefreshControl, Image, FlatList, Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft, Building2, Clock, MapPin, Phone, Plus,
  Mail, Globe, Facebook, Instagram, CheckCircle, Star,
  Tag, Award,
} from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Loading } from '../../components/ui/Loading';
import { ReviewItem } from '../../components/services/ReviewItem';
import { RatingStars } from '../../components/services/RatingStars';
import { useService } from '../../hooks/useServices';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { Review, CreateReviewRequest } from '../../types';
import { formatServiceType } from '../../lib/utils';
import { Input } from '../../components/ui/Input';
import { useToast } from '../../components/ui';
import { useAuthStore } from '../../store/authStore';
import { isServiceProvider } from '../../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DAYS_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const DAY_LABELS: Record<string, string> = {
  mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday',
  fri: 'Friday', sat: 'Saturday', sun: 'Sunday',
};
const JS_DAY_MAP: Record<number, string> = {
  1: 'mon', 2: 'tue', 3: 'wed', 4: 'thu', 5: 'fri', 6: 'sat', 0: 'sun',
};

function isOpenNow(openingHours?: Record<string, string>): boolean | null {
  if (!openingHours) return null;
  const now  = new Date();
  const day  = JS_DAY_MAP[now.getDay()];
  const hours = openingHours[day];
  if (!hours) return false;
  const [open, close] = hours.split('-');
  if (!open || !close) return null;
  const [oh, om] = open.split(':').map(Number);
  const [ch, cm] = close.split(':').map(Number);
  const cur = now.getHours() * 60 + now.getMinutes();
  return cur >= oh * 60 + om && cur < ch * 60 + cm;
}

export default function ServiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router  = useRouter();
  const queryClient = useQueryClient();
  const { user }   = useAuthStore();
  const { service, isLoading, refetch } = useService(id);
  const [refreshing,      setRefreshing]     = useState(false);
  const [showReviewForm,  setShowReviewForm] = useState(false);
  const [rating,          setRating]         = useState(5);
  const [comment,         setComment]        = useState('');
  const [photoIndex,      setPhotoIndex]     = useState(0);
  const { showToast } = useToast();

  const reviewsQuery = useQuery({
    queryKey: ['reviews', id],
    queryFn: async () => {
      const r = await api.get<{ success: boolean; data: Review[] }>(`/services/${id}/reviews`);
      return r.data?.data ?? [];
    },
    enabled: !!id,
  });

  const submitReviewMutation = useMutation({
    mutationFn: (data: CreateReviewRequest) => api.post(`/services/${id}/reviews`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews', id] });
      queryClient.invalidateQueries({ queryKey: ['service', id] });
      setShowReviewForm(false);
      setComment('');
      setRating(5);
      showToast({ type: 'success', title: 'Review submitted', message: 'Thanks for sharing your experience.' });
    },
    onError: (error) => {
      showToast({ type: 'error', title: 'Review failed', message: (error as { message?: string })?.message ?? 'Please try again.' });
    },
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetch(), reviewsQuery.refetch()]);
    setRefreshing(false);
  };

  if (isLoading || !service) return <Loading fullScreen />;

  const allPhotos = service.photos?.length ? service.photos : (service.logoUrl ? [service.logoUrl] : []);
  const openStatus = isOpenNow(service.openingHours);
  const isOwner    = user?.id === service.ownerId;
  const canEdit    = isOwner || isServiceProvider(user?.role);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Back + edit header */}
      <View style={styles.navBar}>
        <TouchableOpacity style={styles.navBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.navTitle} numberOfLines={1}>{service.name}</Text>
        {canEdit && isOwner ? (
          <TouchableOpacity style={styles.navBtn} onPress={() => router.push(`/service/${id}/edit`)}>
            <Text style={styles.editText}>Edit</Text>
          </TouchableOpacity>
        ) : <View style={{ width: 52 }} />}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />}>

        {/* Photo carousel */}
        {allPhotos.length > 0 ? (
          <View style={styles.carouselWrap}>
            <FlatList
              data={allPhotos}
              horizontal pagingEnabled showsHorizontalScrollIndicator={false}
              keyExtractor={(_, i) => String(i)}
              onMomentumScrollEnd={(e) => setPhotoIndex(Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH))}
              renderItem={({ item }) => (
                <Image source={{ uri: item }} style={styles.carouselPhoto} resizeMode="cover" />
              )}
            />
{allPhotos.length > 1 && (
               <View style={styles.dots}>
                 {allPhotos.map((photo, i) => (
                   <View key={photo} style={[styles.dot, i === photoIndex && styles.dotActive]} />
                 ))}
               </View>
             )}
          </View>
        ) : (
          <View style={styles.noPhoto}>
            <Building2 size={48} color={Colors.neutral300} />
          </View>
        )}

        {/* Name + type + badges */}
        <View style={styles.heroSection}>
          <View style={styles.heroTop}>
            <View style={styles.heroNameBlock}>
              <Text style={styles.serviceName}>{service.name}</Text>
              <Text style={styles.serviceType}>{formatServiceType(service.type)}</Text>
            </View>
            {service.isVerified && (
              <View style={styles.verifiedBadge}>
                <CheckCircle size={14} color={Colors.primary} />
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            )}
          </View>

          <RatingStars rating={service.rating} reviewCount={service.reviewCount} size="md" />

          {service.isHighlyRecommended && (
            <View style={styles.recommendedPill}>
              <Star size={12} color={Colors.secondary} />
              <Text style={styles.recommendedText}>Highly Recommended</Text>
            </View>
          )}

          {/* Open Now / Closed indicator */}
          {openStatus !== null && (
            <View style={[styles.openPill, { backgroundColor: openStatus ? Colors.successBg : '#FEF2F2' }]}>
              <View style={[styles.openDot, { backgroundColor: openStatus ? Colors.success : Colors.error }]} />
              <Text style={[styles.openText, { color: openStatus ? Colors.success : Colors.error }]}>
                {openStatus ? 'Open Now' : 'Closed Now'}
              </Text>
            </View>
          )}

          {/* Tags */}
          {(service.tags ?? []).length > 0 && (
            <View style={styles.chipRow}>
              {service.tags!.map((t) => (
                <View key={t} style={styles.tagChip}>
                  <Tag size={10} color={Colors.textSecondary} />
                  <Text style={styles.tagChipText}>{t}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Specialties */}
          {(service.specialties ?? []).length > 0 && (
            <View style={styles.chipRow}>
              {service.specialties!.map((s) => (
                <View key={s} style={styles.specialtyChip}>
                  <Award size={10} color={Colors.primary} />
                  <Text style={styles.specialtyChipText}>{s}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Info card */}
        <View style={styles.section}>
          <Card>
            <View style={styles.infoRow}>
              <MapPin size={16} color={Colors.textSecondary} />
              <Text style={styles.infoText}>{service.address}, {service.city}</Text>
            </View>
            {service.phone && (
              <TouchableOpacity style={styles.infoRow} onPress={() => Linking.openURL(`tel:${service.phone}`)}>
                <Phone size={16} color={Colors.primary} />
                <Text style={[styles.infoText, { color: Colors.primary, fontWeight: '600' }]}>{service.phone}</Text>
              </TouchableOpacity>
            )}
            {service.email && (
              <TouchableOpacity style={styles.infoRow} onPress={() => Linking.openURL(`mailto:${service.email}`)}>
                <Mail size={16} color={Colors.textSecondary} />
                <Text style={[styles.infoText, { color: Colors.primary }]}>{service.email}</Text>
              </TouchableOpacity>
            )}
            {service.website && (
              <TouchableOpacity style={styles.infoRow} onPress={() => Linking.openURL(service.website!)}>
                <Globe size={16} color={Colors.textSecondary} />
                <Text style={[styles.infoText, { color: Colors.primary }]}>{service.website}</Text>
              </TouchableOpacity>
            )}
            {service.facebook && (
              <TouchableOpacity style={styles.infoRow} onPress={() => Linking.openURL(service.facebook!)}>
                <Facebook size={16} color="#1877F2" />
                <Text style={[styles.infoText, { color: '#1877F2' }]}>Facebook</Text>
              </TouchableOpacity>
            )}
            {service.instagram && (
              <TouchableOpacity style={styles.infoRow} onPress={() => Linking.openURL(`https://instagram.com/${service.instagram!.replace('@', '')}`)}>
                <Instagram size={16} color="#E4405F" />
                <Text style={[styles.infoText, { color: '#E4405F' }]}>{service.instagram}</Text>
              </TouchableOpacity>
            )}
            {service.description && (
              <View style={[styles.infoRow, { alignItems: 'flex-start' }]}>
                <Text style={styles.infoText}>{service.description}</Text>
              </View>
            )}
          </Card>
        </View>

        {/* Opening hours */}
        {service.openingHours && Object.keys(service.openingHours).length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Clock size={14} color={Colors.primary} />
              <Text style={styles.sectionTitle}>Opening Hours</Text>
            </View>
            <Card>
              {DAYS_ORDER.map((day) => {
                const hours = service.openingHours![day];
                const isToday = JS_DAY_MAP[new Date().getDay()] === day;
                return (
                  <View key={day} style={[styles.hourRow, isToday && styles.hourRowToday]}>
                    <Text style={[styles.hourDay, isToday && styles.hourDayToday]}>{DAY_LABELS[day]}</Text>
                    <Text style={[styles.hourVal, isToday && styles.hourValToday]}>
                      {hours ?? 'Closed'}
                    </Text>
                  </View>
                );
              })}
            </Card>
          </View>
        )}

        {/* Owner card */}
        {service.ownerName && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About the Provider</Text>
            <Card style={styles.ownerCard}>
              <View style={styles.ownerAvatarWrap}>
                {service.ownerAvatarUrl ? (
                  <Image source={{ uri: service.ownerAvatarUrl }} style={styles.ownerAvatar} />
                ) : (
                  <View style={styles.ownerAvatarPlaceholder}>
                    <Text style={styles.ownerInitial}>{service.ownerName.charAt(0).toUpperCase()}</Text>
                  </View>
                )}
              </View>
              <View style={styles.ownerInfo}>
                <Text style={styles.ownerName}>{service.ownerName}</Text>
                <Text style={styles.ownerSub}>Service Provider · PetPal member</Text>
              </View>
            </Card>
          </View>
        )}

        {/* Call CTA */}
        {service.phone && (
          <View style={styles.section}>
            <Button title={`📞 Call ${service.phone}`} variant="primary" onPress={() => Linking.openURL(`tel:${service.phone}`)} fullWidth />
          </View>
        )}

        {/* Reviews */}
        <View style={styles.section}>
          <View style={styles.reviewsHeader}>
            <Text style={styles.sectionTitle}>Reviews ({service.reviewCount})</Text>
            <TouchableOpacity onPress={() => setShowReviewForm((p) => !p)} style={styles.writeReviewBtn}>
              <Plus size={14} color={Colors.primary} />
              <Text style={styles.writeReviewText}>Write Review</Text>
            </TouchableOpacity>
          </View>

          {showReviewForm && (
            <Card style={{ gap: 12 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: Colors.textPrimary }}>Your Review</Text>
              <View style={{ flexDirection: 'row', gap: 4 }}>
                {[1,2,3,4,5].map((s) => (
                  <TouchableOpacity key={s} onPress={() => setRating(s)}>
                    <Text style={{ fontSize: 28, color: s <= rating ? Colors.secondary : Colors.neutral200 }}>★</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Input placeholder="Share your experience…" value={comment} onChangeText={setComment} multiline numberOfLines={3} style={{ minHeight: 80, textAlignVertical: 'top' }} />
              <Button title="Submit Review" variant="primary" onPress={() => submitReviewMutation.mutate({ rating, comment: comment.trim() || undefined })} isLoading={submitReviewMutation.isPending} fullWidth />
            </Card>
          )}

          {reviewsQuery.isLoading ? <Loading size="small" /> :
           (reviewsQuery.data ?? []).length === 0 ? (
            <Text style={{ textAlign: 'center', color: Colors.textSecondary, paddingVertical: 20 }}>No reviews yet. Be the first!</Text>
           ) : (
            (reviewsQuery.data ?? []).map((review) => <ReviewItem key={review.id} review={review} />)
           )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:          { flex: 1, backgroundColor: Colors.background },
  navBar:             { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10, backgroundColor: Colors.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  navBtn:             { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.neutral100, alignItems: 'center', justifyContent: 'center' },
  navTitle:           { flex: 1, fontSize: 16, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center', marginHorizontal: 8 },
  editText:           { fontSize: 14, fontWeight: '700', color: Colors.primary, paddingHorizontal: 8 },
  carouselWrap:       { position: 'relative' },
  carouselPhoto:      { width: SCREEN_WIDTH, height: SCREEN_WIDTH * 0.65 },
  noPhoto:            { height: 140, backgroundColor: Colors.neutral50, alignItems: 'center', justifyContent: 'center' },
  dots:               { flexDirection: 'row', justifyContent: 'center', gap: 5, paddingVertical: 8 },
  dot:                { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.neutral300 },
  dotActive:          { backgroundColor: Colors.primary, width: 16 },
  heroSection:        { padding: 20, gap: 10 },
  heroTop:            { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  heroNameBlock:      { flex: 1 },
  serviceName:        { fontSize: 22, fontWeight: '800', color: Colors.textPrimary },
  serviceType:        { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  verifiedBadge:      { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.primaryBg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  verifiedText:       { fontSize: 12, fontWeight: '700', color: Colors.primary },
  recommendedPill:    { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', backgroundColor: Colors.secondaryBg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 16 },
  recommendedText:    { fontSize: 12, fontWeight: '600', color: Colors.secondary },
  openPill:           { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16 },
  openDot:            { width: 7, height: 7, borderRadius: 4 },
  openText:           { fontSize: 12, fontWeight: '700' },
  chipRow:            { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tagChip:            { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, backgroundColor: Colors.neutral50, borderWidth: 1, borderColor: Colors.border },
  tagChipText:        { fontSize: 11, fontWeight: '600', color: Colors.textSecondary },
  specialtyChip:      { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, backgroundColor: Colors.primaryBg },
  specialtyChipText:  { fontSize: 11, fontWeight: '600', color: Colors.primary },
  section:            { paddingHorizontal: 20, paddingBottom: 16, gap: 10 },
  sectionTitle:       { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  sectionHeaderRow:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoRow:            { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  infoText:           { flex: 1, fontSize: 14, color: Colors.textPrimary, lineHeight: 20 },
  hourRow:            { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, paddingHorizontal: 4 },
  hourRowToday:       { backgroundColor: Colors.primaryBg, borderRadius: 8, paddingHorizontal: 10 },
  hourDay:            { fontSize: 13, color: Colors.textSecondary, width: 90 },
  hourDayToday:       { color: Colors.primary, fontWeight: '700' },
  hourVal:            { fontSize: 13, color: Colors.textPrimary },
  hourValToday:       { color: Colors.primary, fontWeight: '700' },
  ownerCard:          { flexDirection: 'row', alignItems: 'center', gap: 12 },
  ownerAvatarWrap:    {},
  ownerAvatar:        { width: 48, height: 48, borderRadius: 24 },
  ownerAvatarPlaceholder: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.primaryBg, alignItems: 'center', justifyContent: 'center' },
  ownerInitial:       { fontSize: 20, fontWeight: '700', color: Colors.primary },
  ownerInfo:          { flex: 1 },
  ownerName:          { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  ownerSub:           { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  reviewsHeader:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  writeReviewBtn:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  writeReviewText:    { fontSize: 14, fontWeight: '700', color: Colors.primary },
});
