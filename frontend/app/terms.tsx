import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../src/utils/theme';

export default function TermsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Termini e Condizioni</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Text style={s.lastUpdate}>Ultimo aggiornamento: Aprile 2025</Text>

        <Text style={s.sectionTitle}>1. Accettazione dei Termini</Text>
        <Text style={s.text}>
          Utilizzando l'applicazione QuotaX, accetti integralmente i presenti Termini e Condizioni. Se non accetti questi termini, non utilizzare l'applicazione.
        </Text>

        <Text style={s.sectionTitle}>2. Descrizione del Servizio</Text>
        <Text style={s.text}>
          QuotaX e un'applicazione di pronostici sportivi basata su intelligenza artificiale. Il servizio fornisce analisi, statistiche e previsioni su eventi sportivi a scopo esclusivamente informativo e di intrattenimento.
        </Text>
        <View style={s.warningBox}>
          <Ionicons name="warning" size={18} color="#FFB800" />
          <Text style={s.warningText}>
            QuotaX NON e un bookmaker, NON gestisce denaro reale, NON facilita scommesse e NON garantisce risultati. I pronostici sono generati da algoritmi AI e hanno valore puramente indicativo.
          </Text>
        </View>

        <Text style={s.sectionTitle}>3. Requisiti di Eta</Text>
        <Text style={s.text}>
          Per utilizzare QuotaX devi avere almeno 18 anni. Registrandoti dichiari di avere l'eta legale nel tuo paese di residenza.
        </Text>

        <Text style={s.sectionTitle}>4. Account Utente</Text>
        <Text style={s.text}>
          Sei responsabile della sicurezza del tuo account e di tutte le attivita che avvengono tramite esso. Devi fornire informazioni accurate durante la registrazione. Ci riserviamo il diritto di sospendere o eliminare account che violano questi termini.
        </Text>

        <Text style={s.sectionTitle}>5. Piani e Abbonamenti</Text>
        <Text style={s.text}>
          QuotaX offre piani gratuiti e a pagamento (Pro, Elite). I prezzi e le funzionalita sono indicati nell'app. Gli abbonamenti si rinnovano automaticamente salvo disdetta. Puoi annullare in qualsiasi momento dalle impostazioni del tuo store (App Store / Google Play).
        </Text>

        <Text style={s.sectionTitle}>6. Limitazione di Responsabilita</Text>
        <Text style={s.text}>
          QuotaX fornisce pronostici basati su dati e algoritmi AI. NON garantiamo in alcun modo l'accuratezza, la completezza o l'affidabilita dei pronostici. L'utente utilizza le informazioni fornite a proprio rischio e pericolo.
        </Text>
        <Text style={s.text}>
          QuotaX non e responsabile per eventuali perdite finanziarie derivanti dall'uso delle informazioni fornite dall'app. Le decisioni di scommessa sono esclusiva responsabilita dell'utente.
        </Text>

        <Text style={s.sectionTitle}>7. Proprieta Intellettuale</Text>
        <Text style={s.text}>
          Tutti i contenuti dell'app (algoritmi, design, testi, loghi, grafiche) sono proprieta di QuotaX e protetti dalle leggi sul diritto d'autore. E vietata la riproduzione, distribuzione o modifica senza autorizzazione scritta.
        </Text>

        <Text style={s.sectionTitle}>8. Uso Corretto</Text>
        <Text style={s.text}>L'utente si impegna a NON:</Text>
        <Text style={s.bullet}>- Utilizzare l'app per scopi illegali</Text>
        <Text style={s.bullet}>- Tentare di accedere a dati di altri utenti</Text>
        <Text style={s.bullet}>- Manipolare o abusare del sistema referral</Text>
        <Text style={s.bullet}>- Rivendere o redistribuire i contenuti dell'app</Text>
        <Text style={s.bullet}>- Utilizzare bot o sistemi automatizzati</Text>

        <Text style={s.sectionTitle}>9. Gioco Responsabile</Text>
        <Text style={s.text}>
          QuotaX promuove il gioco responsabile. Se ritieni di avere un problema con il gioco d'azzardo, ti invitiamo a contattare i servizi di assistenza del tuo paese. L'app e uno strumento informativo e non deve essere utilizzata come unica base per decisioni di scommessa.
        </Text>

        <Text style={s.sectionTitle}>10. Modifiche ai Termini</Text>
        <Text style={s.text}>
          Ci riserviamo il diritto di modificare questi Termini in qualsiasi momento. Le modifiche saranno comunicate tramite l'app. L'uso continuato dopo le modifiche costituisce accettazione.
        </Text>

        <Text style={s.sectionTitle}>11. Legge Applicabile</Text>
        <Text style={s.text}>
          I presenti Termini sono regolati dalla legge italiana. Per qualsiasi controversia sara competente il Foro di riferimento.
        </Text>

        <Text style={s.sectionTitle}>12. Contatti</Text>
        <Text style={s.text}>
          Per domande sui Termini e Condizioni: legal@quotax.bet
        </Text>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: colors.textPrimary },
  scroll: { paddingHorizontal: 20 },
  lastUpdate: { color: colors.textMuted, fontSize: 12, marginBottom: 20 },
  sectionTitle: { color: colors.primary, fontSize: 16, fontWeight: '800', marginTop: 20, marginBottom: 8 },
  text: { color: colors.textSecondary, fontSize: 14, lineHeight: 22, marginBottom: 8 },
  bullet: { color: colors.textSecondary, fontSize: 14, lineHeight: 22, paddingLeft: 16 },
  warningBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: 'rgba(255,184,0,0.08)', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: 'rgba(255,184,0,0.15)', marginVertical: 8 },
  warningText: { color: '#FFB800', fontSize: 13, lineHeight: 20, flex: 1, fontWeight: '600' },
});
