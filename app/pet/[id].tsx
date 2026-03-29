import React, { useEffect, useState } from 'react';
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
import { Plus, PawPrint, AlertTriangle, Circle, CircleDot } from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import { HealthScore } from '../../components/pet/HealthScore';
import { HealthTimeline } from '../../components/pet/HealthTimeline';
import { DiaryTimeline } from '../../components/pet/DiaryTimeline';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Loading } from '../../components/ui/Loading';
import { ScreenHeader } from '../../components/ui';
import { Tabs } from '../../components/ui/Tabs';
import { usePetStore } from '../../store/petStore';
import { calculateAge, formatDate, formatPetType } from '../../lib/utils';

export default function PetDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const {
    selectedPet,
    healthRecords,
    healthScores,
    diaries,
    fetchPet,
    fetchHealthRecords,
    fetchDiaries,
    deletePet,
    isLoading,
  } = usePetStore();
  const [refreshing, setRefreshing] = React.useState(false);
  const [activeTab, setActiveTab] = useState('health');

  useEffect(() => {
    if (id) {
      fetchPet(id);
      fetchHealthRecords(id);
      fetchDiaries(id);
    }
  }, [id, fetchPet, fetchHealthRecords, fetchDiaries]);

  const handleRefresh = async () => {
    if (!id) return;
    setRefreshing(true);
    await Promise.all([fetchPet(id), fetchHealthRecords(id), fetchDiaries(id)]);
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
  const petDiaries = diaries[id ?? ''] ?? [];

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScreenHeader
        title={pet.name}
        subtitle="Pet profile, health score, and records"
        rightAction={
          <TouchableOpacity onPress={() => router.push(`/pet/${id}/record/add`)} style={styles.headerAction}>
            <Plus size={18} color={Colors.primary} />
          </TouchableOpacity>
        }
      />
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
              <PawPrint size={48} color={Colors.primary} />
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
                      <View style={styles.deductionReasonRow}>
                        <AlertTriangle size={14} color={Colors.warning} />
                        <Text style={styles.deductionText}>{d.reason}</Text>
                      </View>
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
                      {s.priority === 'high' ? '' : s.priority === 'medium' ? '' : ''}
                    </Text>
                    {s.priority === 'high' ? (
                      <CircleDot size={16} color={Colors.error} />
                    ) : s.priority === 'medium' ? (
                      <CircleDot size={16} color={Colors.secondary} />
                    ) : (
                      <Circle size={16} color={Colors.success} />
                    )}
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

        {/* Tabbed Content: Health Timeline & Pet Diary */}
        <View style={styles.section}>
          <View style={styles.tabsContainer}>
            <Tabs
              tabs={[
                { key: 'health', label: 'Health Timeline' },
                { key: 'diary', label: 'Pet Diary' },
              ]}
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />
          </View>
          
          {activeTab === 'health' && (
            <View style={styles.tabContent}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Health Records</Text>
                <TouchableOpacity onPress={() => router.push(`/pet/${id}/record/add`)}>
                  <View style={styles.addRecordRow}>
                    <Plus size={14} color={Colors.primary} />
                    <Text style={styles.addRecord}>Add Record</Text>
                  </View>
                </TouchableOpacity>
              </View>
              <HealthTimeline 
                records={records} 
                onRecordPress={(record) => router.push(`/pet/${id}/record/${record.id}`)} 
              />
            </View>
          )}
          
          {activeTab === 'diary' && (
            <View style={styles.tabContent}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Diary Entries</Text>
                <TouchableOpacity onPress={() => router.push(`/pet/${id}/diary/add`)}>
                  <View style={styles.addRecordRow}>
                    <Plus size={14} color={Colors.primary} />
                    <Text style={styles.addRecord}>Add Entry</Text>
                  </View>
                </TouchableOpacity>
              </View>
              <DiaryTimeline diaries={petDiaries} petId={id} />
            </View>
          )}
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
    paddingHorizontal: 24,
    paddingBottom: 20,
    gap: 6,
  },
  headerAction: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
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
    gap: 10,
  },
  deductionReasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
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
    fontSize: 0,
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
  addRecordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
  },
  actionButton: {
    flex: 1,
  },
  tabsContainer: {
    marginBottom: 16,
  },
  tabContent: {
    gap: 12,
  },
});
