import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../src/context/AuthContext';
import { notificationsAPI } from '../src/utils/api';
import { colors } from '../src/utils/theme';

const NOTIF_SETTINGS = [
  { key: 'value_bet', title: 'Value Bet', desc: 'Edge alto rilevato — immediato', icon: 'flame', color: '#FF6B35' },
  { key: 'confidence_drop', title: 'Fiducia Ridotta', desc: 'AI riduce fiducia — real-time', icon: 'warning', color: '#FFB800' },
  { key: 'nuova_schedina', title: 'Schedine del Giorno', desc: 'Nuove schedine — ore 10:00', icon: 'layers', color: '#00FF88' },
  { key: 'pre_evento', title: 'Pre-Evento', desc: 'Match in arrivo — 30 min prima', icon: 'time', color: '#00B4D8' },
  { key: 'quota_calo', title: 'Quota in Calo', desc: 'Perdita di valore — immediato', icon: 'trending-down', color: '#FF3B30' },
  { key: 'inattivita', title: 'Promemoria', desc: 'Nuove opportunità — dopo 24h', icon: 'eye', color: '#9B59B6' },
  { key: 'badge', title: 'Badge', desc: 'Badge sbloccato — immediato', icon: 'trophy', color: '#FFD700' },
  { key: 'upsell', title: 'Promozioni', desc: 'Offerte Premium — periodico', icon: 'lock-closed', color: '#FFD700' },
];

export default function NotificationSettingsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const userId = user?.user_id || 'guest_demo';

  useEffect(() => {
    notificationsAPI.getPreferences(userId).then(data => {
      setPrefs(data.preferences || {});
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const togglePref = async (key: string) => {
    Haptics.selectionAsync();
    const newVal = !prefs[key];
    setPrefs(prev => ({ ...prev, [key]: newVal }));
    setSaving(true);
    try {
      await notificationsAPI.updatePreferences(userId, { [key]: newVal });
    } catch {} finally { setSaving(false); }
  };

  const toggleMaster = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const newVal = !prefs.push_enabled;
    setPrefs(prev => ({ ...prev, push_enabled: newVal }));
    setSaving(true);
    try {
      await notificationsAPI.updatePreferences(userId, { push_enabled: newVal });
    } catch {} finally { setSaving(false); }
  };

  if (loading) return <View style={s.loadingContainer}><ActivityIndicator size="large" color={colors.primary} /></View>;

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Impostazioni Notifiche</Text>
        {saving && <ActivityIndicator size="small" color={colors.primary} />}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>
        {/* Master Toggle */}
        <View style={s.masterCard}>
          <View style={s.masterLeft}>
            <Ionicons name="notifications" size={24} color={prefs.push_enabled ? colors.primary : colors.textMuted} />
            <View>
              <Text style={s.masterTitle}>Notifiche Push</Text>
              <Text style={s.masterSub}>{prefs.push_enabled ? 'Attive' : 'Disattivate'}</Text>
            </View>
          </View>
          <Switch
            value={!!prefs.push_enabled}
            onValueChange={toggleMaster}
            trackColor={{ false: colors.border, true: colors.primary + '60' }}
            thumbColor={prefs.push_enabled ? colors.primary : colors.textMuted}
          />
        </View>

        {/* Quiet Hours */}
        <View style={s.quietCard}>
          <Ionicons name="moon" size={18} color={colors.textSecondary} />
          <View style={s.quietContent}>
            <Text style={s.quietTitle}>Ore di silenzio</Text>
            <Text style={s.quietValue}>{prefs.quiet_hours_start || '23:00'} — {prefs.quiet_hours_end || '07:00'}</Text>
          </View>
        </View>

        {/* Individual Toggles */}
        <Text style={s.sectionTitle}>Tipi di notifica</Text>
        {NOTIF_SETTINGS.map(setting => (
          <View key={setting.key} style={[s.settingRow, !prefs.push_enabled && s.settingDisabled]}>
            <View style={[s.settingIcon, { backgroundColor: setting.color + '15' }]}>
              <Ionicons name={setting.icon as any} size={18} color={prefs.push_enabled ? setting.color : colors.textMuted} />
            </View>
            <View style={s.settingContent}>
              <Text style={[s.settingTitle, !prefs.push_enabled && s.settingTitleDisabled]}>{setting.title}</Text>
              <Text style={s.settingDesc}>{setting.desc}</Text>
            </View>
            <Switch
              value={prefs.push_enabled ? !!prefs[setting.key] : false}
              onValueChange={() => togglePref(setting.key)}
              disabled={!prefs.push_enabled}
              trackColor={{ false: colors.border, true: setting.color + '60' }}
              thumbColor={prefs[setting.key] && prefs.push_enabled ? setting.color : colors.textMuted}
            />
          </View>
        ))}

        {/* Info */}
        <View style={s.infoCard}>
          <Ionicons name="information-circle" size={18} color={colors.textMuted} />
          <Text style={s.infoText}>Le notifiche push richiedono il permesso del dispositivo. I timing indicati sono approssimativi e dipendono dalla disponibilità dei dati.</Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: colors.textPrimary, flex: 1 },
  scrollContent: { padding: 16 },
  // Master
  masterCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.card, borderRadius: 18, padding: 18, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  masterLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  masterTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '700' },
  masterSub: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  // Quiet hours
  quietCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderRadius: 14, padding: 14, marginBottom: 20, borderWidth: 1, borderColor: colors.border },
  quietContent: { flex: 1 },
  quietTitle: { color: colors.textSecondary, fontSize: 12 },
  quietValue: { color: colors.textPrimary, fontSize: 14, fontWeight: '600', marginTop: 2 },
  sectionTitle: { color: colors.textMuted, fontSize: 11, fontWeight: '700', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 },
  // Setting row
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderRadius: 16, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: colors.border },
  settingDisabled: { opacity: 0.5 },
  settingIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  settingContent: { flex: 1 },
  settingTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: '600' },
  settingTitleDisabled: { color: colors.textMuted },
  settingDesc: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  // Info
  infoCard: { flexDirection: 'row', gap: 10, backgroundColor: colors.card, borderRadius: 14, padding: 14, marginTop: 16, borderWidth: 1, borderColor: colors.border },
  infoText: { color: colors.textMuted, fontSize: 11, flex: 1, lineHeight: 16 },
});
