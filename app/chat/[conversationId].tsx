import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform,
  ActivityIndicator, Alert, Image, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { ArrowLeft, Send, Paperclip, ImageIcon, Video, Camera, X, FileText } from 'lucide-react-native';
import { uploadImage } from '../../lib/uploadImage';
import { Colors } from '../../constants/colors';
import { useChatStore } from '../../store/chatStore';
import { usePawMatchStore } from '../../store/pawmatchStore';
import { usePetStore } from '../../store/petStore';
import { useAuthStore } from '../../store/authStore';
import { ChatMessage, PawMatchMessage, ChatBadge } from '../../types';
import { ChatBubble, ChatBubbleMessage } from '../../components/chat/ChatBubble';

const PENDING_MSG_LIMIT = 3;

const BADGE_CONFIG: Record<ChatBadge, { label: string; color: string; bg: string }> = {
  LOST:     { label: 'LOST',  color: '#EF4444', bg: '#FEF2F2' },
  FOUND:    { label: 'FOUND', color: '#10B981', bg: '#ECFDF5' },
  BREED:    { label: 'BREED', color: '#E11D48', bg: '#FFF1F2' },
  ADOPT:    { label: 'ADOPT', color: '#7C3AED', bg: '#F5F3FF' },
  PLAYDATE: { label: 'PLAY',  color: '#0891B2', bg: '#E0F2FE' },
};

// ── Build unified bubble list ─────────────────────────────────────────────────

function buildBubbles(
  items: Array<{
    id: string;
    content?: string | null;
    createdAt: string;
    senderId?: string;
    senderPetId?: string;
    senderName?: string;
    mediaUrl?: string | null;
  }>,
  isMineFn: (senderId: string) => boolean,
  getAvatarFn: () => string | undefined,
  getNameFn: (item: any) => string | undefined,
): ChatBubbleMessage[] {
  return items.map((item, i) => {
    const senderId = item.senderId ?? item.senderPetId ?? '';
    const mine = isMineFn(senderId);
    const prev = items[i - 1];
    const next = items[i + 1];
    const prevId = prev ? (prev.senderId ?? prev.senderPetId ?? '') : null;
    const nextId = next ? (next.senderId ?? next.senderPetId ?? '') : null;
    const grouped = prevId === senderId;
    const tail = nextId !== senderId;

    // If PawMatch sends mediaUrl separately, embed it as [img] prefix
    let content = item.content ?? '';
    const mediaUrl = item.mediaUrl;
    if (mediaUrl && !content.startsWith('[img]') && !content.startsWith('[vid:')) {
      content = `[img]${mediaUrl}${content ? `\n${content}` : ''}`;
    }

    return {
      id: item.id,
      content,
      isMine: mine,
      senderName: mine ? undefined : getNameFn(item),
      senderAvatarUrl: mine ? undefined : getAvatarFn(),
      createdAt: item.createdAt,
      grouped,
      tail,
      isLast: i === items.length - 1,
    };
  });
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function ConversationScreen() {
  const { conversationId, kind = 'community' } = useLocalSearchParams<{ conversationId: string; kind?: string }>();
  const isPawmatch = kind === 'pawmatch';
  const router = useRouter();
  const { user } = useAuthStore();
  const {
    conversations, messages, fetchMessages, sendMessage,
    acceptConversation, declineConversation, markRead, isSending,
  } = useChatStore();
  const {
    matches, fetchConversation, conversations: pmConversations,
    sendMessage: pmSendMessage, acceptAdoptionRequest, declineAdoptionRequest,
  } = usePawMatchStore();
  const { pets } = usePetStore();

  const [input,          setInput]          = useState('');
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [attachment,     setAttachment]     = useState<{
    type: 'image' | 'video' | 'file';
    uri: string;
    name: string;
    uploading: boolean;
  } | null>(null);
  const flatRef = useRef<FlatList>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Community data ──────────────────────────────────────────────────────────
  const conv = !isPawmatch ? conversations.find((c) => c.id === conversationId) : null;
  const msgs: ChatMessage[] = !isPawmatch ? (messages[conversationId ?? ''] ?? []) : [];
  const isInitiator = !isPawmatch && user?.id === conv?.initiatorId;
  const otherName   = !isPawmatch ? (isInitiator ? conv?.recipientName : conv?.initiatorName) : undefined;
  const sentByMe    = !isPawmatch ? msgs.filter((m) => m.senderId === user?.id).length : 0;
  const limitReached = !isPawmatch && conv?.status === 'PENDING' && isInitiator && sentByMe >= PENDING_MSG_LIMIT;
  const commCanType = !isPawmatch && (conv?.status === 'ACTIVE' || (conv?.status === 'PENDING' && isInitiator && !limitReached));

  // ── PawMatch data ───────────────────────────────────────────────────────────
  const myPetIds = new Set(pets.map((p) => p.id));
  const match = isPawmatch ? matches.find((m) => m.id === conversationId) : null;
  const pmConv = isPawmatch ? pmConversations[conversationId ?? ''] : null;
  const pmMsgs: PawMatchMessage[] = isPawmatch ? (pmConv?.messages ?? []) : [];
  const pmStatus = (pmConv as any)?.status ?? 'ACTIVE';
  const pmIsInitiator = match ? myPetIds.has(match.profileA.petId) : false;
  const otherProfile = match ? (myPetIds.has(match.profileA.petId) ? match.profileB : match.profileA) : null;
  const pmOtherName   = otherProfile?.pet?.name;
  const pmOtherAvatar = otherProfile?.pet?.avatarUrl;
  const myPet = pets.find((p) =>
    match && (myPetIds.has(match.profileA.petId) ? p.id === match.profileA.petId : p.id === match.profileB.petId),
  );
  const pmSentByMe = pmMsgs.filter((m) => m.senderPetId === myPet?.id).length;
  const pmLimitReached = pmStatus === 'PENDING' && pmIsInitiator && pmSentByMe >= PENDING_MSG_LIMIT;
  const pmCanType = pmStatus === 'ACTIVE' || (pmStatus === 'PENDING' && pmIsInitiator && !pmLimitReached);

  const canType = isPawmatch ? pmCanType : commCanType;
  const badge: ChatBadge | null = isPawmatch && match ? (match.mode as ChatBadge) : null;
  const convStatus = isPawmatch ? pmStatus : conv?.status;

  // ── Unified bubble list ─────────────────────────────────────────────────────
  const bubbles: ChatBubbleMessage[] = isPawmatch
    ? buildBubbles(
        pmMsgs as any[],
        (petId) => myPetIds.has(petId),
        () => pmOtherAvatar,
        () => pmOtherName,
      )
    : buildBubbles(
        msgs as any[],
        (userId) => userId === user?.id,
        () => undefined,
        (item) => item.senderName,
      );

  // ── Data loading ────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!conversationId) return;
    if (isPawmatch) {
      await fetchConversation(conversationId);
    } else {
      await fetchMessages(conversationId);
      await markRead(conversationId);
    }
  }, [conversationId, isPawmatch, fetchConversation, fetchMessages, markRead]);

  useEffect(() => { load(); }, [load]);

  useFocusEffect(
    useCallback(() => {
      pollRef.current = setInterval(load, 3000);
      return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }, [load]),
  );

  // ── Permissions ─────────────────────────────────────────────────────────────
  const requestLibraryPermission = async (): Promise<boolean> => {
    const { status, canAskAgain } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status === 'granted') return true;
    if (!canAskAgain) {
      Alert.alert('Permission Required', 'Enable photo library access in Settings > PawRok > Photos.');
    } else {
      Alert.alert('Permission Required', 'Allow PawRok to access your photo library.');
    }
    return false;
  };

  // ── Attachment pickers ──────────────────────────────────────────────────────
  const handlePickImage = async () => {
    setShowAttachMenu(false);
    if (!(await requestLibraryPermission())) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setAttachment({ type: 'image', uri: asset.uri, name: asset.fileName ?? 'image.jpg', uploading: false });
    }
  };

  const handlePickVideo = async () => {
    setShowAttachMenu(false);
    if (!(await requestLibraryPermission())) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      quality: 0.8,
      allowsEditing: false,
      videoMaxDuration: 120,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setAttachment({ type: 'video', uri: asset.uri, name: asset.fileName ?? 'video.mp4', uploading: false });
    }
  };

  const handleTakePhoto = async () => {
    setShowAttachMenu(false);
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Allow PawRok to access your camera.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 0.8,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const isVideo = asset.type === 'video';
      setAttachment({
        type: isVideo ? 'video' : 'image',
        uri: asset.uri,
        name: asset.fileName ?? (isVideo ? 'video.mp4' : 'photo.jpg'),
        uploading: false,
      });
    }
  };

  // ── Send ────────────────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!input.trim() && !attachment) return;
    if (!conversationId) return;
    const text = input.trim();
    setInput('');
    const pendingAttachment = attachment;
    setAttachment(null);

    try {
      let content = text;

      if (pendingAttachment) {
        setAttachment({ ...pendingAttachment, uploading: true });
        try {
          if (pendingAttachment.type === 'image') {
            const url = await uploadImage(pendingAttachment.uri, { folder: 'chat' });
            content = `[img]${url}${text ? `\n${text}` : ''}`;
          } else if (pendingAttachment.type === 'video') {
            const url = await uploadImage(pendingAttachment.uri, { folder: 'chat' });
            content = `[vid:${pendingAttachment.name}]${url}${text ? `\n${text}` : ''}`;
          } else {
            content = `[file:${pendingAttachment.name}]${pendingAttachment.uri}${text ? `\n${text}` : ''}`;
          }
        } catch {
          setAttachment(null);
          Alert.alert('Upload failed', 'Could not upload the attachment. Please try again.');
          setInput(text);
          return;
        }
        setAttachment(null);
      }

      if (!content.trim() && !pendingAttachment) return;

      if (isPawmatch && myPet) {
        let pmContent: string | undefined = text || undefined;
        let pmMediaUrl: string | undefined;
        if (pendingAttachment?.type === 'image' || pendingAttachment?.type === 'video') {
          const urlMatch = content.match(/\[(img|vid:[^\]]*)\](https?:\/\/\S+)/);
          if (urlMatch) { pmMediaUrl = urlMatch[2]; pmContent = text || undefined; }
        } else if (pendingAttachment?.type === 'file') {
          pmContent = content;
        } else {
          pmContent = content;
        }
        await pmSendMessage(conversationId, myPet.id, pmContent, pmMediaUrl);
      } else {
        await sendMessage(conversationId, content);
      }
      flatRef.current?.scrollToEnd({ animated: true });
    } catch (err) {
      const msg = (err as { message?: string }).message ?? 'Failed to send message';
      Alert.alert('Error', msg);
      if (text) setInput(text);
      if (pendingAttachment) setAttachment(pendingAttachment);
    }
  };

  // ── Accept / Decline ────────────────────────────────────────────────────────
  const handleAccept = async () => {
    if (!conversationId) return;
    if (isPawmatch && pmConv?.id) {
      await acceptAdoptionRequest(pmConv.id);
    } else {
      await acceptConversation(conversationId);
    }
    await load();
  };

  const handleDecline = async () => {
    if (!conversationId) return;
    Alert.alert('Decline', 'Are you sure you want to decline this request?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Decline', style: 'destructive',
        onPress: async () => {
          if (isPawmatch && pmConv?.id) {
            await declineAdoptionRequest(pmConv.id);
          } else {
            await declineConversation(conversationId);
          }
          router.back();
        },
      },
    ]);
  };

  // ── Render bubble ───────────────────────────────────────────────────────────
  const renderBubble = useCallback(({ item }: { item: ChatBubbleMessage }) => (
    <ChatBubble msg={item} />
  ), []);

  // ── UI ──────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color={Colors.textPrimary} />
        </TouchableOpacity>

        {isPawmatch && pmOtherAvatar && (
          <Image source={{ uri: pmOtherAvatar }} style={styles.headerAvatar} />
        )}

        <View style={styles.headerInfo}>
          <View style={styles.headerTitleRow}>
            {badge && (
              <View style={[styles.headerBadge, { backgroundColor: BADGE_CONFIG[badge].bg }]}>
                <Text style={[styles.headerBadgeText, { color: BADGE_CONFIG[badge].color }]}>
                  {BADGE_CONFIG[badge].label}
                </Text>
              </View>
            )}
            <Text style={styles.headerName} numberOfLines={1}>
              {isPawmatch ? (pmOtherName ?? '…') : (otherName ?? '…')}
            </Text>
          </View>
          {conv && <Text style={styles.headerSub} numberOfLines={1}>Re: {conv.alertTitle}</Text>}
          {isPawmatch && match && (
            <Text style={styles.headerSub} numberOfLines={1}>
              {otherProfile?.pet?.name} · {match.mode}
            </Text>
          )}
        </View>

        <View style={[
          styles.statusChip,
          { backgroundColor: convStatus === 'ACTIVE' ? Colors.primaryBg : convStatus === 'DECLINED' ? '#FEF2F2' : '#FFFBEB' },
        ]}>
          <Text style={[
            styles.statusChipText,
            { color: convStatus === 'ACTIVE' ? Colors.primary : convStatus === 'DECLINED' ? Colors.error : Colors.secondary },
          ]}>
            {convStatus === 'ACTIVE' ? 'Active' : convStatus === 'DECLINED' ? 'Declined' : 'Pending'}
          </Text>
        </View>
      </View>

      {/* ── Request banner (recipient side, PENDING) ── */}
      {((!isPawmatch && conv?.status === 'PENDING' && !isInitiator) ||
        (isPawmatch && pmStatus === 'PENDING' && !pmIsInitiator)) && (
        <View style={styles.requestBanner}>
          <Text style={styles.requestBannerText}>
            {isPawmatch
              ? `${otherProfile?.pet?.owner?.name ?? 'Someone'} wants to adopt ${match?.profileB?.pet?.name ?? 'your pet'}`
              : `${conv?.initiatorName} wants to chat about: ${conv?.alertTitle}`}
          </Text>
          <View style={styles.requestBannerActions}>
            <TouchableOpacity style={styles.acceptBtn} onPress={handleAccept}>
              <Text style={styles.acceptBtnText}>Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.declineBtn} onPress={handleDecline}>
              <Text style={styles.declineBtnText}>Decline</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Intro-message limit warning (initiator, PENDING) ── */}
      {limitReached && (
        <View style={styles.limitBanner}>
          <Text style={styles.limitBannerText}>
            Sent {PENDING_MSG_LIMIT}/{PENDING_MSG_LIMIT} intro messages. Waiting for {conv?.recipientName} to accept.
          </Text>
        </View>
      )}
      {isPawmatch && pmStatus === 'PENDING' && pmIsInitiator && pmLimitReached && (
        <View style={styles.limitBanner}>
          <Text style={styles.limitBannerText}>
            Sent {PENDING_MSG_LIMIT}/{PENDING_MSG_LIMIT} intro messages. Waiting for the owner to accept.
          </Text>
        </View>
      )}

      {/* ── Declined banner ── */}
      {convStatus === 'DECLINED' && (
        <View style={styles.declinedBanner}>
          <Text style={styles.declinedBannerText}>This chat request was declined.</Text>
        </View>
      )}

      {/* ── Messages + input ── */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={flatRef}
          data={bubbles}
          keyExtractor={(m) => m.id}
          renderItem={renderBubble}
          contentContainerStyle={styles.msgList}
          onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={styles.emptyMsgs}>
              <Text style={styles.emptyMsgsText}>
                {(conv?.status === 'PENDING' && isInitiator) || (pmStatus === 'PENDING' && pmIsInitiator)
                  ? `Send up to ${PENDING_MSG_LIMIT} messages to introduce yourself.`
                  : 'No messages yet. Say hello! 🐾'}
              </Text>
            </View>
          }
        />

        {/* Input bar */}
        {canType && (
          <View style={styles.inputWrap}>
            {/* Remaining intro-message hint */}
            {(conv?.status === 'PENDING' && isInitiator && !limitReached) && (
              <Text style={styles.limitHint}>{PENDING_MSG_LIMIT - sentByMe} intro message{PENDING_MSG_LIMIT - sentByMe !== 1 ? 's' : ''} left</Text>
            )}
            {(isPawmatch && pmStatus === 'PENDING' && pmIsInitiator && !pmLimitReached) && (
              <Text style={styles.limitHint}>{PENDING_MSG_LIMIT - pmSentByMe} intro message{PENDING_MSG_LIMIT - pmSentByMe !== 1 ? 's' : ''} left</Text>
            )}

            {/* Attachment preview */}
            {attachment && (
              <View style={styles.attachPreview}>
                {attachment.type === 'image' ? (
                  <Image source={{ uri: attachment.uri }} style={styles.attachPreviewImage} />
                ) : (
                  <View style={styles.attachPreviewChip}>
                    {attachment.type === 'video'
                      ? <Video size={16} color={Colors.primary} />
                      : <FileText size={16} color={Colors.primary} />}
                    <Text style={styles.attachPreviewName} numberOfLines={1}>{attachment.name}</Text>
                  </View>
                )}
                {attachment.uploading ? (
                  <ActivityIndicator size="small" color={Colors.primary} style={styles.attachPreviewSpinner} />
                ) : (
                  <TouchableOpacity style={styles.attachPreviewRemove} onPress={() => setAttachment(null)}>
                    <X size={14} color={Colors.surface} />
                  </TouchableOpacity>
                )}
              </View>
            )}

            <View style={styles.inputRow}>
              <TouchableOpacity
                style={styles.attachBtn}
                onPress={() => setShowAttachMenu(true)}
                disabled={!!attachment?.uploading}
              >
                <Paperclip size={22} color={Colors.textSecondary} strokeWidth={1.8} />
              </TouchableOpacity>
              <TextInput
                style={styles.input}
                placeholder="Type a message…"
                placeholderTextColor={Colors.neutral400}
                value={input}
                onChangeText={setInput}
                multiline
                maxLength={500}
                returnKeyType="send"
                onSubmitEditing={handleSend}
              />
              <TouchableOpacity
                style={[styles.sendBtn, ((!input.trim() && !attachment) || isSending || attachment?.uploading) && styles.sendBtnDisabled]}
                onPress={handleSend}
                disabled={(!input.trim() && !attachment) || isSending || attachment?.uploading}
              >
                {isSending || attachment?.uploading
                  ? <ActivityIndicator size="small" color={Colors.surface} />
                  : <Send size={18} color={Colors.surface} />}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Attachment picker modal */}
        <Modal
          visible={showAttachMenu}
          transparent
          animationType="slide"
          onRequestClose={() => setShowAttachMenu(false)}
        >
          <TouchableOpacity
            style={styles.attachModalBackdrop}
            activeOpacity={1}
            onPress={() => setShowAttachMenu(false)}
          />
          <View style={styles.attachModal}>
            <View style={styles.attachModalHandle} />
            <Text style={styles.attachModalTitle}>Attach</Text>
            <View style={styles.attachModalOptions}>
              <TouchableOpacity style={styles.attachOption} onPress={handlePickImage}>
                <View style={[styles.attachOptionIcon, { backgroundColor: '#EFF6FF' }]}>
                  <ImageIcon size={26} color="#3B82F6" />
                </View>
                <Text style={styles.attachOptionLabel}>Image</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.attachOption} onPress={handlePickVideo}>
                <View style={[styles.attachOptionIcon, { backgroundColor: '#FFF7ED' }]}>
                  <Video size={26} color="#F97316" />
                </View>
                <Text style={styles.attachOptionLabel}>Video</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.attachOption} onPress={handleTakePhoto}>
                <View style={[styles.attachOptionIcon, { backgroundColor: '#F0FDF4' }]}>
                  <Camera size={26} color="#16A34A" />
                </View>
                <Text style={styles.attachOptionLabel}>Camera</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:            { flex: 1, backgroundColor: Colors.background },
  flex:                 { flex: 1 },

  // Header
  header:               { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: Colors.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border, gap: 10 },
  backBtn:              { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.neutral100, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  headerAvatar:         { width: 36, height: 36, borderRadius: 18, flexShrink: 0 },
  headerInfo:           { flex: 1 },
  headerTitleRow:       { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerBadge:          { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  headerBadgeText:      { fontSize: 9, fontWeight: '800', letterSpacing: 0.3 },
  headerName:           { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, flexShrink: 1 },
  headerSub:            { fontSize: 12, color: Colors.textSecondary, fontStyle: 'italic' },
  statusChip:           { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, flexShrink: 0 },
  statusChipText:       { fontSize: 11, fontWeight: '700' },

  // Banners
  requestBanner:        { backgroundColor: '#FFFBEB', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#FCD34D', paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
  requestBannerText:    { fontSize: 13, color: Colors.secondary, fontWeight: '500', lineHeight: 18 },
  requestBannerActions: { flexDirection: 'row', gap: 10 },
  acceptBtn:            { flex: 1, backgroundColor: Colors.primary, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  acceptBtnText:        { fontSize: 14, fontWeight: '700', color: Colors.surface },
  declineBtn:           { flex: 1, backgroundColor: Colors.neutral100, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  declineBtnText:       { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  limitBanner:          { backgroundColor: '#FFFBEB', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#FCD34D' },
  limitBannerText:      { fontSize: 13, color: Colors.secondary, textAlign: 'center', fontWeight: '500' },
  declinedBanner:       { backgroundColor: '#FEF2F2', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#FECACA' },
  declinedBannerText:   { fontSize: 13, color: Colors.error, textAlign: 'center', fontWeight: '500' },

  // Message list
  msgList:              { paddingVertical: 16, paddingBottom: 8, flexGrow: 1 },
  emptyMsgs:            { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyMsgsText:        { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', paddingHorizontal: 40, lineHeight: 20 },

  // Input bar
  inputWrap:            { backgroundColor: Colors.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border, paddingTop: 6 },
  limitHint:            { fontSize: 11, color: Colors.secondary, fontWeight: '600', paddingHorizontal: 14, paddingBottom: 4 },
  inputRow:             { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 10, paddingBottom: 10, gap: 6 },
  attachBtn:            { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  input:                { flex: 1, backgroundColor: Colors.neutral50, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, color: Colors.textPrimary, maxHeight: 100, borderWidth: StyleSheet.hairlineWidth, borderColor: Colors.border },
  sendBtn:              { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled:      { opacity: 0.4 },

  // Attachment preview strip
  attachPreview:        { flexDirection: 'row', alignItems: 'center', marginHorizontal: 12, marginBottom: 6, gap: 8, backgroundColor: Colors.neutral50, borderRadius: 10, padding: 8, borderWidth: StyleSheet.hairlineWidth, borderColor: Colors.border },
  attachPreviewImage:   { width: 56, height: 56, borderRadius: 8 },
  attachPreviewChip:    { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  attachPreviewName:    { flex: 1, fontSize: 13, color: Colors.textPrimary, fontWeight: '500' },
  attachPreviewSpinner: { marginLeft: 'auto' as any },
  attachPreviewRemove:  { width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.neutral400, alignItems: 'center', justifyContent: 'center' },

  // Attach modal
  attachModalBackdrop:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  attachModal:          { backgroundColor: Colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: Platform.OS === 'ios' ? 32 : 20, paddingTop: 8 },
  attachModalHandle:    { width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.neutral300, alignSelf: 'center', marginBottom: 12 },
  attachModalTitle:     { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center', marginBottom: 20 },
  attachModalOptions:   { flexDirection: 'row', justifyContent: 'center', gap: 32, paddingHorizontal: 24 },
  attachOption:         { alignItems: 'center', gap: 8 },
  attachOptionIcon:     { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  attachOptionLabel:    { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
});
