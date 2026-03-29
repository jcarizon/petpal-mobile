import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Mail, ArrowLeft, CircleCheck } from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuthStore } from '../../store/authStore';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { forgotPassword, isLoading, error, clearError } = useAuthStore();
  const [email, setEmail] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const validateEmail = (value: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  };

  const handleSubmit = async () => {
    clearError();
    setLocalError(null);

    if (!email.trim()) {
      setLocalError('Email is required');
      return;
    }

    if (!validateEmail(email.trim())) {
      setLocalError('Enter a valid email address');
      return;
    }

    try {
      await forgotPassword(email.trim());
      setSent(true);
    } catch {
      // handled by store
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={18} color={Colors.textPrimary} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <View style={styles.iconWrap}>
            <Mail size={32} color={Colors.primary} />
          </View>
          <Text style={styles.title}>Reset your password</Text>
          <Text style={styles.subtitle}>
            Enter your account email and we will send password reset instructions.
          </Text>
        </View>

        {sent ? (
          <View style={styles.successCard}>
            <CircleCheck size={24} color={Colors.success} />
            <Text style={styles.successTitle}>Email sent</Text>
            <Text style={styles.successBody}>
              If an account exists for {email.trim()}, password reset instructions will arrive shortly.
            </Text>
            <Button title="Have token? Reset now" variant="outline" onPress={() => router.push('/(auth)/reset-password')} fullWidth />
            <Button title="Back to login" onPress={() => router.replace('/(auth)/login')} fullWidth />
          </View>
        ) : (
          <View style={styles.form}>
            <Input
              label="Email address"
              value={email}
              placeholder="you@example.com"
              onChangeText={(text) => {
                setEmail(text);
                if (localError) setLocalError(null);
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              leftIcon={<Mail size={18} color={Colors.textSecondary} />}
              error={(localError ?? error) ?? undefined}
            />
            <Button
              title="Send reset link"
              onPress={handleSubmit}
              isLoading={isLoading}
              fullWidth
              size="lg"
            />
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 32,
    gap: 24,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
  },
  backText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  header: {
    gap: 12,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: Colors.textSecondary,
  },
  form: {
    gap: 16,
  },
  successCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 18,
    gap: 12,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  successBody: {
    fontSize: 14,
    lineHeight: 21,
    color: Colors.textSecondary,
  },
});
