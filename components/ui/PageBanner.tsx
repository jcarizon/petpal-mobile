import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/colors';

interface PageBannerProps {
  title: string;
  subtitle?: string;
  helper?: string;
  iconNode?: React.ReactNode;
  rightNode?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

export function PageBanner({
  title,
  subtitle,
  helper,
  iconNode,
  rightNode,
  style,
  children,
}: PageBannerProps) {
  return (
    <LinearGradient
      colors={[Colors.bannerGradientStart, Colors.bannerGradientMid, Colors.bannerGradientEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.banner, style]}
    >
      <View style={styles.topRow}>
        <View style={styles.titleBlock}>
          {iconNode ? <View style={styles.iconWrapper}>{iconNode}</View> : null}
          <View style={styles.textBlock}>
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
        </View>
        {rightNode ?? <View style={styles.placeholder} />}
      </View>
      {helper ? <Text style={styles.helper}>{helper}</Text> : null}
      {children ? <View style={styles.children}>{children}</View> : null}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  banner: {
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderRadius: 24,
    marginHorizontal: 20,
    marginBottom: 12,
    marginTop: 0,
    shadowColor: Colors.neutral900,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  titleBlock: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    flex: 1,
  },
  iconWrapper: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBlock: {
    flex: 1,
  },
  title: {
    color: Colors.textInverse,
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 28,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    marginTop: 4,
  },
  helper: {
    marginTop: 12,
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
  },
  children: {
    marginTop: 14,
  },
  placeholder: {
    width: 34,
    height: 34,
  },
});
