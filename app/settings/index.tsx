import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft, User, Bell, Lock, Info,
  LogOut, ChevronRight, Phone, MapPin, Mail, Trash2,
} from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { ImageUploader } from '../../components/ui/ImageUploader';
import { useAuthStore } from '../../store/authStore';
import { useToast } from '../../components/ui';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, updateProfile, logout, deleteAccount } = useAuthStore();
  const { showToast } = useToast();

  const [editingProfile, setEditingProfile] = useState(false);
  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [city, setCity] = useState(user?.city ?? '');
  const [saving,      setSaving]      = useState(false);
  const [avatarUrl,   setAvatarUrl]   = useState(user?.avatarUrl ?? '');
  const [isUploading, setIsUploading] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(false);

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      showToast({ type: 'error', title: 'Name required', message: 'Please enter your name.' });
      return;
    }
    setSaving(true);
    try {
      await updateProfile({
        name: name.trim(),
        phone: phone.trim() || undefined,
        city: city.trim() || undefined,
      });
      setEditingProfile(false);
      showToast({ type: 'success', title: 'Profile updated', message: 'Your changes have been saved.' });
    } catch {
      showToast({ type: 'error', title: 'Update failed', message: 'Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingProfile(false);
    setName(user?.name ?? '');
    setPhone(user?.phone ?? '');
    setCity(user?.city ?? '');
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and related PawRok data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: async () => {
            setDeletingAccount(true);
            try {
              await deleteAccount();
            } catch {
              setDeletingAccount(false);
              showToast({
                type: 'error',
                title: 'Delete failed',
                message: 'Please try again or contact support.',
              });
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={20} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Profile ───────────────────────────────────── */}
        <View style={styles.group}>
          <View style={styles.groupHeader}>
            <User size={14} color={Colors.primary} />
            <Text style={styles.groupTitle}>Profile</Text>
            {!editingProfile && (
              <TouchableOpacity onPress={() => setEditingProfile(true)} style={styles.editBtn}>
                <Text style={styles.editBtnText}>Edit</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Avatar — always visible, tappable to change */}
          <View style={styles.avatarRow}>
            <ImageUploader
              value={avatarUrl || user?.avatarUrl}
              onChange={(url) => {
                setAvatarUrl(url);
                if (url.startsWith('http')) {
                  updateProfile({ avatarUrl: url }).catch(() =>
                    showToast({ type: 'error', title: 'Avatar update failed', message: 'Please try again.' })
                  );
                }
              }}
              folder="pets"
              shape="circle"
              width={80}
              height={80}
              onUploadStart={() => setIsUploading(true)}
              onUploadEnd={(err) => {
                setIsUploading(false);
                if (err) showToast({ type: 'error', title: 'Upload failed', message: err.message });
              }}
            />
            <View style={styles.avatarMeta}>
              <Text style={styles.avatarName}>{user?.name ?? 'Profile'}</Text>
              <Text style={styles.avatarHint}>{isUploading ? 'Uploading…' : 'Tap to change photo'}</Text>
            </View>
          </View>

          {editingProfile ? (
            <View style={styles.editForm}>
              <Input
                label="Name"
                value={name}
                onChangeText={setName}
                placeholder="Your name"
              />
              <Input
                label="Phone (optional)"
                value={phone}
                onChangeText={setPhone}
                placeholder="+63 9XX XXX XXXX"
                keyboardType="phone-pad"
              />
              <Input
                label="City (optional)"
                value={city}
                onChangeText={setCity}
                placeholder="e.g. Cebu City"
              />
              <View style={styles.editActions}>
                <Button
                  title="Cancel"
                  variant="outline"
                  size="sm"
                  onPress={handleCancelEdit}
                />
                <Button
                  title="Save Changes"
                  variant="primary"
                  size="sm"
                  onPress={handleSaveProfile}
                  isLoading={saving}
                />
              </View>
            </View>
          ) : (
            <>
              <InfoRow icon={<User size={14} color={Colors.textSecondary} />}   label="Name"  value={user?.name  ?? '—'} />
              <InfoRow icon={<Mail size={14} color={Colors.textSecondary} />}   label="Email" value={user?.email ?? '—'} />
              <InfoRow icon={<Phone size={14} color={Colors.textSecondary} />}  label="Phone" value={user?.phone ?? 'Not set'} />
              <InfoRow icon={<MapPin size={14} color={Colors.textSecondary} />} label="City"  value={user?.city  ?? 'Not set'} last />
            </>
          )}
        </View>

        {/* ── Notifications ─────────────────────────────── */}
        <View style={styles.group}>
          <View style={styles.groupHeader}>
            <Bell size={14} color={Colors.primary} />
            <Text style={styles.groupTitle}>Notifications</Text>
          </View>
          <ToggleRow
            label="Push Notifications"
            sub="Alerts, sightings & interests"
            value={pushEnabled}
            onChange={setPushEnabled}
          />
          <ToggleRow
            label="Email Notifications"
            sub="Weekly digest & important updates"
            value={emailEnabled}
            onChange={setEmailEnabled}
          />
          <TouchableOpacity
            style={styles.navRow}
            onPress={() => router.push('/settings/notifications')}
            activeOpacity={0.7}
          >
            <Text style={styles.navRowLabel}>Notification History & Type Settings</Text>
            <ChevronRight size={16} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* ── Security ──────────────────────────────────── */}
        <View style={styles.group}>
          <View style={styles.groupHeader}>
            <Lock size={14} color={Colors.primary} />
            <Text style={styles.groupTitle}>Security</Text>
          </View>
          <LinkRow
            label="Change Password"
            onPress={() => showToast({ type: 'info', title: 'Coming soon', message: 'Password change will be available soon.' })}
          />
          <LinkRow label="Privacy Policy" onPress={() => {}} last />
        </View>

        {/* ── About ─────────────────────────────────────── */}
        <View style={styles.group}>
          <View style={styles.groupHeader}>
            <Info size={14} color={Colors.primary} />
            <Text style={styles.groupTitle}>About</Text>
          </View>
          <LinkRow label="App Version" value="1.0.0" last />
        </View>

        {/* ── Sign Out ──────────────────────────────────── */}
        <TouchableOpacity style={styles.signOutBtn} onPress={handleLogout} activeOpacity={0.75}>
          <LogOut size={16} color={Colors.error} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.deleteAccountBtn, deletingAccount && styles.disabledAction]}
          onPress={handleDeleteAccount}
          activeOpacity={0.75}
          disabled={deletingAccount}
        >
          <Trash2 size={16} color={Colors.surface} />
          <Text style={styles.deleteAccountText}>
            {deletingAccount ? 'Deleting Account...' : 'Delete Account'}
          </Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

// ── Sub-components ────────────────────────────────────

function InfoRow({ icon, label, value, last }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <View style={styles.rowLeft}>
        {icon}
        <Text style={styles.rowLabel}>{label}</Text>
      </View>
      <Text style={styles.rowValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function LinkRow({ label, value, onPress, last }: {
  label: string;
  value?: string;
  onPress?: () => void;
  last?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.row, !last && styles.rowBorder]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={styles.rowLabel}>{label}</Text>
      {value
        ? <Text style={styles.rowValue}>{value}</Text>
        : <ChevronRight size={16} color={Colors.neutral400} />
      }
    </TouchableOpacity>
  );
}

function ToggleRow({ label, sub, value, onChange, last }: {
  label: string;
  sub: string;
  value: boolean;
  onChange: (v: boolean) => void;
  last?: boolean;
}) {
  return (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <View style={styles.toggleInfo}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowSub}>{sub}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: Colors.neutral200, true: Colors.primary }}
        thumbColor={Colors.textInverse}
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.neutral100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  content: {
    padding: 16,
    gap: 16,
    paddingBottom: 60,
  },
  group: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    shadowColor: Colors.neutral900,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.neutral50,
  },
  groupTitle: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  editBtn: {
    backgroundColor: Colors.primaryBg,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
  },
  editBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  editForm: {
    padding: 16,
    gap: 12,
  },
  editActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rowLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  rowValue: {
    fontSize: 13,
    color: Colors.textSecondary,
    flexShrink: 1,
    textAlign: 'right',
    maxWidth: '55%',
  },
  rowSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  toggleInfo: {
    flex: 1,
    gap: 1,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
  },
  deleteAccountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: 16,
    backgroundColor: Colors.error,
  },
  disabledAction: {
    opacity: 0.6,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  navRowLabel: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  signOutText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.error,
  },
  deleteAccountText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.surface,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  avatarMeta: {
    flex: 1,
    gap: 4,
  },
  avatarName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  avatarHint: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
});
