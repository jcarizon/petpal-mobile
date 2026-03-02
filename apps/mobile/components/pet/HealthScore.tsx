import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';

interface HealthScoreProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

function getHealthColor(score: number): string {
  if (score >= 80) return Colors.healthExcellent;
  if (score >= 60) return Colors.healthGood;
  if (score >= 40) return Colors.healthFair;
  return Colors.healthPoor;
}

function getHealthLabel(score: number): string {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Fair';
  return 'Poor';
}

export function HealthScore({ score, size = 'md', showLabel = true }: HealthScoreProps) {
  const color = getHealthColor(score);
  const label = getHealthLabel(score);
  const clampedScore = Math.max(0, Math.min(100, score));
  const percentage = clampedScore / 100;

  const sizes = {
    sm: { outer: 60, inner: 44, fontSize: 14, strokeWidth: 6 },
    md: { outer: 100, inner: 76, fontSize: 22, strokeWidth: 10 },
    lg: { outer: 140, inner: 110, fontSize: 30, strokeWidth: 14 },
  };

  const s = sizes[size];

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.gauge,
          {
            width: s.outer,
            height: s.outer,
            borderRadius: s.outer / 2,
            borderWidth: s.strokeWidth,
            borderColor: Colors.neutral200,
          },
        ]}
      >
        <View
          style={[
            styles.gaugeInner,
            {
              width: s.inner,
              height: s.inner,
              borderRadius: s.inner / 2,
              backgroundColor: `${color}20`,
            },
          ]}
        >
          <Text style={[styles.score, { fontSize: s.fontSize, color }]}>
            {clampedScore}
          </Text>
        </View>
        {/* Progress arc overlay */}
        <View
          style={[
            styles.progressArc,
            {
              width: s.outer,
              height: s.outer,
              borderRadius: s.outer / 2,
              borderWidth: s.strokeWidth,
              borderColor: color,
              borderRightColor: percentage < 0.75 ? 'transparent' : color,
              borderBottomColor: percentage < 0.5 ? 'transparent' : color,
              borderLeftColor: percentage < 0.25 ? 'transparent' : color,
              transform: [{ rotate: '-90deg' }],
            },
          ]}
        />
      </View>
      {showLabel && (
        <Text style={[styles.label, { color }]}>{label}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 8,
  },
  gauge: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gaugeInner: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
  },
  score: {
    fontWeight: '800',
  },
  progressArc: {
    position: 'absolute',
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
  },
});
