import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, Modal, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import MatchCard from '../../src/components/MatchCard';
import SportFilter from '../../src/components/SportFilter';
import BetSlip from '../../src/components/BetSlip';
import { matchesAPI, predictionsAPI } from '../../src/utils/api';
import { Match, Prediction } from '../../src/types';
import { useAuth } from '../../src/context/AuthContext';

export default function MatchesScreen() {
  const { isAuthenticated, refreshUser } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [predictions, setPredictions] = useState<Record<string, Prediction>>({});
  const [selectedSport, setSelectedSport] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [showBetSlip, setShowBetSlip] = useState(false);
  const [error, setError] = useState('');

  const fetchData = async () => {
    setError('');
    try {
      const [matchData, predData] = await Promise.all([
        selectedSport === 'all' 
          ? matchesAPI.getAll() 
          : matchesAPI.getBySport(selectedSport),
        selectedSport === 'all'
          ? predictionsAPI.getAll()
          : predictionsAPI.getBySport(selectedSport),
      ]);

      setMatches(matchData || []);
      
      const predMap: Record<string, Prediction> = {};
      (predData || []).forEach((p: Prediction) => {
        predMap[p.match_id] = p;
      });
      setPredictions(predMap);
    } catch (err: any) {
      console.error('Errore caricamento dati:', err);
      setError('Errore nel caricamento. Tira giù per aggiornare.');
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

  const handleMatchPress = (match: Match) => {
    setSelectedMatch(match);
    setShowBetSlip(true);
  };

  const handleBetPlaced = () => {
    if (isAuthenticated) {
      refreshUser();
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Partite</Text>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
          <Ionicons name="refresh" size={22} color="#6366F1" />
        </TouchableOpacity>
      </View>

      <SportFilter selected={selectedSport} onSelect={setSelectedSport} />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>Caricamento partite...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
            <Text style={styles.retryText}>Riprova</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#6366F1"
              colors={['#6366F1']}
            />
          }
        >
          {matches.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-outline" size={48} color="#6B7280" />
              <Text style={styles.emptyText}>Nessuna partita trovata</Text>
              <Text style={styles.emptySubtext}>Tira giù per aggiornare</Text>
            </View>
          ) : (
            matches.map((match) => (
              <MatchCard
                key={match.match_id}
                match={match}
                prediction={predictions[match.match_id]}
                onPress={() => handleMatchPress(match)}
              />
            ))
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
          <TouchableOpacity 
            style={styles.modalBackdrop} 
            onPress={() => setShowBetSlip(false)}
            activeOpacity={1}
          />
          {selectedMatch && (
            <BetSlip
              match={selectedMatch}
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
  refreshButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 4,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 20,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    color: '#9CA3AF',
    fontSize: 16,
    fontWeight: '600',
  },
  emptySubtext: {
    color: '#6B7280',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
});
