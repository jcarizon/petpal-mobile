import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacityProps,
  ViewStyle,
  TextStyle,
  Animated,
} from 'react-native';
import { Colors } from '../../constants/colors';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export function Button({
  title,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  disabled,
  style,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || isLoading;
  const [scale] = React.useState(new Animated.Value(1));

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.96,
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

  return (
    <Animated.View style={{ transform: [{ scale }], width: fullWidth ? '100%' : undefined }}>
      <TouchableOpacity
        style={[
          styles.base,
          styles[variant],
          styles[`size_${size}`],
          fullWidth && styles.fullWidth,
          isDisabled && styles.disabled,
          style as ViewStyle,
        ]}
        disabled={isDisabled}
        activeOpacity={0.8}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled }}
        {...props}
      >
        {isLoading ? (
          <ActivityIndicator
            size="small"
            color={variant === 'primary' ? Colors.textInverse : Colors.primary}
          />
        ) : (
          <>
            {leftIcon}
            <Text
              style={[
                styles.text,
                styles[`text_${variant}`],
                styles[`textSize_${size}`],
                variant === 'primary' && styles.textPrimaryBold,
              ]}
              maxFontSizeMultiplier={1.2}
              allowFontScaling
            >
              {title}
            </Text>
            {rightIcon}
          </>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: 0,
  } as ViewStyle,
  fullWidth: {
    width: '100%',
  } as ViewStyle,
  disabled: {
    opacity: 0.5,
  } as ViewStyle,

  // Variants
  primary: {
    backgroundColor: Colors.primary,
  } as ViewStyle,
  secondary: {
    backgroundColor: Colors.secondary,
  } as ViewStyle,
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Colors.primary,
  } as ViewStyle,
  ghost: {
    backgroundColor: 'transparent',
  } as ViewStyle,

  // Sizes
  size_sm: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  } as ViewStyle,
  size_md: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  } as ViewStyle,
  size_lg: {
    paddingHorizontal: 28,
    paddingVertical: 16,
  } as ViewStyle,

  // Text base
  text: {
    fontWeight: '600',
    letterSpacing: 0.1,
  } as TextStyle,
  textPrimaryBold: {
    fontWeight: '700',
    letterSpacing: 0.2,
  } as TextStyle,

  // Text variants
  text_primary: { color: Colors.textInverse } as TextStyle,
  text_secondary: { color: Colors.textInverse } as TextStyle,
  text_outline: { color: Colors.primary } as TextStyle,
  text_ghost: { color: Colors.primary } as TextStyle,

  // Text sizes
  textSize_sm: { fontSize: 13 } as TextStyle,
  textSize_md: { fontSize: 15 } as TextStyle,
  textSize_lg: { fontSize: 17 } as TextStyle,
});
