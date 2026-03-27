import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../src/context/AuthContext';
import { colors } from '../src/utils/theme';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

export default function LoginScreen() {
  const router = useRouter();
  const { login, isAuthenticated, loading } = useAuth();
  const [authLoading, setAuthLoading] = useState(false);
  const [error, setError] = useState('');

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

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
        <Ionicons name="close" size={28} color={colors.textSecondary} />
      </TouchableOpacity>

      <View style={styles.content}>
        <View style={styles.logoSection}>
          <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.logoIcon}>
            <Ionicons name="trending-up" size={40} color={colors.background} />
          </LinearGradient>
          <Text style={styles.title}>EdgeBet</Text>
          <Text style={styles.subtitle}>Accedi per vedere tutte le performance e iniziare a guadagnare</Text>
        </View>

        <View style={styles.features}>
          <View style={styles.feature}>
            <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
            <Text style={styles.featureText}>ROI verificabile in tempo reale</Text>
          </View>
          <View style={styles.feature}>
            <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
            <Text style={styles.featureText}>Storico completo delle schedine</Text>
          </View>
          <View style={styles.feature}>
            <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
            <Text style={styles.featureText}>Portafoglio virtuale per tracking</Text>
          </View>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

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

        <TouchableOpacity style={styles.skipButton} onPress={() => router.replace('/(tabs)')}>
          <Text style={styles.skipText}>Continua come ospite</Text>
        </TouchableOpacity>

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
  logoSection: { alignItems: 'center', marginBottom: 40 },
  logoIcon: { width: 80, height: 80, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { fontSize: 32, fontWeight: '800', color: colors.textPrimary, marginBottom: 8 },
  subtitle: { fontSize: 16, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  features: { marginBottom: 32, gap: 12 },
  feature: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, padding: 14, borderRadius: 12 },
  featureText: { color: colors.textPrimary, fontSize: 14 },
  error: { color: colors.loss, textAlign: 'center', marginBottom: 16 },
  googleButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: '#4285F4', padding: 16, borderRadius: 14, marginBottom: 16 },
  googleText: { color: colors.textPrimary, fontSize: 16, fontWeight: '600' },
  skipButton: { alignItems: 'center', padding: 16 },
  skipText: { color: colors.textSecondary, fontSize: 14 },
  disclaimer: { color: colors.textMuted, fontSize: 11, textAlign: 'center', marginTop: 24, lineHeight: 16 },
});
