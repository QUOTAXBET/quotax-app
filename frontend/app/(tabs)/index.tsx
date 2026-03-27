import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, Modal, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { matchesAPI, socialAPI } from '../../src/utils/api';
import SportFilter from '../../src/components/SportFilter';
import MatchCard from '../../src/components/MatchCard';
import BetSlip from '../../src/components/BetSlip';
import { Match, Prediction, Schedina } from '../../src/types';

const colors = {
  background: '#0B0F14',
  card: '#1A2332',
  primary: '#00FF88',
  gold: '#FFD700',
  loss: '#FF4D4D',
  textPrimary: '#FFFFFF',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',
  border: '#2A3847',
};

export default function PartiteScreen() {
  const router = useRouter();
  const { user, isAuthenticated, isPremium, refreshUser } = useAuth();
  const [matches, setMatches] = useState<any[]>([]);
  const [predictions, setPredictions] = useState<Record<string, any>>({});
  const [selectedSport, setSelectedSport] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<any>(null);
  const [showBetSlip, setShowBetSlip] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [social, setSocial] = useState<any>(null);

  const fetchData = async () => {
    try {
      const [matchData, predData, socialData, statsData] = await Promise.all([
        selectedSport === 'all' 
          ? matchesAPI.getAll() 
          : matchesAPI.getBySport(selectedSport),
        selectedSport === 'all'
          ? matchesAPI.getPredictions()
          : matchesAPI.getPredictionsBySport(selectedSport),
        socialAPI.getActivity(),
        matchesAPI.getStats(),
      ]);

      setMatches(matchData || []);
      setSocial(socialData);
      setStats(statsData);
      
      const predMap: Record<string, any> = {};
      (predData || []).forEach((p: any) => {
        predMap[p.match_id] = p;
      });
      setPredictions(predMap);
    } catch (e) {
      console.error('Error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [selectedSport]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [selectedSport]);

  const handleMatchPress = (match: any) => {
    setSelectedMatch(match);
    setShowBetSlip(true);
  };

  const handleBetPlaced = () => {
    if (isAuthenticated) refreshUser();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header con Stats */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logo}>
            <Ionicons name="trending-up" size={24} color={colors.primary} />
            <Text style={styles.logoText}>EdgeBet</Text>
          </View>
        </View>
        {!isAuthenticated ? (
          <TouchableOpacity style={styles.loginBtn} onPress={() => router.push('/login')}>
            <Text style={styles.loginBtnText}>Accedi</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => router.push('/(tabs)/profile')}>
            <View style={styles.avatarSmall}>
              <Text style={styles.avatarSmallText}>{user?.name?.charAt(0)}</Text>
            </View>
          </TouchableOpacity>
        )}
      </View>

      {/* Stats Banner */}
      {stats && (
        <View style={styles.statsBanner}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>+{stats.roi_7d}%</Text>
            <Text style={styles.statLabel}>ROI 7gg</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.win_rate}%</Text>
            <Text style={styles.statLabel}>Win Rate</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.streak}</Text>
            <Text style={styles.statLabel}>Serie</Text>
          </View>
          {social && (
            <>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <View style={styles.liveIndicator}>
                  <View style={styles.liveDot} />
                  <Text style={styles.statValue}>{social.viewing_now}</Text>
                </View>
                <Text style={styles.statLabel}>Online</Text>
              </View>
            </>
          )}
        </View>
      )}

      {/* Social Proof Ticker */}
      {social && social.activities && social.activities.length > 0 && (
        <View style={styles.socialTicker}>
          <Ionicons name="flash" size={14} color={colors.primary} />
          <Text style={styles.socialTickerText}>
            {social.activities[0].type === 'win' 
              ? `${social.activities[0].user} ha vinto +\u20AC${social.activities[0].amount?.toFixed(0)} - ${social.activities[0].time}`
              : `${social.activities[0].user} si \u00e8 abbonato al piano ${social.activities[0].plan} - ${social.activities[0].time}`
            }
          </Text>
        </View>
      )}

      {/* Sport Filter */}
      <SportFilter selected={selectedSport} onSelect={setSelectedSport} />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Caricamento partite...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
        >
          {matches.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyText}>Nessuna partita trovata</Text>
            </View>
          ) : (
            matches.map((match, index) => {
              // Tier-based paywall: guests see 70% locked, free users 40% locked, premium sees all
              const shouldLock = isPremium ? false : 
                !isAuthenticated ? (index % 10 >= 3) : // guests: 7 of 10 locked
                (index % 5 >= 3); // free: 2 of 5 locked
              
              return (
                <MatchCard
                  key={match.match_id}
                  match={match}
                  prediction={predictions[match.match_id]}
                  onPress={() => handleMatchPress(match)}
                  isLocked={shouldLock}
                  onUnlock={() => router.push('/subscribe')}
                />
              );
            })
          )}

          {/* Upgrade CTA for free users */}
          {(!isAuthenticated || user?.subscription_tier === 'free') && (
            <TouchableOpacity style={styles.upgradeBanner} onPress={() => router.push('/subscribe')}>
              <Ionicons name="diamond" size={20} color={colors.gold} />
              <Text style={styles.upgradeText}>Sblocca tutti i pronostici premium</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.gold} />
            </TouchableOpacity>
          )}
        </ScrollView>
      )}

      <Modal
        visible={showBetSlip}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowBetSlip(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} onPress={() => setShowBetSlip(false)} activeOpacity={1} />
          {selectedMatch && (
            <BetSlip
              match={selectedMatch}
              prediction={predictions[selectedMatch.match_id]}
              onClose={() => setShowBetSlip(false)}
              onBetPlaced={handleBetPlaced}
              isLoggedIn={isAuthenticated}
            />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  logo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoText: { fontSize: 22, fontWeight: '800', color: colors.textPrimary },
  loginBtn: { backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16 },
  loginBtnText: { color: colors.background, fontWeight: '700', fontSize: 13 },
  avatarSmall: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarSmallText: { color: colors.background, fontSize: 14, fontWeight: '700' },
  statsBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', backgroundColor: colors.card, marginHorizontal: 16, borderRadius: 16, paddingVertical: 14, marginBottom: 8 },
  statItem: { alignItems: 'center' },
  statValue: { color: colors.primary, fontSize: 18, fontWeight: '800' },
  statLabel: { color: colors.textMuted, fontSize: 10, marginTop: 2 },
  statDivider: { width: 1, height: 30, backgroundColor: colors.border },
  liveIndicator: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  socialTicker: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: 'rgba(0, 255, 136, 0.08)', borderRadius: 10, marginBottom: 4 },
  socialTickerText: { color: colors.textSecondary, fontSize: 12, flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingTop: 4 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: colors.textSecondary, fontSize: 14 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { color: colors.textSecondary, fontSize: 16 },
  upgradeBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: 'rgba(255, 215, 0, 0.1)', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.gold, marginTop: 16 },
  upgradeText: { color: colors.gold, fontSize: 14, fontWeight: '600' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.6)' },
});
