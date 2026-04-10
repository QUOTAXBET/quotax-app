import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors } from '../src/utils/theme';

const API_BASE = process.env.EXPO_PUBLIC_BACKEND_URL || '';

interface EmailTemplate {
  template_id: string;
  name: string;
  subject: string;
  preview_text: string;
  body_html: string;
  trigger: string;
  timing: string;
  category: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  onboarding: '#00FF88',
  conversion: '#FFD700',
  engagement: '#00B4D8',
  exclusive: '#9B59B6',
};

const CATEGORY_ICONS: Record<string, string> = {
  onboarding: 'person-add',
  conversion: 'trending-up',
  engagement: 'pulse',
  exclusive: 'diamond',
};

export default function EmailsScreen() {
  const router = useRouter();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sentMessage, setSentMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/emails/templates`)
      .then(res => res.json())
      .then(data => {
        setTemplates(data.templates || []);
        if (data.templates?.length > 0) setSelectedTemplate(data.templates[0]);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSendTest = async () => {
    if (!selectedTemplate) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSending(true);
    setSentMessage(null);
    try {
      const res = await fetch(`${API_BASE}/api/emails/send-test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template_id: selectedTemplate.template_id, email: 'test@edgebet.com' }),
      });
      const data = await res.json();
      setSentMessage(data.message || 'Email inviata');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => setSentMessage(null), 4000);
    } catch (e) {
      setSentMessage('Errore invio');
    } finally { setSending(false); }
  };

  if (loading) return <View style={s.loadingContainer}><ActivityIndicator size="large" color={colors.primary} /></View>;

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Ionicons name="mail" size={20} color={colors.primary} />
          <Text style={s.headerTitle}>Email Marketing</Text>
        </View>
        <View style={s.headerBadge}><Text style={s.headerBadgeText}>{templates.length} template</Text></View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>
        {/* Template Selector */}
        <View style={s.templateSelector}>
          {templates.map(t => {
            const isActive = selectedTemplate?.template_id === t.template_id;
            const catColor = CATEGORY_COLORS[t.category] || colors.primary;
            return (
              <TouchableOpacity
                key={t.template_id}
                style={[s.templateTab, isActive && { borderColor: catColor, backgroundColor: catColor + '10' }]}
                onPress={() => { Haptics.selectionAsync(); setSelectedTemplate(t); }}
                activeOpacity={0.7}
              >
                <Ionicons name={(CATEGORY_ICONS[t.category] || 'mail') as any} size={16} color={isActive ? catColor : colors.textMuted} />
                <Text style={[s.templateTabText, isActive && { color: catColor }]}>{t.name}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {selectedTemplate && (
          <>
            {/* Email Info Card */}
            <View style={s.infoCard}>
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>Oggetto:</Text>
                <Text style={s.infoValue}>{selectedTemplate.subject}</Text>
              </View>
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>Preview:</Text>
                <Text style={s.infoValue}>{selectedTemplate.preview_text}</Text>
              </View>
              <View style={s.infoDivider} />
              <View style={s.infoMetaRow}>
                <View style={s.metaItem}>
                  <Ionicons name="flash" size={12} color={colors.textMuted} />
                  <Text style={s.metaText}>{selectedTemplate.trigger}</Text>
                </View>
                <View style={s.metaItem}>
                  <Ionicons name="time" size={12} color={colors.textMuted} />
                  <Text style={s.metaText}>{selectedTemplate.timing}</Text>
                </View>
              </View>
              <View style={[s.categoryBadge, { backgroundColor: (CATEGORY_COLORS[selectedTemplate.category] || colors.primary) + '15' }]}>
                <Text style={[s.categoryText, { color: CATEGORY_COLORS[selectedTemplate.category] || colors.primary }]}>
                  {selectedTemplate.category.toUpperCase()}
                </Text>
              </View>
            </View>

            {/* Email Preview Label */}
            <View style={s.previewLabel}>
              <Ionicons name="eye" size={14} color={colors.textSecondary} />
              <Text style={s.previewLabelText}>Anteprima Email</Text>
            </View>

            {/* Email HTML Preview - Rendered as styled cards */}
            <View style={s.previewCard}>
              {/* Email header */}
              <View style={s.emailHeader}>
                <Text style={s.emailLogo}>EdgeBet</Text>
                {selectedTemplate.category === 'exclusive' && <Text style={[s.emailLogo, { color: colors.gold }]}>Elite</Text>}
                <Text style={s.emailSubheader}>
                  {selectedTemplate.template_id === 'welcome' ? "L'AI che batte i bookmaker" :
                   selectedTemplate.template_id === 'upsell' ? '' :
                   selectedTemplate.template_id === 'reminder' ? '' : ''}
                </Text>
              </View>

              {/* Email body */}
              <View style={s.emailBody}>
                <Text style={s.emailSubject}>{selectedTemplate.subject}</Text>
                <Text style={s.emailPreview}>{selectedTemplate.preview_text}</Text>

                {/* Template-specific content */}
                {selectedTemplate.template_id === 'welcome' && (
                  <View style={s.emailSection}>
                    <Text style={s.emailSectionTitle}>Cosa puoi fare ora:</Text>
                    <Text style={s.emailBullet}>  Consulta i pronostici AI su Calcio, NBA e UFC</Text>
                    <Text style={s.emailBullet}>  Segui le schedine AI con un tap</Text>
                    <Text style={s.emailBullet}>  Scopri i Top Picks con il miglior edge</Text>
                    <Text style={s.emailBullet}>  Sblocca badge e scala la classifica</Text>
                  </View>
                )}

                {selectedTemplate.template_id === 'upsell' && (
                  <>
                    <View style={s.emailPlan}>
                      <Text style={[s.emailPlanName, { color: colors.gold }]}>Piano Pro — €9,99/mese</Text>
                      <Text style={s.emailBullet}>  Tutte le schedine AI complete</Text>
                      <Text style={s.emailBullet}>  Pronostici con analisi AI</Text>
                      <Text style={s.emailBullet}>  Top Picks giornalieri</Text>
                    </View>
                    <View style={[s.emailPlan, { borderColor: 'rgba(255,215,0,0.2)' }]}>
                      <Text style={[s.emailPlanName, { color: colors.gold }]}>Piano Elite — €29,99/mese</Text>
                      <Text style={s.emailBullet}>  Tutto del Pro incluso</Text>
                      <Text style={s.emailBullet}>  Elite AI — domande illimitate</Text>
                      <Text style={s.emailBullet}>  Value bet alerts in tempo reale</Text>
                      <Text style={s.emailBullet}>  Badge esclusivi + Classifica VIP</Text>
                    </View>
                  </>
                )}

                {selectedTemplate.template_id === 'reminder' && (
                  <View style={s.emailSection}>
                    <Text style={s.emailSectionTitle}>Oggi per te:</Text>
                    <Text style={s.emailBullet}>  3 schedine singole con confidence {'>'}80%</Text>
                    <Text style={s.emailBullet}>  2 schedine multiple ad alta quota</Text>
                    <Text style={s.emailBullet}>  1 Top Pick con edge +8.3%</Text>
                  </View>
                )}

                {selectedTemplate.template_id === 'elite' && (
                  <>
                    <View style={[s.emailPlan, { borderColor: 'rgba(255,215,0,0.2)' }]}>
                      <Text style={[s.emailPlanName, { color: colors.gold }]}>Value Bet Esclusiva</Text>
                      <Text style={s.emailHighlight}>Arsenal vs Man City — Arsenal @2.61</Text>
                      <Text style={[s.emailBullet, { color: colors.primary }]}>Edge: +5.6% | Confidence: 92%</Text>
                    </View>
                    <View style={[s.emailPlan, { borderColor: 'rgba(255,215,0,0.2)' }]}>
                      <Text style={[s.emailPlanName, { color: colors.gold }]}>Schedina Elite del Giorno</Text>
                      <Text style={s.emailBullet}>  Inter ML @1.45</Text>
                      <Text style={s.emailBullet}>  Over 2.5 Bayern @1.60</Text>
                      <Text style={s.emailBullet}>  Lakers +3.5 @1.90</Text>
                      <Text style={[s.emailHighlight, { color: colors.primary, marginTop: 8 }]}>Quota totale: @4.41</Text>
                    </View>
                  </>
                )}

                {/* CTA Button */}
                <View style={[s.emailCTA, selectedTemplate.category === 'exclusive' || selectedTemplate.category === 'conversion' ? { backgroundColor: colors.gold } : { backgroundColor: colors.primary }]}>
                  <Text style={s.emailCTAText}>
                    {selectedTemplate.template_id === 'welcome' ? 'Inizia Ora' :
                     selectedTemplate.template_id === 'upsell' ? 'Sblocca Ora' :
                     selectedTemplate.template_id === 'reminder' ? 'Vedi le Schedine' : 'Apri nell\'App'}
                  </Text>
                </View>
              </View>

              {/* Email footer */}
              <View style={s.emailFooter}>
                <Text style={s.emailFooterText}>
                  {selectedTemplate.template_id === 'welcome' ? 'EdgeBet — Pronostici AI basati su dati, non su opinioni' :
                   selectedTemplate.template_id === 'upsell' ? 'EdgeBet — Non perdere il tuo vantaggio' :
                   selectedTemplate.template_id === 'reminder' ? 'Ricevi questa email ogni mattina alle 10:00' :
                   'EdgeBet Elite — Il vantaggio che nessun altro ha'}
                </Text>
              </View>
            </View>

            {/* Send Test Button */}
            <TouchableOpacity style={s.sendBtn} onPress={handleSendTest} disabled={sending} activeOpacity={0.7}>
              {sending ? (
                <ActivityIndicator size="small" color={colors.background} />
              ) : (
                <>
                  <Ionicons name="send" size={16} color={colors.background} />
                  <Text style={s.sendBtnText}>Invia Email Test (Simulazione)</Text>
                </>
              )}
            </TouchableOpacity>

            {sentMessage && (
              <View style={s.sentBanner}>
                <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                <Text style={s.sentText}>{sentMessage}</Text>
              </View>
            )}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: colors.textPrimary },
  headerBadge: { backgroundColor: colors.primary, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  headerBadgeText: { color: colors.background, fontSize: 10, fontWeight: '700' },
  scrollContent: { padding: 16 },
  // Template selector
  templateSelector: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  templateTab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  templateTabText: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  // Info card
  infoCard: { backgroundColor: colors.card, borderRadius: 18, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: colors.border },
  infoRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  infoLabel: { color: colors.textMuted, fontSize: 12, width: 60 },
  infoValue: { color: colors.textPrimary, fontSize: 13, fontWeight: '600', flex: 1 },
  infoDivider: { height: 1, backgroundColor: colors.border, marginVertical: 10 },
  infoMetaRow: { flexDirection: 'row', gap: 16, marginBottom: 8 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { color: colors.textMuted, fontSize: 11 },
  categoryBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  categoryText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  // Preview
  previewLabel: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  previewLabelText: { color: colors.textSecondary, fontSize: 13, fontWeight: '700' },
  previewCard: { backgroundColor: '#0B0F14', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, marginBottom: 16 },
  emailHeader: { backgroundColor: '#111820', padding: 28, alignItems: 'center' },
  emailLogo: { color: colors.primary, fontSize: 26, fontWeight: '900' },
  emailSubheader: { color: colors.textMuted, fontSize: 12, marginTop: 6 },
  emailBody: { padding: 24 },
  emailSubject: { color: colors.textPrimary, fontSize: 18, fontWeight: '700', marginBottom: 10 },
  emailPreview: { color: colors.textSecondary, fontSize: 13, lineHeight: 20, marginBottom: 16 },
  emailSection: { backgroundColor: '#111820', borderRadius: 12, padding: 16, marginBottom: 16 },
  emailSectionTitle: { color: colors.primary, fontWeight: '700', marginBottom: 10, fontSize: 13 },
  emailBullet: { color: colors.textPrimary, fontSize: 13, lineHeight: 24 },
  emailPlan: { backgroundColor: '#111820', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  emailPlanName: { fontWeight: '700', marginBottom: 8, fontSize: 14 },
  emailHighlight: { color: colors.textPrimary, fontSize: 14, fontWeight: '700' },
  emailCTA: { alignItems: 'center', paddingVertical: 14, borderRadius: 12, marginTop: 8 },
  emailCTAText: { color: colors.background, fontSize: 15, fontWeight: '700' },
  emailFooter: { padding: 16, borderTopWidth: 1, borderTopColor: colors.border, alignItems: 'center' },
  emailFooterText: { color: colors.textMuted, fontSize: 11 },
  // Send
  sendBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.primary, paddingVertical: 14, borderRadius: 14 },
  sendBtnText: { color: colors.background, fontSize: 14, fontWeight: '700' },
  sentBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(0,255,136,0.08)', padding: 12, borderRadius: 12, marginTop: 10 },
  sentText: { color: colors.primary, fontSize: 13, fontWeight: '600' },
});
