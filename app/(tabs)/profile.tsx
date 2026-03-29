import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
  Alert,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, ChevronRight, LogOut, MapPin, LocateFixed } from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Loading } from '../../components/ui/Loading';
import { useAuthStore } from '../../store/authStore';
import { useCommunityStore } from '../../store/communityStore';
import { calculateLevel, xpForNextLevel, xpProgressPercent } from '../../lib/utils';
import { BadgeType } from '../../types';

const BADGE_ICONS: Record<BadgeType, string> = {
  vax_hero: '💉',
  grooming_pro: '✂️',
  rescue_star: '⭐',
  vet_regular: '🏥',
  community_guard: '🛡️',
  petpal_elite: '👑',
};

const BADGE_COLORS: Record<BadgeType, string> = {
  vax_hero: Colors.badgeVaxHero,
  grooming_pro: Colors.badgeGroomingPro,
  rescue_star: Colors.badgeRescueStar,
  vet_regular: Colors.badgeVetRegular,
  community_guard: Colors.badgeCommunityGuard,
  petpal_elite: Colors.badgePetPalElite,
};

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { badges, leaderboard, fetchBadges, fetchLeaderboard, isLoading } = useCommunityStore();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchBadges();
    fetchLeaderboard(user?.city);
  }, [fetchBadges, fetchLeaderboard, user?.city]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchBadges(), fetchLeaderboard(user?.city)]);
    setRefreshing(false);
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  if (!user) return <Loading fullScreen />;

  const xp = user.xp ?? 0;
  const level = calculateLevel(xp);
  const nextLevelXp = xpForNextLevel(xp);
  const progressPercent = xpProgressPercent(xp);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />
        }
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarLargeText}>
              {user.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.userName}>{user.name}</Text>
          <View style={styles.locationRow}>
            <MapPin size={14} color={Colors.textSecondary} />
            <Text style={styles.userCity}>{user.city}</Text>
          </View>
          <Text style={styles.memberSince}>
            Member since {new Date(user.createdAt).getFullYear()}
          </Text>
        </View>

        {/* XP / Level */}
        <View style={styles.section}>
          <Card style={styles.xpCard}>
            <View style={styles.xpHeader}>
              <Text style={styles.levelText}>Level {level}</Text>
              <Text style={styles.xpText}>{xp} XP</Text>
            </View>
            <View style={styles.progressBar}>
              <View
                style={[styles.progressFill, { width: `${progressPercent}%` }]}
              />
            </View>
            <Text style={styles.nextLevelText}>
              {nextLevelXp - xp} XP to Level {level + 1}
            </Text>
          </Card>
        </View>

        {/* Badges */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Badges</Text>
          <View style={styles.badgesGrid}>
            {badges.length === 0 ? (
              <Text style={styles.noBadges}>Complete actions to earn badges!</Text>
            ) : (
              badges.map((badge) => {
                const icon = BADGE_ICONS[badge.type] ?? '🏅';
                const color = BADGE_COLORS[badge.type] ?? Colors.primary;
                return (
                  <View key={badge.id} style={[styles.badgeItem, { backgroundColor: `${color}20` }]}>
                    <Text style={styles.badgeIcon}>{icon}</Text>
                    <Text style={[styles.badgeName, { color }]}>{badge.name}</Text>
                  </View>
                );
              })
            )}
          </View>
        </View>

        {/* Leaderboard */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Leaderboard</Text>
          {leaderboard.slice(0, 5).map((entry) => (
            <View
              key={entry.userId}
              style={[
                styles.leaderboardItem,
                entry.userId === user.id && styles.leaderboardItemSelf,
              ]}
            >
              <Text style={styles.rankText}>#{entry.rank}</Text>
              <View style={styles.leaderboardAvatar}>
                <Text style={styles.leaderboardAvatarText}>
                  {entry.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.leaderboardInfo}>
                <Text style={styles.leaderboardName}>{entry.name}</Text>
                <Text style={styles.leaderboardCity}>{entry.city}</Text>
              </View>
              <Text style={styles.leaderboardXp}>{entry.xp} XP</Text>
            </View>
          ))}
        </View>

        {/* Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          <Card>
            <Pressable style={({ pressed }) => [styles.settingsItem, pressed && styles.pressedScale]}>
              <Bell size={20} color={Colors.textSecondary} />
              <Text style={styles.settingsLabel}>Notifications</Text>
              <ChevronRight size={18} color={Colors.textSecondary} />
            </Pressable>
            <View style={styles.divider} />
            <Pressable style={({ pressed }) => [styles.settingsItem, pressed && styles.pressedScale]}>
              <LocateFixed size={20} color={Colors.textSecondary} />
              <Text style={styles.settingsLabel}>Location</Text>
              <ChevronRight size={18} color={Colors.textSecondary} />
            </Pressable>
            <View style={styles.divider} />
            <Pressable style={({ pressed }) => [styles.settingsItem, pressed && styles.pressedScale]} onPress={handleLogout}>
              <LogOut size={20} color={Colors.error} />
              <Text style={[styles.settingsLabel, { color: Colors.error }]}>Sign Out</Text>
              <ChevronRight size={18} color={Colors.textSecondary} />
            </Pressable>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  contentContainer: {
    paddingBottom: 120,
  },
  profileHeader: {
    alignItems: 'center',
    paddingTop: 26,
    paddingBottom: 18,
    gap: 8,
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  avatarLargeText: {
    fontSize: 36,
    color: Colors.textInverse,
    fontWeight: '700',
  },
  userName: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  userCity: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  memberSince: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  xpCard: {
    gap: 12,
    paddingVertical: 14,
  },
  xpHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  levelText: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.primary,
  },
  xpText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.neutral200,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  nextLevelText: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'right',
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  badgeItem: {
    alignItems: 'center',
    padding: 13,
    borderRadius: 12,
    width: 80,
    gap: 6,
  },
  badgeIcon: {
    fontSize: 28,
  },
  badgeName: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  noBadges: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    padding: 20,
    width: '100%',
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  leaderboardItemSelf: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryBg,
  },
  rankText: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textSecondary,
    width: 32,
  },
  leaderboardAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leaderboardAvatarText: {
    color: Colors.textInverse,
    fontWeight: '700',
    fontSize: 16,
  },
  leaderboardInfo: {
    flex: 1,
  },
  leaderboardName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  leaderboardCity: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  leaderboardXp: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
  },
  settingsLabel: {
    flex: 1,
    fontSize: 15,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  pressedScale: {
    transform: [{ scale: 0.98 }],
  },
});
