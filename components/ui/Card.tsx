import React from 'react';
import { View, StyleSheet, ViewStyle, TouchableOpacity, Animated, StyleProp } from 'react-native';
import { Colors } from '../../constants/colors';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
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

  const [scale] = React.useState(new Animated.Value(1));

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 40,
      bounciness: 8,
    }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 40,
      bounciness: 8,
    }).start();
  };

  if (onPress) {
    return (
      <Animated.View style={{ transform: [{ scale }] }}>
        <TouchableOpacity
          style={cardStyle}
          onPress={onPress}
          activeOpacity={0.85}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          accessibilityRole="button"
        >
          {children}
        </TouchableOpacity>
      </Animated.View>
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
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
  },
  border: {
    borderWidth: 1,
    borderColor: Colors.border,
  },
});
