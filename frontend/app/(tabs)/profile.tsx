import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import WalletCard from '../../src/components/WalletCard';
import { betsAPI, userAPI, dataAPI } from '../../src/utils/api';
import { Bet } from '../../src/types';
import { format } from 'date-fns';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, isAuthenticated, logout, refreshUser } = useAuth();
  const [bets, setBets] = useState<Bet[]>([]);
  const [wallet, setWallet] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [resetting, setResetting] = useState(false);

  const fetchData = async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    
    try {
      const [betsData, walletData] = await Promise.all([
        betsAPI.getHistory(),
        userAPI.getWallet(),
      ]);
      setBets(betsData);
      setWallet(walletData);
    } catch (error) {
      console.error('Error fetching profile data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [isAuthenticated]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/');
  };

  const handleResetWallet = async () => {
    Alert.alert(
      'Reset Wallet',
      'This will reset your balance to $1000 and clear all bet history. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            setResetting(true);
            try {
              await userAPI.resetWallet();
              await refreshUser();
              await fetchData();
            } catch (error) {
              console.error('Reset failed:', error);
            } finally {
              setResetting(false);
            }
          },
        },
      ]
    );
  };

  const handleRefreshData = async () => {
    try {
      await dataAPI.refresh();
      Alert.alert('Success', 'Match data has been refreshed!');
    } catch (error) {
      console.error('Refresh failed:', error);
    }
  };

  const settleBet = async (betId: string, won: boolean) => {
    try {
      await betsAPI.settle(betId, won);
      await refreshUser();
      await fetchData();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to settle bet');
    }
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
        </View>
        <View style={styles.guestContainer}>
          <Ionicons name="person-circle-outline" size={80} color="#6B7280" />
          <Text style={styles.guestTitle}>Guest Mode</Text>
          <Text style={styles.guestText}>
            Sign in to track your bets, manage your virtual wallet, and save your progress.
          </Text>
          <TouchableOpacity style={styles.loginButton} onPress={() => router.replace('/')}>
            <Ionicons name="logo-google" size={20} color="#fff" />
            <Text style={styles.loginButtonText}>Sign in with Google</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={22} color="#EF4444" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#6366F1"
          />
        }
      >
        <View style={styles.userSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </View>
          <Text style={styles.userName}>{user?.name}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#6366F1" style={{ marginTop: 40 }} />
        ) : (
          <>
            {wallet && (
              <WalletCard
                balance={wallet.balance}
                totalBets={wallet.total_bets}
                totalWins={wallet.total_wins}
                totalProfit={wallet.total_profit}
              />
            )}

            <View style={styles.actionsSection}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleResetWallet}
                disabled={resetting}
              >
                {resetting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="refresh-circle" size={20} color="#fff" />
                    <Text style={styles.actionText}>Reset Wallet</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton} onPress={handleRefreshData}>
                <Ionicons name="sync" size={20} color="#fff" />
                <Text style={styles.actionText}>Refresh Matches</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.betsSection}>
              <Text style={styles.sectionTitle}>Betting History</Text>
              
              {bets.length === 0 ? (
                <View style={styles.emptyBets}>
                  <Ionicons name="receipt-outline" size={32} color="#6B7280" />
                  <Text style={styles.emptyText}>No bets placed yet</Text>
                </View>
              ) : (
                bets.map((bet) => (
                  <View key={bet.bet_id} style={styles.betCard}>
                    <View style={styles.betHeader}>
                      <View style={styles.sportBadge}>
                        <Text style={styles.sportText}>{bet.sport.toUpperCase()}</Text>
                      </View>
                      <View style={[
                        styles.statusBadge,
                        { backgroundColor: bet.status === 'won' ? '#10B981' : bet.status === 'lost' ? '#EF4444' : '#F59E0B' }
                      ]}>
                        <Text style={styles.statusText}>{bet.status.toUpperCase()}</Text>
                      </View>
                    </View>

                    <View style={styles.betDetails}>
                      <View style={styles.betRow}>
                        <Text style={styles.betLabel}>Bet Type</Text>
                        <Text style={styles.betValue}>{bet.bet_type}</Text>
                      </View>
                      <View style={styles.betRow}>
                        <Text style={styles.betLabel}>Stake</Text>
                        <Text style={styles.betValue}>${bet.stake.toFixed(2)}</Text>
                      </View>
                      <View style={styles.betRow}>
                        <Text style={styles.betLabel}>Odds</Text>
                        <Text style={styles.betValue}>{bet.odds.toFixed(2)}</Text>
                      </View>
                      <View style={styles.betRow}>
                        <Text style={styles.betLabel}>
                          {bet.status === 'pending' ? 'Potential' : 'Actual'} Payout
                        </Text>
                        <Text style={[
                          styles.betValue,
                          { color: bet.status === 'won' ? '#10B981' : bet.status === 'lost' ? '#EF4444' : '#fff' }
                        ]}>
                          ${bet.status === 'pending' ? bet.potential_payout.toFixed(2) : bet.actual_payout.toFixed(2)}
                        </Text>
                      </View>
                    </View>

                    {bet.status === 'pending' && (
                      <View style={styles.settleButtons}>
                        <TouchableOpacity
                          style={[styles.settleButton, styles.winButton]}
                          onPress={() => settleBet(bet.bet_id, true)}
                        >
                          <Text style={styles.settleText}>Mark as Won</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.settleButton, styles.loseButton]}
                          onPress={() => settleBet(bet.bet_id, false)}
                        >
                          <Text style={styles.settleText}>Mark as Lost</Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    <Text style={styles.betDate}>
                      {format(new Date(bet.created_at), 'MMM d, yyyy HH:mm')}
                    </Text>
                  </View>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
  },
  logoutButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  userSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '700',
  },
  userName: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  userEmail: {
    color: '#6B7280',
    fontSize: 14,
  },
  actionsSection: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 24,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#374151',
    padding: 14,
    borderRadius: 12,
  },
  actionText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  betsSection: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  emptyBets: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 14,
  },
  betCard: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  betHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sportBadge: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  sportText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  betDetails: {
    gap: 8,
  },
  betRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  betLabel: {
    color: '#6B7280',
    fontSize: 13,
  },
  betValue: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  settleButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  settleButton: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  winButton: {
    backgroundColor: '#10B981',
  },
  loseButton: {
    backgroundColor: '#EF4444',
  },
  settleText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  betDate: {
    color: '#6B7280',
    fontSize: 11,
    marginTop: 12,
  },
  guestContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  guestTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
  },
  guestText: {
    color: '#9CA3AF',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#4285F4',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
