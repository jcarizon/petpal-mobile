import React from 'react';
import { TouchableOpacity, Text, StyleSheet, Share, ViewStyle } from 'react-native';
import { Colors } from '../../constants/colors';

interface ShareButtonProps {
  message: string;
  style?: ViewStyle;
}

export function ShareButton({ message, style }: ShareButtonProps) {
  const handleShare = async () => {
    try {
      await Share.share({ message });
    } catch (error) {
      // Handle error
    }
  };

  return (
    <TouchableOpacity style={[styles.button, style]} onPress={handleShare} activeOpacity={0.8}>
      <Text style={styles.text}>Share</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: Colors.neutral100,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  text: {
    color: Colors.textPrimary,
    fontWeight: '600',
    fontSize: 15,
  },
});
