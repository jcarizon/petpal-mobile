import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CalendarDays, LocateFixed, Users } from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { ScreenHeader } from '../../components/ui';

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScreenHeader
        title="Event Details"
        subtitle="View event schedule, location, and RSVP actions"
      />
      <View style={styles.content}>
        <Card style={styles.card}>
          <View style={styles.row}>
            <CalendarDays size={18} color={Colors.primary} />
            <Text style={styles.text}>Event #{id}</Text>
          </View>
          <View style={styles.row}>
            <LocateFixed size={18} color={Colors.primary} />
            <Text style={styles.text}>Location details will be shown here</Text>
          </View>
          <View style={styles.row}>
            <Users size={18} color={Colors.primary} />
            <Text style={styles.text}>RSVP and attendees coming in next pass</Text>
          </View>
          <Button title="RSVP (Soon)" fullWidth variant="outline" />
        </Card>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  card: {
    gap: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  text: {
    fontSize: 14,
    color: Colors.textPrimary,
    flex: 1,
  },
});
