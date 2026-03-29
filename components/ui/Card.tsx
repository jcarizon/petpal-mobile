import React from 'react';
import { View, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';
import { Colors } from '../../constants/colors';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  padding?: 'sm' | 'md' | 'lg' | 'none';
  shadow?: boolean;
  border?: boolean;
}

export function Card({
  children,
  style,
  onPress,
  padding = 'md',
  shadow = true,
  border = false,
}: CardProps) {
  const cardStyle: ViewStyle[] = [
    styles.card,
    padding !== 'none' && styles[`padding_${padding}`],
    shadow && styles.shadow,
    border && styles.border,
    style,
  ].filter(Boolean) as ViewStyle[];

  if (onPress) {
    return (
      <TouchableOpacity
        style={cardStyle}
        onPress={onPress}
        activeOpacity={0.8}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
  },
  padding_sm: {
    padding: 10,
  },
  padding_md: {
    padding: 16,
  },
  padding_lg: {
    padding: 20,
  },
  shadow: {
    shadowColor: Colors.neutral900,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  border: {
    borderWidth: 1,
    borderColor: Colors.border,
  },
});
