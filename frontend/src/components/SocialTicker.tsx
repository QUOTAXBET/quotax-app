import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../utils/theme';

interface SocialTickerProps {
  activity: { user: string; amount: number; time: string } | null;
}

export default function SocialTicker({ activity }: SocialTickerProps) {
  if (!activity) return null;

  return (
    <View style={s.socialTicker}>
      <Ionicons name="flash" size={13} color={colors.primary} />
      <Text style={s.socialTickerText} numberOfLines={1}>
        {activity.user} ha vinto +€{activity.amount?.toFixed(0)} — {activity.time}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  socialTicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(0,255,136,0.06)',
    borderRadius: 10,
    marginTop: 8,
  },
  socialTickerText: { color: colors.textSecondary, fontSize: 11, flex: 1 },
});
