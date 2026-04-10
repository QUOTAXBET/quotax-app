import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../utils/theme';

interface StatsBannerProps {
  stats: { roi_7d: number; win_rate: number; streak: number } | null;
  social: { viewing_now: number } | null;
}

export default function StatsBanner({ stats, social }: StatsBannerProps) {
  if (!stats) return null;

  return (
    <View style={s.statsBanner}>
      <View style={s.statItem}>
        <Text style={s.statValue}>+{stats.roi_7d}%</Text>
        <Text style={s.statLabel}>ROI</Text>
      </View>
      <View style={s.statDivider} />
      <View style={s.statItem}>
        <Text style={s.statValue}>{stats.win_rate}%</Text>
        <Text style={s.statLabel}>Win</Text>
      </View>
      <View style={s.statDivider} />
      <View style={s.statItem}>
        <Text style={s.statValue}>{stats.streak}</Text>
        <Text style={s.statLabel}>Serie</Text>
      </View>
      {social && (
        <>
          <View style={s.statDivider} />
          <View style={s.statItem}>
            <View style={s.liveRow}>
              <View style={s.liveDot} />
              <Text style={s.statValue}>{social.viewing_now}</Text>
            </View>
            <Text style={s.statLabel}>Online</Text>
          </View>
        </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  statsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: colors.card,
    paddingVertical: 10,
    paddingHorizontal: 8,
    marginHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statItem: { alignItems: 'center' },
  statValue: { color: colors.primary, fontSize: 15, fontWeight: '800' },
  statLabel: { color: colors.textMuted, fontSize: 9, marginTop: 2 },
  statDivider: { width: 1, height: 24, backgroundColor: colors.border },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary },
});
