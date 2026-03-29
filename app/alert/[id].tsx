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
  Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  CalendarDays,
  MapPin,
  Phone,
  FileText,
  Search,
  CheckCheck,
  PawPrint,
  User,
} from 'lucide-react-native';
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
import { ScreenHeader } from '../../components/ui';

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

  const handleCallPhone = (phone: string) => {
    const url = `tel:${phone.replace(/\s/g, '')}`;
    Linking.canOpenURL(url).then((supported) => {
      if (supported) Linking.openURL(url);
    });
  };

  if (isLoading || !selectedAlert) {
    return <Loading fullScreen />;
  }

  const alert = selectedAlert;
  const alertSightings = sightings[id ?? ''] ?? [];
  const isOwner = alert.userId === user?.id;
  const isLost = alert.type === 'lost';
  const isResolved = alert.status === 'resolved';

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScreenHeader
        title="Alert Details"
        subtitle="Track sightings and coordinate community responses"
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.primary}
          />
        }
      >
        {/* Alert Image */}
        {alert.photoUrl ? (
          <Image
            source={{ uri: alert.photoUrl }}
            style={styles.alertImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.alertImagePlaceholder}>
            <Text style={styles.alertImagePlaceholderText}>🐾</Text>
          </View>
        )}

        {/* Alert Header */}
        <View style={styles.header}>
          <View style={styles.badgeRow}>
            <Badge
              label={isLost ? '🚨 LOST' : '✅ FOUND'}
              backgroundColor={isLost ? Colors.alertLost : Colors.alertFound}
              color={Colors.textInverse}
              size="md"
            />
            {isResolved && (
              <Badge
                label="✔ RESOLVED"
                backgroundColor={Colors.neutral400}
                color={Colors.textInverse}
                size="md"
              />
            )}
          </View>
          <Text style={styles.title}>{alert.title}</Text>
          {alert.userName ? (
            <Text style={styles.postedBy}>Posted by {alert.userName}</Text>
          ) : null}
        </View>

        {/* Details Card */}
        <View style={styles.section}>
          <Card>
            {/* Date */}
            <View style={styles.detailItem}>
              <CalendarDays size={16} color={Colors.textSecondary} />
              <Text style={styles.detailText}>{formatDate(alert.createdAt, 'long')}</Text>
            </View>

            {/* Location */}
            {alert.city ? (
              <View style={styles.detailItem}>
                <MapPin size={16} color={Colors.textSecondary} />
                <Text style={styles.detailText}>{alert.city}</Text>
              </View>
            ) : null}

            {/* Pet Name */}
            {alert.petName ? (
              <View style={styles.detailItem}>
                <PawPrint size={16} color={Colors.textSecondary} />
                <View style={styles.detailTextGroup}>
                  <Text style={styles.detailLabel}>Pet Name</Text>
                  <Text style={styles.detailText}>{alert.petName}</Text>
                </View>
              </View>
            ) : null}

            {/* Pet Breed */}
            {alert.petBreed ? (
              <View style={styles.detailItem}>
                <PawPrint size={16} color={Colors.textSecondary} />
                <View style={styles.detailTextGroup}>
                  <Text style={styles.detailLabel}>Breed</Text>
                  <Text style={styles.detailText}>{alert.petBreed}</Text>
                </View>
              </View>
            ) : null}

            {/* Pet Species */}
            {alert.petSpecies ? (
              <View style={styles.detailItem}>
                <PawPrint size={16} color={Colors.textSecondary} />
                <View style={styles.detailTextGroup}>
                  <Text style={styles.detailLabel}>Species</Text>
                  <Text style={styles.detailText}>{alert.petSpecies}</Text>
                </View>
              </View>
            ) : null}

            {/* Description */}
            {alert.description ? (
              <View style={styles.detailItem}>
                <FileText size={16} color={Colors.textSecondary} />
                <Text style={[styles.detailText, styles.detailDescription]}>
                  {alert.description}
                </Text>
              </View>
            ) : null}

            {/* Contact phone — tappable */}
            {alert.userPhone ? (
              <TouchableOpacity
                style={styles.detailItem}
                onPress={() => handleCallPhone(alert.userPhone!)}
                activeOpacity={0.7}
              >
                <Phone size={16} color={Colors.primary} />
                <Text style={[styles.detailText, styles.phoneText]}>{alert.userPhone}</Text>
              </TouchableOpacity>
            ) : null}
          </Card>
        </View>

        {/* Sighting button */}
        {!isResolved && !isOwner && (
          <View style={styles.section}>
            <Button
              title={showSightingForm ? 'Cancel' : 'I Saw This Pet'}
              variant={showSightingForm ? 'outline' : 'primary'}
              onPress={() => setShowSightingForm((prev) => !prev)}
              fullWidth
              leftIcon={<Search size={16} color={showSightingForm ? Colors.primary : Colors.textInverse} />}
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
        {isOwner && !isResolved && (
          <View style={styles.section}>
            <Button
              title="Mark as Resolved"
              variant="secondary"
              onPress={handleResolve}
              fullWidth
              leftIcon={<CheckCheck size={16} color={Colors.textInverse} />}
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
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  detailTextGroup: {
    flex: 1,
    gap: 2,
  },
  detailLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
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