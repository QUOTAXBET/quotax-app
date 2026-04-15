import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform, Animated, Easing } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../src/context/AuthContext';
import { colors } from '../src/utils/theme';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

const BULLETS = [
  'Algoritmo AI avanzato — 40+ fattori per ogni pronostico',
  'ROI verificabile in tempo reale, non promesse',
  'Storico completo delle schedine: trasparenza totale',
];

export default function LoginScreen() {
  const router = useRouter();
  const { login, isAuthenticated, loading } = useAuth();
  const [authLoading, setAuthLoading] = useState(false);
  const [error, setError] = useState('');

  // Animations
  const glowAnim = useRef(new Animated.Value(0.3)).current;
  const shimmerX = useRef(new Animated.Value(-1)).current;
  const bulletAnims = useRef(BULLETS.map(() => new Animated.Value(0))).current;
  const bulletTransY = useRef(BULLETS.map(() => new Animated.Value(20))).current;

  useEffect(() => {
    // Green glow pulse on logo
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 0.9, duration: 1500, useNativeDriver: false }),
        Animated.timing(glowAnim, { toValue: 0.3, duration: 1500, useNativeDriver: false }),
      ])
    ).start();

    // Shimmer on Google button every 3s
    const runShimmer = () => {
      shimmerX.setValue(-1);
      Animated.timing(shimmerX, {
        toValue: 2,
        duration: 800,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }).start();
    };
    runShimmer();
    const shimmerInterval = setInterval(runShimmer, 3000);

    // Sequential bullet fade-in
    BULLETS.forEach((_, i) => {
      Animated.parallel([
        Animated.timing(bulletAnims[i], { toValue: 1, duration: 400, delay: i * 200, useNativeDriver: true }),
        Animated.timing(bulletTransY[i], { toValue: 0, duration: 400, delay: i * 200, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start();
    });

    return () => clearInterval(shimmerInterval);
  }, []);

  useEffect(() => {
    const handleUrl = async (event: { url: string }) => {
      const url = event.url;
      if (url.includes('session_id=')) {
        const sessionId = url.split('session_id=')[1]?.split('&')[0]?.split('#')[0];
        if (sessionId) await handleLogin(sessionId);
      }
    };

    Linking.getInitialURL().then((url) => { if (url) handleUrl({ url }); });
    const sub = Linking.addEventListener('url', handleUrl);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (isAuthenticated && !loading) router.replace('/(tabs)');
  }, [isAuthenticated, loading]);

  const handleLogin = async (sessionId: string) => {
    setAuthLoading(true);
    setError('');
    try {
      await login(sessionId);
      router.replace('/(tabs)');
    } catch (e: any) {
      setError('Accesso fallito. Riprova.');
    } finally {
      setAuthLoading(false);
    }
  };

  const startGoogleLogin = async () => {
    setAuthLoading(true);
    setError('');
    try {
      let redirectUrl = Platform.OS === 'web' ? window.location.origin : Linking.createURL('');
      const authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
      
      if (Platform.OS === 'web') {
        window.location.href = authUrl;
      } else {
        const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);
        if (result.type === 'success' && result.url) {
          const sessionId = result.url.split('session_id=')[1]?.split('&')[0]?.split('#')[0];
          if (sessionId) await handleLogin(sessionId);
        }
      }
    } catch (e: any) {
      setError('Impossibile aprire la pagina di login');
    } finally {
      setAuthLoading(false);
    }
  };

  const glowShadowRadius = glowAnim.interpolate({
    inputRange: [0.3, 0.9],
    outputRange: [6, 22],
  });

  const shimmerTranslate = shimmerX.interpolate({
    inputRange: [-1, 2],
    outputRange: [-200, 400],
  });

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
        <Ionicons name="close" size={28} color={colors.textSecondary} />
      </TouchableOpacity>

      <View style={styles.content}>
        {/* Logo with green glow */}
        <View style={styles.logoSection}>
          <Animated.View style={[styles.logoGlow, {
            shadowRadius: glowShadowRadius,
            shadowOpacity: glowAnim,
          }]}>
            <Ionicons name="trending-up" size={38} color={colors.primary} style={{ marginBottom: -4 }} />
            <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
              <Text style={styles.logoQuota}>Quota</Text>
              <Text style={styles.logoXGreen}>X</Text>
            </View>
          </Animated.View>
          <Text style={styles.subtitle}>
            Unisciti a 2.400+ scommettitori che usano l'AI per battere i bookmaker
          </Text>
        </View>

        {/* Animated Bullet Points */}
        <View style={styles.features}>
          {BULLETS.map((text, i) => (
            <Animated.View
              key={i}
              style={[
                styles.feature,
                { opacity: bulletAnims[i], transform: [{ translateY: bulletTransY[i] }] },
              ]}
            >
              <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
              <Text style={styles.featureText}>{text}</Text>
            </Animated.View>
          ))}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {/* Google button with shimmer */}
        <View style={styles.googleButtonWrap}>
          <TouchableOpacity style={styles.googleButton} onPress={startGoogleLogin} disabled={authLoading}>
            {authLoading ? (
              <ActivityIndicator color={colors.textPrimary} />
            ) : (
              <>
                <Ionicons name="logo-google" size={22} color={colors.textPrimary} />
                <Text style={styles.googleText}>Continua con Google</Text>
              </>
            )}
          </TouchableOpacity>
          {/* Shimmer overlay */}
          <Animated.View
            style={[styles.shimmer, { transform: [{ translateX: shimmerTranslate }], pointerEvents: 'none' }]}
          >
            <LinearGradient
              colors={['transparent', 'rgba(255,255,255,0.15)', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.shimmerGradient}
            />
          </Animated.View>
        </View>

        <TouchableOpacity style={styles.skipButton} onPress={() => router.replace('/(tabs)')}>
          <Text style={styles.skipText}>Continua come ospite</Text>
        </TouchableOpacity>

        {/* Footer: zero friction message */}
        <Text style={styles.noCardText}>Nessuna carta di credito. Accesso immediato.</Text>

        <Text style={styles.disclaimer}>
          Continuando accetti i Termini di Servizio. Questa app è solo per intrattenimento.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  closeBtn: { position: 'absolute', top: 60, right: 20, zIndex: 10, padding: 8 },
  content: { flex: 1, padding: 24, justifyContent: 'center' },
  logoSection: { alignItems: 'center', marginBottom: 36 },
  logoGlow: { shadowColor: '#00FF88', shadowOffset: { width: 0, height: 0 }, elevation: 10, marginBottom: 16 },
  logoIcon: { width: 80, height: 80, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 32, fontWeight: '800', color: colors.textPrimary, marginBottom: 10 },
  logoQuota: { fontSize: 36, fontWeight: '900', color: '#C0C0C0', letterSpacing: -1 },
  logoXGreen: { fontSize: 42, fontWeight: '900', color: colors.primary, letterSpacing: -1 },
  subtitle: { fontSize: 15, color: colors.textSecondary, textAlign: 'center', lineHeight: 22, paddingHorizontal: 8 },
  features: { marginBottom: 28, gap: 10 },
  feature: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, padding: 14, borderRadius: 12 },
  featureText: { color: colors.textPrimary, fontSize: 14, flex: 1 },
  error: { color: colors.loss, textAlign: 'center', marginBottom: 16 },
  googleButtonWrap: { position: 'relative', overflow: 'hidden', borderRadius: 14, marginBottom: 16 },
  googleButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: '#4285F4', padding: 16, borderRadius: 14 },
  googleText: { color: colors.textPrimary, fontSize: 16, fontWeight: '600' },
  shimmer: { position: 'absolute', top: 0, bottom: 0, width: 120 },
  shimmerGradient: { flex: 1 },
  skipButton: { alignItems: 'center', padding: 14 },
  skipText: { color: colors.textSecondary, fontSize: 14 },
  noCardText: { color: colors.primary, fontSize: 13, textAlign: 'center', fontWeight: '600', marginTop: 4 },
  disclaimer: { color: colors.textMuted, fontSize: 11, textAlign: 'center', marginTop: 20, lineHeight: 16 },
});
