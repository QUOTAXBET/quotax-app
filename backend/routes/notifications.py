from fastapi import APIRouter, Request
import uuid
from datetime import datetime, timezone, timedelta
from services.database import db

router = APIRouter()

NOTIFICATION_TYPES = {
    "value_bet": {"title": "Value Bet Rilevata", "body": "Nuova value bet disponibile - edge alto rilevato ora", "icon": "flame", "color": "#FF6B35", "timing": "immediato", "category": "alert"},
    "confidence_drop": {"title": "Fiducia Ridotta", "body": "L'AI ha ridotto la fiducia su una giocata - controlla subito", "icon": "warning", "color": "#FFB800", "timing": "real-time", "category": "alert"},
    "nuova_schedina": {"title": "Schedine del Giorno", "body": "Nuove schedine AI disponibili oggi", "icon": "layers", "color": "#00FF88", "timing": "10:00", "category": "daily"},
    "pre_evento": {"title": "Match in Arrivo", "body": "Sta per iniziare - controlla le tue giocate", "icon": "time", "color": "#00B4D8", "timing": "30 min prima", "category": "event"},
    "quota_calo": {"title": "Quota in Calo", "body": "Quota in calo - potresti perdere valore", "icon": "trending-down", "color": "#FF3B30", "timing": "immediato", "category": "alert"},
    "inattivita": {"title": "Non Perderle", "body": "Nuove opportunita oggi - non perderle", "icon": "eye", "color": "#9B59B6", "timing": "24h", "category": "engagement"},
    "badge": {"title": "Badge Sbloccato!", "body": "Hai sbloccato un nuovo badge!", "icon": "trophy", "color": "#FFD700", "timing": "immediato", "category": "gamification"},
    "upsell": {"title": "Passa a Premium", "body": "Stai perdendo le analisi migliori - sbloccale ora", "icon": "lock-closed", "color": "#FFD700", "timing": "periodico", "category": "marketing"},
}


def _generate_demo_notifications(user_id: str) -> list:
    now = datetime.now(timezone.utc)
    return [
        {"notification_id": str(uuid.uuid4()), "user_id": user_id, "type": "value_bet", "title": "Value Bet Rilevata", "body": "Nuova value bet disponibile - edge alto rilevato ora", "detail": "Man City vs Arsenal: Edge +5.6% su Arsenal @2.61", "icon": "flame", "color": "#FF6B35", "read": False, "created_at": (now - timedelta(minutes=12)).isoformat(), "action_url": "/live"},
        {"notification_id": str(uuid.uuid4()), "user_id": user_id, "type": "nuova_schedina", "title": "Schedine del Giorno", "body": "Nuove schedine AI disponibili oggi", "detail": "3 nuove schedine con confidence >75%", "icon": "layers", "color": "#00FF88", "read": False, "created_at": (now - timedelta(hours=2)).isoformat(), "action_url": "/schedine"},
        {"notification_id": str(uuid.uuid4()), "user_id": user_id, "type": "confidence_drop", "title": "Fiducia Ridotta", "body": "L'AI ha ridotto la fiducia su una giocata - controlla subito", "detail": "Lakers vs Celtics: confidence da 78% a 62%", "icon": "warning", "color": "#FFB800", "read": False, "created_at": (now - timedelta(hours=4)).isoformat(), "action_url": "/"},
        {"notification_id": str(uuid.uuid4()), "user_id": user_id, "type": "pre_evento", "title": "Match in Arrivo", "body": "Sta per iniziare - controlla le tue giocate", "detail": "Inter vs Milan inizia tra 30 minuti", "icon": "time", "color": "#00B4D8", "read": True, "created_at": (now - timedelta(hours=6)).isoformat(), "action_url": "/"},
        {"notification_id": str(uuid.uuid4()), "user_id": user_id, "type": "quota_calo", "title": "Quota in Calo", "body": "Quota in calo - potresti perdere valore", "detail": "Real Madrid @1.95 -> @1.78 nelle ultime 2 ore", "icon": "trending-down", "color": "#FF3B30", "read": True, "created_at": (now - timedelta(hours=10)).isoformat(), "action_url": "/"},
        {"notification_id": str(uuid.uuid4()), "user_id": user_id, "type": "badge", "title": "Badge Sbloccato!", "body": "Hai sbloccato un nuovo badge!", "detail": "Badge 'Membro della Community' ottenuto", "icon": "trophy", "color": "#FFD700", "read": True, "created_at": (now - timedelta(days=1)).isoformat(), "action_url": "/profile"},
        {"notification_id": str(uuid.uuid4()), "user_id": user_id, "type": "upsell", "title": "Passa a Premium", "body": "Stai perdendo le analisi migliori - sbloccale ora", "detail": "Sblocca tutte le schedine AI e le analisi Elite", "icon": "lock-closed", "color": "#FFD700", "read": True, "created_at": (now - timedelta(days=2)).isoformat(), "action_url": "/subscribe"},
    ]


@router.get("/notifications/types")
async def get_notification_types():
    return {"types": NOTIFICATION_TYPES}


@router.get("/notifications/{user_id}")
async def get_user_notifications(user_id: str, limit: int = 50):
    cursor = db.notifications.find({"user_id": user_id}, {"_id": 0}).sort("created_at", -1).limit(limit)
    notifs = await cursor.to_list(length=limit)
    if len(notifs) == 0:
        demo_notifs = _generate_demo_notifications(user_id)
        if demo_notifs:
            await db.notifications.insert_many(demo_notifs)
            cursor = db.notifications.find({"user_id": user_id}, {"_id": 0}).sort("created_at", -1).limit(limit)
            notifs = await cursor.to_list(length=limit)
    unread_count = await db.notifications.count_documents({"user_id": user_id, "read": False})
    return {"notifications": notifs, "unread_count": unread_count}


@router.post("/notifications/mark-read/{notification_id}")
async def mark_notification_read(notification_id: str):
    await db.notifications.update_one({"notification_id": notification_id}, {"$set": {"read": True}})
    return {"success": True}


@router.post("/notifications/mark-all-read/{user_id}")
async def mark_all_read(user_id: str):
    result = await db.notifications.update_many({"user_id": user_id, "read": False}, {"$set": {"read": True}})
    return {"success": True, "updated": result.modified_count}


@router.get("/notifications/preferences/{user_id}")
async def get_notification_preferences(user_id: str):
    prefs = await db.notification_prefs.find_one({"user_id": user_id}, {"_id": 0})
    if not prefs:
        default_prefs = {
            "user_id": user_id, "value_bet": True, "confidence_drop": True,
            "nuova_schedina": True, "pre_evento": True, "quota_calo": True,
            "inattivita": True, "badge": True, "upsell": False,
            "push_enabled": True, "quiet_hours_start": "23:00", "quiet_hours_end": "07:00",
        }
        await db.notification_prefs.insert_one({**default_prefs})
        prefs = await db.notification_prefs.find_one({"user_id": user_id}, {"_id": 0})
    return {"preferences": prefs}


@router.put("/notifications/preferences/{user_id}")
async def update_notification_preferences(user_id: str, request: Request):
    body = await request.json()
    await db.notification_prefs.update_one({"user_id": user_id}, {"$set": body}, upsert=True)
    return {"success": True}


@router.delete("/notifications/{notification_id}")
async def delete_notification(notification_id: str):
    await db.notifications.delete_one({"notification_id": notification_id})
    return {"success": True}
