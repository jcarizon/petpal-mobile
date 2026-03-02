import React from 'react';
import { View, ActivityIndicator, StyleSheet, Animated } from 'react-native';
import { Colors } from '../../constants/colors';

interface LoadingProps {
  size?: 'small' | 'large';
  color?: string;
  fullScreen?: boolean;
}

export function Loading({
  size = 'large',
  color = Colors.primary,
  fullScreen = false,
}: LoadingProps) {
  if (fullScreen) {
    return (
      <View style={styles.fullScreen}>
        <ActivityIndicator size={size} color={color} />
      </View>
    );
  }

  return (
    <View style={styles.center}>
      <ActivityIndicator size={size} color={color} />
    </View>
  );
}

// Skeleton shimmer component
export function Skeleton({
  width,
  height,
  borderRadius = 8,
  style,
}: {
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: object;
}) {
  const animatedValue = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 800,
          useNativeDriver: false,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 800,
          useNativeDriver: false,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [animatedValue]);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 0.9],
  });

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: Colors.neutral200,
          opacity,
        },
        style,
      ]}
    />
  );
}

export function PetCardSkeleton() {
  return (
    <View style={styles.petCardSkeleton}>
      <Skeleton width={80} height={80} borderRadius={40} />
      <Skeleton width={100} height={14} style={{ marginTop: 10 }} />
      <Skeleton width={70} height={12} style={{ marginTop: 6 }} />
    </View>
  );
}

export function ListItemSkeleton() {
  return (
    <View style={styles.listItemSkeleton}>
      <Skeleton width={56} height={56} borderRadius={28} />
      <View style={styles.listItemContent}>
        <Skeleton width={160} height={14} />
        <Skeleton width={100} height={12} style={{ marginTop: 8 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  center: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  petCardSkeleton: {
    alignItems: 'center',
    padding: 16,
    width: 120,
  },
  listItemSkeleton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  listItemContent: {
    flex: 1,
  },
});
