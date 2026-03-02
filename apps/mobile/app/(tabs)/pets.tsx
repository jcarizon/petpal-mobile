import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { PetCard } from '../../components/pet/PetCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { Loading } from '../../components/ui/Loading';
import { usePetStore } from '../../store/petStore';

export default function PetsScreen() {
  const router = useRouter();
  const { pets, fetchPets, isLoading } = usePetStore();
  const [refreshing, setRefreshing] = React.useState(false);

  useEffect(() => {
    fetchPets();
  }, [fetchPets]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchPets();
    setRefreshing(false);
  };

  if (isLoading && pets.length === 0) {
    return <Loading fullScreen />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>My Pets</Text>
      </View>

      {pets.length === 0 ? (
        <EmptyState
          icon="🐾"
          title="No pets yet"
          description="Add your first pet to start tracking their health."
          actionLabel="Add Pet"
          onAction={() => router.push('/pet/add')}
        />
      ) : (
        <FlatList
          data={pets}
          numColumns={3}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />
          }
          renderItem={({ item }) => (
            <PetCard
              pet={item}
              onPress={() => router.push(`/pet/${item.id}`)}
            />
          )}
          columnWrapperStyle={styles.row}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/pet/add')}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  list: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 100,
    gap: 12,
  },
  row: {
    gap: 12,
    justifyContent: 'flex-start',
  },
  fab: {
    position: 'absolute',
    bottom: 28,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  fabText: {
    fontSize: 28,
    color: Colors.textInverse,
    fontWeight: '300',
    lineHeight: 32,
  },
});
