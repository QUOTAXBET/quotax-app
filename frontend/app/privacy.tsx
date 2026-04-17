import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../src/utils/theme';

export default function PrivacyPolicyScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Privacy Policy</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Text style={s.lastUpdate}>Ultimo aggiornamento: Aprile 2025</Text>

        <Text style={s.sectionTitle}>1. Introduzione</Text>
        <Text style={s.text}>
          QuotaX ("noi", "nostro", "la nostra app") si impegna a proteggere la privacy dei propri utenti. Questa Privacy Policy descrive come raccogliamo, utilizziamo e proteggiamo le informazioni personali quando utilizzi la nostra applicazione mobile.
        </Text>
        <Text style={s.text}>
          QuotaX e un servizio di pronostici sportivi basato su intelligenza artificiale. NON gestiamo denaro reale, NON siamo un bookmaker e NON facilitiamo scommesse di alcun tipo.
        </Text>

        <Text style={s.sectionTitle}>2. Dati raccolti</Text>
        <Text style={s.text}>Raccogliamo i seguenti dati:</Text>
        <Text style={s.bullet}>- Indirizzo email (per la registrazione)</Text>
        <Text style={s.bullet}>- Nome e immagine profilo (se accedi con Google)</Text>
        <Text style={s.bullet}>- Dati di utilizzo dell'app (sezioni visitate, funzioni usate)</Text>
        <Text style={s.bullet}>- Preferenze utente (piano abbonamento, badge, schedine seguite)</Text>
        <Text style={s.text}>NON raccogliamo:</Text>
        <Text style={s.bullet}>- Dati finanziari o bancari</Text>
        <Text style={s.bullet}>- Dati di geolocalizzazione precisa</Text>
        <Text style={s.bullet}>- Contatti della rubrica</Text>

        <Text style={s.sectionTitle}>3. Utilizzo dei dati</Text>
        <Text style={s.text}>I dati raccolti vengono utilizzati per:</Text>
        <Text style={s.bullet}>- Fornire e migliorare il servizio di pronostici AI</Text>
        <Text style={s.bullet}>- Gestire il tuo account e le preferenze</Text>
        <Text style={s.bullet}>- Inviare notifiche relative all'app (se autorizzate)</Text>
        <Text style={s.bullet}>- Generare statistiche aggregate anonime</Text>

        <Text style={s.sectionTitle}>4. Condivisione dei dati</Text>
        <Text style={s.text}>
          NON vendiamo, affittiamo o condividiamo i tuoi dati personali con terze parti a scopo commerciale. I dati possono essere condivisi solo con:
        </Text>
        <Text style={s.bullet}>- Provider di autenticazione (Google OAuth)</Text>
        <Text style={s.bullet}>- Provider di servizi AI (per generare pronostici)</Text>
        <Text style={s.bullet}>- Autorita competenti (solo se richiesto per legge)</Text>

        <Text style={s.sectionTitle}>5. Sicurezza</Text>
        <Text style={s.text}>
          Adottiamo misure di sicurezza tecniche e organizzative per proteggere i tuoi dati, inclusa la crittografia dei dati in transito e a riposo, l'autenticazione sicura e il monitoraggio degli accessi.
        </Text>

        <Text style={s.sectionTitle}>6. Conservazione</Text>
        <Text style={s.text}>
          I tuoi dati vengono conservati per la durata del tuo account. Puoi richiedere la cancellazione del tuo account e di tutti i dati associati in qualsiasi momento contattandoci.
        </Text>

        <Text style={s.sectionTitle}>7. Diritti dell'utente</Text>
        <Text style={s.text}>Hai diritto a:</Text>
        <Text style={s.bullet}>- Accedere ai tuoi dati personali</Text>
        <Text style={s.bullet}>- Richiedere la rettifica di dati inesatti</Text>
        <Text style={s.bullet}>- Richiedere la cancellazione dei tuoi dati</Text>
        <Text style={s.bullet}>- Revocare il consenso al trattamento</Text>
        <Text style={s.bullet}>- Esportare i tuoi dati in formato leggibile</Text>

        <Text style={s.sectionTitle}>8. Minori</Text>
        <Text style={s.text}>
          QuotaX non e destinata a minori di 18 anni. Non raccogliamo consapevolmente dati di minori. Se scopriamo di aver raccolto dati di un minore, li cancelleremo immediatamente.
        </Text>

        <Text style={s.sectionTitle}>9. Modifiche</Text>
        <Text style={s.text}>
          Ci riserviamo il diritto di aggiornare questa Privacy Policy. Le modifiche saranno comunicate tramite l'app. L'uso continuato dell'app dopo le modifiche costituisce accettazione della nuova policy.
        </Text>

        <Text style={s.sectionTitle}>10. Contatti</Text>
        <Text style={s.text}>
          Per domande sulla privacy, scrivi a: support@quotax.bet
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
});
