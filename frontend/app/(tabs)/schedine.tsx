import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../src/context/AuthContext';
import { schedineAPI, publicAPI, badgesAPI } from '../../src/utils/api';
import { colors } from '../../src/utils/theme';
import { Schedina } from '../../src/types';
import BadgeUnlockPopup from '../../src/components/BadgeUnlockPopup';
import { SkeletonSchedinaCard } from '../../src/components/Skeleton';

type FilterTab = 'all' | 'single' | 'multi';
type SubTab = 'disponibili' | 'archivio';

export default function SchedineAIScreen() {
  const router = useRouter();
  const { user, isAuthenticated, isPremium } = useAuth();
  const [schedine, setSchedine] = useState<Schedina[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('disponibili');
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set());
  const [followingId, setFollowingId] = useState<string | null>(null);
  const [badgePopup, setBadgePopup] = useState<any>(null);

  const userTier = !isAuthenticated ? 'guest' : (user?.subscription_tier === 'premium' ? 'premium' : user?.subscription_tier === 'pro' ? 'pro' : 'free');

  const fetchData = async () => {
    try {
      const [schedData, statsData] = await Promise.all([schedineAPI.getAll(), publicAPI.getStats()]);
      setSchedine(schedData);
      setStats(statsData);

      // Fetch followed schedine
      if (isAuthenticated) {
        try {
          const followed = await schedineAPI.getFollowed();
          setFollowedIds(new Set(followed.followed_ids || []));
        } catch (e) {}
      }
    } catch (e) { console.error(e); } finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { fetchData(); }, []);
  const onRefresh = useCallback(() => { setRefreshing(true); fetchData(); }, []);

  const handleFollow = async (schedinaId: string) => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setFollowingId(schedinaId);
    try {
      const result = await schedineAPI.follow(schedinaId);
      setFollowedIds(prev => {
        const next = new Set(prev);
        if (result.followed) next.add(schedinaId);
        else next.delete(schedinaId);
        return next;
      });
      Haptics.notificationAsync(result.followed ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning);

      // Check for badge unlock when following
      if (result.followed && user?.user_id) {
        try {
          const badgeResult = await badgesAPI.getUserBadges(user.user_id);
          const newBadges = (badgeResult.badges || []).filter((b: any) => b.new);
          if (newBadges.length > 0) {
            const def = (badgeResult.definitions || []).find((d: any) => d.badge_id === newBadges[0].badge_id);
            if (def) setBadgePopup(def);
          }
        } catch {}
      }
    } catch (e) {
      console.error(e);
    } finally {
      setFollowingId(null);
    }
  };

  const canSeeCard = (index: number): boolean => {
    // Elite: unlimited
    if (userTier === 'premium') return true;
    // Pro: unlimited schedine
    if (userTier === 'pro') return true;
    // Free: 2 schedine settimanali
    if (userTier === 'free') return index < 2;
    // Guest: 1 schedina
    return index < 1;
  };

  const filteredSchedine = schedine.filter(sch => {
    // Main tab filter
    if (activeTab === 'single') { if (sch.matches.length !== 1) return false; }
    if (activeTab === 'multi') { if (sch.matches.length <= 1) return false; }
    // Sub tab filter: Disponibili = followed/played schedine, Archivio = won or lost
    if (activeSubTab === 'disponibili') return followedIds.has(sch.schedina_id);
    if (activeSubTab === 'archivio') return sch.status === 'won' || sch.status === 'lost';
    return true;
  });

  if (loading) return (
    <SafeAreaView style={st.container} edges={['top']}>
      <View style={st.header}>
        <View style={st.headerLeft}><Ionicons name="layers" size={22} color={colors.primary} /><Text style={st.title}>Schedine AI</Text></View>
        <View style={st.headerCounter}><Text style={st.headerCounterText}>{schedine.length} totali</Text></View>
      </View>
      <View style={{ padding: 20 }}><SkeletonSchedinaCard /><SkeletonSchedinaCard /><SkeletonSchedinaCard /></View>
    </SafeAreaView>
  );

  const monthWon = schedine.filter(s => s.status === 'won').length;
  const monthTotal = schedine.length;

  return (
    <SafeAreaView style={st.container} edges={['top']}>
      <View style={st.header}>
        <View style={st.headerLeft}>
          <Ionicons name="layers" size={22} color={colors.primary} />
          <Text style={st.title}>Schedine AI</Text>
        </View>
        <View style={st.headerBadge}><Text style={st.headerBadgeText}>{schedine.filter(s => !s.is_locked).length} disponibili</Text></View>
      </View>

      {/* Monthly stats */}
      {stats && (
        <View style={st.monthlyStats}>
          <Ionicons name="trophy" size={16} color={colors.gold} />
          <Text style={st.monthlyText}>
            Questo mese: <Text style={st.monthlyHighlight}>{monthWon}/{monthTotal} vinte</Text> — ROI <Text style={st.monthlyHighlight}>+{stats.roi_7d}%</Text>
          </Text>
        </View>
      )}

      {/* Filter Tabs */}
      <View style={st.tabRow}>
        {([
          { key: 'all', label: 'Tutte', icon: 'grid' },
          { key: 'single', label: 'Singole', icon: 'document-text' },
          { key: 'multi', label: 'Multiple', icon: 'layers' },
        ] as { key: FilterTab; label: string; icon: string }[]).map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[st.tab, activeTab === tab.key && st.tabActive]}
            onPress={() => { Haptics.selectionAsync(); setActiveTab(tab.key); }}
          >
            <Ionicons name={tab.icon as any} size={14} color={activeTab === tab.key ? colors.background : colors.textMuted} />
            <Text style={[st.tabText, activeTab === tab.key && st.tabTextActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Subtabs: Disponibili / Archivio */}
      <View style={st.subTabRow}>
        {([
          { key: 'disponibili', label: 'Schedine giocate', icon: 'time' },
          { key: 'archivio', label: 'Archivio', icon: 'archive' },
        ] as { key: SubTab; label: string; icon: string }[]).map(sub => (
          <TouchableOpacity
            key={sub.key}
            style={[st.subTab, activeSubTab === sub.key && st.subTabActive]}
            onPress={() => { Haptics.selectionAsync(); setActiveSubTab(sub.key); }}
          >
            <Ionicons name={sub.icon as any} size={13} color={activeSubTab === sub.key ? colors.primary : colors.textMuted} />
            <Text style={[st.subTabText, activeSubTab === sub.key && st.subTabTextActive]}>{sub.label}</Text>
            {sub.key === 'disponibili' && (
              <View style={st.subTabCount}>
                <Text style={st.subTabCountText}>{followedIds.size}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={st.scrollContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}>
        {filteredSchedine.length === 0 && (
          <View style={st.emptyState}>
            <Ionicons name="search" size={40} color={colors.textMuted} />
            <Text style={st.emptyText}>Nessuna schedina in questa categoria</Text>
          </View>
        )}

        {filteredSchedine.map((sch, idx) => {
          const visible = canSeeCard(idx);
          const isFollowed = followedIds.has(sch.schedina_id);
          const isFollowLoading = followingId === sch.schedina_id;

          return (
            <View key={sch.schedina_id} style={[st.schedina, isFollowed && st.schedinaFollowed]}>
              <View style={st.schHeader}>
                <View style={st.statusContainer}>
                  {sch.status === 'won' && <View style={[st.statusBadge, st.statusWon]}><Ionicons name="checkmark-circle" size={12} color={colors.background} /><Text style={st.statusText}>VINTA</Text></View>}
                  {sch.status === 'lost' && <View style={[st.statusBadge, st.statusLost]}><Ionicons name="close-circle" size={12} color={colors.background} /><Text style={st.statusText}>PERSA</Text></View>}
                  {sch.status === 'pending' && <View style={[st.statusBadge, st.statusPending]}><Ionicons name="time" size={12} color={colors.background} /><Text style={st.statusText}>IN CORSO</Text></View>}
                  <View style={st.confBadge}>
                    <Ionicons name="analytics" size={11} color={colors.primary} />
                    <Text style={st.confText}>{sch.confidence}%</Text>
                  </View>
                </View>
                <View style={st.oddsBox}><Text style={st.totalOdds}>@{sch.total_odds.toFixed(2)}</Text></View>
              </View>

              {visible ? (
                <View style={st.matchesList}>
                  {sch.matches.map((m, i) => (
                    <View key={i} style={[st.matchRow, i === sch.matches.length - 1 && { borderBottomWidth: 0 }]}>
                      <View style={st.matchInfo}>
                        <Text style={st.matchLeague}>{m.league}</Text>
                        <Text style={st.matchTeams}>{m.home} - {m.away}</Text>
                      </View>
                      <View style={st.matchBet}>
                        <Text style={st.betType}>{m.bet_type}</Text>
                        <Text style={st.betOdds}>@{m.odds}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <TouchableOpacity style={st.lockedOverlay} onPress={() => router.push(userTier === 'guest' ? '/login' : '/subscribe')} activeOpacity={0.8}>
                  <View style={st.blurLines}>
                    <View style={[st.blurLine, { width: '80%' }]} />
                    <View style={[st.blurLine, { width: '55%' }]} />
                    <View style={[st.blurLine, { width: '70%' }]} />
                  </View>
                  <LinearGradient colors={['transparent', 'rgba(0,255,136,0.08)']} style={st.lockedGradient}>
                    <Ionicons name="lock-open" size={18} color={colors.primary} />
                    <Text style={st.lockedText}>{userTier === 'guest' ? 'Registrati gratis per sbloccare' : 'Abbonati per sbloccare'}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}

              {/* Footer with stake & win */}
              <View style={st.schFooter}>
                <View>
                  <Text style={st.footerLabel}>Puntata consigliata</Text>
                  <Text style={st.footerValue}>€{sch.stake}</Text>
                </View>
                <View style={st.footerRight}>
                  <Text style={st.footerLabel}>{sch.status === 'won' ? 'Vincita' : 'Vincita potenziale'}</Text>
                  <Text style={[st.footerValue, sch.status === 'won' && st.footerWin]}>
                    {sch.status === 'won' ? `+€${sch.actual_win.toFixed(0)}` : `€${sch.potential_win.toFixed(0)}`}
                  </Text>
                </View>
              </View>

              {/* Follow Button */}
              {visible && (
                <TouchableOpacity
                  style={[st.followBtn, isFollowed && st.followBtnActive]}
                  onPress={() => handleFollow(sch.schedina_id)}
                  activeOpacity={0.7}
                  disabled={isFollowLoading}
                >
                  {isFollowLoading ? (
                    <ActivityIndicator size="small" color={isFollowed ? colors.background : colors.primary} />
                  ) : (
                    <>
                      <Ionicons name={isFollowed ? 'checkmark-circle' : 'bookmark-outline'} size={16} color={isFollowed ? colors.background : colors.primary} />
                      <Text style={[st.followText, isFollowed && st.followTextActive]}>
                        {isFollowed ? 'Stai seguendo' : 'Segui questa schedina'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

              {/* Viewers */}
              {sch.viewers && (
                <View style={st.viewersBar}><Ionicons name="eye" size={11} color={colors.textMuted} /><Text style={st.viewersText}>{sch.viewers} persone stanno guardando</Text></View>
              )}
            </View>
          );
        })}

        <View style={{ height: 32 }} />
      </ScrollView>

      <BadgeUnlockPopup
        visible={!!badgePopup}
        badge={badgePopup}
        onClose={() => setBadgePopup(null)}
      />
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: colors.textMuted, fontSize: 13 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 22, fontWeight: '800', color: colors.textPrimary },
  headerCounter: { backgroundColor: 'rgba(0,255,136,0.12)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12 },
  headerCounterText: { color: colors.primary, fontSize: 12, fontWeight: '700' },
  headerBadge: { backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12 },
  headerBadgeText: { color: colors.background, fontSize: 11, fontWeight: '700' },
  monthlyStats: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 20, padding: 12, backgroundColor: 'rgba(255,215,0,0.06)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,215,0,0.12)', marginBottom: 8 },
  monthlyText: { color: colors.textSecondary, fontSize: 12, flex: 1 },
  monthlyHighlight: { color: colors.gold, fontWeight: '700' },
  // Tab Row
  tabRow: { flexDirection: 'row', marginHorizontal: 20, marginBottom: 8, gap: 8 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  tabTextActive: { color: colors.background, fontWeight: '700' },
  // Sub Tab Row
  subTabRow: { flexDirection: 'row', marginHorizontal: 20, marginBottom: 10, gap: 6 },
  subTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 8, borderRadius: 10, backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border },
  subTabActive: { borderColor: colors.primary, backgroundColor: 'rgba(0,255,136,0.06)' },
  subTabText: { color: colors.textMuted, fontSize: 11, fontWeight: '600' },
  subTabTextActive: { color: colors.primary, fontWeight: '700' },
  subTabCount: { backgroundColor: colors.primary, minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  subTabCountText: { color: colors.background, fontSize: 9, fontWeight: '800' },
  emptyState: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  emptyText: { color: colors.textMuted, fontSize: 14 },
  scrollContent: { padding: 20, paddingTop: 4 },
  schedina: { backgroundColor: colors.card, borderRadius: 20, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: colors.border },
  schedinaFollowed: { borderColor: 'rgba(0,255,136,0.25)' },
  schHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  statusContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusWon: { backgroundColor: colors.primary },
  statusLost: { backgroundColor: colors.loss },
  statusPending: { backgroundColor: '#FFB800' },
  statusText: { color: colors.background, fontSize: 10, fontWeight: '700' },
  confBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  confText: { color: colors.primary, fontSize: 12, fontWeight: '700' },
  oddsBox: { backgroundColor: 'rgba(0,255,136,0.08)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(0,255,136,0.2)' },
  totalOdds: { fontSize: 16, fontWeight: '800', color: colors.primary },
  matchesList: { marginBottom: 14 },
  matchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  matchInfo: { flex: 1 },
  matchLeague: { color: colors.textMuted, fontSize: 10, marginBottom: 2 },
  matchTeams: { color: colors.textPrimary, fontSize: 13, fontWeight: '600' },
  matchBet: { alignItems: 'flex-end' },
  betType: { color: colors.textPrimary, fontSize: 13, fontWeight: '700' },
  betOdds: { color: colors.primary, fontSize: 12 },
  lockedOverlay: { position: 'relative', marginBottom: 14, borderRadius: 14, overflow: 'hidden' },
  blurLines: { backgroundColor: colors.background, padding: 16, gap: 8, opacity: 0.15 },
  blurLine: { height: 12, backgroundColor: colors.textMuted, borderRadius: 4 },
  lockedGradient: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', gap: 6 },
  lockedText: { color: colors.primary, fontSize: 13, fontWeight: '700' },
  schFooter: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  footerRight: { alignItems: 'flex-end' },
  footerLabel: { color: colors.textMuted, fontSize: 10, marginBottom: 2 },
  footerValue: { color: colors.textPrimary, fontSize: 17, fontWeight: '700' },
  footerWin: { color: colors.primary },
  // Follow button
  followBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12, paddingVertical: 12, borderRadius: 14, backgroundColor: 'rgba(0,255,136,0.08)', borderWidth: 1, borderColor: 'rgba(0,255,136,0.2)' },
  followBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  followText: { color: colors.primary, fontSize: 13, fontWeight: '700' },
  followTextActive: { color: colors.background },
  viewersBar: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border },
  viewersText: { color: colors.textMuted, fontSize: 10 },
});
