import React, { useState, useCallback } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Calendar, MapPin, Users, PawPrint, MessageCircle } from 'lucide-react-native';
import { UserAvatarBox } from '../ui/UserAvatarBox';
import { formatRelativeDate } from '../../lib/utils';
import { Colors } from '../../constants/colors';
import { PetEvent } from '../../types';
import { useCommunityStore } from '../../store/communityStore';
import { useAuthStore } from '../../store/authStore';
import { useRsvpStore } from '../../store/rsvpStore';
import api from '../../lib/api';

interface Props {
  event: PetEvent;
}

const W = Dimensions.get('window').width;

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
  const [reacted, setReacted]         = useState(false);
  const [reactionCount, setReactionCount] = useState(event.reactionCount ?? 0);
  const [reacting, setReacting]       = useState(false);
  const [bannerHeight, setBannerHeight] = useState(200);
  const userRsvped = useRsvpStore((s) => s.rsvpedIds.includes(event.id)) || (event.hasRsvp ?? false);

  const onDescLayout = useCallback((e: { nativeEvent: { lines: unknown[] } }) => {
    if (!expanded) setIsTruncated(e.nativeEvent.lines.length >= 2);
  }, [expanded]);

  const isPast = new Date(event.startDate) < new Date();
  const isFull = event.maxRsvps != null && event.rsvpCount >= event.maxRsvps;

  const handleRsvp = async (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    if (userRsvped) return;
    useRsvpStore.getState().markRsvped(event.id); // optimistic + persisted immediately
    try {
      await rsvpEvent(event.id);
    } catch { /* RSVP failures are rare; optimistic state is acceptable */ }
  };

  const handleReact = async () => {
    if (reacting) return;
    setReacting(true);
    const next = !reacted;
    setReacted(next);
    setReactionCount((n) => next ? n + 1 : Math.max(0, n - 1));
    try {
      const res = await api.post(`/community/events/${event.id}/react`);
      const data = res.data?.data;
      if (data) { setReacted(data.reacted); setReactionCount(data.count); }
    } catch {
      setReacted(!next);
      setReactionCount((n) => !next ? n + 1 : Math.max(0, n - 1));
    } finally {
      setReacting(false);
    }
  };

  return (
    <View style={styles.card}>
      {/* Header — organizer info */}
      <TouchableOpacity style={styles.header} onPress={() => router.push(`/event/${event.id}`)} activeOpacity={0.8}>
        {event.creatorName ? (
          <UserAvatarBox avatarUrl={event.creatorAvatarUrl} name={event.creatorName} size={40} />
        ) : (
          <View style={[styles.headerIconBox, { backgroundColor: Colors.secondaryBg }]}>
            <Text style={{ fontSize: 20 }}>📅</Text>
          </View>
        )}
        <View style={styles.headerMid}>
          <Text style={styles.creatorName} numberOfLines={1}>
            {event.creatorName ?? 'PawRok'}
          </Text>
          <Text style={styles.creatorSub}>Organizing an event</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.eventPillSmall}>
            <Calendar size={10} color="#fff" />
            <Text style={styles.eventPillSmallText}>Event</Text>
          </View>
          <Text style={styles.headerTime}>{formatRelativeDate(new Date(event.createdAt))}</Text>
        </View>
      </TouchableOpacity>

      {/* Banner */}
      <TouchableOpacity onPress={() => router.push(`/event/${event.id}`)} activeOpacity={0.9}>
        {event.imageUrl ? (
          <Image
            source={{ uri: event.imageUrl }}
            style={[styles.banner, { height: bannerHeight }]}
            resizeMode="cover"
            onLoad={(e) => {
              const { width: iw, height: ih } = e.nativeEvent.source;
              if (iw && ih) {
                const natural = (W / iw) * ih;
                setBannerHeight(Math.min(Math.max(natural, W * 0.45), W * 1.4));
              }
            }}
          />
        ) : (
          <View style={styles.bannerFallback}>
            <Text style={styles.bannerEmoji}>📅</Text>
          </View>
        )}
        {isPast && (
          <View style={styles.eventPillWrap}>
            <View style={[styles.eventPill, { backgroundColor: Colors.neutral500 }]}>
              <Text style={styles.eventPillText}>Past</Text>
            </View>
          </View>
        )}
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
        <View style={styles.metaRow}>
          <Users size={13} color={Colors.textSecondary} />
          <Text style={styles.metaText}>
            {event.rsvpCount} going{event.maxRsvps ? ` · ${event.maxRsvps - event.rsvpCount} spots left` : ''}
          </Text>
        </View>
      </TouchableOpacity>

      {event.description && (
        <View style={styles.descWrap}>
          <Text
            style={styles.description}
            numberOfLines={expanded ? undefined : 2}
            onTextLayout={expanded ? undefined : onDescLayout}
          >
            {event.description}
          </Text>
          {!expanded && isTruncated ? (
            <TouchableOpacity onPress={() => setExpanded(true)} hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}>
              <Text style={styles.moreText}>more</Text>
            </TouchableOpacity>
          ) : expanded ? (
            <TouchableOpacity onPress={() => setExpanded(false)} hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}>
              <Text style={styles.moreText}>less</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      )}

      {/* Reaction + comment bar */}
      <View style={styles.actionBar}>
        <TouchableOpacity style={styles.actionBtn} onPress={handleReact} disabled={reacting}>
          <PawPrint
            size={22}
            color={reacted ? Colors.primary : Colors.textSecondary}
            fill={reacted ? Colors.primary : 'transparent'}
          />
          {reactionCount > 0 && (
            <Text style={[styles.actionCount, reacted && { color: Colors.primary }]}>
              {reactionCount}
            </Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => router.push(`/event/${event.id}`)}>
          <MessageCircle size={22} color={Colors.textSecondary} strokeWidth={1.8} />
          {(event.commentCount ?? 0) > 0 && (
            <Text style={styles.actionCount}>{event.commentCount}</Text>
          )}
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        {!isPast && (
          <TouchableOpacity
            style={[styles.rsvpBtn, userRsvped && styles.rsvpBtnGoing, isFull && !userRsvped && styles.rsvpBtnFull]}
            onPress={handleRsvp}
            disabled={isFull && !userRsvped}
          >
            <Text style={[styles.rsvpBtnText, userRsvped && styles.rsvpBtnTextGoing, isFull && !userRsvped && styles.rsvpBtnTextFull]}>
              {userRsvped ? 'Going ✓' : isFull ? 'Full' : 'RSVP'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export const EventFeedCard = React.memo(EventFeedCardComponent);

const styles = StyleSheet.create({
  card: { backgroundColor: Colors.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  // Header row
  header: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  headerIconBox: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  headerMid: { flex: 1 },
  creatorName: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  creatorSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  headerRight: { alignItems: 'flex-end', gap: 3 },
  eventPillSmall: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: Colors.secondary, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  eventPillSmallText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  headerTime: { fontSize: 10, color: Colors.neutral400 },
  banner: { width: W }, // height set dynamically via onLoad
  bannerFallback: { width: '100%', height: 160, backgroundColor: Colors.secondaryBg, justifyContent: 'center', alignItems: 'center' },
  bannerEmoji: { fontSize: 52 },
  eventPillWrap: { position: 'absolute', top: 10, left: 10, flexDirection: 'row', gap: 6 },
  eventPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.secondary, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  eventPillText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  actionBar: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 12, paddingTop: 6, paddingBottom: 14 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  actionCount: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  rsvpBtn: { backgroundColor: Colors.primary, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6 },
  rsvpBtnFull: { backgroundColor: Colors.neutral200 },
  rsvpBtnGoing: { backgroundColor: Colors.successBg, borderWidth: 1, borderColor: Colors.success },
  rsvpBtnText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  rsvpBtnTextFull: { color: Colors.textDisabled },
  rsvpBtnTextGoing: { color: Colors.success },
  body: { padding: 12 },
  title: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary, marginBottom: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  metaText: { fontSize: 13, color: Colors.textSecondary, flex: 1 },
  description: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  descWrap: { paddingHorizontal: 12, paddingBottom: 12 },
  moreText: { fontSize: 13, color: Colors.neutral400, marginTop: 3 },
});
