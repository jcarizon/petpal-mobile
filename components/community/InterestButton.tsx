import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { CheckCircle, X } from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useCommunityStore } from '../../store/communityStore';
import { AlertType } from '../../types';

interface InterestButtonProps {
  alertId: string;
  alertType: AlertType;
  petName?: string;
}

type Stage = 'idle' | 'composing' | 'submitted';

export function InterestButton({ alertId, alertType, petName }: InterestButtonProps) {
  const { createInterest, isLoading } = useCommunityStore();
  const [stage, setStage] = useState<Stage>('idle');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  const isAdoption = alertType === 'adoption';
  const ctaLabel = isAdoption
    ? `Adopt ${petName || 'This Pet'}`
    : "Let's Arrange a Playdate";
  const successLabel = isAdoption
    ? 'Interest sent! The owner will reach out.'
    : 'Request sent! The owner will contact you to arrange a meetup.';
  const placeholder = isAdoption
    ? 'Introduce yourself (optional) — e.g. "I have a big yard and love dogs!"'
    : 'Say hi (optional) — e.g. "My dog is friendly and loves to play!"';

  const handleSubmit = async () => {
    try {
      setError(null);
      await createInterest(alertId, { message: message.trim() || undefined });
      setStage('submitted');
    } catch (err) {
      const msg = (err as { message?: string })?.message ?? 'Failed to send interest.';
      setError(msg);
    }
  };

  if (stage === 'submitted') {
    return (
      <View style={styles.successRow}>
        <CheckCircle size={20} color={Colors.success} />
        <Text style={styles.successText}>{successLabel}</Text>
      </View>
    );
  }

  if (stage === 'composing') {
    return (
      <View style={styles.composeCard}>
        <View style={styles.composeHeader}>
          <Text style={styles.composeTitle}>
            {isAdoption ? 'Express Interest' : 'Request a Playdate'}
          </Text>
          <TouchableOpacity onPress={() => setStage('idle')}>
            <X size={18} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>
        <Input
          placeholder={placeholder}
          value={message}
          onChangeText={setMessage}
          multiline
          numberOfLines={3}
          style={{ minHeight: 80, textAlignVertical: 'top' }}
        />
        {error && <Text style={styles.errorText}>{error}</Text>}
        <View style={styles.composeActions}>
          <Button
            title="Cancel"
            variant="outline"
            size="md"
            onPress={() => setStage('idle')}
          />
          <Button
            title="Send"
            variant="primary"
            size="md"
            onPress={handleSubmit}
            isLoading={isLoading}
          />
        </View>
      </View>
    );
  }

  return (
    <Button
      title={ctaLabel}
      variant="primary"
      size="lg"
      fullWidth
      onPress={() => setStage('composing')}
    />
  );
}

const styles = StyleSheet.create({
  successRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.successBg,
    borderRadius: 12,
    padding: 14,
  },
  successText: {
    fontSize: 14,
    color: Colors.success,
    fontWeight: '600',
    flex: 1,
  },
  composeCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    gap: 12,
  },
  composeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  composeTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  composeActions: {
    flexDirection: 'row',
    gap: 10,
  },
  errorText: {
    fontSize: 12,
    color: Colors.error,
  },
});
