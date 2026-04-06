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
  Share,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, ChevronRight, LogOut, LocateFixed, Shield, HelpCircle, Users, Crown, Award, Info } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
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

const RANK_MEDALS: Record<number, string> = {
  1: '🥇',
  2: '🥈',
  3: '🥉',
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

  const handleShare = async (shareLevel: number, shareXp: number) => {
    try {
      await Share.share({
        message: `Check out my PetPal profile! I'm Level ${shareLevel} with ${shareXp} XP. Join me on PetPal!`,
      });
    } catch (error) {
      console.log('Share error:', error);
    }
  };

  if (!user) return <Loading fullScreen />;

  const xp = user.totalXP ?? 0;
  const level = calculateLevel(xp);
  const nextLevelXp = xpForNextLevel(xp);
  const progressPercent = xpProgressPercent(xp);
  const userLeaderboardEntry = leaderboard.find((entry) => entry.id === user.id);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />
        }
        contentInsetAdjustmentBehavior="never"
      >
<LinearGradient
          colors={[Colors.heroGradientStart, Colors.heroGradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroBanner}
        >
          <View style={styles.heroTopRow}>
            <View style={styles.avatarLarge}>
              <View style={styles.avatarGlow}>
                <Text style={styles.avatarLargeText}>
                  {user.name.charAt(0).toUpperCase()}
                </Text>
              </View>
            </View>
            <View style={styles.heroHeadline}>
              <Text style={styles.heroName}>{user.name}</Text>
              <View style={styles.locationRow}>
                <LocateFixed size={12} color="rgba(255, 255, 255, 0.85)" />
                <Text style={styles.heroMeta}>{user.city}</Text>
              </View>
              <Text style={styles.heroMeta}>
                {user.createdAt ? `Member since ${new Date(user.createdAt).getFullYear()}` : 'New member'}
              </Text>
            </View>
            <View style={styles.heroLevelBadge}>
              <Crown size={16} color={Colors.secondaryLight} />
              <Text style={styles.heroLevelLabel}>Level {level}</Text>
              {userLeaderboardEntry && (
                <Text style={styles.heroLevelSub}>
                  #{userLeaderboardEntry.rank} in {user.city}
                </Text>
              )}
            </View>
          </View>
          <View style={styles.heroProgressRow}>
            <Text style={styles.heroProgressLabel}>{xp} XP</Text>
            <Text style={styles.heroProgressLabel}>
              {Math.max(0, nextLevelXp - xp)} XP to Level {level + 1}
            </Text>
          </View>
          <View style={styles.progressBar}>
            <View
              style={[styles.progressFill, { width: `${Math.min(progressPercent, 100)}%` }]}
            />
          </View>
          <View style={styles.heroStatsRow}>
            <View style={styles.statChip}>
              <Text style={styles.statLabel}>Badges</Text>
              <Text style={styles.statValue}>{badges.length}</Text>
            </View>
            <View style={styles.statChip}>
              <Text style={styles.statLabel}>City Rank</Text>
              <Text style={styles.statValue}>
                {userLeaderboardEntry ? `#${userLeaderboardEntry.rank}` : '—'}
              </Text>
            </View>
            <View style={styles.statChip}>
              <Text style={styles.statLabel}>Total XP</Text>
              <Text style={styles.statValue}>{xp}</Text>
            </View>
          </View>
          <View style={styles.heroActions}>
            <TouchableOpacity style={styles.actionButtonOutline} onPress={() => handleShare(level, xp)}>
              <Text style={styles.actionButtonOutlineText}>Share Profile</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Badges */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Badges</Text>
            <View style={styles.badgeCountBadge}>
              <Text style={styles.badgeCountText}>{badges.length} earned</Text>
            </View>
          </View>
          <Card>
            {badges.length === 0 ? (
              <View style={styles.emptyBadgesContainer}>
                <Award size={40} color={Colors.textSecondary} />
                <Text style={styles.noBadges}>Complete activities to earn badges!</Text>
                <Text style={styles.noBadgesSub}>Walk, vet visits, and more</Text>
              </View>
            ) : (
              <View style={styles.badgesGrid}>
                {badges.slice(0, 6).map((badge) => {
                  const icon = BADGE_ICONS[badge.type] ?? '🏅';
                  const color = BADGE_COLORS[badge.type] ?? Colors.primary;
                  return (
                    <View key={badge.id} style={styles.badgeItem}>
                      <View style={[styles.badgeIconContainer, { backgroundColor: `${color}15` }]}>
                        <Text style={styles.badgeIcon}>{icon}</Text>
                      </View>
                      <Text style={[styles.badgeName, { color }]} numberOfLines={1}>{badge.name}</Text>
                    </View>
                  );
                })}
              </View>
            )}
            {badges.length > 6 && (
              <TouchableOpacity style={styles.viewAllButton}>
                <Text style={styles.viewAllText}>View all {badges.length} badges</Text>
                <ChevronRight size={16} color={Colors.primary} />
              </TouchableOpacity>
            )}
          </Card>
        </View>

        {/* Leaderboard */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Top Pet Parents</Text>
            <View style={styles.leaderboardCityBadge}>
              <Users size={12} color={Colors.primary} />
              <Text style={styles.leaderboardCityText}>{user.city}</Text>
            </View>
          </View>
          <Card>
            {leaderboard.length === 0 ? (
              <View style={styles.emptyLeaderboard}>
                <Users size={32} color={Colors.textSecondary} />
                <Text style={styles.noBadges}>No rankings yet</Text>
                <Text style={styles.noBadgesSub}>Be the first in your city!</Text>
              </View>
            ) : (
              leaderboard.slice(0, 5).map((entry) => {
                const medal = entry.rank <= 3 ? RANK_MEDALS[entry.rank] : null;
                const isTopThree = entry.rank <= 3;
                return (
                  <View
                    key={entry.id}
                    style={[
                      styles.leaderboardItem,
                      entry.id === user.id && styles.leaderboardItemSelf,
                      isTopThree && styles.leaderboardItemTopThree,
                    ]}
                  >
                    <View style={styles.rankContainer}>
                      {medal ? (
                        <Text style={styles.medalText}>{medal}</Text>
                      ) : (
                        <Text style={styles.rankText}>#{entry.rank}</Text>
                      )}
                    </View>
                    <View style={[
                      styles.leaderboardAvatar,
                      isTopThree && styles.leaderboardAvatarTopThree,
                    ]}>
                      <Text style={styles.leaderboardAvatarText}>
                        {entry.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.leaderboardInfo}>
                      <Text style={[
                        styles.leaderboardName,
                        entry.userId === user.id && styles.leaderboardNameSelf,
                      ]}>
                        {entry.name}
                        {entry.userId === user.id && ' (You)'}
                      </Text>
                      {entry.city && entry.city !== user.city && (
                        <Text style={styles.leaderboardCity}>{entry.city}</Text>
                      )}
                    </View>
                    <View style={styles.xpContainer}>
                      <Text style={[
                        styles.leaderboardXp,
                        isTopThree && styles.leaderboardXpTopThree,
                      ]}>
                        {entry.totalXP} XP
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
            {userLeaderboardEntry && (
              <TouchableOpacity style={styles.viewAllButton}>
                <Text style={styles.viewAllText}>View full leaderboard</Text>
                <ChevronRight size={16} color={Colors.primary} />
              </TouchableOpacity>
            )}
          </Card>
        </View>

        {/* Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          <Card>
            <Pressable style={({ pressed }) => [styles.settingsItem, pressed && styles.pressedScale]}>
              <View style={styles.settingsIconContainer}>
                <Bell size={18} color={Colors.info} />
              </View>
              <Text style={styles.settingsLabel}>Notifications</Text>
              <ChevronRight size={16} color={Colors.textSecondary} />
            </Pressable>
            <View style={styles.divider} />
            <Pressable style={({ pressed }) => [styles.settingsItem, pressed && styles.pressedScale]}>
              <View style={styles.settingsIconContainer}>
                <LocateFixed size={18} color={Colors.warning} />
              </View>
              <Text style={styles.settingsLabel}>Location</Text>
              <View style={styles.settingsValue}>
                <Text style={styles.settingsValueText}>{user.city}</Text>
              </View>
            </Pressable>
            <View style={styles.divider} />
            <Pressable style={({ pressed }) => [styles.settingsItem, pressed && styles.pressedScale]}>
              <View style={styles.settingsIconContainer}>
                <Shield size={18} color={Colors.success} />
              </View>
              <Text style={styles.settingsLabel}>Privacy</Text>
              <ChevronRight size={16} color={Colors.textSecondary} />
            </Pressable>
            <View style={styles.divider} />
            <Pressable style={({ pressed }) => [styles.settingsItem, pressed && styles.pressedScale]}>
              <View style={styles.settingsIconContainer}>
                <HelpCircle size={18} color={Colors.primary} />
              </View>
              <Text style={styles.settingsLabel}>Help & Support</Text>
              <ChevronRight size={16} color={Colors.textSecondary} />
            </Pressable>
            <View style={styles.divider} />
            <Pressable style={({ pressed }) => [styles.settingsItem, pressed && styles.pressedScale]}>
              <View style={styles.settingsIconContainer}>
                <Info size={18} color={Colors.textSecondary} />
              </View>
              <Text style={styles.settingsLabel}>About</Text>
              <ChevronRight size={16} color={Colors.textSecondary} />
            </Pressable>
          </Card>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <LogOut size={18} color={Colors.error} />
            <Text style={styles.logoutButtonText}>Sign Out</Text>
          </TouchableOpacity>
          <Text style={styles.versionText}>PetPal v1.0.0</Text>
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
    gap: 24,
  },
  heroBanner: {
    marginHorizontal: 20,
    borderRadius: 28,
    padding: 24,
    paddingBottom: 20,
    overflow: 'hidden',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarLarge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarGlow: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
  },
  avatarLargeText: {
    fontSize: 36,
    color: Colors.textInverse,
    fontWeight: '700',
  },
  heroHeadline: {
    flex: 1,
  },
  heroName: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textInverse,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  heroMeta: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 2,
  },
  heroLevelBadge: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    gap: 2,
  },
  heroLevelLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textInverse,
  },
  heroLevelSub: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.75)',
  },
  heroProgressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 18,
  },
  heroProgressLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600',
  },
  progressBar: {
    height: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginTop: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: Colors.textInverse,
  },
  heroStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 10,
  },
  statChip: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textInverse,
    marginTop: 4,
  },
  heroActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
    gap: 12,
  },
  actionButtonOutline: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  actionButtonOutlineText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textInverse,
  },
  section: {
    paddingHorizontal: 20,
    gap: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  badgeCountBadge: {
    backgroundColor: Colors.primaryBg,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    padding: 4,
  },
  badgeItem: {
    alignItems: 'center',
    width: '30%',
    paddingVertical: 12,
    gap: 6,
  },
  badgeIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeIcon: {
    fontSize: 26,
  },
  badgeName: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  noBadges: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
  },
  noBadgesSub: {
    fontSize: 13,
    color: Colors.textDisabled,
    textAlign: 'center',
    marginTop: 4,
  },
  emptyBadgesContainer: {
    alignItems: 'center',
    padding: 24,
    gap: 8,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 14,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  leaderboardCityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primaryBg,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  leaderboardCityText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  emptyLeaderboard: {
    alignItems: 'center',
    padding: 24,
    gap: 8,
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    marginBottom: 8,
    backgroundColor: Colors.neutral50,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  leaderboardItemTopThree: {
    backgroundColor: Colors.secondaryBg,
    borderColor: Colors.secondary,
  },
  leaderboardItemSelf: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryBg,
  },
  rankContainer: {
    width: 32,
    alignItems: 'center',
  },
  medalText: {
    fontSize: 22,
  },
  rankText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  leaderboardAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leaderboardAvatarTopThree: {
    backgroundColor: Colors.secondary,
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
  leaderboardNameSelf: {
    color: Colors.primary,
  },
  leaderboardCity: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  xpContainer: {
    alignItems: 'flex-end',
  },
  leaderboardXp: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  leaderboardXpTopThree: {
    color: Colors.secondary,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
  },
  settingsIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.neutral50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsLabel: {
    flex: 1,
    fontSize: 15,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  settingsValue: {
    backgroundColor: Colors.neutral100,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  settingsValueText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    marginTop: 8,
    borderRadius: 14,
    backgroundColor: `${Colors.error}10`,
  },
  logoutButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.error,
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    color: Colors.textDisabled,
    marginTop: 16,
    marginBottom: 40,
  },
  pressedScale: {
    transform: [{ scale: 0.98 }],
  },
});
