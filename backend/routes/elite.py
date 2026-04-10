from fastapi import APIRouter, HTTPException, Request
import os
import uuid
import logging
from datetime import datetime, timezone
from emergentintegrations.llm.chat import LlmChat, UserMessage
from services.database import db
from models.schemas import EliteAskRequest

logger = logging.getLogger(__name__)
router = APIRouter()

ELITE_SYSTEM_PROMPT = """Sei EdgeBet AI, un esperto analista sportivo basato su dati e statistica avanzata.
Rispondi SEMPRE in italiano. Quando l'utente chiede una previsione su un evento sportivo:

1. Analizza le squadre/atleti menzionati
2. Fornisci una previsione chiara con percentuale di probabilit\u00e0
3. Indica il livello di rischio (Basso/Medio/Alto)
4. Suggerisci la quota di valore e il tipo di scommessa
5. Spiega brevemente il ragionamento basato su dati

Formatta la risposta in modo strutturato con sezioni:
\ud83c\udfc6 PREVISIONE: [outcome]
\ud83d\udcca PROBABILIT\u00c0: [X%]
\u26a0\ufe0f RISCHIO: [Basso/Medio/Alto]
\ud83d\udcb0 QUOTA CONSIGLIATA: [@X.XX]
\ud83e\udde0 ANALISI: [breve spiegazione]

Se l'utente non chiede di un evento specifico, rispondi con consigli generali sulle strategie di betting.
Ricorda: questo \u00e8 un sistema di SIMULAZIONE a scopo dimostrativo, non incoraggiare il gioco d'azzardo reale."""


@router.post("/elite/ask")
async def elite_ask(req: EliteAskRequest):
    """Elite feature: AI-powered custom match prediction"""
    try:
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

        return {
            "query": req.query, "response": response,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "model": "EdgeBet AI v2.0"
        }
    except Exception as e:
        logger.error(f"Elite AI error: {e}")
        return {
            "query": req.query,
            "response": f"\ud83c\udfc6 PREVISIONE: Basandomi sull'analisi dei dati disponibili per '{req.query}', il nostro modello AI suggerisce di attendere ulteriori dati prima di effettuare una previsione definitiva.\n\n\ud83d\udcca PROBABILIT\u00c0: In fase di calcolo\n\u26a0\ufe0f RISCHIO: Medio\n\ud83d\udcb0 QUOTA CONSIGLIATA: Verificare le quote aggiornate\n\ud83e\udde0 ANALISI: Il sistema sta elaborando i dati. Riprova tra qualche secondo.",
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "model": "EdgeBet AI v2.0 (fallback)"
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
