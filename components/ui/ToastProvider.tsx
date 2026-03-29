import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CircleAlert, CircleCheck, Info, TriangleAlert } from 'lucide-react-native';
import { Colors } from '../../constants/colors';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastOptions {
  type?: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastState extends ToastOptions {
  visible: boolean;
}

interface ToastContextValue {
  showToast: (options: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const getToastColors = (type: ToastType) => {
  switch (type) {
    case 'success':
      return { bg: Colors.primaryBg, border: Colors.success, text: Colors.success, icon: CircleCheck };
    case 'error':
      return { bg: '#FEF2F2', border: Colors.error, text: Colors.error, icon: CircleAlert };
    case 'warning':
      return { bg: Colors.secondaryBg, border: Colors.warning, text: Colors.warning, icon: TriangleAlert };
    default:
      return { bg: '#EFF6FF', border: Colors.info, text: Colors.info, icon: Info };
  }
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastState | null>(null);
  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const hideToast = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -120,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => setToast((prev) => (prev ? { ...prev, visible: false } : prev)));
  }, [opacity, translateY]);

  const showToast = useCallback(
    ({ type = 'info', title, message, duration = 2600 }: ToastOptions) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      setToast({ type, title, message, duration, visible: true });

      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          speed: 18,
          bounciness: 4,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();

      timerRef.current = setTimeout(() => {
        hideToast();
      }, duration);
    },
    [hideToast, opacity, translateY]
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  const type = toast?.type ?? 'info';
  const colors = getToastColors(type);
  const Icon = colors.icon;

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast?.visible && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.toast,
            {
              top: insets.top + 12,
              backgroundColor: colors.bg,
              borderColor: colors.border,
              opacity,
              transform: [{ translateY }],
            },
          ]}
        >
          <View style={styles.toastContent}>
            <Icon size={18} color={colors.text} />
            <View style={styles.textWrap}>
              <Text style={[styles.title, { color: Colors.textPrimary }]}>{toast.title}</Text>
              {!!toast.message && <Text style={[styles.message, { color: Colors.textSecondary }]}>{toast.message}</Text>}
            </View>
          </View>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 1000,
    borderWidth: 1,
    borderRadius: 12,
    shadowColor: Colors.neutral900,
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  toastContent: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  textWrap: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
  },
  message: {
    fontSize: 12,
    lineHeight: 16,
  },
});
