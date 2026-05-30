import React, { useEffect, useLayoutEffect, useState, useRef } from 'react';
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
  StatusBar,
  Dimensions,
  Animated,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  CalendarDays,
  MapPin,
  Phone,
  FileText,
  Search,
  CheckCheck,
  PawPrint,
  ArrowLeft,
  Plus,
  X,
  Eye,
  MessageCircle,
} from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Loading } from '../../components/ui/Loading';
import { AdoptionDetailsCard } from '../../components/community/AdoptionDetailsCard';
import { PlaymateDetailsCard } from '../../components/community/PlaymateDetailsCard';
import { useCommunityStore } from '../../store/communityStore';
import { useChatStore } from '../../store/chatStore';
import { useAuthStore } from '../../store/authStore';
import { useLocation } from '../../hooks/useLocation';
import { formatDate, formatRelativeDate } from '../../lib/utils';
import { Input } from '../../components/ui/Input';
import { ImageUploader } from '../../components/ui/ImageUploader';
import { resolveImageUrl } from '../../lib/uploadImage';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const HERO_BASE_HEIGHT = Math.max(SCREEN_HEIGHT * 0.5, 350);

export default function AlertDetailScreen() {
  const { id, openModal } = useLocalSearchParams<{ id: string; openModal?: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const {
    selectedAlert,
    sightings,
    interests,
    fetchAlert,
    fetchSightings,
    fetchInterests,
    createSighting,
    createInterest,
    resolveAlert,
    clearSelectedAlert,
    isLoading,
  } = useCommunityStore();
  const { coordinates, getCurrentLocation } = useLocation();
  const [refreshing, setRefreshing]           = useState(false);
  const [showSightingForm, setShowSightingForm] = useState(false);
  const [showSightingsModal, setShowSightingsModal] = useState(false);
  const [showInterestForm, setShowInterestForm] = useState(false);
  const [showInterestsModal, setShowInterestsModal] = useState(false);
  const [sightingDescription, setSightingDescription] = useState('');
  const [sightingPhoto,       setSightingPhoto]       = useState('');
  const [isPhotoUploading,    setIsPhotoUploading]    = useState(false);
  const [interestMessage, setInterestMessage]   = useState('');
  const [galleryIndex, setGalleryIndex]         = useState(0);

  const openModalHandled = useRef(false);

  // Two separate slide-up animations (one per modal)
  const SHEET_HEIGHT = SCREEN_HEIGHT * 0.65;
  const slideAnim    = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const slideAnim2    = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const backdropAnim2 = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();

  // ── Slide helpers ──────────────────────────────────────────────────────────
  const openSlide = (anim: Animated.Value, backdrop: Animated.Value) => {
    Animated.parallel([
      Animated.spring(anim,    { toValue: 0, useNativeDriver: true, damping: 20, stiffness: 200 }),
      Animated.timing(backdrop, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();
  };

  const closeSlide = (anim: Animated.Value, backdrop: Animated.Value, onDone: () => void) => {
    Animated.parallel([
      Animated.timing(anim,    { toValue: SHEET_HEIGHT, duration: 250, useNativeDriver: true }),
      Animated.timing(backdrop, { toValue: 0,            duration: 250, useNativeDriver: true }),
    ]).start(() => onDone());
  };

  const openSightingsModal  = () => { setShowSightingsModal(true);  openSlide(slideAnim,  backdropAnim);  };
  const closeSightingsModal = () => closeSlide(slideAnim,  backdropAnim,  () => setShowSightingsModal(false));
  const openInterestsModal  = () => { setShowInterestsModal(true);  openSlide(slideAnim2, backdropAnim2); };
  const closeInterestsModal = () => closeSlide(slideAnim2, backdropAnim2, () => setShowInterestsModal(false));

  // ── Reset all modal state when the alert ID changes ───────────────────────
  // useLayoutEffect fires synchronously before paint, so no flash of stale
  // modal state occurs when Expo Router reuses this component for a new [id].
  useLayoutEffect(() => {
    setShowSightingForm(false);
    setShowSightingsModal(false);
    setShowInterestForm(false);
    setShowInterestsModal(false);
    setSightingDescription('');
    setInterestMessage('');
    setGalleryIndex(0);
    slideAnim.setValue(SHEET_HEIGHT);
    backdropAnim.setValue(0);
    slideAnim2.setValue(SHEET_HEIGHT);
    backdropAnim2.setValue(0);
    openModalHandled.current = false;
    clearSelectedAlert();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // ── Data fetch + auto-open from nav param ─────────────────────────────────
  useEffect(() => {
    if (!id) return;
    fetchAlert(id);
    fetchSightings(id);
    getCurrentLocation();
  }, [id, fetchAlert, fetchSightings, getCurrentLocation]);

  useEffect(() => {
    if (!id || !selectedAlert) return;
    const isAdopt = selectedAlert.type === 'adoption' || selectedAlert.type === 'playmate';
    if (isAdopt) fetchInterests(id);
  }, [id, selectedAlert, fetchInterests]);

  useEffect(() => {
    if (!openModal || !selectedAlert || openModalHandled.current) return;
    openModalHandled.current = true;
    const isAdopt = selectedAlert.type === 'adoption' || selectedAlert.type === 'playmate';
    if (openModal === 'sightings') {
      isAdopt ? openInterestsModal() : openSightingsModal();
    } else if (openModal === 'form') {
      isAdopt ? setShowInterestForm(true) : setShowSightingForm(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openModal, selectedAlert]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleRefresh = async () => {
    if (!id) return;
    setRefreshing(true);
    await Promise.all([fetchAlert(id), fetchSightings(id)]);
    setRefreshing(false);
  };

  const handleAddSighting = async () => {
    if (!id || !sightingDescription.trim()) {
      Alert.alert('Error', 'Please describe where you saw the pet.');
      return;
    }
    let coords = coordinates;
    if (!coords) coords = await getCurrentLocation();
    if (!coords) {
      Alert.alert('Error', 'Location required. Please enable location permissions.');
      return;
    }
    try {
      const photoUrl = sightingPhoto
        ? await resolveImageUrl(sightingPhoto, { folder: 'sightings' })
        : undefined;
      await createSighting(id, {
        description: sightingDescription.trim(),
        latitude:    coords.latitude,
        longitude:   coords.longitude,
        photoUrl,
      });
      setSightingDescription('');
      setSightingPhoto('');
      setShowSightingForm(false);
    } catch {
      Alert.alert('Error', 'Failed to submit sighting.');
    }
  };

  const handleAddInterest = async () => {
    if (!id) return;
    try {
      await createInterest(id, { message: interestMessage.trim() || undefined });
      setInterestMessage('');
      setShowInterestForm(false);
    } catch {
      Alert.alert('Error', 'Failed to submit interest.');
    }
  };

  const handleResolve = () => {
    Alert.alert('Resolve Alert', 'Mark this alert as resolved?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Resolve', onPress: async () => { if (id) await resolveAlert(id); } },
    ]);
  };

  const { initiateConversation } = useChatStore();

  const handleCallPhone = (phone: string) => {
    const url = `tel:${phone.replace(/\s/g, '')}`;
    Linking.canOpenURL(url).then((supported) => { if (supported) Linking.openURL(url); });
  };

  const handleInitiateChat = async (recipientId: string) => {
    if (!id) return;
    try {
      const conv = await initiateConversation(id, recipientId);
      closeInterestsModal();
      router.push(`/chat/${conv.id}`);
    } catch (err) {
      Alert.alert('Error', (err as { message?: string }).message ?? 'Could not start chat.');
    }
  };

  if (!selectedAlert) {
    return <Loading fullScreen />;
  }

  const alert = selectedAlert;
  const alertSightings = sightings[id ?? ''] ?? [];
  const isOwner = alert.userId === user?.id;
  const isResolved = alert.status === 'resolved';
  const isAdoptionOrPlaymate = alert.type === 'adoption' || alert.type === 'playmate';

  const TYPE_BADGE: Record<string, { label: string; color: string }> = {
    lost:     { label: 'LOST',     color: Colors.alertLost },
    found:    { label: 'FOUND',    color: Colors.alertFound },
    adoption: { label: 'ADOPTION', color: '#8B5CF6' },
    playmate: { label: 'PLAYMATE', color: '#F59E0B' },
  };
  const typeBadge = TYPE_BADGE[alert.type] ?? TYPE_BADGE.lost;
  const heroHeight = HERO_BASE_HEIGHT + insets.top;

  const galleryItems = (alert.photos && alert.photos.length > 0)
    ? alert.photos
    : alert.photoUrl ? [alert.photoUrl] : ['placeholder'];

  const handleGalleryScroll = (event: any) => {
    const idx = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setGalleryIndex(idx);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.primary}
          />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {/* Hero Banner with Image Carousel */}
        <View style={[styles.heroBanner, { height: heroHeight }]}>
          <ScrollView
            horizontal
            pagingEnabled
            decelerationRate="fast"
            snapToAlignment="center"
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleGalleryScroll}
          >
            {galleryItems.map((imageUri, index) =>
              imageUri === 'placeholder' ? (
                <LinearGradient
                  key={`placeholder-${index}`}
                  colors={[Colors.neutral800, Colors.neutral900]}
                  style={[styles.heroImagePlaceholder, { width: SCREEN_WIDTH, height: heroHeight }]}
                >
                  <Text style={styles.placeholderEmoji}>🐾</Text>
                  <Text style={styles.placeholderText}>{alert.title}</Text>
                </LinearGradient>
              ) : (
                <Image
                  key={`image-${index}`}
                  source={{ uri: imageUri }}
                  style={[styles.heroImage, { width: SCREEN_WIDTH, height: heroHeight }]}
                  resizeMode="cover"
                />
              )
            )}
          </ScrollView>
          
          {/* Pagination dots */}
          {galleryItems.length > 1 && (
            <View style={styles.heroPagination}>
              {galleryItems.map((_, idx) => (
                <View
                  key={`dot-${idx}`}
                  style={[styles.heroDot, idx === galleryIndex && styles.heroDotActive]}
                />
              ))}
            </View>
          )}
          
          {/* Header Controls */}
          <View style={[styles.heroHeaderControls, { paddingTop: 16 + insets.top }]}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft size={20} color={Colors.textInverse} />
            </TouchableOpacity>
            <View style={styles.headerActions}>
              <View style={styles.headerActionsColumn}>
                {/* Plus — report sighting (lost/found) or express interest (adoption/playmate) */}
                {!isResolved && !isOwner && (
                  <TouchableOpacity
                    style={styles.headerAction}
                    onPress={() => isAdoptionOrPlaymate ? setShowInterestForm(true) : setShowSightingForm(true)}
                  >
                    <Plus size={16} color={Colors.primary} />
                  </TouchableOpacity>
                )}
                {/* Eye — view sightings (lost/found) or interests (adoption/playmate) */}
                <TouchableOpacity
                  style={styles.headerAction}
                  onPress={() => isAdoptionOrPlaymate ? openInterestsModal() : openSightingsModal()}
                >
                  <Eye size={16} color={Colors.primary} />
                </TouchableOpacity>
              </View>
              {isOwner && !isResolved && (
                <TouchableOpacity
                  style={styles.headerAction}
                  onPress={handleResolve}
                >
                  <CheckCheck size={16} color={Colors.primary} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoCardHeader}>
            <View style={styles.titleRow}>
              <Text style={styles.infoName} numberOfLines={2}>{alert.title}</Text>
              {isResolved ? (
                <Badge
                  label="RESOLVED"
                  backgroundColor={Colors.neutral400}
                  color={Colors.textInverse}
                  size="sm"
                />
              ) : (
                <Badge
                  label={typeBadge.label}
                  backgroundColor={typeBadge.color}
                  color={Colors.textInverse}
                  size="sm"
                />
              )}
            </View>
            <Text style={styles.infoBreed}>Posted by {alert.userName}</Text>
          </View>

          {/* Stats Row */}
          <View style={styles.infoStatRow}>
            <View style={styles.statCard}>
              <View style={[styles.statIconBox, { backgroundColor: '#FEF3C7' }]}>
                <CalendarDays size={16} color={Colors.secondary} />
              </View>
              <Text style={styles.statCardLabel}>Posted</Text>
              <Text style={styles.statCardValue}>
                {formatDate(alert.createdAt, 'short')}
              </Text>
            </View>
            {alert.city && (
              <View style={styles.statCard}>
                <View style={[styles.statIconBox, { backgroundColor: '#FEE2E2' }]}>
                  <MapPin size={16} color={Colors.error} />
                </View>
                <Text style={styles.statCardLabel}>Location</Text>
                <Text style={styles.statCardValue}>{alert.city}</Text>
              </View>
            )}
            <View style={styles.statCard}>
              <View style={[styles.statIconBox, { backgroundColor: isAdoptionOrPlaymate ? '#F5F3FF' : '#E0F2FE' }]}>
                <Search size={16} color={isAdoptionOrPlaymate ? '#8B5CF6' : Colors.info} />
              </View>
              <Text style={styles.statCardLabel}>{isAdoptionOrPlaymate ? 'Interested' : 'Sightings'}</Text>
              <Text style={styles.statCardValue}>
                {isAdoptionOrPlaymate ? (alert.interestCount ?? 0) : alertSightings.length}
              </Text>
            </View>
          </View>

          {/* Details Section */}
          <View style={styles.infoDescriptionSection}>
            {(alert.petName || alert.petBreed || alert.petSpecies) && (
              <View style={styles.detailCard}>
                <View style={styles.detailCardHeader}>
                  <View style={[styles.detailIconBox, { backgroundColor: Colors.primaryBg }]}>
                    <PawPrint size={14} color={Colors.primary} />
                  </View>
                  <Text style={styles.detailCardLabel}>Pet Details</Text>
                </View>
                <View style={styles.detailCardContent}>
                  {alert.petName && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Name</Text>
                      <Text style={styles.detailValue}>{alert.petName}</Text>
                    </View>
                  )}
                  {alert.petBreed && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Breed</Text>
                      <Text style={styles.detailValue}>{alert.petBreed}</Text>
                    </View>
                  )}
                  {alert.petSpecies && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Species</Text>
                      <Text style={styles.detailValue}>{alert.petSpecies}</Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {alert.description && (
              <View style={[styles.detailCard, { backgroundColor: Colors.secondaryBg }]}>
                <View style={styles.detailCardHeader}>
                  <View style={[styles.detailIconBox, { backgroundColor: Colors.surface }]}>
                    <FileText size={14} color={Colors.secondary} />
                  </View>
                  <Text style={[styles.detailCardLabel, { color: Colors.secondaryDark }]}>Description</Text>
                </View>
                <Text style={styles.descriptionCardText}>{alert.description}</Text>
              </View>
            )}

            {alert.userPhone && (
              <TouchableOpacity
                style={[styles.detailCard, { flexDirection: 'row', alignItems: 'center', gap: 12 }]}
                onPress={() => handleCallPhone(alert.userPhone!)}
                activeOpacity={0.7}
              >
                <View style={[styles.detailIconBox, { backgroundColor: Colors.primaryBg, width: 32, height: 32 }]}>
                  <Phone size={16} color={Colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.detailLabel}>Contact</Text>
                  <Text style={[styles.detailValue, { color: Colors.primary }]}>{alert.userPhone}</Text>
                </View>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Adoption / Playmate detail cards */}
        {alert.type === 'adoption' && (
          <View style={styles.extraSection}>
            <AdoptionDetailsCard alert={alert} />
          </View>
        )}
        {alert.type === 'playmate' && (
          <View style={styles.extraSection}>
            <PlaymateDetailsCard alert={alert} />
          </View>
        )}

      </ScrollView>

      {/* ── Sighting Form Modal (lost / found) ─────────────────────────── */}
      {showSightingForm && (
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowSightingForm(false)} />
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Report a Sighting</Text>
              <TouchableOpacity onPress={() => setShowSightingForm(false)}>
                <X size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <Input
              placeholder="Where did you see the pet? Any distinguishing details..."
              value={sightingDescription}
              onChangeText={setSightingDescription}
              multiline
              numberOfLines={4}
              style={{ minHeight: 100, textAlignVertical: 'top', marginTop: 8 }}
            />
            <View style={{ marginTop: 12 }}>
              <Text style={styles.sightingPhotoLabel}>Photo (optional)</Text>
              <ImageUploader
                value={sightingPhoto}
                onChange={setSightingPhoto}
                folder="sightings"
                shape="rect"
                width="100%"
                height={140}
                onUploadStart={() => setIsPhotoUploading(true)}
                onUploadEnd={() => setIsPhotoUploading(false)}
              />
            </View>
            <View style={styles.sightingFormButtons}>
              <Button title="Cancel"      variant="outline"  size="md" onPress={() => setShowSightingForm(false)} />
              <Button title="Add Sighting" variant="primary" size="md" onPress={handleAddSighting} isLoading={isLoading} />
            </View>
          </View>
        </View>
      )}

      {/* ── Interest Form Modal (adoption / playmate) ───────────────────── */}
      {showInterestForm && (
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowInterestForm(false)} />
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {alert.type === 'adoption' ? `Adopt ${alert.petName || 'This Pet'}` : `Request a Playdate`}
              </Text>
              <TouchableOpacity onPress={() => setShowInterestForm(false)}>
                <X size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <Input
              placeholder={
                alert.type === 'adoption'
                  ? 'Tell the owner why you\'d be a great home for this pet...'
                  : 'Introduce your pet and suggest a meetup time/place...'
              }
              value={interestMessage}
              onChangeText={setInterestMessage}
              multiline
              numberOfLines={4}
              style={{ minHeight: 100, textAlignVertical: 'top', marginTop: 8 }}
            />
            <View style={styles.sightingFormButtons}>
              <Button title="Cancel" variant="outline"  size="md" onPress={() => setShowInterestForm(false)} />
              <Button
                title={alert.type === 'adoption' ? 'Send Interest' : 'Request Playdate'}
                variant="primary" size="md" onPress={handleAddInterest} isLoading={isLoading}
              />
            </View>
          </View>
        </View>
      )}

      {/* ── Sightings Slide-in Modal (lost / found) ─────────────────────── */}
      {showSightingsModal && (
        <View style={styles.slideModalOverlay}>
          <Animated.View style={[styles.slideModalBackdrop, { opacity: backdropAnim }]} />
          <Animated.View style={[styles.slideModalContent, { transform: [{ translateY: slideAnim }] }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.slideModalHeader}>
              <Text style={styles.slideModalTitle}>Sightings ({alertSightings.length})</Text>
              <TouchableOpacity onPress={closeSightingsModal}>
                <X size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.slideModalScroll}>
              {alertSightings.length === 0 ? (
                <Text style={styles.noSightings}>No sightings reported yet.</Text>
              ) : (
                alertSightings.map((s) => (
                  <View key={s.id} style={styles.commentRow}>
                    <View style={styles.commentAvatarPlaceholder}>
                      <Text style={styles.commentAvatarInitial}>
                        {(s.userName ?? 'U').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.commentBubble}>
                      <Text style={styles.commentUsername}>{s.userName ?? 'Anonymous'}</Text>
                      <Text style={styles.commentText}>{s.description}</Text>
                      {s.photoUrl && (
                        <Image source={{ uri: s.photoUrl }} style={styles.commentPhoto} />
                      )}
                      <Text style={styles.commentTime}>
                        {formatRelativeDate(new Date(s.createdAt))}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </Animated.View>
        </View>
      )}

      {/* ── Interests Slide-in Modal (adoption / playmate) ──────────────── */}
      {showInterestsModal && (
        <View style={styles.slideModalOverlay}>
          <Animated.View style={[styles.slideModalBackdrop, { opacity: backdropAnim2 }]} />
          <Animated.View style={[styles.slideModalContent, { transform: [{ translateY: slideAnim2 }] }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.slideModalHeader}>
              <Text style={styles.slideModalTitle}>
                {alert.type === 'adoption' ? 'Adoption Interests' : 'Playdate Requests'}
                {' '}({isOwner ? (interests[id ?? ''] ?? []).length : (alert.interestCount ?? 0)})
              </Text>
              <TouchableOpacity onPress={closeInterestsModal}>
                <X size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.slideModalScroll}>
              {(interests[id ?? ''] ?? []).length === 0 ? (
                <Text style={styles.noSightings}>No comments yet. Be the first to express interest!</Text>
              ) : (
                (interests[id ?? ''] ?? []).map((interest) => (
                  <View key={interest.id} style={styles.commentRow}>
                    {/* Avatar */}
                    {interest.userAvatarUrl ? (
                      <Image source={{ uri: interest.userAvatarUrl }} style={styles.commentAvatar} />
                    ) : (
                      <View style={styles.commentAvatarPlaceholder}>
                        <Text style={styles.commentAvatarInitial}>
                          {(interest.userName ?? '?').charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    {/* Bubble + chat button */}
                    <View style={styles.commentBubbleWrap}>
                      <View style={styles.commentBubble}>
                        <Text style={styles.commentUsername}>{interest.userName}</Text>
                        <Text style={styles.commentText}>
                          {interest.message?.trim() || '👋 Expressed interest'}
                        </Text>
                        <Text style={styles.commentTime}>
                          {formatRelativeDate(new Date(interest.createdAt))}
                        </Text>
                      </View>
                      {isOwner && (
                        <TouchableOpacity
                          style={styles.chatBtn}
                          onPress={() => handleInitiateChat(interest.userId)}
                        >
                          <MessageCircle size={14} color={Colors.primary} />
                          <Text style={styles.chatBtnText}>Chat</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </Animated.View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  heroBanner: {
    position: 'relative',
    overflow: 'hidden',
  },
  heroImage: {
    resizeMode: 'cover',
  },
  heroImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderEmoji: {
    fontSize: 64,
  },
  placeholderText: {
    fontSize: 18,
    color: Colors.textInverse,
    fontWeight: '600',
    marginTop: 8,
  },
  heroHeaderControls: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    zIndex: 10,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  headerActionsColumn: {
    flexDirection: 'column',
    gap: 4,
  },
  headerAction: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBadge: {
    position: 'absolute',
    left: 20,
    flexDirection: 'row',
    gap: 8,
  },
  infoCard: {
    marginTop: -24,
    marginHorizontal: 20,
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 20,
    shadowColor: Colors.neutral900,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  infoCardHeader: {
    marginBottom: 20,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  infoName: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.textPrimary,
    flex: 1,
  },
  infoBreed: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  infoStatRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.neutral50,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    gap: 6,
  },
  statIconBox: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statCardLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  statCardValue: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  infoDescriptionSection: {
    marginTop: 12,
    gap: 10,
  },
  detailCard: {
    backgroundColor: Colors.neutral50,
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  detailCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailIconBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailCardLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailCardContent: {
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  descriptionCardText: {
    fontSize: 14,
    color: Colors.textPrimary,
    lineHeight: 20,
  },
  section: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  noSightings: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    padding: 20,
  },
  commentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  commentAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.neutral100,
    flexShrink: 0,
  },
  commentAvatarPlaceholder: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  commentAvatarInitial: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
  commentBubbleWrap: {
    flex: 1,
    gap: 6,
  },
  commentBubble: {
    backgroundColor: Colors.neutral50,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 3,
  },
  chatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.primaryBg,
    borderWidth: 1,
    borderColor: Colors.primary + '40',
  },
  chatBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  commentUsername: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  commentText: {
    fontSize: 13,
    color: Colors.textPrimary,
    lineHeight: 18,
  },
  commentTime: {
    fontSize: 11,
    color: Colors.neutral400,
    marginTop: 2,
  },
  commentPhoto: {
    width: '100%',
    height: 140,
    borderRadius: 10,
    marginTop: 4,
  },
  sightingFormTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  sightingPhotoLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  sightingFormButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  alertImage: {
    width: '100%',
    height: 260,
    backgroundColor: Colors.neutral100,
  },
  alertImagePlaceholder: {
    width: '100%',
    height: 180,
    backgroundColor: Colors.neutral100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertImagePlaceholderText: {
    fontSize: 64,
  },
  header: {
    padding: 20,
    gap: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginTop: 4,
  },
  postedBy: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  detailItem: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  detailTextGroup: {
    flex: 1,
    gap: 2,
  },
  detailText: {
    fontSize: 14,
    color: Colors.textPrimary,
    flex: 1,
  },
  detailDescription: {
    lineHeight: 20,
  },
  phoneText: {
    color: Colors.primary,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 34,
    width: '100%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.neutral300,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  slideModalOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    zIndex: 1000,
  },
  slideModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  slideModalContent: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.65,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 0,
    overflow: 'hidden',
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.neutral300,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  slideModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  slideModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  slideModalScroll: {
    flex: 1,
    paddingTop: 4,
  },
  heroPagination: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  heroDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  heroDotActive: {
    backgroundColor: Colors.textInverse,
    width: 18,
  },
  extraSection: {
    marginHorizontal: 20,
    marginTop: 12,
  },
});
