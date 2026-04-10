import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../src/context/AuthContext';
import { badgesAPI, leaderboardAPI } from '../../src/utils/api';
import { colors } from '../../src/utils/theme';

const BADGE_DEFINITIONS_FALLBACK = [
  { badge_id: 'community', name: 'Membro della Community', description: 'Ti sei registrato su EdgeBet!', icon: 'people', category: 'beginner', points: 50 },
  { badge_id: 'first_follow', name: 'Prima Schedina', description: 'Hai seguito la tua prima schedina!', icon: 'bookmark', category: 'beginner', points: 100 },
  { badge_id: 'first_win', name: 'Prima Vittoria', description: 'La tua prima previsione corretta!', icon: 'trophy', category: 'beginner', points: 150 },
  { badge_id: 'ten_follows', name: 'Collezionista', description: 'Hai seguito 10 schedine!', icon: 'layers', category: 'intermediate', points: 200 },
  { badge_id: 'streak_3', name: 'Serie Vincente', description: '3 previsioni corrette di fila!', icon: 'flame', category: 'intermediate', points: 250 },
  { badge_id: 'streak_5', name: 'In Fiamme', description: '5 previsioni corrette consecutive!', icon: 'bonfire', category: 'intermediate', points: 350 },
  { badge_id: 'top_pick_win', name: 'Occhio d\'Aquila', description: 'Un Top Pick che hai seguito ha vinto!', icon: 'eye', category: 'intermediate', points: 300 },
  { badge_id: 'streak_7', name: 'Inarrestabile', description: '7 giorni consecutivi di utilizzo!', icon: 'rocket', category: 'advanced', points: 400 },
  { badge_id: 'profit_master', name: 'Re del Profitto', description: 'ROI personale sopra il 20%!', icon: 'trending-up', category: 'advanced', points: 500 },
  { badge_id: 'elite_user', name: 'Membro Elite', description: 'Hai usato la funzione Elite AI!', icon: 'diamond', category: 'elite', points: 500 },
];

export default function ProfileScreen() {
  const router = useRouter();
  const { user, isAuthenticated, isPremium, logout } = useAuth();
  const [badges, setBadges] = useState<any[]>([]);
  const [definitions, setDefinitions] = useState<any[]>(BADGE_DEFINITIONS_FALLBACK);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<'badges' | 'leaderboard'>('badges');
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.05, duration: 2000, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
    ])).start();
  }, []);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [leaderData, badgeDefs] = await Promise.all([
        leaderboardAPI.get(),
        badgesAPI.getDefinitions(),
      ]);
      setLeaderboard(leaderData.leaderboard || []);
      setTotalUsers(leaderData.total_users || 0);
      if (badgeDefs.badges) setDefinitions(badgeDefs.badges);

      if (isAuthenticated && user?.user_id) {
        const userBadges = await badgesAPI.getUserBadges(user.user_id);
        setBadges(userBadges.badges || []);
        setTotalPoints(userBadges.total_points || 0);
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const getTierColor = (tier: string) => tier === 'elite' ? colors.gold : tier === 'premium' ? colors.primary : tier === 'pro' ? '#9B59B6' : colors.textMuted;
  const getTierLabel = (tier: string) => tier === 'elite' ? 'ELITE' : tier === 'premium' ? 'PREMIUM' : tier === 'pro' ? 'PRO' : 'FREE';

  // Guest view
  if (!isAuthenticated) {
    return (
      <SafeAreaView style={st.container} edges={['top']}>
        <View style={st.header}><Text style={st.headerTitle}>Profilo</Text></View>
        <ScrollView contentContainerStyle={st.guestContent}>
          <View style={st.guestCard}>
            <Ionicons name="warning" size={48} color={colors.gold} />
            <Text style={st.guestTitle}>Stai lasciando soldi sul tavolo</Text>
            <Text style={st.guestSub}>Gli utenti registrati vedono il doppio delle schedine e tutte le spiegazioni AI</Text>
            <View style={st.guestBullets}>
              <View style={st.bullet}><Ionicons name="checkmark-circle" size={18} color={colors.primary} /><Text style={st.bulletText}>2 schedine AI al giorno — gratis</Text></View>
              <View style={st.bullet}><Ionicons name="checkmark-circle" size={18} color={colors.primary} /><Text style={st.bulletText}>Spiegazioni AI complete su ogni pronostico</Text></View>
              <View style={st.bullet}><Ionicons name="checkmark-circle" size={18} color={colors.primary} /><Text style={st.bulletText}>Accesso alle Top Picks AI del giorno</Text></View>
              <View style={st.bullet}><Ionicons name="checkmark-circle" size={18} color={colors.primary} /><Text style={st.bulletText}>Badge e classifica utenti</Text></View>
            </View>
            <TouchableOpacity style={st.guestCTA} onPress={() => router.push('/login')} activeOpacity={0.7}>
              <Text style={st.guestCTAText}>Registrati Gratis — 30 secondi</Text>
              <Ionicons name="arrow-forward" size={18} color={colors.background} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/login')}><Text style={st.guestLink}>Continua come ospite</Text></TouchableOpacity>
          </View>

          {/* Show leaderboard preview even for guests */}
          <View style={st.sectionHeader}><Ionicons name="podium" size={18} color={colors.gold} /><Text style={st.sectionTitle}>Classifica Top 5</Text></View>
          {leaderboard.slice(0, 5).map((leader: any) => (
            <View key={leader.rank} style={[st.leaderRow, leader.rank <= 3 && st.leaderRowTop]}>
              <View style={[st.rankBadge, leader.rank === 1 && st.rank1, leader.rank === 2 && st.rank2, leader.rank === 3 && st.rank3]}>
                <Text style={st.rankText}>{leader.rank}</Text>
              </View>
              <View style={st.leaderInfo}>
                <Text style={st.leaderName}>{leader.name}</Text>
                <View style={[st.tierPill, { backgroundColor: getTierColor(leader.tier) + '20' }]}><Text style={[st.tierPillText, { color: getTierColor(leader.tier) }]}>{getTierLabel(leader.tier)}</Text></View>
              </View>
              <View style={st.leaderStats}>
                <Text style={st.leaderROI}>+{leader.roi}%</Text>
                <Text style={st.leaderWR}>{leader.win_rate}% win</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Authenticated view
  return (
    <SafeAreaView style={st.container} edges={['top']}>
      <View style={st.header}>
        <Text style={st.headerTitle}>Profilo</Text>
        <TouchableOpacity onPress={() => { Haptics.selectionAsync(); logout(); router.replace('/'); }} style={st.logoutBtn}>
          <Ionicons name="log-out-outline" size={18} color={colors.loss} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        {/* User Card */}
        <View style={st.userCard}>
          <View style={st.avatarWrap}>
            {user?.picture ? (
              <View style={st.avatar}><Text style={st.avatarText}>{user?.name?.[0]}</Text></View>
            ) : (
              <View style={st.avatar}><Ionicons name="person" size={28} color={colors.textPrimary} /></View>
            )}
            <View style={[st.tierDot, { backgroundColor: isPremium ? colors.gold : colors.primary }]} />
          </View>
          <View style={st.userInfo}>
            <Text style={st.userName}>{user?.name}</Text>
            <Text style={st.userEmail}>{user?.email}</Text>
            <View style={[st.userTierBadge, { backgroundColor: isPremium ? 'rgba(255,215,0,0.15)' : 'rgba(0,255,136,0.15)' }]}>
              <Text style={[st.userTierText, { color: isPremium ? colors.gold : colors.primary }]}>{isPremium ? 'PREMIUM' : 'FREE'}</Text>
            </View>
          </View>
          <Text style={st.pointsText}>{totalPoints} pts</Text>
        </View>

        {/* Quick Actions */}
        <View style={st.quickActions}>
          <Animated.View style={{ flex: 1, transform: [{ scale: pulseAnim }] }}>
            <TouchableOpacity style={st.eliteBtn} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push('/elite'); }} activeOpacity={0.7}>
              <Ionicons name="diamond" size={20} color={colors.gold} />
              <Text style={st.eliteBtnText}>Elite AI</Text>
            </TouchableOpacity>
          </Animated.View>
          <TouchableOpacity style={st.subscribeBtn} onPress={() => router.push('/subscribe')} activeOpacity={0.7}>
            <Ionicons name="star" size={20} color={colors.primary} />
            <Text style={st.subscribeBtnText}>{isPremium ? 'Gestisci' : 'Abbonati'}</Text>
          </TouchableOpacity>
        </View>

        {/* Secondary Actions */}
        <View style={st.secondaryActions}>
          <TouchableOpacity style={st.actionBtn} onPress={() => router.push('/notifications')} activeOpacity={0.7}>
            <Ionicons name="notifications-outline" size={18} color={colors.textSecondary} />
            <Text style={st.actionBtnText}>Notifiche</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={st.actionBtn} onPress={() => router.push('/notification-settings')} activeOpacity={0.7}>
            <Ionicons name="settings-outline" size={18} color={colors.textSecondary} />
            <Text style={st.actionBtnText}>Impostazioni Notifiche</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Section Toggle */}
        <View style={st.toggleRow}>
          <TouchableOpacity style={[st.toggleBtn, activeSection === 'badges' && st.toggleActive]} onPress={() => { Haptics.selectionAsync(); setActiveSection('badges'); }}>
            <Ionicons name="trophy" size={16} color={activeSection === 'badges' ? colors.background : colors.textMuted} />
            <Text style={[st.toggleText, activeSection === 'badges' && st.toggleTextActive]}>Badge</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[st.toggleBtn, activeSection === 'leaderboard' && st.toggleActive]} onPress={() => { Haptics.selectionAsync(); setActiveSection('leaderboard'); }}>
            <Ionicons name="podium" size={16} color={activeSection === 'leaderboard' ? colors.background : colors.textMuted} />
            <Text style={[st.toggleText, activeSection === 'leaderboard' && st.toggleTextActive]}>Classifica</Text>
          </TouchableOpacity>
        </View>

        {/* Badges Grid */}
        {activeSection === 'badges' && (
          <View>
            {/* Badge Progress & Prize Banner */}
            <View style={st.prizeCard}>
              <View style={st.prizeHeader}>
                <Ionicons name="gift" size={20} color={colors.gold} />
                <Text style={st.prizeTitle}>Completa tutti i badge</Text>
              </View>
              <Text style={st.prizeReward}>Premio: 1 mese gratis di Pro!</Text>
              <View style={st.progressBarBg}>
                <View style={[st.progressBarFill, { width: `${Math.min((badges.length / definitions.length) * 100, 100)}%` }]} />
              </View>
              <Text style={st.progressText}>{badges.length}/{definitions.length} badge completati</Text>
            </View>

            <View style={st.badgesGrid}>
              {definitions.map((def) => {
                const earned = badges.find((b: any) => b.badge_id === def.badge_id);
                const isNew = earned?.new;
                return (
                  <View key={def.badge_id} style={[st.badgeCard, earned && st.badgeCardEarned, isNew && st.badgeCardNew]}>
                    <View style={[st.badgeIcon, earned ? st.badgeIconEarned : st.badgeIconLocked]}>
                      <Ionicons name={def.icon as any} size={22} color={earned ? (def.category === 'elite' ? colors.gold : colors.primary) : colors.textMuted} />
                    </View>
                    <Text style={[st.badgeName, !earned && st.badgeNameLocked]}>{def.name}</Text>
                    <Text style={[st.badgeDesc, !earned && st.badgeDescLocked]} numberOfLines={2}>{def.description}</Text>
                    {def.points && <Text style={st.badgePoints}>{def.points} pts</Text>}
                    {earned && <View style={st.earnedBadge}><Ionicons name="checkmark-circle" size={12} color={colors.primary} /><Text style={st.earnedText}>Ottenuto</Text></View>}
                    {!earned && <View style={st.lockedBadge}><Ionicons name="lock-closed" size={10} color={colors.textMuted} /><Text style={st.lockedText}>Bloccato</Text></View>}
                    {isNew && <View style={st.newTag}><Text style={st.newTagText}>NUOVO!</Text></View>}
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Leaderboard */}
        {activeSection === 'leaderboard' && (
          <View style={st.leaderSection}>
            <View style={st.leaderHeader}>
              <Text style={st.leaderTotal}>{totalUsers.toLocaleString()} utenti in classifica</Text>
            </View>
            {leaderboard.map((leader: any) => (
              <View key={leader.rank} style={[st.leaderRow, leader.rank <= 3 && st.leaderRowTop]}>
                <View style={[st.rankBadge, leader.rank === 1 && st.rank1, leader.rank === 2 && st.rank2, leader.rank === 3 && st.rank3]}>
                  {leader.rank <= 3 ? <Ionicons name="trophy" size={14} color={colors.background} /> : <Text style={st.rankText}>{leader.rank}</Text>}
                </View>
                <View style={st.leaderInfo}>
                  <Text style={st.leaderName}>{leader.name}</Text>
                  <View style={st.leaderMeta}>
                    <View style={[st.tierPill, { backgroundColor: getTierColor(leader.tier) + '20' }]}><Text style={[st.tierPillText, { color: getTierColor(leader.tier) }]}>{getTierLabel(leader.tier)}</Text></View>
                    <Text style={st.badgeCountText}>{leader.badge_count} badge</Text>
                  </View>
                </View>
                <View style={st.leaderStats}>
                  <Text style={st.leaderROI}>+{leader.roi}%</Text>
                  <Text style={st.leaderWR}>{leader.win_rate}% win</Text>
                  {leader.streak > 0 && <Text style={st.leaderStreak}>{leader.streak} serie</Text>}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: colors.textPrimary },
  logoutBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,59,48,0.1)', alignItems: 'center', justifyContent: 'center' },
  // Guest
  guestContent: { padding: 20 },
  guestCard: { alignItems: 'center', backgroundColor: colors.card, borderRadius: 24, padding: 28, gap: 14, borderWidth: 1, borderColor: colors.border, marginBottom: 20 },
  guestTitle: { color: colors.gold, fontSize: 20, fontWeight: '800', textAlign: 'center' },
  guestSub: { color: colors.textSecondary, fontSize: 13, textAlign: 'center', lineHeight: 19 },
  guestBullets: { width: '100%', gap: 10, marginVertical: 8 },
  bullet: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bulletText: { color: colors.textPrimary, fontSize: 13, flex: 1 },
  guestCTA: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.primary, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 16, marginTop: 8 },
  guestCTAText: { color: colors.background, fontWeight: '700', fontSize: 14 },
  guestLink: { color: colors.textMuted, fontSize: 12, marginTop: 8 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, paddingTop: 8 },
  sectionTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '700' },
  // User Card
  userCard: { flexDirection: 'row', alignItems: 'center', gap: 14, marginHorizontal: 20, padding: 16, backgroundColor: colors.card, borderRadius: 20, borderWidth: 1, borderColor: colors.border },
  avatarWrap: { position: 'relative' },
  avatar: { width: 52, height: 52, borderRadius: 16, backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.textPrimary, fontSize: 22, fontWeight: '700' },
  tierDot: { position: 'absolute', bottom: -2, right: -2, width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: colors.card },
  userInfo: { flex: 1 },
  userName: { color: colors.textPrimary, fontSize: 17, fontWeight: '700' },
  userEmail: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  userTierBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginTop: 4 },
  userTierText: { fontSize: 9, fontWeight: '800' },
  pointsText: { color: colors.gold, fontSize: 16, fontWeight: '800' },
  // Quick Actions
  quickActions: { flexDirection: 'row', gap: 10, marginHorizontal: 20, marginVertical: 14 },
  eliteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(255,215,0,0.08)', borderRadius: 16, paddingVertical: 14, borderWidth: 1, borderColor: 'rgba(255,215,0,0.2)' },
  eliteBtnText: { color: colors.gold, fontWeight: '700', fontSize: 14 },
  subscribeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(0,255,136,0.08)', borderRadius: 16, paddingVertical: 14, borderWidth: 1, borderColor: 'rgba(0,255,136,0.2)' },
  subscribeBtnText: { color: colors.primary, fontWeight: '700', fontSize: 14 },
  // Secondary Actions
  secondaryActions: { marginHorizontal: 20, marginBottom: 14, gap: 6 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 13, borderWidth: 1, borderColor: colors.border },
  actionBtnText: { flex: 1, color: colors.textPrimary, fontSize: 14, fontWeight: '500' },
  // Toggle
  toggleRow: { flexDirection: 'row', marginHorizontal: 20, gap: 8, marginBottom: 14 },
  toggleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  toggleActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  toggleText: { color: colors.textMuted, fontWeight: '600', fontSize: 13 },
  toggleTextActive: { color: colors.background, fontWeight: '700' },
  // Badges
  prizeCard: { marginHorizontal: 20, marginBottom: 14, backgroundColor: 'rgba(255,215,0,0.06)', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: 'rgba(255,215,0,0.15)' },
  prizeHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  prizeTitle: { color: colors.gold, fontSize: 15, fontWeight: '800' },
  prizeReward: { color: colors.textSecondary, fontSize: 12, marginBottom: 10 },
  progressBarBg: { height: 8, backgroundColor: colors.border, borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: colors.gold, borderRadius: 4 },
  progressText: { color: colors.textMuted, fontSize: 11, marginTop: 6, textAlign: 'center' },
  badgesGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: 16, gap: 10 },
  badgeCard: { width: '47%', backgroundColor: colors.card, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: colors.border, alignItems: 'center', gap: 6, position: 'relative' },
  badgeCardEarned: { borderColor: 'rgba(0,255,136,0.2)' },
  badgeCardNew: { borderColor: 'rgba(255,215,0,0.4)' },
  badgeIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  badgeIconEarned: { backgroundColor: 'rgba(0,255,136,0.1)' },
  badgeIconLocked: { backgroundColor: colors.background },
  badgeName: { color: colors.textPrimary, fontSize: 12, fontWeight: '700', textAlign: 'center' },
  badgeNameLocked: { color: colors.textMuted },
  badgeDesc: { color: colors.textSecondary, fontSize: 10, textAlign: 'center', lineHeight: 14 },
  badgeDescLocked: { color: colors.textMuted, opacity: 0.5 },
  badgePoints: { color: colors.gold, fontSize: 9, fontWeight: '700' },
  earnedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  earnedText: { color: colors.primary, fontSize: 9, fontWeight: '700' },
  lockedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  lockedText: { color: colors.textMuted, fontSize: 9 },
  newTag: { position: 'absolute', top: 6, right: 6, backgroundColor: colors.gold, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  newTagText: { color: colors.background, fontSize: 8, fontWeight: '800' },
  // Leaderboard
  leaderSection: { marginHorizontal: 20 },
  leaderHeader: { marginBottom: 10 },
  leaderTotal: { color: colors.textMuted, fontSize: 12 },
  leaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderRadius: 16, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: colors.border },
  leaderRowTop: { borderColor: 'rgba(255,215,0,0.15)' },
  rankBadge: { width: 32, height: 32, borderRadius: 10, backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center' },
  rank1: { backgroundColor: '#FFD700' },
  rank2: { backgroundColor: '#C0C0C0' },
  rank3: { backgroundColor: '#CD7F32' },
  rankText: { color: colors.textPrimary, fontSize: 13, fontWeight: '800' },
  leaderInfo: { flex: 1 },
  leaderName: { color: colors.textPrimary, fontSize: 14, fontWeight: '700' },
  leaderMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 },
  tierPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  tierPillText: { fontSize: 9, fontWeight: '700' },
  badgeCountText: { color: colors.textMuted, fontSize: 10 },
  leaderStats: { alignItems: 'flex-end' },
  leaderROI: { color: colors.primary, fontSize: 16, fontWeight: '800' },
  leaderWR: { color: colors.textSecondary, fontSize: 10, marginTop: 2 },
  leaderStreak: { color: colors.gold, fontSize: 9, fontWeight: '700', marginTop: 2 },
});
