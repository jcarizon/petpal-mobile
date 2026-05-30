import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Syringe } from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import { Alert } from '../../types';

interface PlaymateDetailsCardProps {
  alert: Alert;
}

export function PlaymateDetailsCard({ alert }: PlaymateDetailsCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconBox}>
          <Syringe size={14} color="#D97706" />
        </View>
        <Text style={styles.title}>Playdate Details</Text>
      </View>

      {alert.playmatePreferredArea ? (
        <View style={styles.row}>
          <Text style={styles.label}>Preferred area</Text>
          <Text style={styles.value}>{alert.playmatePreferredArea}</Text>
        </View>
      ) : null}

      {alert.playmateSchedule ? (
        <View style={styles.row}>
          <Text style={styles.label}>Schedule</Text>
          <Text style={styles.value}>{alert.playmateSchedule}</Text>
        </View>
      ) : null}

      {(alert.playmatePreferredSize || alert.playmateEnergyLevel) && (
        <View style={styles.row}>
          <Text style={styles.label}>Looking for</Text>
          <View style={styles.tagRow}>
            {alert.playmatePreferredSize && alert.playmatePreferredSize !== 'any' && (
              <View style={styles.tag}>
                <Text style={styles.tagText}>
                  Size: {alert.playmatePreferredSize.charAt(0).toUpperCase() + alert.playmatePreferredSize.slice(1)}
                </Text>
              </View>
            )}
            {alert.playmateEnergyLevel && alert.playmateEnergyLevel !== 'any' && (
              <View style={styles.tag}>
                <Text style={styles.tagText}>
                  Energy: {alert.playmateEnergyLevel.charAt(0).toUpperCase() + alert.playmateEnergyLevel.slice(1)}
                </Text>
              </View>
            )}
            {(!alert.playmatePreferredSize || alert.playmatePreferredSize === 'any') &&
             (!alert.playmateEnergyLevel || alert.playmateEnergyLevel === 'any') && (
              <Text style={styles.valueSecondary}>Any size or energy level</Text>
            )}
          </View>
        </View>
      )}

      {alert.playmateVaccineRequired && (
        <View style={styles.row}>
          <Text style={styles.label}>Vaccine requirement</Text>
          <View style={styles.requireBadge}>
            <Syringe size={11} color={Colors.info} />
            <Text style={styles.requireText}>Must be vaccinated</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFBEB',
    borderRadius: 14,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
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
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B45309',
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
  tagRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
  },
  requireBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#E0F2FE',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  requireText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.info,
  },
});
