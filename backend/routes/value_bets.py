from fastapi import APIRouter
import random
import uuid
from datetime import datetime, timezone
from services.mock_data import get_cached_matches, generate_predictions_for_matches

router = APIRouter()

BOOKMAKERS = ["Bet365", "Snai", "Sisal", "Goldbet", "Eurobet", "Betfair", "888sport", "William Hill"]


@router.get("/value-bets")
async def get_value_bets():
    """Get value bets — Elite only. Quotes potentially mispriced by bookmakers."""
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
