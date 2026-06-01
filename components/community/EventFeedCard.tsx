import React, { useState, useCallback } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Calendar, MapPin, Users } from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import { PetEvent } from '../../types';
import { useCommunityStore } from '../../store/communityStore';
import { useAuthStore } from '../../store/authStore';

interface Props {
  event: PetEvent;
}

const CARD_WIDTH = Dimensions.get('window').width - 40;

function formatEventDate(startDate: string, endDate?: string): string {
  const start = new Date(startDate);
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const timeOpts: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit', hour12: true };
  const datePart = start.toLocaleDateString('en-PH', opts);
  const timePart = start.toLocaleTimeString('en-PH', timeOpts);
  return `${datePart} · ${timePart}`;
}

function EventFeedCardComponent({ event }: Props) {
  const router = useRouter();
  const { rsvpEvent } = useCommunityStore();
  const { user } = useAuthStore();
  const [expanded, setExpanded]       = useState(false);
  const [isTruncated, setIsTruncated] = useState(false);

  const onDescLayout = useCallback((e: { nativeEvent: { lines: unknown[] } }) => {
    if (!expanded) setIsTruncated(e.nativeEvent.lines.length >= 2);
  }, [expanded]);

  const isPast = new Date(event.startDate) < new Date();
  const isFull = event.maxRsvps != null && event.rsvpCount >= event.maxRsvps;

  const handleRsvp = async (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    await rsvpEvent(event.id);
  };

  return (
    <View style={styles.card}>
      {/* Banner */}
      <TouchableOpacity onPress={() => router.push(`/event/${event.id}`)} activeOpacity={0.9}>
        {event.imageUrl ? (
          <Image source={{ uri: event.imageUrl }} style={styles.banner} resizeMode="cover" />
        ) : (
          <View style={styles.bannerFallback}>
            <Text style={styles.bannerEmoji}>📅</Text>
          </View>
        )}
        <View style={styles.eventPillWrap}>
          <View style={styles.eventPill}>
            <Calendar size={10} color="#fff" />
            <Text style={styles.eventPillText}>Event</Text>
          </View>
          {isPast && (
            <View style={[styles.eventPill, { backgroundColor: Colors.neutral500 }]}>
              <Text style={styles.eventPillText}>Past</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>

      {/* Body */}
      <TouchableOpacity style={styles.body} onPress={() => router.push(`/event/${event.id}`)} activeOpacity={0.8}>
        <Text style={styles.title} numberOfLines={2}>{event.title}</Text>
        <View style={styles.metaRow}>
          <Calendar size={13} color={Colors.textSecondary} />
          <Text style={styles.metaText}>{formatEventDate(event.startDate, event.endDate)}</Text>
        </View>
        <View style={styles.metaRow}>
          <MapPin size={13} color={Colors.textSecondary} />
          <Text style={styles.metaText} numberOfLines={1}>{event.location}</Text>
        </View>
      </TouchableOpacity>
      {event.description && (
        <View style={styles.descWrap}>
          {expanded ? (
            <Text style={styles.description}>{event.description}</Text>
          ) : (
            <Text style={styles.description} numberOfLines={2} onTextLayout={onDescLayout}>
              {event.description}
            </Text>
          )}
          {!expanded && isTruncated && (
            <TouchableOpacity onPress={() => setExpanded(true)} hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}>
              <Text style={styles.moreText}>more</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.rsvpCount}>
          <Users size={14} color={Colors.textSecondary} />
          <Text style={styles.rsvpCountText}>
            {event.rsvpCount} going{event.maxRsvps ? ` · ${event.maxRsvps - event.rsvpCount} spots left` : ''}
          </Text>
        </View>
        {!isPast && (
          <TouchableOpacity
            style={[styles.rsvpBtn, isFull && styles.rsvpBtnFull]}
            onPress={handleRsvp}
            disabled={isFull}
          >
            <Text style={[styles.rsvpBtnText, isFull && styles.rsvpBtnTextFull]}>
              {isFull ? 'Full' : 'RSVP'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export const EventFeedCard = React.memo(EventFeedCardComponent);

const styles = StyleSheet.create({
  card: { backgroundColor: Colors.surface, borderRadius: 16, overflow: 'hidden', elevation: 2, shadowColor: Colors.neutral900, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8 },
  banner: { width: '100%', height: 180 },
  bannerFallback: { width: '100%', height: 140, backgroundColor: Colors.secondaryBg, justifyContent: 'center', alignItems: 'center' },
  bannerEmoji: { fontSize: 48 },
  eventPillWrap: { position: 'absolute', top: 10, left: 10, flexDirection: 'row', gap: 6 },
  eventPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.secondary, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  eventPillText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  body: { padding: 12 },
  title: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary, marginBottom: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  metaText: { fontSize: 13, color: Colors.textSecondary, flex: 1 },
  description: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  descWrap: { paddingHorizontal: 12, paddingBottom: 8 },
  moreText: { fontSize: 13, color: Colors.neutral400, marginTop: 3 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingBottom: 12 },
  rsvpCount: { flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1 },
  rsvpCountText: { fontSize: 12, color: Colors.textSecondary },
  rsvpBtn: { backgroundColor: Colors.primary, borderRadius: 20, paddingHorizontal: 18, paddingVertical: 7 },
  rsvpBtnFull: { backgroundColor: Colors.neutral200 },
  rsvpBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  rsvpBtnTextFull: { color: Colors.textDisabled },
});
