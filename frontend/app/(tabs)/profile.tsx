import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Animated, Alert, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../src/context/AuthContext';
import { badgesAPI, leaderboardAPI, devAPI, userStatsAPI, weeklyReportAPI, referralAPI } from '../../src/utils/api';
import { colors } from '../../src/utils/theme';
import { LineChart } from 'react-native-gifted-charts';
import * as Clipboard from 'expo-clipboard';
import { Share, Platform } from 'react-native';

const BADGE_DEFINITIONS_FALLBACK = [
  { badge_id: 'community', name: 'Membro della Community', description: 'Ti sei registrato su QuotaX!', icon: 'people', category: 'beginner', points: 50 },
  { badge_id: 'first_follow', name: 'Prima Schedina', description: 'Hai seguito la tua prima schedina!', icon: 'bookmark', category: 'beginner', points: 100 },
  { badge_id: 'first_win', name: 'Prima Vittoria', description: 'La tua prima previsione corretta!', icon: 'trophy', category: 'beginner', points: 150 },
  { badge_id: 'ten_follows', name: 'Collezionista', description: 'Hai seguito 10 schedine!', icon: 'layers', category: 'intermediate', points: 200 },
  { badge_id: 'streak_3', name: 'Serie Vincente', description: '3 previsioni corrette di fila!', icon: 'flame', category: 'intermediate', points: 250 },
  { badge_id: 'streak_5', name: 'In Fiamme', description: '5 previsioni corrette consecutive!', icon: 'bonfire', category: 'intermediate', points: 350 },
  { badge_id: 'top_pick_win', name: 'Occhio d\'Aquila', description: 'Un Top Pick che hai seguito ha vinto!', icon: 'eye', category: 'intermediate', points: 300 },
  { badge_id: 'streak_7', name: 'Inarrestabile', description: '7 giorni consecutivi di utilizzo!', icon: 'rocket', category: 'advanced', points: 400 },
  { badge_id: 'profit_master', name: 'Re del Profitto', description: 'ROI personale sopra il 20%!', icon: 'trending-up', category: 'advanced', points: 500 },
  { badge_id: 'elite_user', name: 'Membro Elite', description: 'Hai usato la funzione Elite AI!', icon: 'diamond', category: 'elite', points: 500 },
  { badge_id: 'member_pro', name: 'Membro Pro', description: 'Ti sei abbonato al piano Pro!', icon: 'star', category: 'elite', points: 400 },
];

const SCREEN_WIDTH = Dimensions.get('window').width;

// Animated counter hook
function useCountUp(target: number, duration: number = 1200, decimals: number = 1) {
  const [val, setVal] = useState(0);
  const animRef = useRef<any>(null);

  useEffect(() => {
    if (target === 0) { setVal(0); return; }
    let start = 0;
    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = target * eased;
      setVal(current);
      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        setVal(target);
      }
    };
    animRef.current = requestAnimationFrame(animate);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [target, duration]);

  return decimals === 0 ? Math.round(val) : parseFloat(val.toFixed(decimals));
}

export default function ProfileScreen() {
  const router = useRouter();
  const { user, isAuthenticated, isPremium, logout, refreshUser } = useAuth();
  const [badges, setBadges] = useState<any[]>([]);
  const [definitions, setDefinitions] = useState<any[]>(BADGE_DEFINITIONS_FALLBACK);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<'badges' | 'leaderboard' | 'stats' | 'referral'>('badges');
  const [devOpen, setDevOpen] = useState(false);
  const [switchingTier, setSwitchingTier] = useState<string | null>(null);
  const [statsData, setStatsData] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [weeklyReport, setWeeklyReport] = useState<any>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [referralData, setReferralData] = useState<any>(null);
  const [referralLoading, setReferralLoading] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const statsEntryAnim = useRef(new Animated.Value(0)).current;

  const isProOrElite = user?.subscription_tier === 'pro' || user?.subscription_tier === 'premium';
  const isElite = user?.subscription_tier === 'premium';

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.05, duration: 2000, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
    ])).start();
  }, []);

  useEffect(() => { fetchData(); }, []);

  // Fetch stats when tab becomes active
  const fetchStats = useCallback(async () => {
    if (!user?.user_id || !isProOrElite) return;
    setStatsLoading(true);
    statsEntryAnim.setValue(0);
    try {
      const data = await userStatsAPI.get(user.user_id);
      setStatsData(data);

      // Fetch weekly report for Elite users
      if (isElite) {
        setReportLoading(true);
        try {
          const report = await weeklyReportAPI.get(user.user_id);
          setWeeklyReport(report);
        } catch (e) {
          console.log('Weekly report not available:', e);
        } finally {
          setReportLoading(false);
        }
      }

      // Animate entry
      Animated.timing(statsEntryAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();
    } catch (e) {
      console.error('Stats fetch error:', e);
    } finally {
      setStatsLoading(false);
    }
  }, [user?.user_id, isProOrElite, isElite]);

  useEffect(() => {
    if (activeSection === 'stats' && !statsData && isProOrElite) {
      fetchStats();
    }
    if (activeSection === 'referral' && !referralData && isAuthenticated && user?.user_id) {
      fetchReferral();
    }
  }, [activeSection, isProOrElite, isAuthenticated]);

  const fetchReferral = async () => {
    if (!user?.user_id) return;
    setReferralLoading(true);
    try {
      const data = await referralAPI.get(user.user_id);
      setReferralData(data);
    } catch (e) {
      console.error('Referral fetch error:', e);
    } finally {
      setReferralLoading(false);
    }
  };

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

  const getTierColor = (tier: string) => tier === 'elite' ? colors.gold : tier === 'premium' ? colors.gold : tier === 'pro' ? '#9B59B6' : colors.primary;
  const getTierLabel = (tier: string) => tier === 'elite' ? 'ELITE' : tier === 'premium' ? 'ELITE' : tier === 'pro' ? 'PRO' : 'FREE';

  const handleSwitchTier = async (tier: string) => {
    if (!user?.user_id) return;
    setSwitchingTier(tier);
    try {
      await devAPI.switchTier(user.user_id, tier);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await refreshUser();
      Alert.alert('Piano cambiato!', `Ora sei ${tier === 'premium' ? 'Elite' : tier === 'pro' ? 'Pro' : 'Free'}. Vai su Pronostici/Schedine/Top Picks per testare.`);
    } catch (e: any) {
      Alert.alert('Errore', e?.message || 'Errore nel cambio piano');
    } finally {
      setSwitchingTier(null);
    }
  };

  // Guest view
  if (!isAuthenticated) {
    return (
      <SafeAreaView style={st.container} edges={['top']}>
        <View style={st.header}><Text style={st.headerTitle}>Profilo</Text></View>
        <ScrollView contentContainerStyle={st.guestContent}>
          <View style={st.guestCard}>
            <Ionicons name="warning" size={48} color={colors.gold} />
            <Text style={st.guestTitle}>Stai usando solo una parte delle funzionalità</Text>
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
            <View style={[st.userTierBadge, { backgroundColor: user?.subscription_tier === 'premium' ? 'rgba(255,215,0,0.15)' : user?.subscription_tier === 'pro' ? 'rgba(155,89,182,0.15)' : 'rgba(0,255,136,0.15)' }]}>
              <Text style={[st.userTierText, { color: user?.subscription_tier === 'premium' ? colors.gold : user?.subscription_tier === 'pro' ? '#9B59B6' : colors.primary }]}>
                {user?.subscription_tier === 'premium' ? 'ELITE' : user?.subscription_tier === 'pro' ? 'PRO' : 'FREE'}
              </Text>
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

        {/* Legal Links */}
        <View style={st.legalSection}>
          <TouchableOpacity style={st.legalBtn} onPress={() => router.push('/privacy')} activeOpacity={0.7}>
            <Ionicons name="shield-checkmark" size={18} color={colors.textMuted} />
            <Text style={st.legalBtnText}>Privacy Policy</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={st.legalBtn} onPress={() => router.push('/terms')} activeOpacity={0.7}>
            <Ionicons name="document-text" size={18} color={colors.textMuted} />
            <Text style={st.legalBtnText}>Termini e Condizioni</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Dev Panel - Tier Switcher */}
        <TouchableOpacity 
          style={st.devToggle} 
          onPress={() => { Haptics.selectionAsync(); setDevOpen(!devOpen); }}
          activeOpacity={0.7}
        >
          <View style={st.devToggleLeft}>
            <Ionicons name="code-slash" size={16} color="#FF6B35" />
            <Text style={st.devToggleText}>Dev Mode — Cambia Piano</Text>
          </View>
          <Ionicons name={devOpen ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textMuted} />
        </TouchableOpacity>

        {devOpen && (
          <View style={st.devPanel}>
            <Text style={st.devLabel}>Piano attuale: <Text style={{ color: getTierColor(user?.subscription_tier || 'free'), fontWeight: '800' }}>{getTierLabel(user?.subscription_tier || 'free')}</Text></Text>
            <Text style={st.devHint}>Seleziona un piano per testare. Le altre tab si aggiorneranno automaticamente.</Text>
            <View style={st.devTierRow}>
              {[
                { tier: 'free', label: 'Free', icon: 'person', color: colors.primary },
                { tier: 'pro', label: 'Pro', icon: 'star', color: '#9B59B6' },
                { tier: 'premium', label: 'Elite', icon: 'diamond', color: colors.gold },
              ].map(t => {
                const isActive = user?.subscription_tier === t.tier;
                return (
                  <TouchableOpacity
                    key={t.tier}
                    style={[st.devTierBtn, isActive && { borderColor: t.color, backgroundColor: t.color + '15' }]}
                    onPress={() => !isActive && handleSwitchTier(t.tier)}
                    disabled={switchingTier !== null}
                    activeOpacity={0.7}
                  >
                    {switchingTier === t.tier ? (
                      <ActivityIndicator size="small" color={t.color} />
                    ) : (
                      <>
                        <Ionicons name={t.icon as any} size={20} color={isActive ? t.color : colors.textMuted} />
                        <Text style={[st.devTierLabel, isActive && { color: t.color }]}>{t.label}</Text>
                        {isActive && <Ionicons name="checkmark-circle" size={14} color={t.color} />}
                      </>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

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
          {isProOrElite && (
            <TouchableOpacity style={[st.toggleBtn, activeSection === 'stats' && st.toggleActiveGold]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActiveSection('stats'); }}>
              <Ionicons name="analytics" size={16} color={activeSection === 'stats' ? colors.background : colors.gold} />
              <Text style={[st.toggleText, activeSection === 'stats' && st.toggleTextActive, activeSection !== 'stats' && { color: colors.gold }]}>Stats</Text>
            </TouchableOpacity>
          )}
          {isAuthenticated && (
            <TouchableOpacity style={[st.toggleBtn, activeSection === 'referral' && st.toggleActive]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActiveSection('referral'); }}>
              <Ionicons name="gift" size={16} color={activeSection === 'referral' ? colors.background : colors.primary} />
              <Text style={[st.toggleText, activeSection === 'referral' && st.toggleTextActive, activeSection !== 'referral' && { color: colors.primary }]}>Invita</Text>
            </TouchableOpacity>
          )}
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
              <Text style={st.prizeReward}>Premio: 1 mese gratis di Elite!</Text>
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

        {/* Stats Section (Pro/Elite) */}
        {activeSection === 'stats' && isProOrElite && (
          <StatsSection
            statsData={statsData}
            statsLoading={statsLoading}
            statsEntryAnim={statsEntryAnim}
            onRefresh={fetchStats}
            weeklyReport={weeklyReport}
            reportLoading={reportLoading}
            isElite={isElite}
          />
        )}

        {/* Referral Section */}
        {activeSection === 'referral' && isAuthenticated && (
          <ReferralSection data={referralData} loading={referralLoading} onRefresh={fetchReferral} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// Referral Section Component
function ReferralSection({ data, loading, onRefresh }: { data: any; loading: boolean; onRefresh: () => void }) {
  const [copied, setCopied] = useState(false);
  const entryAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (data) {
      Animated.timing(entryAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    }
  }, [data]);

  const handleCopy = async () => {
    if (!data?.referral_code) return;
    await Clipboard.setStringAsync(data.referral_code);
    setCopied(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (!data?.referral_code) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share({
        message: `Prova QuotaX! Usa il mio codice ${data.referral_code} per registrarti e sbloccare vantaggi esclusivi!`,
      });
    } catch (e) {}
  };

  if (loading || !data) {
    return (
      <View style={st.refContainer}>
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 30 }} />
        <Text style={st.statsLoadText}>Caricamento referral...</Text>
      </View>
    );
  }

  const count = data.referral_count || 0;
  const nextM = data.next_milestone;
  const progressTarget = nextM ? nextM.count : 10;
  const progressWidth = Math.min((count / progressTarget) * 100, 100);

  return (
    <Animated.View style={[st.refContainer, { opacity: entryAnim, transform: [{ translateY: entryAnim.interpolate({ inputRange: [0, 1], outputRange: [25, 0] }) }] }]}>
      {/* Header */}
      <View style={st.refHeader}>
        <Ionicons name="people" size={22} color={colors.primary} />
        <View>
          <Text style={st.refTitle}>Invita amici</Text>
          <Text style={st.refSub}>Condividi il tuo codice e sblocca premi esclusivi</Text>
        </View>
      </View>

      {/* Code Card */}
      <View style={st.refCodeCard}>
        <Text style={st.refCodeLabel}>Il tuo codice referral</Text>
        <Text style={st.refCode}>{data.referral_code}</Text>
        <View style={st.refCodeBtns}>
          <TouchableOpacity style={[st.refCopyBtn, copied && st.refCopyBtnDone]} onPress={handleCopy} activeOpacity={0.8}>
            <Ionicons name={copied ? 'checkmark' : 'copy'} size={16} color={copied ? colors.background : colors.primary} />
            <Text style={[st.refCopyText, copied && st.refCopyTextDone]}>{copied ? 'Copiato!' : 'Copia codice'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={st.refShareBtn} onPress={handleShare} activeOpacity={0.8}>
            <Ionicons name="share-social" size={16} color={colors.background} />
            <Text style={st.refShareText}>Condividi</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats */}
      <View style={st.refStatsCard}>
        <View style={st.refStatItem}>
          <Text style={st.refStatNum}>{count}</Text>
          <Text style={st.refStatLabel}>Amici invitati</Text>
        </View>
        {nextM && (
          <View style={st.refStatItem}>
            <Text style={st.refStatNum}>{nextM.remaining}</Text>
            <Text style={st.refStatLabel}>Al prossimo premio</Text>
          </View>
        )}
      </View>

      {/* Progress Bar */}
      {nextM && (
        <View style={st.refProgressCard}>
          <View style={st.refProgressHeader}>
            <Text style={st.refProgressLabel}>Prossimo premio: {nextM.emoji} {nextM.badge}</Text>
            <Text style={st.refProgressCount}>{count}/{nextM.count}</Text>
          </View>
          <View style={st.refProgressBar}>
            <Animated.View style={[st.refProgressFill, { width: `${progressWidth}%` }]} />
          </View>
        </View>
      )}

      {/* Milestones */}
      <View style={st.refMilestones}>
        <Text style={st.refMilestonesTitle}>Premi disponibili</Text>
        {(data.milestones || []).map((m: any, i: number) => (
          <View key={i} style={[st.refMilestone, m.unlocked && st.refMilestoneUnlocked]}>
            <View style={[st.refMilestoneIcon, m.unlocked && st.refMilestoneIconDone]}>
              <Text style={st.refMilestoneEmoji}>{m.emoji}</Text>
            </View>
            <View style={st.refMilestoneInfo}>
              <Text style={[st.refMilestoneName, m.unlocked && st.refMilestoneNameDone]}>{m.badge}</Text>
              <Text style={st.refMilestoneDesc}>
                {m.count === 1 ? 'Invita 1 amico' : `Invita ${m.count} amici`}
                {m.reward === 'pro_1month' ? ' — 1 mese PRO gratis' : m.reward === 'elite_1month' ? ' — 1 mese ELITE gratis' : ''}
              </Text>
            </View>
            {m.unlocked ? (
              <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
            ) : (
              <Ionicons name="lock-closed" size={18} color={colors.textMuted} />
            )}
          </View>
        ))}
      </View>

      {/* CTA */}
      <TouchableOpacity style={st.refCTA} onPress={handleShare} activeOpacity={0.85}>
        <Ionicons name="rocket" size={18} color={colors.background} />
        <Text style={st.refCTAText}>Invita ora e sblocca premi</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// Stats Section Component
function StatsSection({ statsData, statsLoading, statsEntryAnim, onRefresh, weeklyReport, reportLoading, isElite }: { statsData: any; statsLoading: boolean; statsEntryAnim: Animated.Value; onRefresh: () => void; weeklyReport: any; reportLoading: boolean; isElite: boolean }) {
  const roiValue = useCountUp(statsData?.roi_monthly || 0, 1400, 1);
  const winRateValue = useCountUp(statsData?.win_rate || 0, 1200, 1);
  const profitValue = useCountUp(statsData?.profit_net || 0, 1600, 2);
  const totalBetsValue = useCountUp(statsData?.total_bets || 0, 1000, 0);
  const streakValue = useCountUp(statsData?.streak || 0, 800, 0);

  if (statsLoading || !statsData) {
    return (
      <View style={st.statsContainer}>
        {/* Skeleton loaders */}
        {[1, 2, 3].map(i => (
          <View key={i} style={st.statsSkeleton}>
            <View style={st.skeletonShine} />
          </View>
        ))}
        <ActivityIndicator size="large" color={colors.gold} style={{ marginTop: 20 }} />
        <Text style={st.statsLoadText}>Caricamento statistiche...</Text>
      </View>
    );
  }

  const roiPositive = (statsData?.roi_monthly || 0) >= 0;
  const profitPositive = (statsData?.profit_net || 0) >= 0;
  const weeklyRoiPositive = (statsData?.roi_weekly || 0) >= 0;

  // Prepare chart data
  const chartData = (statsData?.roi_history || []).map((item: any, idx: number) => ({
    value: item.roi,
    label: idx % 5 === 0 ? `G${item.day}` : '',
    labelTextStyle: { color: colors.textMuted, fontSize: 8 },
  }));

  const chartWidth = SCREEN_WIDTH - 80;

  return (
    <Animated.View style={[st.statsContainer, { opacity: statsEntryAnim, transform: [{ translateY: statsEntryAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }] }]}>
      {/* Header */}
      <View style={st.statsHeader}>
        <View style={st.statsHeaderLeft}>
          <Ionicons name="analytics" size={20} color={colors.gold} />
          <Text style={st.statsTitle}>Le Tue Statistiche</Text>
        </View>
        <TouchableOpacity onPress={onRefresh} style={st.refreshBtn} activeOpacity={0.7}>
          <Ionicons name="refresh" size={16} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Main Stats Cards Row */}
      <View style={st.statsCardsRow}>
        {/* ROI Card */}
        <View style={[st.statCard, st.statCardMain]}>
          <View style={st.statCardHeader}>
            <Ionicons name="trending-up" size={16} color={roiPositive ? colors.profit : colors.loss} />
            <Text style={st.statCardLabel}>ROI Mensile</Text>
          </View>
          <Text style={[st.statCardValue, { color: roiPositive ? colors.profit : colors.loss }]}>
            {roiPositive ? '+' : ''}{roiValue}%
          </Text>
          <View style={[st.statCardTrend, { backgroundColor: weeklyRoiPositive ? 'rgba(0,255,136,0.1)' : 'rgba(255,77,77,0.1)' }]}>
            <Ionicons name={weeklyRoiPositive ? 'arrow-up' : 'arrow-down'} size={10} color={weeklyRoiPositive ? colors.profit : colors.loss} />
            <Text style={[st.statCardTrendText, { color: weeklyRoiPositive ? colors.profit : colors.loss }]}>
              {weeklyRoiPositive ? '+' : ''}{statsData?.roi_weekly}% sett.
            </Text>
          </View>
        </View>

        {/* Win Rate Card */}
        <View style={[st.statCard, st.statCardMain]}>
          <View style={st.statCardHeader}>
            <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
            <Text style={st.statCardLabel}>Win Rate</Text>
          </View>
          <Text style={[st.statCardValue, { color: colors.primary }]}>{winRateValue}%</Text>
          <View style={st.winRateBar}>
            <View style={[st.winRateFill, { width: `${Math.min(statsData?.win_rate || 0, 100)}%` }]} />
          </View>
          <Text style={st.statCardSub}>{statsData?.wins}V / {statsData?.losses}P</Text>
        </View>
      </View>

      {/* Secondary Stats Row */}
      <View style={st.statsCardsRow}>
        {/* Profit Card */}
        <View style={st.statCard}>
          <View style={st.statCardHeader}>
            <Ionicons name="cash" size={14} color={profitPositive ? colors.profit : colors.loss} />
            <Text style={st.statCardLabel}>Profitto Netto</Text>
          </View>
          <Text style={[st.statCardValueSm, { color: profitPositive ? colors.profit : colors.loss }]}>
            {profitPositive ? '+' : ''}{profitValue.toLocaleString()}
          </Text>
        </View>

        {/* Total Bets */}
        <View style={st.statCard}>
          <View style={st.statCardHeader}>
            <Ionicons name="receipt" size={14} color={colors.textSecondary} />
            <Text style={st.statCardLabel}>Scommesse</Text>
          </View>
          <Text style={st.statCardValueSm}>{totalBetsValue}</Text>
        </View>

        {/* Streak */}
        <View style={st.statCard}>
          <View style={st.statCardHeader}>
            <Ionicons name="flame" size={14} color={colors.gold} />
            <Text style={st.statCardLabel}>Serie</Text>
          </View>
          <Text style={[st.statCardValueSm, { color: colors.gold }]}>{streakValue}</Text>
        </View>
      </View>

      {/* ROI Chart */}
      <View style={st.chartCard}>
        <View style={st.chartHeader}>
          <Ionicons name="bar-chart" size={16} color={colors.primary} />
          <Text style={st.chartTitle}>Andamento ROI (30 giorni)</Text>
        </View>
        <View style={st.chartWrap}>
          <LineChart
            data={chartData}
            width={chartWidth}
            height={160}
            spacing={chartWidth / Math.max(chartData.length - 1, 1)}
            color={colors.primary}
            thickness={2}
            startFillColor={'rgba(0,255,136,0.2)'}
            endFillColor={'rgba(0,255,136,0.01)'}
            areaChart
            hideDataPoints
            yAxisTextStyle={{ color: colors.textMuted, fontSize: 9 }}
            xAxisLabelTextStyle={{ color: colors.textMuted, fontSize: 8 }}
            yAxisColor={'transparent'}
            xAxisColor={colors.border}
            rulesColor={colors.border}
            rulesType="dashed"
            noOfSections={4}
            curved
            initialSpacing={0}
            endSpacing={0}
            adjustToWidth
          />
        </View>
      </View>

      {/* Best Pick Card */}
      {statsData?.best_pick && (
        <View style={st.bestPickCard}>
          <View style={st.bestPickHeader}>
            <Ionicons name="star" size={16} color={colors.gold} />
            <Text style={st.bestPickTitle}>Miglior Pick del Mese</Text>
          </View>
          <View style={st.bestPickContent}>
            <View style={st.bestPickMatch}>
              <Ionicons name="football" size={14} color={colors.textSecondary} />
              <Text style={st.bestPickMatchText}>{statsData.best_pick.match}</Text>
            </View>
            <View style={st.bestPickDetails}>
              <View style={st.bestPickDetail}>
                <Text style={st.bestPickDetailLabel}>Esito</Text>
                <Text style={st.bestPickDetailValue}>{statsData.best_pick.outcome}</Text>
              </View>
              <View style={st.bestPickDetail}>
                <Text style={st.bestPickDetailLabel}>Quota</Text>
                <Text style={st.bestPickDetailValue}>{statsData.best_pick.odds}</Text>
              </View>
              <View style={st.bestPickDetail}>
                <Text style={st.bestPickDetailLabel}>Profitto</Text>
                <Text style={[st.bestPickDetailValue, { color: colors.profit }]}>+{statsData.best_pick.profit}</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Additional Info */}
      <View style={st.statsFooter}>
        <View style={st.statsFooterRow}>
          <Text style={st.statsFooterLabel}>Quota Media</Text>
          <Text style={st.statsFooterValue}>{statsData?.avg_odds}</Text>
        </View>
        <View style={st.statsFooterRow}>
          <Text style={st.statsFooterLabel}>Stake Medio</Text>
          <Text style={st.statsFooterValue}>{statsData?.avg_stake}</Text>
        </View>
      </View>

      <Text style={st.statsDisclaimer}>Statistiche simulate a scopo dimostrativo. Non rappresentano risultati reali.</Text>

      {/* Weekly Report (Elite Only) */}
      {isElite && (
        <View style={st.reportCard}>
          <View style={st.reportHeader}>
            <View style={st.reportHeaderLeft}>
              <Ionicons name="document-text" size={18} color={colors.gold} />
              <Text style={st.reportTitle}>Report Settimanale AI</Text>
            </View>
            <View style={st.reportEliteBadge}>
              <Ionicons name="diamond" size={10} color={colors.background} />
              <Text style={st.reportEliteText}>ELITE</Text>
            </View>
          </View>

          {reportLoading && !weeklyReport && (
            <View style={st.reportLoading}>
              <ActivityIndicator size="small" color={colors.gold} />
              <Text style={st.reportLoadingText}>Generazione report AI...</Text>
            </View>
          )}

          {weeklyReport && (
            <View style={st.reportContent}>
              <Text style={st.reportPeriod}>{weeklyReport.period}</Text>

              {/* Report Stats Row */}
              <View style={st.reportStatsRow}>
                <View style={st.reportStatItem}>
                  <Text style={st.reportStatLabel}>ROI</Text>
                  <Text style={[st.reportStatValue, { color: (weeklyReport.stats?.roi || 0) >= 0 ? colors.profit : colors.loss }]}>
                    {(weeklyReport.stats?.roi || 0) >= 0 ? '+' : ''}{weeklyReport.stats?.roi}%
                  </Text>
                </View>
                <View style={st.reportStatDivider} />
                <View style={st.reportStatItem}>
                  <Text style={st.reportStatLabel}>Win Rate</Text>
                  <Text style={[st.reportStatValue, { color: colors.primary }]}>{weeklyReport.stats?.win_rate}%</Text>
                </View>
                <View style={st.reportStatDivider} />
                <View style={st.reportStatItem}>
                  <Text style={st.reportStatLabel}>Profitto</Text>
                  <Text style={[st.reportStatValue, { color: (weeklyReport.stats?.profit || 0) >= 0 ? colors.profit : colors.loss }]}>
                    {(weeklyReport.stats?.profit || 0) >= 0 ? '+' : ''}{weeklyReport.stats?.profit?.toFixed(0)}
                  </Text>
                </View>
              </View>

              {/* Best & Worst Pick */}
              <View style={st.reportPicksRow}>
                {weeklyReport.best_pick && (
                  <View style={[st.reportPickCard, st.reportPickBest]}>
                    <Ionicons name="trophy" size={14} color={colors.profit} />
                    <Text style={st.reportPickLabel}>Miglior Pick</Text>
                    <Text style={st.reportPickMatch} numberOfLines={1}>{weeklyReport.best_pick.match}</Text>
                    <Text style={[st.reportPickProfit, { color: colors.profit }]}>+{weeklyReport.best_pick.profit}</Text>
                  </View>
                )}
                {weeklyReport.worst_pick && (
                  <View style={[st.reportPickCard, st.reportPickWorst]}>
                    <Ionicons name="trending-down" size={14} color={colors.loss} />
                    <Text style={st.reportPickLabel}>Peggior Pick</Text>
                    <Text style={st.reportPickMatch} numberOfLines={1}>{weeklyReport.worst_pick.match}</Text>
                    <Text style={[st.reportPickProfit, { color: colors.loss }]}>-{weeklyReport.worst_pick.loss}</Text>
                  </View>
                )}
              </View>

              {/* AI Suggestion */}
              {weeklyReport.ai_suggestion && (
                <View style={st.reportAI}>
                  <View style={st.reportAIHeader}>
                    <Ionicons name="sparkles" size={14} color={colors.gold} />
                    <Text style={st.reportAITitle}>Consiglio AI</Text>
                  </View>
                  <Text style={st.reportAIText}>{weeklyReport.ai_suggestion}</Text>
                </View>
              )}
            </View>
          )}

          {!weeklyReport && !reportLoading && (
            <View style={st.reportEmpty}>
              <Ionicons name="hourglass" size={20} color={colors.textMuted} />
              <Text style={st.reportEmptyText}>Nessun report disponibile questa settimana</Text>
            </View>
          )}
        </View>
      )}
    </Animated.View>
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
  toggleActiveGold: { backgroundColor: colors.gold, borderColor: colors.gold },
  toggleText: { color: colors.textMuted, fontWeight: '600', fontSize: 13 },
  toggleTextActive: { color: colors.background, fontWeight: '700' },
  // Dev Panel
  devToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 20, marginBottom: 8, paddingVertical: 12, paddingHorizontal: 16, backgroundColor: 'rgba(255,107,53,0.06)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,107,53,0.15)' },
  devToggleLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  devToggleText: { color: '#FF6B35', fontSize: 13, fontWeight: '700' },
  devPanel: { marginHorizontal: 20, marginBottom: 12, padding: 16, backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,107,53,0.2)' },
  devLabel: { color: colors.textPrimary, fontSize: 14, fontWeight: '600', marginBottom: 4 },
  devHint: { color: colors.textMuted, fontSize: 11, marginBottom: 14 },
  devTierRow: { flexDirection: 'row', gap: 8 },
  devTierBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, borderRadius: 14, backgroundColor: colors.background, borderWidth: 1.5, borderColor: colors.border },
  devTierLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '700' },
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
  // Stats Section
  statsContainer: { marginHorizontal: 20, gap: 12 },
  statsSkeleton: { height: 80, backgroundColor: colors.card, borderRadius: 16, marginBottom: 10, overflow: 'hidden' },
  skeletonShine: { width: '40%', height: '100%', backgroundColor: 'rgba(255,255,255,0.03)' },
  statsLoadText: { color: colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: 8 },
  statsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  statsHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statsTitle: { color: colors.gold, fontSize: 17, fontWeight: '800' },
  refreshBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  statsCardsRow: { flexDirection: 'row', gap: 10 },
  statCard: { flex: 1, backgroundColor: colors.card, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: colors.border, gap: 6 },
  statCardMain: { padding: 16, borderColor: 'rgba(0,255,136,0.12)' },
  statCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statCardLabel: { color: colors.textMuted, fontSize: 10, fontWeight: '600', textTransform: 'uppercase' },
  statCardValue: { color: colors.textPrimary, fontSize: 28, fontWeight: '900', letterSpacing: -1 },
  statCardValueSm: { color: colors.textPrimary, fontSize: 20, fontWeight: '800' },
  statCardSub: { color: colors.textMuted, fontSize: 10 },
  statCardTrend: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statCardTrendText: { fontSize: 10, fontWeight: '700' },
  winRateBar: { height: 4, backgroundColor: colors.border, borderRadius: 2, overflow: 'hidden' },
  winRateFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 2 },
  chartCard: { backgroundColor: colors.card, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: colors.border },
  chartHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  chartTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: '700' },
  chartWrap: { marginLeft: -8, overflow: 'hidden' },
  bestPickCard: { backgroundColor: 'rgba(255,215,0,0.06)', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: 'rgba(255,215,0,0.15)' },
  bestPickHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  bestPickTitle: { color: colors.gold, fontSize: 14, fontWeight: '800' },
  bestPickContent: { gap: 10 },
  bestPickMatch: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bestPickMatchText: { color: colors.textPrimary, fontSize: 15, fontWeight: '700' },
  bestPickDetails: { flexDirection: 'row', gap: 12 },
  bestPickDetail: { flex: 1, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 10, alignItems: 'center', gap: 4 },
  bestPickDetailLabel: { color: colors.textMuted, fontSize: 9, fontWeight: '600', textTransform: 'uppercase' },
  bestPickDetailValue: { color: colors.textPrimary, fontSize: 16, fontWeight: '800' },
  statsFooter: { backgroundColor: colors.card, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.border, gap: 8 },
  statsFooterRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statsFooterLabel: { color: colors.textMuted, fontSize: 12 },
  statsFooterValue: { color: colors.textPrimary, fontSize: 14, fontWeight: '700' },
  statsDisclaimer: { color: colors.textMuted, fontSize: 9, textAlign: 'center', fontStyle: 'italic', marginTop: 4, opacity: 0.6 },
  // Weekly Report
  reportCard: { backgroundColor: 'rgba(255,215,0,0.04)', borderRadius: 20, padding: 18, borderWidth: 1.5, borderColor: 'rgba(255,215,0,0.2)', marginTop: 4 },
  reportHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  reportHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reportTitle: { color: colors.gold, fontSize: 16, fontWeight: '800' },
  reportEliteBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.gold, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  reportEliteText: { color: colors.background, fontSize: 8, fontWeight: '900' },
  reportLoading: { alignItems: 'center', gap: 8, paddingVertical: 20 },
  reportLoadingText: { color: colors.textMuted, fontSize: 12 },
  reportContent: { gap: 14 },
  reportPeriod: { color: colors.textSecondary, fontSize: 12, fontWeight: '600' },
  reportStatsRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 14, padding: 14 },
  reportStatItem: { flex: 1, alignItems: 'center', gap: 4 },
  reportStatLabel: { color: colors.textMuted, fontSize: 9, fontWeight: '600', textTransform: 'uppercase' },
  reportStatValue: { color: colors.textPrimary, fontSize: 20, fontWeight: '900' },
  reportStatDivider: { width: 1, height: 30, backgroundColor: colors.border },
  reportPicksRow: { flexDirection: 'row', gap: 10 },
  reportPickCard: { flex: 1, borderRadius: 14, padding: 12, gap: 6, alignItems: 'center' },
  reportPickBest: { backgroundColor: 'rgba(0,255,136,0.06)', borderWidth: 1, borderColor: 'rgba(0,255,136,0.12)' },
  reportPickWorst: { backgroundColor: 'rgba(255,77,77,0.06)', borderWidth: 1, borderColor: 'rgba(255,77,77,0.12)' },
  reportPickLabel: { color: colors.textMuted, fontSize: 9, fontWeight: '700', textTransform: 'uppercase' },
  reportPickMatch: { color: colors.textPrimary, fontSize: 12, fontWeight: '600', textAlign: 'center' },
  reportPickProfit: { fontSize: 16, fontWeight: '900' },
  reportAI: { backgroundColor: 'rgba(255,215,0,0.06)', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: 'rgba(255,215,0,0.1)' },
  reportAIHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  reportAITitle: { color: colors.gold, fontSize: 13, fontWeight: '800' },
  reportAIText: { color: colors.textSecondary, fontSize: 13, lineHeight: 20 },
  reportEmpty: { alignItems: 'center', gap: 8, paddingVertical: 20 },
  reportEmptyText: { color: colors.textMuted, fontSize: 12 },
  // Legal
  legalSection: { marginHorizontal: 20, gap: 6, marginTop: 8, marginBottom: 8 },
  legalBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14, paddingHorizontal: 16, backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.border },
  legalBtnText: { flex: 1, color: colors.textSecondary, fontSize: 14, fontWeight: '500' },
  // Referral
  refContainer: { marginHorizontal: 20, gap: 14 },
  refHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  refTitle: { color: colors.primary, fontSize: 18, fontWeight: '800' },
  refSub: { color: colors.textMuted, fontSize: 11 },
  refCodeCard: { backgroundColor: 'rgba(0,255,136,0.05)', borderRadius: 20, padding: 20, borderWidth: 1.5, borderColor: 'rgba(0,255,136,0.15)', alignItems: 'center', gap: 10 },
  refCodeLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  refCode: { color: colors.primary, fontSize: 28, fontWeight: '900', letterSpacing: 3 },
  refCodeBtns: { flexDirection: 'row', gap: 10, marginTop: 6 },
  refCopyBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 14, borderWidth: 1.5, borderColor: colors.primary },
  refCopyBtnDone: { backgroundColor: colors.primary, borderColor: colors.primary },
  refCopyText: { color: colors.primary, fontSize: 13, fontWeight: '700' },
  refCopyTextDone: { color: colors.background },
  refShareBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 14, backgroundColor: colors.primary },
  refShareText: { color: colors.background, fontSize: 13, fontWeight: '700' },
  refStatsCard: { flexDirection: 'row', gap: 10 },
  refStatItem: { flex: 1, backgroundColor: colors.card, borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  refStatNum: { color: colors.primary, fontSize: 28, fontWeight: '900' },
  refStatLabel: { color: colors.textMuted, fontSize: 10, fontWeight: '600', marginTop: 4, textTransform: 'uppercase' },
  refProgressCard: { backgroundColor: colors.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border },
  refProgressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  refProgressLabel: { color: colors.textSecondary, fontSize: 12, fontWeight: '600' },
  refProgressCount: { color: colors.primary, fontSize: 14, fontWeight: '800' },
  refProgressBar: { height: 8, backgroundColor: colors.border, borderRadius: 4, overflow: 'hidden' },
  refProgressFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 4 },
  refMilestones: { backgroundColor: colors.card, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: colors.border, gap: 4 },
  refMilestonesTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: '800', marginBottom: 8 },
  refMilestone: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  refMilestoneUnlocked: { opacity: 1 },
  refMilestoneIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.04)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  refMilestoneIconDone: { backgroundColor: 'rgba(0,255,136,0.1)', borderColor: 'rgba(0,255,136,0.2)' },
  refMilestoneEmoji: { fontSize: 20 },
  refMilestoneInfo: { flex: 1, gap: 2 },
  refMilestoneName: { color: colors.textPrimary, fontSize: 14, fontWeight: '700' },
  refMilestoneNameDone: { color: colors.primary },
  refMilestoneDesc: { color: colors.textMuted, fontSize: 11 },
  refCTA: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.primary, paddingVertical: 16, borderRadius: 16 },
  refCTAText: { color: colors.background, fontSize: 15, fontWeight: '800' },
});
