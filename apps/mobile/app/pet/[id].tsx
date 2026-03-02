import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { HealthScore } from '../../components/pet/HealthScore';
import { HealthTimeline } from '../../components/pet/HealthTimeline';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Loading } from '../../components/ui/Loading';
import { usePetStore } from '../../store/petStore';
import { calculateAge, formatDate, formatPetType } from '../../lib/utils';

export default function PetDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const {
    selectedPet,
    healthRecords,
    healthScores,
    fetchPet,
    fetchHealthRecords,
    deletePet,
    isLoading,
  } = usePetStore();
  const [refreshing, setRefreshing] = React.useState(false);

  useEffect(() => {
    if (id) {
      fetchPet(id);
      fetchHealthRecords(id);
    }
  }, [id, fetchPet, fetchHealthRecords]);

  const handleRefresh = async () => {
    if (!id) return;
    setRefreshing(true);
    await Promise.all([fetchPet(id), fetchHealthRecords(id)]);
    setRefreshing(false);
  };

  const handleDelete = () => {
    Alert.alert('Delete Pet', 'Are you sure you want to delete this pet?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (id) {
            await deletePet(id);
            router.back();
          }
        },
      },
    ]);
  };

  if (isLoading || !selectedPet) {
    return <Loading fullScreen />;
  }

  const pet = selectedPet;
  const records = healthRecords[id ?? ''] ?? [];
  const scoreData = healthScores[id ?? ''];

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />
        }
      >
        {/* Pet Photo & Info */}
        <View style={styles.petHeader}>
          {pet.photoUrl ? (
            <Image source={{ uri: pet.photoUrl }} style={styles.petPhoto} />
          ) : (
            <View style={styles.petPhotoPlaceholder}>
              <Text style={styles.petPhotoEmoji}>
                {pet.type === 'dog' ? '🐕' : pet.type === 'cat' ? '🐈' : '🐾'}
              </Text>
            </View>
          )}

          <Text style={styles.petName}>{pet.name}</Text>
          <Text style={styles.petBreed}>{pet.breed ?? formatPetType(pet.type)}</Text>
          {pet.birthDate && (
            <Text style={styles.petAge}>
              Age: {calculateAge(pet.birthDate)}
            </Text>
          )}
          {pet.weight && (
            <Text style={styles.petWeight}>Weight: {pet.weight} kg</Text>
          )}
        </View>

        {/* Health Score */}
        {scoreData && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Health Score</Text>
            <Card style={styles.healthScoreCard}>
              <HealthScore score={scoreData.score} size="lg" />
              {scoreData.deductions.length > 0 && (
                <View style={styles.deductions}>
                  {scoreData.deductions.map((d, i) => (
                    <View key={i} style={styles.deductionItem}>
                      <Text style={styles.deductionText}>⚠️ {d.reason}</Text>
                      <Text style={styles.deductionPoints}>-{d.points}</Text>
                    </View>
                  ))}
                </View>
              )}
            </Card>
          </View>
        )}

        {/* Smart Suggestions */}
        {scoreData?.suggestions && scoreData.suggestions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Smart Suggestions</Text>
            {scoreData.suggestions.map((s) => (
              <Card key={s.id} style={styles.suggestionCard}>
                <View style={styles.suggestionRow}>
                  <View
                    style={[
                      styles.suggestionPriority,
                      {
                        backgroundColor:
                          s.priority === 'high'
                            ? '#FEF2F2'
                            : s.priority === 'medium'
                            ? Colors.secondaryBg
                            : Colors.primaryBg,
                      },
                    ]}
                  >
                    <Text style={styles.suggestionPriorityText}>
                      {s.priority === 'high' ? '🔴' : s.priority === 'medium' ? '🟡' : '🟢'}
                    </Text>
                  </View>
                  <View style={styles.suggestionContent}>
                    <Text style={styles.suggestionTitle}>{s.title}</Text>
                    <Text style={styles.suggestionDesc}>{s.description}</Text>
                  </View>
                </View>
              </Card>
            ))}
          </View>
        )}

        {/* Health Timeline */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Health Timeline</Text>
            <TouchableOpacity onPress={() => router.push(`/pet/${id}/record/add`)}>
              <Text style={styles.addRecord}>+ Add Record</Text>
            </TouchableOpacity>
          </View>
          <HealthTimeline records={records} />
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Button
            title="Edit Pet"
            variant="outline"
            onPress={() => router.push(`/pet/add?id=${id}`)}
            style={styles.actionButton}
          />
          <Button
            title="Delete"
            variant="ghost"
            onPress={handleDelete}
            style={[styles.actionButton, { borderColor: Colors.error }]}
          />
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
  petHeader: {
    alignItems: 'center',
    padding: 24,
    gap: 6,
  },
  petPhoto: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 8,
  },
  petPhotoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  petPhotoEmoji: {
    fontSize: 60,
  },
  petName: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  petBreed: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  petAge: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  petWeight: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  addRecord: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
  healthScoreCard: {
    alignItems: 'center',
    gap: 16,
  },
  deductions: {
    width: '100%',
    gap: 8,
  },
  deductionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deductionText: {
    fontSize: 13,
    color: Colors.textSecondary,
    flex: 1,
  },
  deductionPoints: {
    fontSize: 13,
    color: Colors.error,
    fontWeight: '700',
  },
  suggestionCard: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.secondary,
  },
  suggestionRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  suggestionPriority: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionPriorityText: {
    fontSize: 16,
  },
  suggestionContent: {
    flex: 1,
    gap: 4,
  },
  suggestionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  suggestionDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
  },
  actionButton: {
    flex: 1,
  },
});
