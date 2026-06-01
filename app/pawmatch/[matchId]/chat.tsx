import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Send } from 'lucide-react-native';
import { Colors } from '../../../constants/colors';
import { usePawMatchStore } from '../../../store/pawmatchStore';
import { usePetStore } from '../../../store/petStore';
import { PawMatchMessage } from '../../../types';

export default function ChatScreen() {
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const router = useRouter();
  const { matches, conversations, fetchConversation, sendMessage } = usePawMatchStore();
  const { pets } = usePetStore();
  const [text, setText] = useState('');
  const listRef = useRef<FlatList>(null);

  const match = matches.find((m) => m.id === matchId);
  const conversation = conversations[matchId];
  const myPet = pets[0];

  useEffect(() => {
    if (matchId) {
      fetchConversation(matchId);
      const interval = setInterval(() => fetchConversation(matchId), 3000);
      return () => clearInterval(interval);
    }
  }, [matchId]);

  useEffect(() => {
    if (conversation?.messages.length) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [conversation?.messages.length]);

  const getOtherProfile = () => {
    if (!match || !myPet) return null;
    return match.profileA.petId === myPet.id ? match.profileB : match.profileA;
  };

  const otherProfile = getOtherProfile();
  const otherPetName = otherProfile?.pet?.name ?? 'Chat';

  const handleSend = async () => {
    if (!text.trim() || !myPet) return;
    const content = text.trim();
    setText('');
    try {
      await sendMessage(matchId, myPet.id, content);
    } catch {
      setText(content);
    }
  };

  const renderMessage = ({ item }: { item: PawMatchMessage }) => {
    const isMine = item.senderPetId === myPet?.id;
    return (
      <View style={[styles.msgRow, isMine ? styles.msgRowMine : styles.msgRowOther]}>
        {!isMine && otherProfile?.pet?.avatarUrl && (
          <Image source={{ uri: otherProfile.pet.avatarUrl }} style={styles.msgAvatar} />
        )}
        <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleOther]}>
          {item.mediaUrl ? (
            <Image source={{ uri: item.mediaUrl }} style={styles.mediaImg} resizeMode="cover" />
          ) : (
            <Text style={[styles.bubbleText, isMine && styles.bubbleTextMine]}>{item.content}</Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        {otherProfile?.pet?.avatarUrl && (
          <Image source={{ uri: otherProfile.pet.avatarUrl }} style={styles.headerAvatar} />
        )}
        <Text style={styles.headerTitle}>{otherPetName}</Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
        <FlatList
          ref={listRef}
          data={conversation?.messages ?? []}
          keyExtractor={(m) => m.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messageList}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Say hello! 🐾</Text>
            </View>
          }
        />
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="Type a message…"
            placeholderTextColor={Colors.textDisabled}
            multiline
            returnKeyType="send"
            onSubmitEditing={handleSend}
          />
          <TouchableOpacity style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]} onPress={handleSend} disabled={!text.trim()}>
            <Send size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: 10 },
  backBtn: { width: 32, height: 32, justifyContent: 'center' },
  headerAvatar: { width: 36, height: 36, borderRadius: 18 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary, flex: 1 },
  messageList: { padding: 16, paddingBottom: 8 },
  msgRow: { flexDirection: 'row', marginBottom: 10, alignItems: 'flex-end' },
  msgRowMine: { justifyContent: 'flex-end' },
  msgRowOther: { justifyContent: 'flex-start' },
  msgAvatar: { width: 28, height: 28, borderRadius: 14, marginRight: 8 },
  bubble: { maxWidth: '75%', borderRadius: 16, padding: 10 },
  bubbleMine: { backgroundColor: Colors.primary, borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: Colors.surface, borderBottomLeftRadius: 4, elevation: 1 },
  bubbleText: { fontSize: 14, color: Colors.textPrimary, lineHeight: 20 },
  bubbleTextMine: { color: '#fff' },
  mediaImg: { width: 200, height: 150, borderRadius: 8 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, paddingVertical: 10, backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border, gap: 8 },
  input: { flex: 1, backgroundColor: Colors.neutral100, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: Colors.textPrimary, maxHeight: 100 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  sendBtnDisabled: { backgroundColor: Colors.neutral300 },
  empty: { flex: 1, alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 16, color: Colors.textSecondary },
});
