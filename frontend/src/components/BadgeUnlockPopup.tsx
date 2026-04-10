import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors } from '../utils/theme';

interface BadgePopupProps {
  visible: boolean;
  badge: { name: string; description: string; icon: string; category: string } | null;
  onClose: () => void;
}

export default function BadgeUnlockPopup({ visible, badge, onClose }: BadgePopupProps) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible && badge) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      scaleAnim.setValue(0);
      rotateAnim.setValue(0);
      glowAnim.setValue(0);
      fadeAnim.setValue(0);

      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(rotateAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 1200, useNativeDriver: false }),
          Animated.timing(glowAnim, { toValue: 0, duration: 1200, useNativeDriver: false }),
        ])
      ).start();

      const timer = setTimeout(() => onClose(), 4000);
      return () => clearTimeout(timer);
    }
  }, [visible, badge]);

  if (!visible || !badge) return null;

  const spin = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.8] });
  const isElite = badge.category === 'elite';
  const badgeColor = isElite ? colors.gold : colors.primary;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[st.overlay, { opacity: fadeAnim }]}>
        <Animated.View style={[st.card, { transform: [{ scale: scaleAnim }] }]}>
          <Animated.View style={[st.glowRing, { opacity: glowOpacity, borderColor: badgeColor }]} />

          <Animated.View style={[st.iconWrap, { backgroundColor: badgeColor + '20', borderColor: badgeColor + '40', transform: [{ rotate: spin }] }]}>
            <Ionicons name={badge.icon as any} size={36} color={badgeColor} />
          </Animated.View>

          <Text style={st.unlockLabel}>BADGE SBLOCCATO!</Text>
          <Text style={[st.badgeName, { color: badgeColor }]}>{badge.name}</Text>
          <Text style={st.badgeDesc}>{badge.description}</Text>

          <View style={st.pointsRow}>
            <Ionicons name="star" size={16} color={colors.gold} />
            <Text style={st.pointsText}>+100 punti</Text>
          </View>

          <TouchableOpacity style={[st.closeBtn, { backgroundColor: badgeColor }]} onPress={onClose} activeOpacity={0.8}>
            <Text style={st.closeBtnText}>Fantastico!</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const st = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 40 },
  card: { backgroundColor: colors.card, borderRadius: 28, padding: 32, alignItems: 'center', width: '100%', maxWidth: 320, position: 'relative', borderWidth: 1, borderColor: colors.border },
  glowRing: { position: 'absolute', top: -6, left: -6, right: -6, bottom: -6, borderRadius: 34, borderWidth: 3, borderColor: colors.primary },
  iconWrap: { width: 80, height: 80, borderRadius: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 2, marginBottom: 16 },
  unlockLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '800', letterSpacing: 2, marginBottom: 6 },
  badgeName: { fontSize: 22, fontWeight: '900', marginBottom: 6 },
  badgeDesc: { color: colors.textSecondary, fontSize: 13, textAlign: 'center', lineHeight: 19, marginBottom: 16 },
  pointsRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20 },
  pointsText: { color: colors.gold, fontSize: 14, fontWeight: '700' },
  closeBtn: { paddingHorizontal: 32, paddingVertical: 14, borderRadius: 16 },
  closeBtnText: { color: colors.background, fontSize: 16, fontWeight: '800' },
});
