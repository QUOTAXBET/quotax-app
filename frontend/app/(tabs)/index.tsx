import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../src/context/AuthContext';
import { dashboardAPI, publicAPI, socialAPI } from '../../src/utils/api';
import { colors } from '../../src/utils/theme';

export default function DashboardScreen() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [social, setSocial] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      if (isAuthenticated) {
        const [statsData, socialData] = await Promise.all([
          dashboardAPI.getStats(),
          socialAPI.getActivity(),
        ]);
        setStats(statsData);
        setSocial(socialData);
      } else {
        const [statsData, socialData] = await Promise.all([
          publicAPI.getStats(),
          socialAPI.getActivity(),
        ]);
        setStats(statsData);
        setSocial(socialData);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, [isAuthenticated]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [isAuthenticated]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Ciao{user ? `, ${user.name.split(' ')[0]}` : ''} 👋</Text>
            <Text style={styles.subtitle}>Ecco le tue performance</Text>
          </View>
          {!isAuthenticated && (
            <TouchableOpacity style={styles.loginBtn} onPress={() => router.push('/login')}>
              <Text style={styles.loginBtnText}>Accedi</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Main Stats */}
        <View style={styles.mainStats}>
          <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.roiCard}>
            <Text style={styles.roiLabel}>ROI 7 Giorni</Text>
            <Text style={styles.roiValue}>+{stats?.roi_7d || 0}%</Text>
            <View style={styles.roiTrend}>
              <Ionicons name="trending-up" size={16} color={colors.background} />
              <Text style={styles.roiTrendText}>In crescita</Text>
            </View>
          </LinearGradient>

          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats?.win_rate || 0}%</Text>
              <Text style={styles.statLabel}>Win Rate</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats?.total_bets || 0}</Text>
              <Text style={styles.statLabel}>Giocate</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats?.streak || 0}</Text>
              <Text style={styles.statLabel}>Serie</Text>
            </View>
            {isAuthenticated && stats?.roi_30d ? (
              <View style={styles.statCard}>
                <Text style={[styles.statValue, { color: colors.primary }]}>+{stats.roi_30d}%</Text>
                <Text style={styles.statLabel}>ROI 30gg</Text>
              </View>
            ) : (
              <TouchableOpacity style={[styles.statCard, styles.lockedCard]} onPress={() => router.push('/subscribe')}>
                <Ionicons name="lock-closed" size={20} color={colors.gold} />
                <Text style={styles.lockedText}>Premium</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Activity Feed */}
        {social && (
          <View style={styles.activitySection}>
            <Text style={styles.sectionTitle}>Attività Recente</Text>
            {social.activities.slice(0, 3).map((act: any, idx: number) => (
              <View key={idx} style={styles.activityItem}>
                <View style={[styles.activityIcon, act.type === 'win' ? styles.activityWin : styles.activitySub]}>
                  <Ionicons name={act.type === 'win' ? 'cash' : 'star'} size={16} color={colors.background} />
                </View>
                <View style={styles.activityContent}>
                  <Text style={styles.activityText}>
                    {act.type === 'win' 
                      ? <><Text style={styles.activityUser}>{act.user}</Text> ha vinto <Text style={styles.activityAmount}>+€{act.amount}</Text></>
                      : <><Text style={styles.activityUser}>{act.user}</Text> si è abbonato a <Text style={styles.activityPlan}>{act.plan}</Text></>
                    }
                  </Text>
                  <Text style={styles.activityTime}>{act.time}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Upgrade CTA for free users */}
        {(!isAuthenticated || user?.subscription_tier === 'free') && (
          <TouchableOpacity style={styles.upgradeBanner} onPress={() => router.push('/subscribe')}>
            <LinearGradient colors={[colors.gold, colors.goldDark]} style={styles.upgradeGradient}>
              <View style={styles.upgradeContent}>
                <Ionicons name="diamond" size={24} color={colors.background} />
                <View style={styles.upgradeText}>
                  <Text style={styles.upgradeTitle}>Passa a Premium</Text>
                  <Text style={styles.upgradeSubtitle}>Sblocca tutte le schedine e AI</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={24} color={colors.background} />
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.quickAction} onPress={() => router.push('/(tabs)/schedine')}>
            <Ionicons name="receipt" size={24} color={colors.primary} />
            <Text style={styles.quickActionText}>Schedine</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickAction} onPress={() => router.push('/(tabs)/live')}>
            <Ionicons name="pulse" size={24} color={colors.loss} />
            <Text style={styles.quickActionText}>Live</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickAction} onPress={() => router.push('/(tabs)/ai')}>
            <Ionicons name="sparkles" size={24} color={colors.gold} />
            <Text style={styles.quickActionText}>AI</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
  greeting: { fontSize: 24, fontWeight: '800', color: colors.textPrimary },
  subtitle: { fontSize: 14, color: colors.textSecondary, marginTop: 2 },
  loginBtn: { backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  loginBtnText: { color: colors.background, fontWeight: '700' },
  mainStats: { paddingHorizontal: 20 },
  roiCard: { borderRadius: 20, padding: 24, marginBottom: 16 },
  roiLabel: { color: 'rgba(11, 15, 20, 0.7)', fontSize: 14, marginBottom: 4 },
  roiValue: { color: colors.background, fontSize: 48, fontWeight: '800' },
  roiTrend: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  roiTrendText: { color: colors.background, fontSize: 13 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: { flex: 1, minWidth: '45%', backgroundColor: colors.card, borderRadius: 16, padding: 16, alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: '800', color: colors.textPrimary },
  statLabel: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
  lockedCard: { backgroundColor: 'rgba(255, 215, 0, 0.1)', borderWidth: 1, borderColor: colors.gold },
  lockedText: { fontSize: 11, color: colors.gold, marginTop: 4 },
  activitySection: { padding: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: 16 },
  activityItem: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  activityIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  activityWin: { backgroundColor: colors.primary },
  activitySub: { backgroundColor: colors.gold },
  activityContent: { flex: 1 },
  activityText: { color: colors.textPrimary, fontSize: 14 },
  activityUser: { fontWeight: '600' },
  activityAmount: { color: colors.primary, fontWeight: '700' },
  activityPlan: { color: colors.gold, fontWeight: '600' },
  activityTime: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  upgradeBanner: { marginHorizontal: 20, borderRadius: 16, overflow: 'hidden', marginBottom: 20 },
  upgradeGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  upgradeContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  upgradeText: {},
  upgradeTitle: { color: colors.background, fontSize: 16, fontWeight: '700' },
  upgradeSubtitle: { color: 'rgba(11, 15, 20, 0.7)', fontSize: 12 },
  quickActions: { flexDirection: 'row', paddingHorizontal: 20, gap: 12, marginBottom: 24 },
  quickAction: { flex: 1, backgroundColor: colors.card, borderRadius: 16, padding: 16, alignItems: 'center', gap: 8 },
  quickActionText: { color: colors.textSecondary, fontSize: 12 },
});
