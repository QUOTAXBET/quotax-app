from fastapi import APIRouter, HTTPException
import os
import uuid
import random
import logging
from datetime import datetime, timezone, timedelta
from services.database import db

logger = logging.getLogger(__name__)
router = APIRouter()

# Try to import LLM for AI suggestion
try:
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    LLM_AVAILABLE = True
except ImportError:
    LLM_AVAILABLE = False
    logger.warning("emergentintegrations not available for weekly report AI")


REPORT_SYSTEM_PROMPT = """Sei EdgeBet AI, un analista sportivo esperto. Genera un breve report settimanale (max 150 parole) in italiano per un utente di betting simulato.
Includi:
1. Un commento sulla performance della settimana
2. Un consiglio strategico per la prossima settimana
3. Un avvertimento sui rischi da evitare
Tono: professionale ma amichevole. Usa emoji dove appropriato."""


async def _generate_ai_suggestion(roi: float, win_rate: float, best_pick: dict) -> str:
    """Generate AI suggestion using LLM"""
    if not LLM_AVAILABLE:
        return _fallback_suggestion(roi, win_rate)

    llm_key = os.environ.get('EMERGENT_LLM_KEY')
    if not llm_key:
        return _fallback_suggestion(roi, win_rate)

    try:
        chat = LlmChat(
            api_key=llm_key,
            session_id=f"report_{uuid.uuid4().hex[:8]}",
            system_message=REPORT_SYSTEM_PROMPT
        )
        chat.with_model("openai", "gpt-4.1-mini")

        prompt = f"""Dati della settimana dell'utente:
- ROI settimanale: {roi:+.1f}%
- Win Rate: {win_rate:.1f}%
- Miglior pick: {best_pick.get('match', 'N/A')} @ quota {best_pick.get('odds', 'N/A')} (profitto: +€{best_pick.get('profit', 0):.0f})

Genera il report settimanale."""

        user_msg = UserMessage(text=prompt)
        response = await chat.send_message(user_msg)
        return response
    except Exception as e:
        logger.error(f"Weekly report AI error: {e}")
        return _fallback_suggestion(roi, win_rate)


def _fallback_suggestion(roi: float, win_rate: float) -> str:
    """Fallback suggestion when LLM is not available"""
    if roi > 5:
        return "Settimana eccellente! Il tuo ROI e' sopra la media. Consiglio: non alzare le puntate per euforia, mantieni la disciplina. La prossima settimana concentrati su quote tra 1.80 e 2.50 per mantenere il ritmo."
    elif roi > 0:
        return "Buona settimana con profitto positivo. Consiglio: analizza le partite dove hai perso per capire i pattern. La prossima settimana punta su match con dati statistici solidi e evita le scommesse emotive."
    else:
        return "Settimana in rosso, ma fa parte del gioco. Consiglio: rivedi la tua strategia di bankroll management. Non inseguire le perdite. La prossima settimana riduci il numero di scommesse e concentrati sulla qualita'."


@router.get("/report/weekly/{user_id}")
async def get_weekly_report(user_id: str):
    """Generate weekly report for Elite users"""
    # Check user tier
    user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=404, detail="Utente non trovato")

    tier = user_doc.get("subscription_tier", "free")
    if tier != "premium":
        raise HTTPException(status_code=403, detail="Report disponibile solo per Elite")

    # Check if we already generated a report this week
    week_start = datetime.now(timezone.utc) - timedelta(days=7)
    existing_report = await db.weekly_reports.find_one({
        "user_id": user_id,
        "created_at": {"$gte": week_start}
    }, {"_id": 0})

    if existing_report:
        return existing_report

    # Generate new weekly stats (mock)
    total_bets = random.randint(15, 40)
    wins = int(total_bets * random.uniform(0.55, 0.75))
    losses = total_bets - wins
    win_rate = round((wins / total_bets) * 100, 1)
    weekly_roi = round(random.uniform(-5.0, 12.0), 1)
    profit = round(random.uniform(-150, 500), 2)

    best_pick = {
        "match": f"{'Inter' if random.random() > 0.5 else 'Milan'} vs {'Juventus' if random.random() > 0.5 else 'Roma'}",
        "outcome": random.choice(["1", "X", "2", "Over 2.5", "Under 2.5"]),
        "odds": round(random.uniform(1.70, 3.80), 2),
        "profit": round(random.uniform(30, 250), 2),
    }

    worst_pick = {
        "match": f"{'Napoli' if random.random() > 0.5 else 'Lazio'} vs {'Atalanta' if random.random() > 0.5 else 'Fiorentina'}",
        "outcome": random.choice(["1", "X", "2"]),
        "odds": round(random.uniform(2.0, 4.5), 2),
        "loss": round(random.uniform(20, 100), 2),
    }

    # Generate AI suggestion
    ai_suggestion = await _generate_ai_suggestion(weekly_roi, win_rate, best_pick)

    report = {
        "report_id": str(uuid.uuid4()),
        "user_id": user_id,
        "period": f"{(datetime.now(timezone.utc) - timedelta(days=7)).strftime('%d/%m')} - {datetime.now(timezone.utc).strftime('%d/%m/%Y')}",
        "stats": {
            "total_bets": total_bets,
            "wins": wins,
            "losses": losses,
            "win_rate": win_rate,
            "roi": weekly_roi,
            "profit": profit,
        },
        "best_pick": best_pick,
        "worst_pick": worst_pick,
        "ai_suggestion": ai_suggestion,
        "created_at": datetime.now(timezone.utc),
    }

    # Save to DB
    await db.weekly_reports.insert_one({**report})
    report.pop("_id", None)

    return report
