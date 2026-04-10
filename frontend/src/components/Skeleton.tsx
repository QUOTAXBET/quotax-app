import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { colors } from '../utils/theme';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

function SkeletonLine({ width = '100%', height = 14, borderRadius = 8, style }: SkeletonProps) {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 1000, useNativeDriver: false }),
        Animated.timing(shimmer, { toValue: 0, duration: 1000, useNativeDriver: false }),
      ])
    ).start();
  }, []);

  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.7] });

  return (
    <Animated.View style={[{ width: width as any, height, borderRadius, backgroundColor: colors.border, opacity }, style]} />
  );
}

export function SkeletonMatchCard() {
  return (
    <View style={sk.card}>
      <View style={sk.row}>
        <SkeletonLine width={70} height={22} borderRadius={10} />
        <SkeletonLine width={80} height={16} />
      </View>
      <View style={sk.teamsRow}>
        <View style={sk.teamCol}>
          <SkeletonLine width={40} height={40} borderRadius={12} />
          <SkeletonLine width={80} height={12} />
        </View>
        <SkeletonLine width={30} height={20} />
        <View style={sk.teamCol}>
          <SkeletonLine width={40} height={40} borderRadius={12} />
          <SkeletonLine width={80} height={12} />
        </View>
      </View>
      <View style={sk.oddsRow}>
        <SkeletonLine width={'30%' as any} height={44} borderRadius={12} />
        <SkeletonLine width={'30%' as any} height={44} borderRadius={12} />
        <SkeletonLine width={'30%' as any} height={44} borderRadius={12} />
      </View>
      <View style={sk.predBox}>
        <SkeletonLine width={'60%' as any} height={14} />
        <SkeletonLine width={'90%' as any} height={12} style={{ marginTop: 8 }} />
        <SkeletonLine width={'100%' as any} height={6} borderRadius={3} style={{ marginTop: 10 }} />
        <SkeletonLine width={'75%' as any} height={12} style={{ marginTop: 8 }} />
      </View>
    </View>
  );
}

export function SkeletonSchedinaCard() {
  return (
    <View style={sk.card}>
      <View style={sk.row}>
        <SkeletonLine width={60} height={22} borderRadius={10} />
        <SkeletonLine width={70} height={28} borderRadius={10} />
      </View>
      <SkeletonLine width={'100%' as any} height={40} style={{ marginTop: 12 }} />
      <SkeletonLine width={'100%' as any} height={40} style={{ marginTop: 6 }} />
      <SkeletonLine width={'100%' as any} height={40} style={{ marginTop: 6 }} />
      <View style={[sk.row, { marginTop: 14 }]}>
        <SkeletonLine width={'45%' as any} height={16} />
        <SkeletonLine width={'45%' as any} height={16} />
      </View>
    </View>
  );
}

export function SkeletonTopPickCard() {
  return (
    <View style={sk.card}>
      <View style={sk.row}>
        <SkeletonLine width={70} height={22} borderRadius={10} />
        <SkeletonLine width={30} height={30} borderRadius={15} />
      </View>
      <SkeletonLine width={'50%' as any} height={12} style={{ marginTop: 10 }} />
      <SkeletonLine width={'85%' as any} height={18} style={{ marginTop: 6 }} />
      <SkeletonLine width={'100%' as any} height={56} borderRadius={16} style={{ marginTop: 14 }} />
      <SkeletonLine width={'100%' as any} height={80} borderRadius={16} style={{ marginTop: 12 }} />
    </View>
  );
}

export function SkeletonNotificationCard() {
  return (
    <View style={sk.notifCard}>
      <SkeletonLine width={44} height={44} borderRadius={14} />
      <View style={{ flex: 1, gap: 6 }}>
        <SkeletonLine width={'70%' as any} height={14} />
        <SkeletonLine width={'100%' as any} height={12} />
      </View>
    </View>
  );
}

const sk = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: 20, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: colors.border },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  teamsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 16, paddingHorizontal: 10 },
  teamCol: { alignItems: 'center', gap: 8 },
  oddsRow: { flexDirection: 'row', justifyContent: 'space-around', gap: 8, marginBottom: 14 },
  predBox: { backgroundColor: colors.background, borderRadius: 14, padding: 14 },
  notifCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderRadius: 16, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: colors.border },
});

export default SkeletonLine;
