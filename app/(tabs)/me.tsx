import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
  RefreshControl,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Plus, Syringe, Search, Megaphone, Star, Award, Settings,
  ChevronRight, PawPrint, Bell, LogOut, MapPin,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/colors';
import { PetCard } from '../../components/pet/PetCard';
import { Loading } from '../../components/ui/Loading';
import { useAuthStore } from '../../store/authStore';
import { isServiceProvider } from '../../types';
import { usePetStore } from '../../store/petStore';
import { useCommunityStore } from '../../store/communityStore';
import { getGreeting } from '../../lib/utils';
import { useLocation } from '../../hooks/useLocation';
import { TYPE_CONFIG } from '../../components/community/AlertCard';

export default function MeScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { pets, fetchPets, healthScores, fetchHealthRecords, isLoading: petsLoading } = usePetStore();
  const { userAlerts, fetchBadges, badges, leaderboard, fetchLeaderboard, fetchUserAlerts, isLoading: communityLoading } = useCommunityStore();
  useLocation();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchPets();
    fetchUserAlerts(user?.id || '');
    fetchBadges();
    fetchLeaderboard(user?.city);
  }, [fetchPets, fetchUserAlerts, fetchBadges, fetchLeaderboard, user?.id, user?.city]);

  useEffect(() => {
    pets.forEach((pet) => {
      const existingScore = healthScores[pet.id];
      if (!existingScore || existingScore.score == null) fetchHealthRecords(pet.id);
    });
  }, [pets, healthScores, fetchHealthRecords]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchPets(), fetchUserAlerts(user?.id || ''), fetchBadges(), fetchLeaderboard(user?.city)]);
    setRefreshing(false);
  };

  const userLeaderboardEntry = Array.isArray(leaderboard)
    ? leaderboard.find((e) => e.id === user?.id)
    : undefined;

  const level = calculateLevel(user?.totalXP || 0);
  const xpPercent = Math.min(xpProgressPercent(user?.totalXP || 0), 100);
  const xpToNext = Math.max(0, xpForNextLevel(user?.totalXP || 0) - (user?.totalXP || 0));
  const userName = user?.name?.split(' ')[0] ?? 'Friend';
  const greeting = getGreeting();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.primaryLight} />}
      >
        {/* ── HERO ────────────────────────────────────────── */}
        <LinearGradient
          colors={['#053D2D', Colors.heroGradientStart, '#0F9D6A']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          {/* Top bar */}
          <View style={styles.heroTopBar}>
            <Text style={styles.heroGreeting}>{greeting}, {userName} 👋</Text>
            <View style={styles.heroTopBarRight}>
              <TouchableOpacity
                style={styles.heroSettingsBtn}
                onPress={() => router.push('/notifications')}
              >
                <Bell size={18} color={Colors.textInverse} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.heroSettingsBtn}
                onPress={() => router.push('/settings')}
              >
                <Settings size={18} color={Colors.textInverse} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Avatar + name */}
          <View style={styles.heroProfileRow}>
            <View style={styles.avatarRing}>
              {user?.avatarUrl ? (
                <Image source={{ uri: user.avatarUrl }} style={styles.avatarImage} />
              ) : (
                <LinearGradient
                  colors={['#34D399', '#059669']}
                  style={styles.avatarGradient}
                >
                  <Text style={styles.avatarInitial}>
                    {user?.name?.charAt(0).toUpperCase() ?? '?'}
                  </Text>
                </LinearGradient>
              )}
            </View>

            <View style={styles.heroNameCol}>
              <Text style={styles.heroName} numberOfLines={1}>{user?.name ?? 'My Profile'}</Text>
              <View style={styles.heroLevelRow}>
                <Star size={11} color={Colors.secondaryLight} />
                <Text style={styles.heroLevelText}>Level {level}</Text>
                {userLeaderboardEntry && (
                  <View style={styles.rankPill}>
                    <Text style={styles.rankPillText}>#{userLeaderboardEntry.rank}</Text>
                  </View>
                )}
              </View>
              {(user?.city || user?.createdAt) && (
                <View style={styles.heroMetaRow}>
                  <MapPin size={10} color="rgba(255,255,255,0.6)" />
                  <Text style={styles.heroMeta}>
                    {[user?.city, user?.createdAt ? `Since ${new Date(user.createdAt).getFullYear()}` : null]
                      .filter(Boolean).join(' · ')}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* XP bar */}
          <View style={styles.xpSection}>
            <View style={styles.xpLabelRow}>
              <Text style={styles.xpLabel}>{user?.totalXP ?? 0} XP</Text>
              <Text style={styles.xpLabel}>{xpToNext} XP to Level {level + 1}</Text>
            </View>
            <View style={styles.xpTrack}>
              <View style={[styles.xpFill, { width: `${xpPercent}%` }]} />
            </View>
          </View>
        </LinearGradient>

        {/* ── STATS CARD ──────────────────────────────────── */}
        <View style={styles.statsCard}>
          {[
            { label: 'Badges',    value: String(badges.length) },
            { label: 'City Rank', value: userLeaderboardEntry ? `#${userLeaderboardEntry.rank}` : '—' },
            { label: 'Pets',      value: String(pets.length) },
            { label: 'Alerts',   value: String(userAlerts.length) },
          ].map((s, i, arr) => (
            <React.Fragment key={s.label}>
              <View style={styles.statItem}>
                <Text style={styles.statNum}>{s.value}</Text>
                <Text style={styles.statLbl}>{s.label}</Text>
              </View>
              {i < arr.length - 1 && <View style={styles.statDivider} />}
            </React.Fragment>
          ))}
        </View>

        {/* ── QUICK ACTIONS ────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            {QUICK_ACTIONS.map((a) => (
              <Pressable
                key={a.label}
                style={({ pressed }) => [styles.actionCard, { borderColor: a.color + '40', backgroundColor: a.bg }, pressed && { opacity: 0.82, transform: [{ scale: 0.97 }] }]}
                onPress={() => router.push(a.route as any)}
              >
                <View style={[styles.actionIcon, { backgroundColor: a.color }]}>
                  <a.icon size={16} color="#fff" />
                </View>
                <Text style={[styles.actionLabel, { color: a.color }]}>{a.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* ── MY PETS ──────────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>My Pets</Text>
            <TouchableOpacity onPress={() => router.push('/pet/add')} style={styles.sectionAction}>
              <Plus size={14} color={Colors.primary} />
              <Text style={styles.sectionActionText}>Add</Text>
            </TouchableOpacity>
          </View>

          {petsLoading ? (
            <Loading size="small" />
          ) : pets.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyEmoji}>🐾</Text>
              <Text style={styles.emptyTitle}>No pets yet</Text>
              <Text style={styles.emptySub}>Add your first furry friend</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/pet/add')}>
                <Text style={styles.emptyBtnText}>+ Add Pet</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.petRow}>
              {pets.map((pet) => (
                <PetCard
                  key={pet.id}
                  pet={pet}
                  onPress={() => router.push(`/pet/${pet.id}`)}
                  healthScore={healthScores[pet.id]?.score ?? null}
                />
              ))}
              <TouchableOpacity style={styles.addPetCard} onPress={() => router.push('/pet/add')}>
                <View style={styles.addPetIconCircle}>
                  <Plus size={24} color={Colors.primary} />
                </View>
                <Text style={styles.addPetText}>Add Pet</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>

        {/* ── MY BADGES ────────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>My Badges</Text>
            <View style={styles.countPill}>
              <Text style={styles.countPillText}>{badges.length} earned</Text>
            </View>
          </View>

          <View style={styles.card}>
            {badges.length === 0 ? (
              <View style={styles.emptyCard}>
                <Award size={36} color={Colors.neutral300} />
                <Text style={styles.emptyTitle}>No badges yet</Text>
                <Text style={styles.emptySub}>Complete activities to earn badges</Text>
              </View>
            ) : (
              <View style={styles.badgeGrid}>
                {badges.slice(0, 6).map((badge) => {
                  const icon = BADGE_ICONS[badge.type] ?? '🏅';
                  const color = BADGE_COLORS[badge.type] ?? Colors.primary;
                  return (
                    <View key={badge.id} style={styles.badgeItem}>
                      <View style={[styles.badgeCircle, { backgroundColor: color + '18' }]}>
                        <Text style={styles.badgeEmoji}>{icon}</Text>
                      </View>
                      <Text style={[styles.badgeName, { color }]} numberOfLines={2}>{badge.name}</Text>
                    </View>
                  );
                })}
              </View>
            )}
            {badges.length > 6 && (
              <TouchableOpacity style={styles.viewAllRow}>
                <Text style={styles.viewAllText}>View all {badges.length} badges</Text>
                <ChevronRight size={15} color={Colors.primary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ── MY ALERTS ────────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>My Alerts</Text>
            <TouchableOpacity onPress={() => router.push('/alert/create')} style={styles.sectionAction}>
              <Plus size={14} color={Colors.primary} />
              <Text style={styles.sectionActionText}>Create</Text>
            </TouchableOpacity>
          </View>

          {communityLoading && userAlerts.length === 0 ? (
            <Loading size="small" />
          ) : userAlerts.length === 0 ? (
            <View style={styles.emptyCard}>
              <Bell size={32} color={Colors.neutral300} />
              <Text style={styles.emptyTitle}>No alerts yet</Text>
              <Text style={styles.emptySub}>Create a lost, found or adoption alert</Text>
            </View>
          ) : (
            <View style={styles.card}>
              {userAlerts.map((item, i) => {
                const cfg = TYPE_CONFIG[item.type] ?? TYPE_CONFIG.lost;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.alertRow, i < userAlerts.length - 1 && styles.alertRowBorder]}
                    onPress={() => router.push(`/alert/${item.id}`)}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.alertTypeDot, { backgroundColor: cfg.color }]} />
                    <View style={styles.alertRowInfo}>
                      <Text style={styles.alertRowTitle} numberOfLines={1}>{item.title}</Text>
                      <Text style={styles.alertRowMeta}>
                        {cfg.label} · {item.status === 'resolved' ? 'Resolved' : 'Active'} · {new Date(item.createdAt).toLocaleDateString()}
                      </Text>
                    </View>
                    <View style={[styles.alertStatusDot, { backgroundColor: item.status === 'resolved' ? Colors.neutral300 : Colors.success }]} />
                    <ChevronRight size={14} color={Colors.neutral400} />
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* ── SERVICE PROVIDER ─────────────────────────────── */}
        {isServiceProvider(user?.role) ? (
          <TouchableOpacity style={styles.providerRow} onPress={() => router.push('/service/my-listings')} activeOpacity={0.75}>
            <Text style={styles.providerRowEmoji}>🏪</Text>
            <View style={styles.providerRowText}>
              <Text style={styles.providerRowTitle}>My Business Listings</Text>
              <Text style={styles.providerRowSub}>Manage your service listings & reviews</Text>
            </View>
            <ChevronRight size={18} color={Colors.neutral400} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.providerRow} onPress={() => router.push('/settings/become-provider')} activeOpacity={0.75}>
            <Text style={styles.providerRowEmoji}>💼</Text>
            <View style={styles.providerRowText}>
              <Text style={styles.providerRowTitle}>Become a Service Provider</Text>
              <Text style={styles.providerRowSub}>List your pet business on PawRok</Text>
            </View>
            <ChevronRight size={18} color={Colors.neutral400} />
          </TouchableOpacity>
        )}

        {/* ── SIGN OUT ─────────────────────────────────────── */}
        <TouchableOpacity
          style={styles.signOutBtn}
          onPress={logout}
          activeOpacity={0.75}
        >
          <LogOut size={16} color={Colors.error} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Helpers ───────────────────────────────────────────

function calculateLevel(xp: number): number {
  return Math.floor(Math.sqrt(xp / 100)) + 1;
}
function xpForNextLevel(xp: number): number {
  const l = calculateLevel(xp);
  return (l + 1) * (l + 1) * 100;
}
function xpProgressPercent(xp: number): number {
  const l = calculateLevel(xp);
  const start = l * l * 100;
  const end = (l + 1) * (l + 1) * 100;
  return ((xp - start) / (end - start)) * 100;
}

const QUICK_ACTIONS = [
  { label: 'Add Pet',    icon: PawPrint, color: Colors.primary,   bg: Colors.primaryBg,  route: '/pet/add' },
  { label: 'Add Record', icon: Syringe,  color: '#3B82F6',        bg: '#EFF6FF',         route: '/pet/add' },
  { label: 'Report',     icon: Megaphone,color: Colors.error,     bg: '#FEF2F2',         route: '/alert/create' },
  { label: 'Services',   icon: Search,   color: Colors.secondary, bg: Colors.secondaryBg,route: '/(tabs)/services' },
];

const BADGE_ICONS: Record<string, string> = {
  vax_hero: '💉', grooming_pro: '✂️', rescue_star: '⭐',
  vet_regular: '🏥', community_guard: '🛡️', pawrok_elite: '👑',
  rescue_angel: '🪼', adoption_hero: '🏆', social_pup: '🤝', playdate_champ: '🐾',
  FIRST_PET: '🐣', HEALTH_HERO: '💊', COMMUNITY_STAR: '🌟',
  FINDER_HERO: '🔍', REVIEW_MASTER: '✍️', LOYALTY_BADGE: '❤️',
  RESCUE_ANGEL: '🪼', ADOPTION_HERO: '🏆', SOCIAL_PUP: '🤝', PLAYDATE_CHAMP: '🐾',
};

const BADGE_COLORS: Record<string, string> = {
  vax_hero: Colors.badgeVaxHero, grooming_pro: Colors.badgeGroomingPro,
  rescue_star: Colors.badgeRescueStar, vet_regular: Colors.badgeVetRegular,
  community_guard: Colors.badgeCommunityGuard, pawrok_elite: Colors.badgePawRokElite,
  RESCUE_ANGEL: '#8B5CF6', ADOPTION_HERO: '#10B981', SOCIAL_PUP: '#F59E0B', PLAYDATE_CHAMP: '#EF4444',
};

// ── Styles ────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingBottom: 120,
  },

  // Hero
  hero: {
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 28,
    gap: 20,
  },
  heroTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroTopBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroGreeting: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
  },
  heroSettingsBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarRing: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.9)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 30,
    fontWeight: '800',
    color: Colors.textInverse,
  },
  heroNameCol: {
    flex: 1,
    gap: 4,
  },
  heroName: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textInverse,
    letterSpacing: -0.3,
  },
  heroLevelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroLevelText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.secondaryLight,
  },
  rankPill: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  rankPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textInverse,
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  heroMeta: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.65)',
  },
  xpSection: {
    gap: 8,
  },
  xpLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  xpLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
  },
  xpTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.2)',
    overflow: 'hidden',
  },
  xpFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: Colors.secondaryLight,
  },

  // Stats card
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    marginTop: -1,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 8,
    shadowColor: Colors.neutral900,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statNum: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  statLbl: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: Colors.border,
  },

  // Sections
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
    gap: 12,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.2,
  },
  sectionAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primaryBg,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  sectionActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  countPill: {
    backgroundColor: Colors.primaryBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  countPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },

  // Quick actions
  actionsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  actionCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 8,
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },

  // Pets
  petRow: {
    gap: 14,
    paddingRight: 4,
    paddingVertical: 4,
  },
  addPetCard: {
    width: 110,
    minHeight: 148,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryBg,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    gap: 8,
  },
  addPetIconCircle: {
    backgroundColor: Colors.surface,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  addPetText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
  },

  // Card wrapper
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    shadowColor: Colors.neutral900,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },

  // Badges
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  badgeItem: {
    alignItems: 'center',
    width: '30%',
    gap: 6,
  },
  badgeCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeEmoji: {
    fontSize: 24,
  },
  badgeName: {
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 14,
  },
  viewAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },

  // Alerts list
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  alertRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  alertTypeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  alertRowInfo: {
    flex: 1,
    gap: 2,
  },
  alertRowTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  alertRowMeta: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  alertStatusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },

  // Empty states
  emptyCard: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
    gap: 6,
  },
  emptyEmoji: {
    fontSize: 36,
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  emptySub: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  emptyBtn: {
    marginTop: 10,
    backgroundColor: Colors.primary,
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 20,
  },
  emptyBtnText: {
    color: Colors.textInverse,
    fontSize: 13,
    fontWeight: '700',
  },

  // Sign out
  providerRow:      { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, marginHorizontal: 16, marginTop: 20, marginBottom: 12, borderRadius: 14, padding: 14, gap: 12, borderWidth: 1, borderColor: Colors.border },
  providerRowEmoji: { fontSize: 28 },
  providerRowText:  { flex: 1 },
  providerRowTitle: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  providerRowSub:   { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 28,
    marginHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
  },
  signOutText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.error,
  },
});
