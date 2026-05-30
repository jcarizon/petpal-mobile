import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Home, Check } from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import { Alert } from '../../types';

interface AdoptionDetailsCardProps {
  alert: Alert;
}

export function AdoptionDetailsCard({ alert }: AdoptionDetailsCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconBox}>
          <Home size={14} color="#8B5CF6" />
        </View>
        <Text style={styles.title}>Adoption Details</Text>
      </View>

      {alert.adoptionReason ? (
        <View style={styles.row}>
          <Text style={styles.label}>Reason for rehoming</Text>
          <Text style={styles.value}>{alert.adoptionReason}</Text>
        </View>
      ) : null}

      {alert.adoptionFee !== undefined && (
        <View style={styles.row}>
          <Text style={styles.label}>Adoption fee</Text>
          <Text style={styles.value}>
            {alert.adoptionFee === 0 ? 'Free to good home' : `₱${alert.adoptionFee}`}
          </Text>
        </View>
      )}

      {(alert.isNeutered !== undefined || alert.isVaccinated !== undefined) && (
        <View style={styles.row}>
          <Text style={styles.label}>Health status</Text>
          <View style={styles.chipRow}>
            {alert.isNeutered && (
              <View style={styles.chip}>
                <Check size={11} color={Colors.success} />
                <Text style={styles.chipText}>Neutered</Text>
              </View>
            )}
            {alert.isVaccinated && (
              <View style={styles.chip}>
                <Check size={11} color={Colors.success} />
                <Text style={styles.chipText}>Vaccinated</Text>
              </View>
            )}
            {!alert.isNeutered && !alert.isVaccinated && (
              <Text style={styles.valueSecondary}>Not specified</Text>
            )}
          </View>
        </View>
      )}

      {alert.idealOwnerNote ? (
        <View style={styles.row}>
          <Text style={styles.label}>Ideal owner</Text>
          <Text style={styles.value}>{alert.idealOwnerNote}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#F5F3FF',
    borderRadius: 14,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  iconBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6D28D9',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: {
    gap: 4,
  },
  label: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  value: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: '500',
    lineHeight: 20,
  },
  valueSecondary: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.successBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.success,
  },
});
