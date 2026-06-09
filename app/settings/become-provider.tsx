import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Store, CheckCircle, Star, Shield, Users } from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui';
import { useAuthStore } from '../../store/authStore';
import api from '../../lib/api';

const BENEFITS = [
  { icon: <Store     size={20} color={Colors.primary} />, title: 'List your business',    sub: 'Create a verified listing visible to pet owners nearby' },
  { icon: <Star      size={20} color={Colors.secondary} />, title: 'Collect reviews',     sub: 'Build your reputation through genuine customer reviews' },
  { icon: <Users     size={20} color="#8B5CF6" />,          title: 'Reach pet owners',    sub: 'Get discovered by thousands of pet lovers in your area' },
  { icon: <Shield    size={20} color={Colors.success} />,   title: 'Get verified',        sub: 'Earn the verified badge to build trust with customers' },
  { icon: <CheckCircle size={20} color="#F59E0B" />,        title: 'Manage listings',     sub: 'Update your details, hours, and photos anytime' },
];

export default function BecomeProviderScreen() {
  const router = useRouter();
  const { user, updateProfile } = useAuthStore();
  const { showToast } = useToast();

  const [businessName, setBusinessName] = useState(user?.businessName ?? '');
  const [businessBio,  setBusinessBio]  = useState(user?.businessBio  ?? '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isAlreadyProvider = ['SERVICE_PROVIDER', 'VET', 'GROOMER', 'ADMIN'].includes(user?.role ?? '');

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const response = await api.put('/auth/upgrade-to-provider', {
        businessName: businessName.trim() || undefined,
        businessBio:  businessBio.trim()  || undefined,
      });
      const updated = (response.data as { data?: Record<string, unknown> })?.data;
      if (updated) {
        await updateProfile({ businessName: updated.businessName as string, businessBio: updated.businessBio as string });
      }
      showToast({
        type: 'success',
        title: isAlreadyProvider ? 'Business info updated!' : 'Welcome, Service Provider!',
        message: isAlreadyProvider ? 'Your business details have been saved.' : "You can now create and manage service listings.",
      });
      router.replace('/service/create');
    } catch (err) {
      showToast({ type: 'error', title: 'Failed', message: (err as { message?: string }).message ?? 'Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isAlreadyProvider ? 'Business Profile' : 'Become a Provider'}</Text>
        <View style={{ width: 36 }} />
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {!isAlreadyProvider && (
            <>
              <View style={styles.heroSection}>
                <View style={styles.heroIcon}>
                  <Store size={36} color={Colors.primary} />
                </View>
                <Text style={styles.heroTitle}>List Your Pet Business on PawRok</Text>
                <Text style={styles.heroSub}>
                  Join hundreds of pet service providers already on PawRok. Reach local pet owners, collect reviews, and grow your business.
                </Text>
              </View>

              <View style={styles.benefitsList}>
                {BENEFITS.map((b, i) => (
                  <View key={i} style={styles.benefitRow}>
                    <View style={styles.benefitIcon}>{b.icon}</View>
                    <View style={styles.benefitText}>
                      <Text style={styles.benefitTitle}>{b.title}</Text>
                      <Text style={styles.benefitSub}>{b.sub}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </>
          )}

          <View style={styles.formSection}>
            <Text style={styles.formTitle}>Business Information</Text>
            <Text style={styles.formSub}>This helps customers identify your business on PawRok.</Text>

            <Input
              label="Business Name (optional)"
              placeholder="e.g. PawsUp Veterinary Clinic"
              value={businessName}
              onChangeText={setBusinessName}
            />
            <Input
              label="Business Bio (optional)"
              placeholder="A short description of your business, experience, or services offered..."
              value={businessBio}
              onChangeText={setBusinessBio}
              multiline
              numberOfLines={4}
              style={{ minHeight: 90, textAlignVertical: 'top' }}
            />
          </View>

          <Button
            title={isAlreadyProvider ? 'Save & Create Listing' : 'Become a Service Provider'}
            variant="primary"
            size="lg"
            fullWidth
            onPress={handleSubmit}
            isLoading={isSubmitting}
            style={styles.submitBtn}
          />

          <Text style={styles.disclaimer}>
            By continuing you agree to PawRok's service provider guidelines. All listings are reviewed before going live.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: Colors.background },
  flex:          { flex: 1 },
  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: Colors.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  backBtn:       { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.neutral100, alignItems: 'center', justifyContent: 'center' },
  headerTitle:   { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  content:       { padding: 20, gap: 20, paddingBottom: 40 },
  heroSection:   { alignItems: 'center', gap: 12, paddingVertical: 8 },
  heroIcon:      { width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.primaryBg, alignItems: 'center', justifyContent: 'center' },
  heroTitle:     { fontSize: 22, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center', lineHeight: 30 },
  heroSub:       { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 21 },
  benefitsList:  { gap: 14 },
  benefitRow:    { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  benefitIcon:   { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.neutral50, alignItems: 'center', justifyContent: 'center', flexShrink: 0, borderWidth: 1, borderColor: Colors.border },
  benefitText:   { flex: 1 },
  benefitTitle:  { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  benefitSub:    { fontSize: 13, color: Colors.textSecondary, lineHeight: 18, marginTop: 2 },
  formSection:   { gap: 12 },
  formTitle:     { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  formSub:       { fontSize: 13, color: Colors.textSecondary, lineHeight: 19 },
  submitBtn:     { marginTop: 4 },
  disclaimer:    { fontSize: 12, color: Colors.neutral400, textAlign: 'center', lineHeight: 17 },
});
