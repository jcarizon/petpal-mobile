import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Building2, Clock3, Info, MapPin, Phone, Plus } from 'lucide-react-native';
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
import { ScreenHeader } from '../../components/ui';
import { useToast } from '../../components/ui';

export default function ServiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { service, isLoading, refetch } = useService(id);
  const [refreshing, setRefreshing] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const { showToast } = useToast();

  const reviewsQuery = useQuery({
    queryKey: ['reviews', id],
    queryFn: async () => {
      const response = await api.get<{ success: boolean; data: Review[] }>(`/services/${id}/reviews`);
      return response.data?.data ?? [];
    },
    enabled: !!id,
  });

  const submitReviewMutation = useMutation({
    mutationFn: (data: CreateReviewRequest) =>
      api.post(`/services/${id}/reviews`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews', id] });
      queryClient.invalidateQueries({ queryKey: ['service', id] });
      setShowReviewForm(false);
      setComment('');
      setRating(5);
      showToast({
        type: 'success',
        title: 'Review submitted',
        message: 'Thanks for sharing your experience.',
      });
    },
    onError: (error) => {
      showToast({
        type: 'error',
        title: 'Review failed',
        message: (error as { message?: string })?.message ?? 'Please try again.',
      });
    },
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetch(), reviewsQuery.refetch()]);
    setRefreshing(false);
  };

  const handleCall = () => {
    if (service?.phone) {
      Linking.openURL(`tel:${service.phone}`);
    }
  };

  if (isLoading || !service) {
    return <Loading fullScreen />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScreenHeader
        title="Service Details"
        subtitle="Contact information, ratings, and community reviews"
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.serviceIcon}>
            <Building2 size={34} color={Colors.primary} />
          </View>
          <Text style={styles.serviceName}>{service.name}</Text>
          <Text style={styles.serviceType}>{formatServiceType(service.type)}</Text>

          <View style={styles.badgeRow}>
            {service.isVerified && (
              <Badge label="✓ Verified" variant="default" size="md" />
            )}
            {service.isHighlyRecommended && (
              <Badge label="⭐ Highly Recommended" variant="warning" size="md" />
            )}
          </View>

          <RatingStars rating={service.rating} reviewCount={service.reviewCount} size="lg" />
        </View>

        {/* Info */}
        <View style={styles.section}>
          <Card>
            <View style={styles.infoItem}>
              <MapPin size={16} color={Colors.textSecondary} />
              <Text style={styles.infoText}>{service.address}, {service.city}</Text>
            </View>
            {service.phone && (
              <View style={styles.infoItem}>
                <Phone size={16} color={Colors.textSecondary} />
                <Text style={[styles.infoText, styles.phoneText]} onPress={handleCall}>
                  {service.phone}
                </Text>
              </View>
            )}
            {service.hours && (
              <View style={styles.infoItem}>
                <Clock3 size={16} color={Colors.textSecondary} />
                <Text style={styles.infoText}>{service.hours}</Text>
              </View>
            )}
            {service.description && (
              <View style={styles.infoItem}>
                <Info size={16} color={Colors.textSecondary} />
                <Text style={styles.infoText}>{service.description}</Text>
              </View>
            )}
          </Card>
        </View>

        {/* Contact button */}
        {service.phone && (
          <View style={styles.section}>
            <Button
              title={`Call ${service.phone}`}
              variant="primary"
              onPress={handleCall}
              fullWidth
            />
          </View>
        )}

        {/* Reviews */}
        <View style={styles.section}>
          <View style={styles.reviewsHeader}>
            <Text style={styles.sectionTitle}>Reviews</Text>
            <TouchableOpacity onPress={() => setShowReviewForm((prev) => !prev)}>
              <View style={styles.writeReviewRow}>
                <Plus size={14} color={Colors.primary} />
                <Text style={styles.writeReview}>Write Review</Text>
              </View>
            </TouchableOpacity>
          </View>

          {showReviewForm && (
            <Card style={styles.reviewForm}>
              <Text style={styles.reviewFormTitle}>Your Review</Text>

              {/* Star rating selector */}
              <View style={styles.ratingSelector}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <TouchableOpacity key={s} onPress={() => setRating(s)}>
                    <Text style={[styles.ratingStar, { color: s <= rating ? Colors.secondary : Colors.neutral300 }]}>
                      ★
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Input
                placeholder="Share your experience..."
                value={comment}
                onChangeText={setComment}
                multiline
                numberOfLines={3}
                style={{ minHeight: 80, textAlignVertical: 'top' }}
              />

              <Button
                title="Submit Review"
                variant="primary"
                onPress={() => submitReviewMutation.mutate({ rating, comment: comment.trim() || undefined })}
                isLoading={submitReviewMutation.isPending}
                fullWidth
              />
            </Card>
          )}

          {reviewsQuery.isLoading ? (
            <Loading size="small" />
          ) : (reviewsQuery.data ?? []).length === 0 ? (
            <Text style={styles.noReviews}>No reviews yet. Be the first!</Text>
          ) : (
            (reviewsQuery.data ?? []).map((review) => (
              <ReviewItem key={review.id} review={review} />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    alignItems: 'center',
    padding: 24,
    gap: 8,
  },
  serviceIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  serviceName: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  serviceType: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  section: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 12,
  },
  infoItem: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    paddingVertical: 8,
  },
  infoText: {
    fontSize: 14,
    color: Colors.textPrimary,
    flex: 1,
    lineHeight: 20,
  },
  phoneText: {
    color: Colors.primary,
    fontWeight: '600',
  },
  reviewsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  writeReview: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
  writeReviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reviewForm: {
    gap: 12,
  },
  reviewFormTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  ratingSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  ratingStar: {
    fontSize: 28,
  },
  noReviews: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    padding: 20,
  },
});
