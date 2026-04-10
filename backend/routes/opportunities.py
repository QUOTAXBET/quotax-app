from fastapi import APIRouter
import random
import uuid
from datetime import datetime, timezone
from services.mock_data import get_cached_matches, generate_predictions_for_matches

router = APIRouter()


@router.get("/opportunities")
async def get_daily_opportunities():
    """Get 1-3 curated high-value daily opportunities"""
    matches = get_cached_matches("all")
    predictions = generate_predictions_for_matches(matches)

    high_value = [p for p in predictions if p["confidence"] >= 60]
    high_value.sort(key=lambda x: x["confidence"], reverse=True)

    opportunities = []
    for i, pred in enumerate(high_value[:3]):
        match = next((m for m in matches if m["match_id"] == pred["match_id"]), None)
        if not match:
            continue

        edge_pct = round(random.uniform(5.5, 22.0), 1)
        explanations = [
            f"{match['home_team']} ha vinto 4 delle ultime 5 partite. Forma eccellente e quota sottovalutata dal mercato.",
            f"Analisi statistica mostra un edge del {edge_pct}% sulle quote attuali. Il modello AI rileva un pattern storico favorevole.",
            f"Confronto diretto favorevole: {match['home_team'] if pred['predicted_outcome'] == 'home' else match['away_team']} domina nelle ultime sfide contro l'avversario.",
            f"Le quote del mercato non riflettono il recente cambio di forma. Valore identificato dall'analisi AI avanzata.",
            f"Pattern statistico: in situazioni simili, l'esito previsto si verifica nel {pred['confidence']}% dei casi negli ultimi 3 anni.",
        ]

        opportunities.append({
            "opportunity_id": f"opp_{uuid.uuid4().hex[:8]}",
            "match_id": match["match_id"], "sport": match["sport"], "league": match["league"],
            "home_team": match["home_team"], "away_team": match["away_team"],
            "match_date": match["match_date"], "predicted_outcome": pred["predicted_outcome"],
            "confidence": pred["confidence"], "odds": pred["odds"],
            "edge_percentage": edge_pct, "risk_level": pred["risk_level"],
            "value_rating": "HIGH VALUE" if pred["confidence"] >= 70 else "VALUE BET",
            "explanation": random.choice(explanations),
            "ai_analysis": f"Il modello EdgeBet AI ha analizzato {random.randint(150, 500)} fattori per questa partita. Edge stimato: +{edge_pct}% rispetto alle quote di mercato. Confidenza del modello: {pred['confidence']}%.",
            "rank": i + 1,
        })

    return {
        "date": datetime.now(timezone.utc).strftime("%d/%m/%Y"),
        "total": len(opportunities), "opportunities": opportunities,
        "viewers": random.randint(80, 250),
    }
