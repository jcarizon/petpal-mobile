import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, Modal, TouchableOpacity, StyleSheet,
  Animated, Dimensions, FlatList, Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  AlertTriangle, Search, BookOpen, BookMarked, Calendar,
  ChevronRight, ChevronLeft, PawPrint, X,
} from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import { Pet } from '../../types';

interface Props {
  visible: boolean;
  onClose: () => void;
  pets: Pet[];
}

type Step = 'menu' | 'pick-pet';
type DiaryIntent = 'post' | 'story';

const SCREEN_H = Dimensions.get('window').height;

const OPTIONS = [
  {
    id: 'lost',
    emoji: '🚨',
    label: 'Lost Pet',
    subtitle: 'Report a missing pet',
    color: Colors.error,
    bg: '#FEF2F2',
  },
  {
    id: 'found',
    emoji: '🐾',
    label: 'Found Pet',
    subtitle: 'Report a found stray',
    color: Colors.success,
    bg: '#ECFDF5',
  },
  {
    id: 'post',
    emoji: '📝',
    label: 'Public Diary Post',
    subtitle: 'Share an update to the community feed',
    color: Colors.primary,
    bg: Colors.primaryBg,
  },
  {
    id: 'story',
    emoji: '📖',
    label: 'Pet Story',
    subtitle: 'Add to your story circles',
    color: '#7C3AED',
    bg: '#F5F3FF',
  },
  {
    id: 'event',
    emoji: '📅',
    label: 'Event',
    subtitle: 'Organise a community pet meetup',
    color: Colors.secondary,
    bg: Colors.secondaryBg,
  },
] as const;

type OptionId = typeof OPTIONS[number]['id'];

export function CreatePostSheet({ visible, onClose, pets }: Props) {
  const router = useRouter();
  const slideAnim = useRef(new Animated.Value(SCREEN_H)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const [step, setStep] = useState<Step>('menu');
  const [pendingIntent, setPendingIntent] = useState<DiaryIntent>('post');

  useEffect(() => {
    if (visible) {
      setStep('menu');
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 220 }),
        Animated.timing(backdropAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: SCREEN_H, duration: 230, useNativeDriver: true }),
        Animated.timing(backdropAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const dismiss = () => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: SCREEN_H, duration: 230, useNativeDriver: true }),
      Animated.timing(backdropAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start(() => onClose());
  };

  const navigateToDiary = (petId: string, intent: DiaryIntent) => {
    dismiss();
    // Both post and story use the same diary add screen with PUBLIC visibility pre-selected
    router.push({ pathname: '/pet/[id]/diary/add', params: { id: petId, visibility: 'PUBLIC' } });
  };

  const handleOption = (id: OptionId) => {
    if (id === 'lost') {
      dismiss();
      router.push({ pathname: '/alert/create', params: { type: 'lost' } });
      return;
    }
    if (id === 'found') {
      dismiss();
      router.push({ pathname: '/alert/create', params: { type: 'found' } });
      return;
    }
    if (id === 'post' || id === 'story') {
      if (pets.length === 0) return; // disabled — no pets
      if (pets.length === 1) {
        navigateToDiary(pets[0].id, id);
      } else {
        setPendingIntent(id);
        setStep('pick-pet');
      }
      return;
    }
    if (id === 'event') {
      dismiss();
      router.push('/community/events/create');
      return;
    }
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={dismiss}>
      <View style={StyleSheet.absoluteFill}>
        {/* Backdrop */}
        <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={dismiss} />
        </Animated.View>

        {/* Sheet */}
        <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.handle} />

          {step === 'menu' ? (
            <>
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>What would you like to post?</Text>
                <TouchableOpacity onPress={dismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <X size={20} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {OPTIONS.map((opt, i) => {
                const isDiaryOpt = opt.id === 'post' || opt.id === 'story';
                const disabled = isDiaryOpt && pets.length === 0;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={[styles.row, i === OPTIONS.length - 1 && styles.rowLast, disabled && styles.rowDisabled]}
                    onPress={() => !disabled && handleOption(opt.id)}
                    activeOpacity={disabled ? 1 : 0.72}
                  >
                    <View style={[styles.iconBox, { backgroundColor: opt.bg }]}>
                      <Text style={styles.emoji}>{opt.emoji}</Text>
                    </View>
                    <View style={styles.rowText}>
                      <Text style={[styles.rowLabel, disabled && styles.rowLabelDisabled]}>{opt.label}</Text>
                      <Text style={styles.rowSub}>
                        {disabled ? 'Add a pet first to use this option' : opt.subtitle}
                      </Text>
                    </View>
                    <ChevronRight size={18} color={disabled ? Colors.neutral300 : Colors.neutral400} />
                  </TouchableOpacity>
                );
              })}
            </>
          ) : (
            <>
              <View style={styles.sheetHeader}>
                <TouchableOpacity onPress={() => setStep('menu')} style={styles.backBtn}>
                  <ChevronLeft size={20} color={Colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.sheetTitle}>Which pet?</Text>
                <TouchableOpacity onPress={dismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <X size={20} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <FlatList
                data={pets}
                keyExtractor={(p) => p.id}
                style={styles.petList}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.petRow}
                    onPress={() => navigateToDiary(item.id, pendingIntent)}
                    activeOpacity={0.75}
                  >
                    {item.avatarUrl ? (
                      <Image source={{ uri: item.avatarUrl }} style={styles.petAvatar} />
                    ) : (
                      <View style={[styles.petAvatar, styles.petAvatarFallback]}>
                        <PawPrint size={18} color={Colors.primary} />
                      </View>
                    )}
                    <View style={styles.petInfo}>
                      <Text style={styles.petName}>{item.name}</Text>
                      {(item.breed || item.species) && (
                        <Text style={styles.petBreed}>{[item.breed, item.species].filter(Boolean).join(' · ')}</Text>
                      )}
                    </View>
                    <ChevronRight size={18} color={Colors.neutral400} />
                  </TouchableOpacity>
                )}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
              />
            </>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingBottom: 32,
  },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.neutral300, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14 },
  sheetTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  backBtn: { marginRight: 8 },
  row: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border, gap: 14,
  },
  rowLast: { borderBottomWidth: 0 },
  rowDisabled: { opacity: 0.45 },
  iconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  emoji: { fontSize: 22 },
  rowText: { flex: 1 },
  rowLabel: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  rowLabelDisabled: { color: Colors.textDisabled },
  rowSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  petList: { maxHeight: 320 },
  petRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, gap: 14 },
  petAvatar: { width: 46, height: 46, borderRadius: 23 },
  petAvatarFallback: { backgroundColor: Colors.primaryBg, justifyContent: 'center', alignItems: 'center' },
  petInfo: { flex: 1 },
  petName: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  petBreed: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: Colors.border, marginLeft: 80 },
});
