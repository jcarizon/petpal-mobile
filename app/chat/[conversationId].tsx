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
import { ArrowLeft, Send, Paperclip, ImageIcon, Video, Camera, X } from 'lucide-react-native';
import { uploadImage } from '../../lib/uploadImage';
import { Colors } from '../../constants/colors';
import { useChatStore } from '../../store/chatStore';
import { useAuthStore } from '../../store/authStore';
import { ChatMessage } from '../../types';
import { formatRelativeDate } from '../../lib/utils';

const PENDING_MSG_LIMIT = 3;

export default function ConversationScreen() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const {
    conversations, messages, fetchMessages, sendMessage,
    acceptConversation, declineConversation, markRead, isSending,
  } = useChatStore();

  const [input,           setInput]           = useState('');
  const [showAttachMenu,  setShowAttachMenu]  = useState(false);
  const [attachment,      setAttachment]      = useState<{
    type: 'image' | 'video' | 'file';
    uri: string;
    name: string;
    uploading: boolean;
  } | null>(null);
  const flatRef  = useRef<FlatList>(null);
  const pollRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  const conv = conversations.find((c) => c.id === conversationId);
  const msgs: ChatMessage[] = messages[conversationId ?? ''] ?? [];

  const isInitiator = user?.id === conv?.initiatorId;
  const isRecipient = user?.id === conv?.recipientId;
  const otherName   = isInitiator ? conv?.recipientName : conv?.initiatorName;

  const sentByMe = msgs.filter((m) => m.senderId === user?.id).length;
  const limitReached = conv?.status === 'PENDING' && isInitiator && sentByMe >= PENDING_MSG_LIMIT;
  const canType = conv?.status === 'ACTIVE' || (conv?.status === 'PENDING' && isInitiator && !limitReached);

  const load = useCallback(async () => {
    if (!conversationId) return;
    await fetchMessages(conversationId);
    await markRead(conversationId);
  }, [conversationId, fetchMessages, markRead]);

  useEffect(() => { load(); }, [load]);

  // Poll for new messages every 3s while screen is focused
  useFocusEffect(
    useCallback(() => {
      pollRef.current = setInterval(load, 3000);
      return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }, [load])
  );

  const requestLibraryPermission = async (): Promise<boolean> => {
    const { status, canAskAgain } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status === 'granted') return true;
    if (!canAskAgain) {
      Alert.alert(
        'Permission Required',
        'Photo library access is required. Please enable it in your device Settings > PetPal > Photos.',
        [{ text: 'OK' }],
      );
    } else {
      Alert.alert('Permission Required', 'Allow PetPal to access your photo library.');
    }
    return false;
  };

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
      Alert.alert('Permission Required', 'Allow PetPal to access your camera.');
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
            // Files: embed name + uri (no Cloudinary upload for raw files)
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

      if (!content.trim()) return;
      await sendMessage(conversationId, content);
      flatRef.current?.scrollToEnd({ animated: true });
    } catch (err) {
      const msg = (err as { message?: string }).message ?? 'Failed to send message';
      Alert.alert('Error', msg);
      if (text) setInput(text);
      if (pendingAttachment) setAttachment(pendingAttachment);
    }
  };

  const handleAccept = async () => {
    if (!conversationId) return;
    await acceptConversation(conversationId);
    await load();
  };

  const handleDecline = async () => {
    if (!conversationId) return;
    Alert.alert('Decline Chat', 'Are you sure you want to decline this chat request?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Decline', style: 'destructive', onPress: async () => { await declineConversation(conversationId); router.back(); } },
    ]);
  };

  const renderMessage = ({ item, index }: { item: ChatMessage; index: number }) => {
    const mine = item.senderId === user?.id;
    const prev = msgs[index - 1];
    const showName = !mine && (!prev || prev.senderId !== item.senderId);

    // Parse attachment prefixes
    const imgMatch  = item.content.match(/^\[img\](https?:\/\/\S+)(\n(.*))?$/s);
    const vidMatch  = item.content.match(/^\[vid:([^\]]+)\](https?:\/\/\S+)?(\n(.*))?$/s);
    const fileMatch = item.content.match(/^\[file:([^\]]+)\](\S+)(\n(.*))?$/s);

    return (
      <View style={[styles.msgWrap, mine ? styles.msgWrapMine : styles.msgWrapOther]}>
        {showName && <Text style={styles.msgSender}>{item.senderName}</Text>}
        <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}>
          {imgMatch ? (
            <>
              <Image source={{ uri: imgMatch[1] }} style={styles.attachImage} resizeMode="cover" />
              {imgMatch[3] ? <Text style={[styles.bubbleText, mine && styles.bubbleTextMine, { marginTop: 6 }]}>{imgMatch[3]}</Text> : null}
            </>
          ) : vidMatch ? (
            <>
              <View style={[styles.attachChip, mine ? styles.attachChipMine : styles.attachChipOther]}>
                <Video size={16} color={mine ? Colors.surface : Colors.primary} />
                <Text style={[styles.attachChipText, mine && styles.attachChipTextMine]} numberOfLines={1}>{vidMatch[1]}</Text>
              </View>
              {vidMatch[4] ? <Text style={[styles.bubbleText, mine && styles.bubbleTextMine, { marginTop: 4 }]}>{vidMatch[4]}</Text> : null}
            </>
          ) : fileMatch ? (
            <>
              <View style={[styles.attachChip, mine ? styles.attachChipMine : styles.attachChipOther]}>
                <FileText size={16} color={mine ? Colors.surface : Colors.primary} />
                <Text style={[styles.attachChipText, mine && styles.attachChipTextMine]} numberOfLines={1}>{fileMatch[1]}</Text>
              </View>
              {fileMatch[4] ? <Text style={[styles.bubbleText, mine && styles.bubbleTextMine, { marginTop: 4 }]}>{fileMatch[4]}</Text> : null}
            </>
          ) : (
            <Text style={[styles.bubbleText, mine && styles.bubbleTextMine]}>{item.content}</Text>
          )}
        </View>
        <Text style={[styles.msgTime, mine && styles.msgTimeMine]}>
          {formatRelativeDate(new Date(item.createdAt))}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerName} numberOfLines={1}>{otherName ?? '…'}</Text>
          {conv && <Text style={styles.headerAlert} numberOfLines={1}>Re: {conv.alertTitle}</Text>}
        </View>
        {conv && (
          <View style={[styles.statusChip, { backgroundColor: conv.status === 'ACTIVE' ? Colors.primaryBg : conv.status === 'DECLINED' ? '#FEF2F2' : '#FFFBEB' }]}>
            <Text style={[styles.statusChipText, { color: conv.status === 'ACTIVE' ? Colors.primary : conv.status === 'DECLINED' ? Colors.error : Colors.secondary }]}>
              {conv.status === 'ACTIVE' ? 'Active' : conv.status === 'DECLINED' ? 'Declined' : 'Pending'}
            </Text>
          </View>
        )}
      </View>

      {/* Accept/Decline banner (recipient, PENDING) */}
      {conv?.status === 'PENDING' && isRecipient && (
        <View style={styles.requestBanner}>
          <Text style={styles.requestBannerText}>
            {conv.initiatorName} wants to chat about: {conv.alertTitle}
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

      {/* Message limit warning (initiator, PENDING, limit reached) */}
      {limitReached && (
        <View style={styles.limitBanner}>
          <Text style={styles.limitBannerText}>
            Sent {PENDING_MSG_LIMIT}/{PENDING_MSG_LIMIT} intro messages. Waiting for {conv?.recipientName} to accept.
          </Text>
        </View>
      )}

      {/* Declined banner */}
      {conv?.status === 'DECLINED' && (
        <View style={styles.declinedBanner}>
          <Text style={styles.declinedBannerText}>This chat request was declined.</Text>
        </View>
      )}

      {/* Messages */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={flatRef}
          data={msgs}
          keyExtractor={(m) => m.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.msgList}
          onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={styles.emptyMsgs}>
              <Text style={styles.emptyMsgsText}>
                {conv?.status === 'PENDING' && isInitiator
                  ? `Send up to ${PENDING_MSG_LIMIT} messages to introduce yourself.`
                  : 'No messages yet. Say hello!'}
              </Text>
            </View>
          }
        />

        {/* Input bar */}
        {canType && (
          <View style={styles.inputWrap}>
            {conv?.status === 'PENDING' && isInitiator && (
              <Text style={styles.limitHint}>{PENDING_MSG_LIMIT - sentByMe} left</Text>
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
  container:          { flex: 1, backgroundColor: Colors.background },
  flex:               { flex: 1 },
  header:             { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: Colors.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border, gap: 10 },
  backBtn:            { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.neutral100, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  headerInfo:         { flex: 1 },
  headerName:         { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  headerAlert:        { fontSize: 12, color: Colors.textSecondary, fontStyle: 'italic' },
  statusChip:         { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, flexShrink: 0 },
  statusChipText:     { fontSize: 11, fontWeight: '700' },
  requestBanner:      { backgroundColor: '#FFFBEB', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#FCD34D', paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
  requestBannerText:  { fontSize: 13, color: Colors.secondary, fontWeight: '500', lineHeight: 18 },
  requestBannerActions: { flexDirection: 'row', gap: 10 },
  acceptBtn:          { flex: 1, backgroundColor: Colors.primary, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  acceptBtnText:      { fontSize: 14, fontWeight: '700', color: Colors.surface },
  declineBtn:         { flex: 1, backgroundColor: Colors.neutral100, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  declineBtnText:     { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  limitBanner:        { backgroundColor: '#FFFBEB', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#FCD34D' },
  limitBannerText:    { fontSize: 13, color: Colors.secondary, textAlign: 'center', fontWeight: '500' },
  declinedBanner:     { backgroundColor: '#FEF2F2', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#FECACA' },
  declinedBannerText: { fontSize: 13, color: Colors.error, textAlign: 'center', fontWeight: '500' },
  msgList:            { paddingHorizontal: 16, paddingVertical: 16, gap: 4, flexGrow: 1 },
  msgWrap:            { maxWidth: '78%', gap: 2 },
  msgWrapMine:        { alignSelf: 'flex-end', alignItems: 'flex-end' },
  msgWrapOther:       { alignSelf: 'flex-start', alignItems: 'flex-start' },
  msgSender:          { fontSize: 11, fontWeight: '600', color: Colors.textSecondary, marginBottom: 2, marginLeft: 2 },
  bubble:             { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleMine:         { backgroundColor: Colors.primary, borderBottomRightRadius: 4 },
  bubbleOther:        { backgroundColor: Colors.surface, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: Colors.border },
  bubbleText:         { fontSize: 14, color: Colors.textPrimary, lineHeight: 20 },
  bubbleTextMine:     { color: Colors.surface },
  msgTime:            { fontSize: 10, color: Colors.neutral400, marginTop: 2, marginHorizontal: 4 },
  msgTimeMine:        { alignSelf: 'flex-end' },
  emptyMsgs:          { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyMsgsText:      { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', paddingHorizontal: 40, lineHeight: 20 },
  inputWrap:          { backgroundColor: Colors.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border, paddingTop: 6 },
  limitHint:          { fontSize: 11, color: Colors.secondary, fontWeight: '600', paddingHorizontal: 14, paddingBottom: 4 },
  inputRow:           { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 10, paddingBottom: 10, gap: 6 },
  attachBtn:          { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  input:              { flex: 1, backgroundColor: Colors.neutral50, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: Colors.textPrimary, maxHeight: 100, borderWidth: 1, borderColor: Colors.border },
  sendBtn:            { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled:    { opacity: 0.4 },
  // Attachment preview
  attachPreview:      { flexDirection: 'row', alignItems: 'center', marginHorizontal: 12, marginBottom: 6, gap: 8, backgroundColor: Colors.neutral50, borderRadius: 10, padding: 8, borderWidth: 1, borderColor: Colors.border },
  attachPreviewImage: { width: 56, height: 56, borderRadius: 8 },
  attachPreviewChip:  { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  attachPreviewName:  { flex: 1, fontSize: 13, color: Colors.textPrimary, fontWeight: '500' },
  attachPreviewSpinner: { marginLeft: 'auto' as any },
  attachPreviewRemove:{ width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.neutral400, alignItems: 'center', justifyContent: 'center' },
  // Attach modal
  attachModalBackdrop:{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  attachModal:        { backgroundColor: Colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: Platform.OS === 'ios' ? 32 : 20, paddingTop: 8 },
  attachModalHandle:  { width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.neutral300, alignSelf: 'center', marginBottom: 12 },
  attachModalTitle:   { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center', marginBottom: 20 },
  attachModalOptions: { flexDirection: 'row', justifyContent: 'center', gap: 32, paddingHorizontal: 24 },
  attachOption:       { alignItems: 'center', gap: 8 },
  attachOptionIcon:   { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  attachOptionLabel:  { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  // Attachment in bubbles
  attachImage:        { width: 220, height: 160, borderRadius: 10 },
  attachChip:         { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10, maxWidth: 220 },
  attachChipMine:     { backgroundColor: 'rgba(255,255,255,0.2)' },
  attachChipOther:    { backgroundColor: Colors.neutral100 },
  attachChipText:     { flex: 1, fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  attachChipTextMine: { color: Colors.surface },
});
