import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Loading } from '../../components/ui/Loading';
import { SightingItem } from '../../components/community/SightingItem';
import { useCommunityStore } from '../../store/communityStore';
import { useAuthStore } from '../../store/authStore';
import { useLocation } from '../../hooks/useLocation';
import { formatDate } from '../../lib/utils';
import { Input } from '../../components/ui/Input';

export default function AlertDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const {
    selectedAlert,
    sightings,
    fetchAlert,
    fetchSightings,
    createSighting,
    resolveAlert,
    isLoading,
  } = useCommunityStore();
  const { coordinates, getCurrentLocation } = useLocation();
  const [refreshing, setRefreshing] = useState(false);
  const [showSightingForm, setShowSightingForm] = useState(false);
  const [sightingDescription, setSightingDescription] = useState('');

  useEffect(() => {
    if (id) {
      fetchAlert(id);
      fetchSightings(id);
      getCurrentLocation();
    }
  }, [id, fetchAlert, fetchSightings, getCurrentLocation]);

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

    const coords = coordinates ?? (await getCurrentLocation());
    if (!coords) {
      Alert.alert('Error', 'Location required. Please enable location permissions.');
      return;
    }

    try {
      await createSighting(id, {
        description: sightingDescription.trim(),
        latitude: coords.latitude,
        longitude: coords.longitude,
      });
      setSightingDescription('');
      setShowSightingForm(false);
    } catch {
      Alert.alert('Error', 'Failed to submit sighting.');
    }
  };

  const handleResolve = () => {
    Alert.alert('Resolve Alert', 'Mark this alert as resolved?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Resolve',
        onPress: async () => {
          if (id) {
            await resolveAlert(id);
          }
        },
      },
    ]);
  };

  if (isLoading || !selectedAlert) {
    return <Loading fullScreen />;
  }

  const alert = selectedAlert;
  const alertSightings = sightings[id ?? ''] ?? [];
  const isOwner = alert.userId === user?.id;
  const isLost = alert.type === 'lost';

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />
        }
      >
        {/* Alert Image */}
        {alert.photoUrl && (
          <Image source={{ uri: alert.photoUrl }} style={styles.alertImage} />
        )}

        {/* Alert Header */}
        <View style={styles.header}>
          <Badge
            label={isLost ? '🚨 LOST' : '✅ FOUND'}
            backgroundColor={isLost ? Colors.alertLost : Colors.alertFound}
            color={Colors.textInverse}
            size="md"
          />
          <Text style={styles.title}>{alert.title}</Text>
          {alert.petName && <Text style={styles.petName}>Pet: {alert.petName}</Text>}
          {alert.petBreed && <Text style={styles.petBreed}>Breed: {alert.petBreed}</Text>}
        </View>

        {/* Details */}
        <View style={styles.section}>
          <Card>
            <View style={styles.detailItem}>
              <Text style={styles.detailIcon}>📅</Text>
              <Text style={styles.detailText}>{formatDate(alert.createdAt, 'long')}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailIcon}>📍</Text>
              <Text style={styles.detailText}>{alert.city}</Text>
            </View>
            {alert.userPhone && (
              <View style={styles.detailItem}>
                <Text style={styles.detailIcon}>📞</Text>
                <Text style={styles.detailText}>{alert.userPhone}</Text>
              </View>
            )}
            {alert.description && (
              <View style={styles.detailItem}>
                <Text style={styles.detailIcon}>📝</Text>
                <Text style={styles.detailText}>{alert.description}</Text>
              </View>
            )}
          </Card>
        </View>

        {/* Sighting button */}
        {alert.status === 'active' && (
          <View style={styles.section}>
            <Button
              title="🔍 I Saw This Pet"
              variant="primary"
              onPress={() => setShowSightingForm((prev) => !prev)}
              fullWidth
            />
          </View>
        )}

        {/* Sighting form */}
        {showSightingForm && (
          <View style={styles.section}>
            <Card>
              <Text style={styles.sightingFormTitle}>Describe the sighting</Text>
              <Input
                placeholder="Where did you see the pet? Any distinguishing details..."
                value={sightingDescription}
                onChangeText={setSightingDescription}
                multiline
                numberOfLines={3}
                style={{ minHeight: 80, textAlignVertical: 'top' }}
              />
              <Button
                title="Submit Sighting"
                variant="primary"
                onPress={handleAddSighting}
                isLoading={isLoading}
                fullWidth
              />
            </Card>
          </View>
        )}

        {/* Resolve button (owner only) */}
        {isOwner && alert.status === 'active' && (
          <View style={styles.section}>
            <Button
              title="✅ Mark as Resolved"
              variant="secondary"
              onPress={handleResolve}
              fullWidth
            />
          </View>
        )}

        {/* Sightings thread */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Sightings ({alertSightings.length})
          </Text>
          {alertSightings.length === 0 ? (
            <Text style={styles.noSightings}>No sightings reported yet.</Text>
          ) : (
            alertSightings.map((s) => (
              <SightingItem key={s.id} sighting={s} />
            ))
          )}
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
  alertImage: {
    width: '100%',
    height: 250,
  },
  header: {
    padding: 20,
    gap: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  petName: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  petBreed: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  section: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 12,
  },
  detailItem: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    paddingVertical: 6,
  },
  detailIcon: {
    fontSize: 16,
    width: 24,
    textAlign: 'center',
  },
  detailText: {
    fontSize: 14,
    color: Colors.textPrimary,
    flex: 1,
  },
  sightingFormTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 8,
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
});
