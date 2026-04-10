import random
import uuid
from datetime import datetime, timezone, timedelta
from typing import List, Dict


# ==================== PLATFORM STATS ====================

PLATFORM_STATS = {
    "roi_7d": 23.4,
    "roi_30d": 47.8,
    "win_rate": 68.5,
    "total_bets": 342,
    "total_wins": 234,
    "streak": 5,
    "bankroll_history": [
        {"date": "2025-07-01", "value": 10000},
        {"date": "2025-07-02", "value": 10450},
        {"date": "2025-07-03", "value": 10280},
        {"date": "2025-07-04", "value": 10890},
        {"date": "2025-07-05", "value": 11340},
        {"date": "2025-07-06", "value": 11120},
        {"date": "2025-07-07", "value": 12340},
    ],
    "last_win": {"amount": 187.50, "time": "2 min fa"},
    "active_users": random.randint(124, 256),
}

# ==================== TEAMS & FIGHTERS ====================

SOCCER_LEAGUES = {
    "Serie A": ["Inter", "Milan", "Juventus", "Napoli", "Roma", "Lazio", "Atalanta", "Fiorentina"],
    "Premier League": ["Man City", "Arsenal", "Liverpool", "Man United", "Chelsea", "Tottenham", "Newcastle"],
    "La Liga": ["Real Madrid", "Barcelona", "Atletico Madrid", "Sevilla", "Real Sociedad", "Villarreal"],
    "Bundesliga": ["Bayern Monaco", "Borussia Dortmund", "RB Leipzig", "Leverkusen"],
    "Champions League": ["Real Madrid", "Man City", "Bayern Monaco", "PSG", "Inter", "Barcelona"],
}

NBA_TEAMS = ["Lakers", "Celtics", "Warriors", "Heat", "Bucks", "Nuggets", "76ers", "Suns", "Mavericks", "Nets"]

UFC_FIGHTERS = {
    "Heavyweight": ["Jon Jones", "Tom Aspinall", "Ciryl Gane"],
    "Middleweight": ["Dricus Du Plessis", "Israel Adesanya", "Sean Strickland"],
    "Lightweight": ["Islam Makhachev", "Charles Oliveira", "Dustin Poirier"],
}

# ==================== SUBSCRIPTION PLANS ====================

SUBSCRIPTION_PLANS = [
    {
        "id": "pro",
        "name": "Pro",
        "price": 9.99,
        "period": "mese",
        "features": [
            "Pronostici completi con analisi AI",
            "Affidabilità % su ogni previsione",
            "Schedine AI illimitate",
            "2 Top Picks completi al giorno",
            "Simulatore scommesse",
            "ROI tracking + Grafico rendimento",
        ],
        "highlighted": True,
        "badge": "Più Popolare",
        "trial": {"text": "Prova 3 giorni a solo €1", "price": 1.00, "days": 3},
    },
    {
        "id": "premium",
        "name": "Elite",
        "price": 29.99,
        "first_month_price": 19.99,
        "period": "mese",
        "features": [
            "Tutto del Pro incluso",
            "TUTTI i Top Picks completi",
            "Value bets esclusive",
            "Notifiche push in tempo reale",
            "Elite AI — domande illimitate",
            "Report settimanale personalizzato",
        ],
        "highlighted": False,
        "badge": "Massimo Valore",
    },
]

# ==================== GENERATORS ====================

def generate_schedine(count: int = 10, include_premium: bool = True) -> List[Dict]:
    """Generate realistic betting slips"""
    schedine = []
    statuses = ["won", "won", "won", "won", "lost", "pending", "pending"]

    for i in range(count):
        is_premium = i > 3 and include_premium
        num_matches = random.randint(2, 5)
        matches = []
        total_odds = 1.0

        for _ in range(num_matches):
            sport = random.choice(["soccer", "nba", "ufc"])
            if sport == "soccer":
                league = random.choice(list(SOCCER_LEAGUES.keys()))
                teams = SOCCER_LEAGUES[league]
                home, away = random.sample(teams, 2)
                bet_type = random.choice(["1", "X", "2", "1X", "X2", "GOL", "OVER 2.5"])
            elif sport == "nba":
                league = "NBA"
                home, away = random.sample(NBA_TEAMS, 2)
                bet_type = random.choice(["1", "2", "OVER", "UNDER"])
            else:
                division = random.choice(list(UFC_FIGHTERS.keys()))
                league = f"UFC {division}"
                fighters = UFC_FIGHTERS[division]
                home, away = random.sample(fighters, 2)
                bet_type = random.choice(["1", "2"])

            odds = round(random.uniform(1.25, 2.80), 2)
            total_odds *= odds
            matches.append({
                "sport": sport, "league": league, "home": home, "away": away,
                "bet_type": bet_type, "odds": odds,
                "match_time": (datetime.now(timezone.utc) + timedelta(hours=random.randint(-48, 72))).isoformat()
            })

        status = random.choice(statuses)
        stake = random.choice([10, 20, 25, 50, 100])
        potential_win = round(stake * total_odds, 2)
        schedine.append({
            "schedina_id": f"sch_{uuid.uuid4().hex[:8]}",
            "matches": matches,
            "total_odds": round(total_odds, 2),
            "stake": stake,
            "potential_win": potential_win,
            "actual_win": potential_win if status == "won" else 0,
            "status": status,
            "is_premium": is_premium,
            "confidence": random.randint(65, 95),
            "ai_analysis": f"Value bet identificato. Probabilità stimata {random.randint(55, 75)}%. Quote sottovalutate del {random.randint(5, 20)}%.",
            "created_at": (datetime.now(timezone.utc) - timedelta(hours=random.randint(1, 168))).isoformat(),
            "viewers": random.randint(8, 45),
        })
    return schedine


def generate_live_matches() -> List[Dict]:
    """Generate live matches"""
    matches = []
    for _ in range(random.randint(3, 6)):
        sport = random.choice(["soccer", "nba"])
        if sport == "soccer":
            league = random.choice(list(SOCCER_LEAGUES.keys()))
            teams = SOCCER_LEAGUES[league]
            home, away = random.sample(teams, 2)
            score = f"{random.randint(0,3)}-{random.randint(0,3)}"
            minute = random.randint(1, 90)
        else:
            league = "NBA"
            home, away = random.sample(NBA_TEAMS, 2)
            score = f"{random.randint(80,120)}-{random.randint(80,120)}"
            minute = f"Q{random.randint(1,4)}"
        odds_trend = random.choice(["up", "down", "stable"])
        matches.append({
            "match_id": f"live_{uuid.uuid4().hex[:8]}",
            "sport": sport, "league": league, "home": home, "away": away,
            "score": score, "minute": minute,
            "odds_home": round(random.uniform(1.5, 4.0), 2),
            "odds_draw": round(random.uniform(2.5, 4.5), 2) if sport == "soccer" else None,
            "odds_away": round(random.uniform(1.5, 4.0), 2),
            "odds_trend": odds_trend, "is_hot": random.random() > 0.6,
            "alert": "Quota in calo!" if odds_trend == "down" else None,
        })
    return matches


def generate_ai_predictions() -> List[Dict]:
    """Generate AI predictions (premium only)"""
    predictions = []
    for _ in range(8):
        sport = random.choice(["soccer", "nba", "ufc"])
        if sport == "soccer":
            league = random.choice(list(SOCCER_LEAGUES.keys()))
            teams = SOCCER_LEAGUES[league]
            home, away = random.sample(teams, 2)
        elif sport == "nba":
            league = "NBA"
            home, away = random.sample(NBA_TEAMS, 2)
        else:
            division = random.choice(list(UFC_FIGHTERS.keys()))
            league = f"UFC {division}"
            home, away = random.sample(UFC_FIGHTERS[division], 2)
        predicted_outcome = random.choice(["home", "away"] if sport != "soccer" else ["home", "draw", "away"])
        confidence = random.randint(60, 92)
        predictions.append({
            "prediction_id": f"ai_{uuid.uuid4().hex[:8]}",
            "sport": sport, "league": league, "home": home, "away": away,
            "predicted_outcome": predicted_outcome, "confidence": confidence,
            "probability": round(random.uniform(0.55, 0.78), 2),
            "value_rating": round(random.uniform(1.05, 1.35), 2),
            "is_value_bet": random.random() > 0.4,
            "analysis": f"Analisi AI: {home if predicted_outcome == 'home' else away} favorito. Edge stimato: +{random.randint(5, 18)}%",
            "odds": round(random.uniform(1.4, 3.2), 2),
            "match_time": (datetime.now(timezone.utc) + timedelta(hours=random.randint(1, 48))).isoformat(),
        })
    return predictions


def generate_matches(sport_filter: str = "all") -> List[Dict]:
    """Generate realistic upcoming matches"""
    matches = []
    if sport_filter in ["all", "soccer"]:
        for league_name, teams in SOCCER_LEAGUES.items():
            for _ in range(random.randint(1, 3)):
                home, away = random.sample(teams, 2)
                match_date = datetime.now(timezone.utc) + timedelta(hours=random.randint(2, 96))
                matches.append({
                    "match_id": f"m_{uuid.uuid4().hex[:8]}", "sport": "soccer", "league": league_name,
                    "home_team": home, "away_team": away, "match_date": match_date.isoformat(),
                    "odds_home": round(random.uniform(1.3, 3.5), 2), "odds_draw": round(random.uniform(2.8, 4.5), 2),
                    "odds_away": round(random.uniform(1.5, 4.0), 2), "status": "upcoming",
                })
    if sport_filter in ["all", "nba"]:
        for _ in range(random.randint(2, 5)):
            home, away = random.sample(NBA_TEAMS, 2)
            match_date = datetime.now(timezone.utc) + timedelta(hours=random.randint(2, 72))
            matches.append({
                "match_id": f"m_{uuid.uuid4().hex[:8]}", "sport": "nba", "league": "NBA",
                "home_team": home, "away_team": away, "match_date": match_date.isoformat(),
                "odds_home": round(random.uniform(1.4, 2.8), 2), "odds_draw": None,
                "odds_away": round(random.uniform(1.4, 2.8), 2), "status": "upcoming",
            })
    if sport_filter in ["all", "ufc"]:
        for division, fighters in UFC_FIGHTERS.items():
            if len(fighters) >= 2:
                home, away = random.sample(fighters, 2)
                match_date = datetime.now(timezone.utc) + timedelta(hours=random.randint(12, 168))
                matches.append({
                    "match_id": f"m_{uuid.uuid4().hex[:8]}", "sport": "ufc", "league": f"UFC {division}",
                    "home_team": home, "away_team": away, "match_date": match_date.isoformat(),
                    "odds_home": round(random.uniform(1.3, 3.0), 2), "odds_draw": None,
                    "odds_away": round(random.uniform(1.3, 3.0), 2), "status": "upcoming",
                })
    random.shuffle(matches)
    return matches[:15]


def generate_predictions_for_matches(matches: List[Dict]) -> List[Dict]:
    """Generate AI predictions for matches"""
    motivations = {
        "soccer": [
            "L'AI rileva superiorità difensiva nelle ultime 5 partite e vantaggio nelle statistiche testa a testa.",
            "Forma recente dominante: 4 vittorie consecutive e miglior attacco del campionato nelle ultime giornate.",
            "Pattern storico favorevole: in trasferte simili, questa squadra vince il 72% delle volte dal 2022.",
            "Analisi xG (Expected Goals): media di 2.1 xG per partita vs 0.9 subiti. Edge statistico chiaro.",
            "Il modello rileva stanchezza avversaria (3 partite in 8 giorni) e assenze chiave in difesa.",
        ],
        "nba": [
            "Rendimento casalingo eccezionale: 8-2 nelle ultime 10 in casa. Vantaggio canestri + rimbalzi offensivi.",
            "L'AI rileva un mismatch tattico favorevole: roster profondo vs rotazioni corte dell'avversario.",
            "Back-to-back per l'avversario con trasferta lunga. Calo medio del 12% nel 4° quarto rilevato dal modello.",
            "Trend ATS (Against The Spread) favorevole: copertura nel 75% delle ultime 12 partite.",
            "Star player in forma: ultimi 5 match sopra media stagionale di 8 punti. Impact rating al massimo.",
        ],
        "ufc": [
            "Analisi striking: vantaggio del 23% nella precisione dei colpi significativi nelle ultime 3 fight.",
            "Il modello rileva superiorità nel grappling e nel takedown defense (94% nelle ultime 5 fight).",
            "Stile favorevole nel matchup: striker vs grappler con deficit nel takedown. Modello prevede KO/TKO.",
            "Analisi cardio: fighter con miglior resistenza al 3° round. L'avversario cala del 35% dopo il 2° round.",
            "Record in questa weight class: 7-1 con finish rate del 75%. Vantaggio di reach significativo.",
        ],
    }
    predictions = []
    for match in matches:
        predicted_outcome = random.choice(["home", "away"] if match["sport"] != "soccer" else ["home", "draw", "away"])
        confidence = random.randint(55, 92)
        if predicted_outcome == "home":
            odds = match["odds_home"]
        elif predicted_outcome == "away":
            odds = match["odds_away"]
        else:
            odds = match.get("odds_draw", 3.0) or 3.0
        risk = "low" if confidence > 75 else "medium" if confidence > 60 else "high"
        sport_motivations = motivations.get(match["sport"], motivations["soccer"])
        predictions.append({
            "prediction_id": f"pred_{uuid.uuid4().hex[:8]}",
            "match_id": match["match_id"], "sport": match["sport"], "league": match["league"],
            "home_team": match["home_team"], "away_team": match["away_team"],
            "predicted_outcome": predicted_outcome, "confidence": confidence, "odds": odds,
            "risk_level": risk, "ai_motivation": random.choice(sport_motivations),
            "analysis": f"L'analisi AI indica {match['home_team'] if predicted_outcome == 'home' else match['away_team'] if predicted_outcome == 'away' else 'Pareggio'} come esito più probabile. Edge stimato: +{random.randint(5, 18)}%",
            "value_bet": random.random() > 0.5,
        })
    return predictions


# ==================== MATCH CACHE ====================

import time as _time

_cached_matches: Dict = {"data": None, "time": None, "key": None}

def get_cached_matches(sport_filter: str = "all") -> List[Dict]:
    """Cache matches for 60 seconds so predictions stay aligned"""
    now = _time.time()
    cache_key = sport_filter
    if (_cached_matches.get("key") == cache_key and
        _cached_matches.get("time") and
        now - _cached_matches["time"] < 60):
        return _cached_matches["data"]
    matches = generate_matches(sport_filter)
    _cached_matches["data"] = matches
    _cached_matches["time"] = now
    _cached_matches["key"] = cache_key
    return matches
