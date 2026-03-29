import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { BookOpen } from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import { PetDiary } from '../../types';
import { DiaryCard } from './DiaryCard';

interface DiaryTimelineProps {
  diaries: PetDiary[];
  petId?: string;
  onDiaryPress?: (diary: PetDiary) => void;
}

export function DiaryTimeline({ diaries, petId, onDiaryPress }: DiaryTimelineProps) {
  const router = useRouter();
  if (diaries.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <BookOpen size={40} color={Colors.textSecondary} />
        <Text style={styles.emptyTitle}>No diary entries yet</Text>
        <Text style={styles.emptySubtitle}>
          Start documenting your pet's daily life and memorable moments
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={diaries}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <DiaryCard 
          diary={item} 
          onPress={() => {
            if (onDiaryPress) {
              onDiaryPress(item);
            } else if (petId) {
              router.push(`/pet/${petId}/diary/${item.id}`);
            }
          }} 
        />
      )}
      scrollEnabled={false}
      contentContainerStyle={styles.listContent}
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    gap: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
