import React, { useState } from 'react';
import { Animated } from 'react-native';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  TextInputProps,
  ViewStyle,
} from 'react-native';
import { Colors } from '../../constants/colors';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isPassword?: boolean;
  containerStyle?: ViewStyle;
  editable?: boolean;
}

export function Input({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  isPassword = false,
  containerStyle,
  style,
  editable,
  ...props
}: InputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const borderAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(borderAnim, {
      toValue: isFocused ? 1 : !!error ? 2 : 0,
      duration: 180,
      useNativeDriver: false,
    }).start();
  }, [isFocused, error, borderAnim]);

  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [Colors.border, Colors.primary, Colors.error],
  });

  const secureTextEntry = isPassword ? !showPassword : false;

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}

      <Animated.View
        style={[
          styles.inputWrapper,
          { borderColor },
        ]}
      >
        {leftIcon && <View style={styles.icon}>{leftIcon}</View>}

        <TextInput
          style={[styles.input, style, editable === false && styles.inputDisabled]}
          placeholderTextColor={Colors.textDisabled}
          secureTextEntry={secureTextEntry}
          onFocus={() => !editable === false && setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          editable={editable !== false}
          accessible
          accessibilityLabel={label}
          accessibilityHint={hint}
          {...props}
        />
        {isPassword ? (
          <TouchableOpacity
            onPress={() => setShowPassword((prev) => !prev)}
            style={styles.icon}
            hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
            accessibilityRole="button"
            accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
          >
            <Text style={styles.showHideText}>{showPassword ? 'Hide' : 'Show'}</Text>
          </TouchableOpacity>
        ) : (
          rightIcon && <View style={styles.icon}>{rightIcon}</View>
        )}
      </Animated.View>

      {error && <Text style={styles.error}>{error}</Text>}
      {hint && !error && <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    paddingHorizontal: 14,
    minHeight: 48,
  },
  inputWrapperFocused: {
    borderColor: Colors.primary,
  },
  inputWrapperError: {
    borderColor: Colors.error,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: Colors.textPrimary,
    paddingVertical: 10,
  },
  inputDisabled: {
    color: Colors.textDisabled,
  },
  icon: {
    marginHorizontal: 4,
  },
  showHideText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '500',
  },
  error: {
    fontSize: 12,
    color: Colors.error,
  },
  hint: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
});
