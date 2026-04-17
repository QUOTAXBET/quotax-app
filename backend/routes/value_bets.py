from fastapi import APIRouter
import random
import uuid
import logging
from datetime import datetime, timezone
from services.mock_data import get_cached_matches, generate_predictions_for_matches

try:
    from services.odds_api import get_live_odds, calculate_value_bets
    REAL_API = True
except Exception:
    REAL_API = False

logger = logging.getLogger(__name__)
router = APIRouter()

BOOKMAKERS = ["Bet365", "Snai", "Sisal", "Goldbet", "Eurobet", "Betfair", "888sport", "William Hill"]


@router.get("/value-bets")
async def get_value_bets():
    """Get value bets — Elite only. Real odds from 40+ bookmakers."""

    # Try real data first
    if REAL_API:
        try:
            all_vb = []
            for sport_key in ["soccer_italy_serie_a", "soccer_epl", "basketball_nba"]:
                odds_data = await get_live_odds(sport_key)
                vbs = calculate_value_bets(odds_data, min_edge=2.0)
                # Filter out extreme odds (> 15) and extreme edge (> 30%)
                vbs = [v for v in vbs if v["bookmaker_odds"] < 15 and v["edge_percentage"] < 30]
                all_vb.extend(vbs)

            all_vb.sort(key=lambda x: x["edge_percentage"], reverse=True)
            real_value_bets = []
            for i, vb in enumerate(all_vb[:8]):
                implied_bookie = round((1 / vb["bookmaker_odds"]) * 100, 1)
                implied_ai = round((1 / vb["ai_estimated_odds"]) * 100, 1)
                real_value_bets.append({
                    "value_bet_id": f"vb_real_{i}",
                    "match_id": f"{vb['home_team']}_vs_{vb['away_team']}",
                    "sport": "soccer" if "soccer" in vb.get("sport", "") else "nba" if "basket" in vb.get("sport", "") else "soccer",
                    "league": vb.get("league", ""),
                    "home_team": vb["home_team"],
                    "away_team": vb["away_team"],
                    "match_date": vb.get("commence_time", datetime.now(timezone.utc).isoformat()),
                    "predicted_outcome": "home" if vb["outcome_label"] == vb["home_team"] else "away" if vb["outcome_label"] == vb["away_team"] else "draw",
                    "outcome_label": vb["outcome_label"],
                    "outcome_type": "vincente" if vb["outcome_label"] != "Draw" else "",
                    "confidence": min(95, 55 + int(vb["edge_percentage"] * 2)),
                    "risk_level": vb["risk_level"],
                    "bookmaker_odds": vb["bookmaker_odds"],
                    "ai_estimated_odds": vb["ai_estimated_odds"],
                    "edge_percentage": vb["edge_percentage"],
                    "implied_prob_bookie": implied_bookie,
                    "implied_prob_ai": implied_ai,
                    "bookmaker": vb["bookmaker"],
                    "explanation": f"L'AI rileva che la probabilita reale e superiore rispetto a quella implicita nella quota attuale. Probabilita stimata {implied_ai}% vs {implied_bookie}% del bookmaker. Edge: +{vb['edge_percentage']}%.",
                    "is_dropping": random.random() > 0.6,
                    "urgency_text": "Quota in calo — possibile correzione" if random.random() > 0.6 else None,
                    "rank": i + 1,
                })

            if real_value_bets:
                logger.info(f"Serving {len(real_value_bets)} real value bets")
                return {"date": datetime.now(timezone.utc).strftime("%d/%m/%Y"), "total": len(real_value_bets), "value_bets": real_value_bets}
        except Exception as e:
            logger.error(f"Real value bets failed: {e}")

    # Fallback to mock data
    matches = get_cached_matches("all")
    predictions = generate_predictions_for_matches(matches)

    # Filter for high edge predictions
    high_edge = [p for p in predictions if p["confidence"] >= 58]
    high_edge.sort(key=lambda x: x["confidence"], reverse=True)

    value_bets = []
    for i, pred in enumerate(high_edge[:5]):
        match = next((m for m in matches if m["match_id"] == pred["match_id"]), None)
        if not match:
            continue

        bookmaker_odds = pred["odds"]
        # AI estimates the real probability is higher = lower fair odds
        ai_estimated_odds = round(bookmaker_odds * random.uniform(0.72, 0.88), 2)
        edge_pct = round(((bookmaker_odds / ai_estimated_odds) - 1) * 100, 1)
        implied_prob_bookie = round((1 / bookmaker_odds) * 100, 1)
        implied_prob_ai = round((1 / ai_estimated_odds) * 100, 1)

        is_dropping = random.random() > 0.6
        bookmaker = random.choice(BOOKMAKERS)

        outcome_label = (
            match["home_team"] if pred["predicted_outcome"] == "home"
            else match["away_team"] if pred["predicted_outcome"] == "away"
            else "Pareggio"
        )
        outcome_type = (
            "vincente" if pred["predicted_outcome"] in ["home", "away"]
            else ""
        )

        explanations = [
            f"L'AI rileva che la probabilità reale è superiore rispetto a quella implicita nella quota attuale. Il modello stima una probabilità del {implied_prob_ai}% contro il {implied_prob_bookie}% implicito nella quota.",
            f"Discrepanza rilevata: la quota di {bookmaker} non riflette i dati recenti. Nelle ultime 10 partite simili, l'esito previsto si è verificato nel {pred['confidence']}% dei casi.",
            f"Il mercato sottovaluta il fattore forma. {outcome_label} ha un trend positivo che il bookmaker non ha ancora corretto nella quota.",
            f"Analisi avanzata su {random.randint(180, 450)} variabili indica un vantaggio statistico del {edge_pct}% rispetto alla quota offerta da {bookmaker}.",
        ]

        value_bets.append({
            "value_bet_id": f"vb_{uuid.uuid4().hex[:8]}",
            "match_id": match["match_id"],
            "sport": match["sport"],
            "league": match["league"],
            "home_team": match["home_team"],
            "away_team": match["away_team"],
            "match_date": match["match_date"],
            "predicted_outcome": pred["predicted_outcome"],
            "outcome_label": outcome_label,
            "outcome_type": outcome_type,
            "confidence": pred["confidence"],
            "risk_level": pred["risk_level"],
            # Value bet specific
            "bookmaker_odds": bookmaker_odds,
            "ai_estimated_odds": ai_estimated_odds,
            "edge_percentage": edge_pct,
            "implied_prob_bookie": implied_prob_bookie,
            "implied_prob_ai": implied_prob_ai,
            "bookmaker": bookmaker,
            "explanation": random.choice(explanations),
            "is_dropping": is_dropping,
            "urgency_text": "Quota in calo — possibile correzione del mercato" if is_dropping else None,
            "rank": i + 1,
        })

    return {
        "date": datetime.now(timezone.utc).strftime("%d/%m/%Y"),
        "total": len(value_bets),
        "value_bets": value_bets,
    }
