import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../src/context/AuthContext';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

export default function LoginScreen() {
  const router = useRouter();
  const { user, loading, login, isAuthenticated } = useAuth();
  const [authLoading, setAuthLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const handleUrl = async (event: { url: string }) => {
      const url = event.url;
      if (url.includes('session_id=')) {
        const sessionId = url.split('session_id=')[1]?.split('&')[0]?.split('#')[0];
        if (sessionId) {
          await handleLogin(sessionId);
        }
      }
    };

    Linking.getInitialURL().then((url) => {
      if (url) handleUrl({ url });
    });

    const subscription = Linking.addEventListener('url', handleUrl);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (isAuthenticated && !loading) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, loading]);

  const handleLogin = async (sessionId: string) => {
    setAuthLoading(true);
    setError('');
    try {
      await login(sessionId);
      router.replace('/(tabs)');
    } catch (err: any) {
      setError('Accesso fallito. Riprova.');
    } finally {
      setAuthLoading(false);
    }
  };

  const startGoogleLogin = async () => {
    setAuthLoading(true);
    setError('');
    try {
      // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
      let redirectUrl: string;
      
      if (Platform.OS === 'web') {
        redirectUrl = window.location.origin;
      } else {
        redirectUrl = Linking.createURL('');
      }
      
      const authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
      
      if (Platform.OS === 'web') {
        window.location.href = authUrl;
      } else {
        const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);
        if (result.type === 'success' && result.url) {
          const sessionId = result.url.split('session_id=')[1]?.split('&')[0]?.split('#')[0];
          if (sessionId) {
            await handleLogin(sessionId);
          }
        }
      }
    } catch (err: any) {
      setError('Impossibile aprire la pagina di login');
    } finally {
      setAuthLoading(false);
    }
  };

  const continueAsGuest = () => {
    router.replace('/(tabs)');
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <View style={styles.logoIcon}>
            <Ionicons name="analytics" size={48} color="#6366F1" />
          </View>
          <Text style={styles.title}>PronoSmart AI</Text>
          <Text style={styles.subtitle}>Pronostici Sportivi Intelligenti</Text>
        </View>

        <View style={styles.features}>
          <View style={styles.featureItem}>
            <Ionicons name="football" size={24} color="#10B981" />
            <Text style={styles.featureText}>Calcio, NBA e UFC</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="flash" size={24} color="#F59E0B" />
            <Text style={styles.featureText}>Pronostici con IA</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="trending-up" size={24} color="#6366F1" />
            <Text style={styles.featureText}>Simulazione Scommesse</Text>
          </View>
        </View>

        <View style={styles.authSection}>
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity
            style={styles.googleButton}
            onPress={startGoogleLogin}
            disabled={authLoading}
          >
            {authLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="logo-google" size={20} color="#fff" />
                <Text style={styles.googleButtonText}>Accedi con Google</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.guestButton} onPress={continueAsGuest}>
            <Text style={styles.guestButtonText}>Continua come Ospite</Text>
          </TouchableOpacity>

          <Text style={styles.disclaimer}>
            Continuando, accetti i nostri Termini di Servizio.
            Questa app è solo a scopo di intrattenimento.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  logoIcon: {
    width: 100,
    height: 100,
    borderRadius: 24,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 8,
  },
  subtitle: {
    color: '#9CA3AF',
    fontSize: 16,
  },
  features: {
    gap: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#1F2937',
    padding: 16,
    borderRadius: 12,
  },
  featureText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  authSection: {
    gap: 16,
  },
  error: {
    color: '#EF4444',
    textAlign: 'center',
    fontSize: 14,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#4285F4',
    padding: 16,
    borderRadius: 12,
  },
  googleButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  guestButton: {
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  guestButtonText: {
    color: '#9CA3AF',
    fontSize: 16,
    fontWeight: '500',
  },
  disclaimer: {
    color: '#6B7280',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});
