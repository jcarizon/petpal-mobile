import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { Colors } from '../../constants/colors';

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'neutral';
type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: BadgeSize;
  color?: string;
  backgroundColor?: string;
  dismissible?: boolean;
  onDismiss?: () => void;
  style?: ViewStyle;
}

const variantColors: Record<BadgeVariant, { bg: string; text: string }> = {
  default: { bg: Colors.primaryBg, text: Colors.primary },
  success: { bg: Colors.primaryBg, text: Colors.success },
  warning: { bg: Colors.secondaryBg, text: Colors.warning },
  error: { bg: '#FEF2F2', text: Colors.error },
  info: { bg: '#EFF6FF', text: Colors.info },
  neutral: { bg: Colors.neutral100, text: Colors.neutral600 },
};

export function Badge({
  label,
  variant = 'default',
  size = 'sm',
  color,
  backgroundColor,
  dismissible = false,
  onDismiss,
  style,
}: BadgeProps) {
  const colors = variantColors[variant];

  return (
    <View
      style={[
        styles.badge,
        styles[`size_${size}`],
        {
          backgroundColor: backgroundColor ?? colors.bg,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          styles[`textSize_${size}`],
          { color: color ?? colors.text },
        ]}
      >
        {label}
      </Text>
      {dismissible && (
        <TouchableOpacity
          onPress={onDismiss}
          hitSlop={{ top: 6, right: 6, bottom: 6, left: 6 }}
        >
          <Text style={[styles.dismiss, { color: color ?? colors.text }]}>✕</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 100,
    alignSelf: 'flex-start',
  },
  size_sm: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  size_md: {
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  text: {
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  textSize_sm: {
    fontSize: 11,
  },
  textSize_md: {
    fontSize: 13,
  },
  dismiss: {
    fontSize: 10,
  },
});
