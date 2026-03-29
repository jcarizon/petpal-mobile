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
import { KeyRound, ArrowLeft, ShieldCheck } from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuthStore } from '../../store/authStore';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { resetPassword, isLoading, error, clearError } = useAuthStore();
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    clearError();
    setLocalError(null);

    if (!token.trim()) {
      setLocalError('Reset token is required');
      return;
    }

    if (password.length < 8) {
      setLocalError('Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      setLocalError('Passwords do not match');
      return;
    }

    try {
      await resetPassword({ token: token.trim(), password });
      setDone(true);
    } catch {
      // handled via store error
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
            {done ? <ShieldCheck size={32} color={Colors.success} /> : <KeyRound size={32} color={Colors.primary} />}
          </View>
          <Text style={styles.title}>{done ? 'Password updated' : 'Set new password'}</Text>
          <Text style={styles.subtitle}>
            {done
              ? 'Your password has been reset successfully. You can now sign in with your new password.'
              : 'Enter the token from your email and choose a new secure password.'}
          </Text>
        </View>

        {done ? (
          <Button title="Go to login" onPress={() => router.replace('/(auth)/login')} fullWidth />
        ) : (
          <View style={styles.form}>
            <Input
              label="Reset token"
              placeholder="Paste your reset token"
              value={token}
              onChangeText={(text) => {
                setToken(text);
                if (localError) setLocalError(null);
              }}
              autoCapitalize="none"
            />

            <Input
              label="New password"
              placeholder="At least 8 characters"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (localError) setLocalError(null);
              }}
              isPassword
            />

            <Input
              label="Confirm new password"
              placeholder="Re-enter password"
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                if (localError) setLocalError(null);
              }}
              isPassword
            />

            {(localError || error) && <Text style={styles.errorText}>{localError ?? error}</Text>}

            <Button
              title="Reset password"
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
  errorText: {
    fontSize: 13,
    color: Colors.error,
  },
});
