import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  CalendarDays,
  MapPin,
  Users,
  Clock,
  CheckCircle,
  ExternalLink,
} from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import { Loading } from '../../components/ui/Loading';
import { Button } from '../../components/ui/Button';
import { useCommunityStore } from '../../store/communityStore';
import { useAuthStore } from '../../store/authStore';

function formatEventDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-PH', {
    weekday: 'short',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatEventTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-PH', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const { selectedEvent, fetchEvent, rsvpEvent, isLoading, error } = useCommunityStore();
  const [refreshing, setRefreshing] = useState(false);
  const [hasRsvped, setHasRsvped] = useState(false);
  const [rsvping, setRsvping] = useState(false);

  useEffect(() => {
    if (id) fetchEvent(id);
  }, [id, fetchEvent]);

  const handleRefresh = async () => {
    setRefreshing(true);
    if (id) await fetchEvent(id);
    setRefreshing(false);
  };

  const handleRsvp = async () => {
    if (!user) {
      Alert.alert('Sign in required', 'Please sign in to RSVP to events.');
      return;
    }
    if (hasRsvped) return;
    setRsvping(true);
    try {
      await rsvpEvent(id!);
      setHasRsvped(true);
    } catch {
      Alert.alert('RSVP failed', 'You may have already RSVPed or the event is full.');
    } finally {
      setRsvping(false);
    }
  };

  const handleOpenMaps = (location: string) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
    Linking.openURL(url);
  };

  if (isLoading && !selectedEvent) return <Loading fullScreen />;

  if (error && !selectedEvent) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={20} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <View style={styles.errorState}>
          <Text style={styles.errorTitle}>Event not found</Text>
          <Text style={styles.errorSub}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const event = selectedEvent;
  if (!event) return <Loading fullScreen />;

  const isFull = event.maxRsvps !== undefined && event.rsvpCount >= event.maxRsvps;
  const spotsLeft = event.maxRsvps !== undefined ? event.maxRsvps - event.rsvpCount : null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={20} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{event.title}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />}
        contentContainerStyle={styles.scroll}
      >
        {/* Banner image */}
        {event.imageUrl ? (
          <Image source={{ uri: event.imageUrl }} style={styles.banner} resizeMode="cover" />
        ) : (
          <View style={styles.bannerPlaceholder}>
            <Text style={styles.bannerEmoji}>🎉</Text>
          </View>
        )}

        {/* Event card */}
        <View style={styles.card}>
          <Text style={styles.title}>{event.title}</Text>

          {event.description ? (
            <Text style={styles.description}>{event.description}</Text>
          ) : null}

          {/* Date & time */}
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <CalendarDays size={16} color={Colors.primary} />
            </View>
            <View style={styles.infoText}>
              <Text style={styles.infoLabel}>Date</Text>
              <Text style={styles.infoValue}>{formatEventDate(event.startDate)}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Clock size={16} color={Colors.secondary} />
            </View>
            <View style={styles.infoText}>
              <Text style={styles.infoLabel}>Time</Text>
              <Text style={styles.infoValue}>
                {formatEventTime(event.startDate)}
                {event.endDate ? ` – ${formatEventTime(event.endDate)}` : ''}
              </Text>
            </View>
          </View>

          {/* Location */}
          <TouchableOpacity style={styles.infoRow} onPress={() => handleOpenMaps(event.location)} activeOpacity={0.7}>
            <View style={styles.infoIcon}>
              <MapPin size={16} color={Colors.error} />
            </View>
            <View style={styles.infoText}>
              <Text style={styles.infoLabel}>Location</Text>
              <Text style={[styles.infoValue, styles.infoLink]}>{event.location}</Text>
            </View>
            <ExternalLink size={14} color={Colors.primary} />
          </TouchableOpacity>

          {/* Attendees */}
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Users size={16} color={Colors.info} />
            </View>
            <View style={styles.infoText}>
              <Text style={styles.infoLabel}>Attendees</Text>
              <Text style={styles.infoValue}>
                {event.rsvpCount} going
                {spotsLeft !== null ? ` · ${isFull ? 'Full' : `${spotsLeft} spots left`}` : ''}
              </Text>
            </View>
          </View>
        </View>

        {/* RSVP section */}
        <View style={styles.rsvpCard}>
          {hasRsvped ? (
            <View style={styles.rsvpedRow}>
              <CheckCircle size={20} color={Colors.success} />
              <Text style={styles.rsvpedText}>You're going! See you there.</Text>
            </View>
          ) : (
            <>
              {isFull && (
                <Text style={styles.fullText}>This event is full.</Text>
              )}
              <Button
                title={isFull ? 'Event Full' : rsvping ? 'Confirming...' : 'RSVP — I\'m Going!'}
                variant="primary"
                fullWidth
                size="lg"
                onPress={handleRsvp}
                isLoading={rsvping}
              />
            </>
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
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  scroll: {
    paddingBottom: 40,
  },
  banner: {
    width: '100%',
    height: 220,
  },
  bannerPlaceholder: {
    width: '100%',
    height: 180,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerEmoji: {
    fontSize: 64,
  },
  card: {
    margin: 16,
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 20,
    gap: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.neutral900,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  description: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 21,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.neutral50,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  infoText: {
    flex: 1,
    gap: 1,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  infoLink: {
    color: Colors.primary,
    textDecorationLine: 'underline',
  },
  rsvpCard: {
    marginHorizontal: 16,
    marginTop: 4,
  },
  rsvpedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.successBg,
    borderRadius: 14,
    padding: 16,
  },
  rsvpedText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.success,
  },
  fullText: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 8,
  },
  errorState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 8,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  errorSub: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
