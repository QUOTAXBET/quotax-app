# Email templates for QuotaX marketing automation
# These templates are used by the auto-email system and the admin preview

EMAIL_TEMPLATES = {
    "welcome": {
        "template_id": "welcome",
        "name": "Welcome",
        "subject": "Benvenuto su QuotaX — inizia da qui",
        "preview_text": "Scopri come usare l'AI per analizzare le migliori quote ogni giorno.",
        "body_html": """
<div style="max-width:600px;margin:0 auto;background:#0B0F14;color:#E5E7EB;font-family:-apple-system,BlinkMacSystemFont,sans-serif;border-radius:16px;overflow:hidden;">
  <div style="background:linear-gradient(135deg,#0B0F14,#1A2332);padding:40px 32px;text-align:center;">
    <div style="font-size:32px;font-weight:900;color:#00FF88;">QuotaX</div>
    <div style="color:#6B7280;font-size:14px;margin-top:8px;">L'AI che batte i bookmaker</div>
  </div>
  <div style="padding:32px;">
    <h2 style="color:#FFFFFF;font-size:22px;margin:0 0 16px;">Benvenuto su QuotaX!</h2>
    <p style="color:#9CA3AF;font-size:15px;line-height:1.6;margin:0 0 20px;">Scopri come usare l'AI per analizzare le migliori quote ogni giorno.</p>
    <div style="background:#111820;border-radius:12px;padding:20px;margin:0 0 24px;">
      <div style="color:#00FF88;font-weight:700;margin-bottom:12px;">Cosa puoi fare ora:</div>
      <div style="color:#E5E7EB;font-size:14px;line-height:2;">
        Consulta i pronostici AI su Calcio, NBA e UFC<br/>
        Segui le schedine AI con un tap<br/>
        Scopri i Top Picks con il miglior edge<br/>
        Sblocca badge e scala la classifica
      </div>
    </div>
    <a href="#" style="display:inline-block;background:#00FF88;color:#0B0F14;font-weight:700;padding:14px 32px;border-radius:12px;text-decoration:none;font-size:16px;">Inizia Ora</a>
  </div>
  <div style="padding:20px 32px;border-top:1px solid #1F2933;text-align:center;">
    <div style="color:#4B5563;font-size:12px;">QuotaX — Pronostici AI basati su dati, non su opinioni</div>
  </div>
</div>""",
        "trigger": "Registrazione utente",
        "timing": "Immediato",
        "category": "onboarding",
    },
    "upsell": {
        "template_id": "upsell",
        "name": "Upsell Pro/Elite",
        "subject": "Stai perdendo le migliori opportunità",
        "preview_text": "Le analisi più complete sono disponibili solo per utenti Pro ed Elite.",
        "body_html": "<div>Upsell template</div>",
        "trigger": "Utente free dopo 3 giorni",
        "timing": "3 giorni dopo registrazione",
        "category": "conversion",
    },
    "reminder": {
        "template_id": "reminder",
        "name": "Reminder Schedine",
        "subject": "Nuove schedine disponibili oggi",
        "preview_text": "Le schedine AI di oggi sono pronte — non perderle!",
        "body_html": "<div>Reminder template</div>",
        "trigger": "Ogni mattina",
        "timing": "Ore 10:00 giornaliero",
        "category": "engagement",
    },
    "elite": {
        "template_id": "elite",
        "name": "Elite Exclusive",
        "subject": "Solo Elite vede queste opportunità",
        "preview_text": "Opportunità esclusive che solo i membri Elite possono vedere.",
        "body_html": "<div>Elite template</div>",
        "trigger": "Utenti Elite — nuove opportunità esclusive",
        "timing": "Quando disponibile",
        "category": "exclusive",
    },
}

# Badge definitions for gamification
BADGE_DEFINITIONS = [
    {"badge_id": "first_follow", "name": "Prima Schedina", "description": "Hai seguito la tua prima schedina!", "icon": "bookmark", "category": "beginner"},
    {"badge_id": "ten_follows", "name": "Collezionista", "description": "Hai seguito 10 schedine!", "icon": "layers", "category": "intermediate"},
    {"badge_id": "streak_3", "name": "Serie Vincente", "description": "3 previsioni corrette di fila!", "icon": "flame", "category": "intermediate"},
    {"badge_id": "streak_7", "name": "Inarrestabile", "description": "7 giorni consecutivi di utilizzo!", "icon": "rocket", "category": "advanced"},
    {"badge_id": "top_pick_win", "name": "Occhio d'Aquila", "description": "Un Top Pick che hai seguito ha vinto!", "icon": "eye", "category": "intermediate"},
    {"badge_id": "elite_user", "name": "Membro Elite", "description": "Hai usato la funzione Elite AI!", "icon": "diamond", "category": "elite"},
    {"badge_id": "profit_master", "name": "Re del Profitto", "description": "ROI personale sopra il 20%!", "icon": "trending-up", "category": "advanced"},
    {"badge_id": "community", "name": "Membro della Community", "description": "Ti sei registrato su QuotaX!", "icon": "people", "category": "beginner"},
]

# Notification type definitions
NOTIFICATION_TYPES = {
    "value_bet": {
        "title": "Value Bet Rilevata",
        "body": "🔥 Nuova value bet disponibile — edge alto rilevato ora",
        "icon": "flame",
        "color": "#FF6B35",
        "timing": "immediato",
        "category": "alert",
    },
    "confidence_drop": {
        "title": "Fiducia Ridotta",
        "body": "⚠️ L'AI ha ridotto la fiducia su una giocata — controlla subito",
        "icon": "warning",
        "color": "#FFB800",
        "timing": "real-time",
        "category": "alert",
    },
    "nuova_schedina": {
        "title": "Schedine del Giorno",
        "body": "🎯 Nuove schedine AI disponibili oggi",
        "icon": "layers",
        "color": "#00FF88",
        "timing": "10:00",
        "category": "daily",
    },
    "pre_evento": {
        "title": "Match in Arrivo",
        "body": "⏳ Sta per iniziare — controlla le tue giocate",
        "icon": "time",
        "color": "#00B4D8",
        "timing": "30 min prima",
        "category": "event",
    },
    "quota_calo": {
        "title": "Quota in Calo",
        "body": "📉 Quota in calo — potresti perdere valore",
        "icon": "trending-down",
        "color": "#FF3B30",
        "timing": "immediato",
        "category": "alert",
    },
    "inattivita": {
        "title": "Non Perderle",
        "body": "👀 Nuove opportunità oggi — non perderle",
        "icon": "eye",
        "color": "#9B59B6",
        "timing": "24h",
        "category": "engagement",
    },
    "badge": {
        "title": "Badge Sbloccato!",
        "body": "🏆 Hai sbloccato un nuovo badge!",
        "icon": "trophy",
        "color": "#FFD700",
        "timing": "immediato",
        "category": "gamification",
    },
    "upsell": {
        "title": "Passa a Premium",
        "body": "🔒 Stai perdendo le analisi migliori — sbloccale ora",
        "icon": "lock-closed",
        "color": "#FFD700",
        "timing": "periodico",
        "category": "marketing",
    },
}

# Subscription plans
SUBSCRIPTION_PLANS = [
    {
        "id": "pro",
        "name": "Pro",
        "price": 9.99,
        "period": "mese",
        "features": [
            "Tutte le schedine AI complete",
            "Pronostici con analisi AI",
            "Top Picks giornalieri",
            "ROI e statistiche avanzate",
            "Supporto prioritario",
        ],
        "highlighted": True,
        "badge": "Più Popolare",
    },
    {
        "id": "premium",
        "name": "Elite",
        "price": 29.99,
        "period": "mese",
        "features": [
            "Tutto del Pro incluso",
            "Elite AI — domande illimitate",
            "Notifiche live match",
            "Value bet alerts in tempo reale",
            "Accesso anticipato ai pronostici",
            "Badge esclusivi + Classifica VIP",
            "Supporto VIP diretto",
        ],
        "highlighted": False,
        "badge": "Massimo Valore",
    },
]

# Mock leaderboard data
MOCK_LEADERBOARD = [
    {"rank": 1, "name": "Marco T.", "roi": 34.2, "win_rate": 78, "streak": 8, "badge_count": 6, "tier": "elite"},
    {"rank": 2, "name": "Luca R.", "roi": 28.7, "win_rate": 72, "streak": 5, "badge_count": 5, "tier": "premium"},
    {"rank": 3, "name": "Andrea P.", "roi": 25.1, "win_rate": 70, "streak": 4, "badge_count": 5, "tier": "premium"},
    {"rank": 4, "name": "Giuseppe M.", "roi": 22.3, "win_rate": 68, "streak": 3, "badge_count": 4, "tier": "premium"},
    {"rank": 5, "name": "Stefano B.", "roi": 19.8, "win_rate": 65, "streak": 3, "badge_count": 4, "tier": "pro"},
    {"rank": 6, "name": "Francesco L.", "roi": 17.5, "win_rate": 63, "streak": 2, "badge_count": 3, "tier": "pro"},
    {"rank": 7, "name": "Alessandro V.", "roi": 15.2, "win_rate": 61, "streak": 2, "badge_count": 3, "tier": "pro"},
    {"rank": 8, "name": "Davide C.", "roi": 12.8, "win_rate": 59, "streak": 1, "badge_count": 2, "tier": "free"},
    {"rank": 9, "name": "Matteo S.", "roi": 10.4, "win_rate": 57, "streak": 1, "badge_count": 2, "tier": "free"},
    {"rank": 10, "name": "Simone D.", "roi": 8.1, "win_rate": 55, "streak": 0, "badge_count": 1, "tier": "free"},
]

# Elite AI system prompt
ELITE_SYSTEM_PROMPT = """Sei QuotaX AI, un esperto analista sportivo basato su dati e statistica avanzata.
Rispondi SEMPRE in italiano. Quando l'utente chiede una previsione su un evento sportivo:

1. Analizza le squadre/atleti menzionati
2. Fornisci una previsione chiara con percentuale di probabilità
3. Indica il livello di rischio (Basso/Medio/Alto)
4. Suggerisci la quota di valore e il tipo di scommessa
5. Spiega brevemente il ragionamento basato su dati

Formatta la risposta in modo strutturato con sezioni:
PREVISIONE: [outcome]
PROBABILITA: [X%]
RISCHIO: [Basso/Medio/Alto]
QUOTA CONSIGLIATA: [@X.XX]
ANALISI: [breve spiegazione]

Se l'utente non chiede di un evento specifico, rispondi con consigli generali sulle strategie di betting.
Ricorda: questo è un sistema di SIMULAZIONE a scopo dimostrativo, non incoraggiare il gioco d'azzardo reale."""
