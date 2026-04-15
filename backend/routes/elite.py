from fastapi import APIRouter, HTTPException, Request
import os
import uuid
import logging
from datetime import datetime, timezone, timedelta

try:
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    LLM_AVAILABLE = True
except ImportError:
    LLM_AVAILABLE = False

from services.database import db
from services.auth_helpers import get_current_user
from models.schemas import EliteAskRequest

logger = logging.getLogger(__name__)
router = APIRouter()

PRO_WEEKLY_LIMIT = 3  # Pro users get 3 requests per week

ELITE_SYSTEM_PROMPT = """Sei QuotaX AI, un esperto analista sportivo basato su dati e statistica avanzata.
Rispondi SEMPRE in italiano. Quando l'utente chiede una previsione su un evento sportivo:

1. Analizza le squadre/atleti menzionati
2. Fornisci una previsione chiara con percentuale di probabilità
3. Indica il livello di rischio (Basso/Medio/Alto)
4. Suggerisci la quota di valore e il tipo di scommessa
5. Spiega brevemente il ragionamento basato su dati

Formatta la risposta in modo strutturato con sezioni:
🏆 PREVISIONE: [outcome]
📊 PROBABILITÀ: [X%]
⚠️ RISCHIO: [Basso/Medio/Alto]
💰 QUOTA CONSIGLIATA: [@X.XX]
🧠 ANALISI: [breve spiegazione]

Se l'utente non chiede di un evento specifico, rispondi con consigli generali sulle strategie di betting.
Ricorda: questo è un sistema di SIMULAZIONE a scopo dimostrativo, non incoraggiare il gioco d'azzardo reale."""


async def _get_weekly_usage(user_id: str) -> int:
    """Count how many AI requests a user made this week"""
    week_start = datetime.now(timezone.utc) - timedelta(days=7)
    count = await db.elite_chats.count_documents({
        "user_id": user_id,
        "created_at": {"$gte": week_start}
    })
    return count


@router.get("/elite/access/{user_id}")
async def check_elite_access(user_id: str):
    """Check if user can use Elite AI and how many requests remain"""
    user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not user_doc:
        return {"allowed": False, "reason": "user_not_found", "tier": "guest"}

    tier = user_doc.get("subscription_tier", "free")

    if tier == "premium":
        return {"allowed": True, "tier": "premium", "remaining": -1, "limit": -1, "label": "Illimitato"}

    if tier == "pro":
        used = await _get_weekly_usage(user_id)
        remaining = max(0, PRO_WEEKLY_LIMIT - used)
        return {
            "allowed": remaining > 0,
            "tier": "pro",
            "used": used,
            "remaining": remaining,
            "limit": PRO_WEEKLY_LIMIT,
            "label": f"{remaining}/{PRO_WEEKLY_LIMIT} richieste questa settimana",
        }

    # Free and Guest: no access
    return {"allowed": False, "tier": tier, "remaining": 0, "limit": 0, "label": "Non disponibile"}


@router.post("/elite/ask")
async def elite_ask(req: EliteAskRequest, request: Request):
    """Elite feature: AI-powered custom match prediction with tier gating"""
    # Check auth
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Accesso richiesto")

    tier = user.subscription_tier

    # Guest/Free: blocked
    if tier in [None, "free"]:
        raise HTTPException(status_code=403, detail="Funzione disponibile solo per Pro ed Elite")

    # Pro: check weekly limit
    if tier == "pro":
        used = await _get_weekly_usage(user.user_id)
        if used >= PRO_WEEKLY_LIMIT:
            raise HTTPException(
                status_code=429,
                detail=f"Hai raggiunto il limite di {PRO_WEEKLY_LIMIT} richieste settimanali. Passa a Elite per accesso illimitato."
            )

    # Elite: unlimited — proceed
    try:
        if not LLM_AVAILABLE:
            # Fallback when emergentintegrations is not available
            response = f"Analisi QuotaX AI per: {req.query}\n\nBasandoci sui dati disponibili e le statistiche recenti, ecco la nostra analisi. Nota: il servizio AI completo sara' disponibile a breve con integrazione diretta."
        else:
            llm_key = os.environ.get('EMERGENT_LLM_KEY')
            if not llm_key:
                raise HTTPException(status_code=500, detail="LLM key not configured")

            chat = LlmChat(
                api_key=llm_key,
                session_id=f"elite_{uuid.uuid4().hex[:8]}",
                system_message=ELITE_SYSTEM_PROMPT
            )
            chat.with_model("openai", "gpt-4.1-mini")

            user_msg = UserMessage(text=req.query)
            response = await chat.send_message(user_msg)

        # Save to history (counts toward weekly limit)
        chat_entry = {
            "chat_id": str(uuid.uuid4()),
            "user_id": user.user_id,
            "query": req.query,
            "response": response,
            "model": "QuotaX AI v2.0",
            "created_at": datetime.now(timezone.utc),
        }
        await db.elite_chats.insert_one(chat_entry)

        # Remaining for Pro
        remaining = None
        if tier == "pro":
            used = await _get_weekly_usage(user.user_id)
            remaining = max(0, PRO_WEEKLY_LIMIT - used)

        return {
            "query": req.query,
            "response": response,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "model": "QuotaX AI v2.0",
            "remaining": remaining,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Elite AI error: {e}")
        return {
            "query": req.query,
            "response": f"🏆 PREVISIONE: Basandomi sull'analisi dei dati disponibili per '{req.query}', il nostro modello AI suggerisce di attendere ulteriori dati prima di effettuare una previsione definitiva.\n\n📊 PROBABILITÀ: In fase di calcolo\n⚠️ RISCHIO: Medio\n💰 QUOTA CONSIGLIATA: Verificare le quote aggiornate\n🧠 ANALISI: Il sistema sta elaborando i dati. Riprova tra qualche secondo.",
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "model": "QuotaX AI v2.0 (fallback)"
        }


@router.post("/elite/save")
async def save_elite_chat(request: Request):
    body = await request.json()
    chat_entry = {
        "chat_id": str(uuid.uuid4()),
        "user_id": body.get("user_id", "anonymous"),
        "query": body.get("query", ""),
        "response": body.get("response", ""),
        "model": body.get("model", ""),
        "created_at": datetime.now(timezone.utc),
    }
    await db.elite_chats.insert_one(chat_entry)
    return {"success": True, "chat_id": chat_entry["chat_id"]}


@router.get("/elite/history/{user_id}")
async def get_elite_history(user_id: str, limit: int = 20):
    cursor = db.elite_chats.find({"user_id": user_id}, {"_id": 0}).sort("created_at", -1).limit(limit)
    chats = await cursor.to_list(length=limit)
    return {"history": chats, "count": len(chats)}
