from fastapi import APIRouter
from datetime import datetime, timezone
from services.database import db

router = APIRouter()

# ==================== BADGE DEFINITIONS (Updated & Complete) ====================

BADGE_DEFINITIONS = [
    {"badge_id": "community", "name": "Membro della Community", "description": "Ti sei registrato su EdgeBet!", "icon": "people", "category": "beginner", "points": 50},
    {"badge_id": "first_follow", "name": "Prima Schedina", "description": "Hai seguito la tua prima schedina!", "icon": "bookmark", "category": "beginner", "points": 100},
    {"badge_id": "first_win", "name": "Prima Vittoria", "description": "La tua prima previsione corretta!", "icon": "trophy", "category": "beginner", "points": 150},
    {"badge_id": "ten_follows", "name": "Collezionista", "description": "Hai seguito 10 schedine!", "icon": "layers", "category": "intermediate", "points": 200},
    {"badge_id": "streak_3", "name": "Serie Vincente", "description": "3 previsioni corrette di fila!", "icon": "flame", "category": "intermediate", "points": 250},
    {"badge_id": "streak_5", "name": "In Fiamme", "description": "5 previsioni corrette consecutive!", "icon": "bonfire", "category": "intermediate", "points": 350},
    {"badge_id": "top_pick_win", "name": "Occhio d'Aquila", "description": "Un Top Pick che hai seguito ha vinto!", "icon": "eye", "category": "intermediate", "points": 300},
    {"badge_id": "streak_7", "name": "Inarrestabile", "description": "7 giorni consecutivi di utilizzo!", "icon": "rocket", "category": "advanced", "points": 400},
    {"badge_id": "profit_master", "name": "Re del Profitto", "description": "ROI personale sopra il 20%!", "icon": "trending-up", "category": "advanced", "points": 500},
    {"badge_id": "elite_user", "name": "Membro Elite", "description": "Hai usato la funzione Elite AI!", "icon": "diamond", "category": "elite", "points": 500},
    {"badge_id": "member_pro", "name": "Membro Pro", "description": "Ti sei abbonato al piano Pro!", "icon": "star", "category": "elite", "points": 400},
]

# Total possible points: 2800
# Prize: When all badges earned = 1 mese gratis
TOTAL_BADGES = len(BADGE_DEFINITIONS)
PRIZE_ALL_BADGES = {"prize": "1 mese gratis", "description": "Completa tutti i badge per ottenere 1 mese gratis di abbonamento Pro!"}


@router.get("/badges/definitions")
async def get_badge_definitions():
    """Get all badge definitions with prize info"""
    return {
        "badges": BADGE_DEFINITIONS,
        "total_badges": TOTAL_BADGES,
        "prize": PRIZE_ALL_BADGES,
    }


@router.get("/badges/user/{user_id}")
async def get_user_badges(user_id: str):
    """Get badges earned by a user with prize progress"""
    user_doc = await db.users.find_one({"user_id": user_id})
    if not user_doc:
        return {"badges": [], "total_points": 0, "progress": 0}

    earned = user_doc.get("badges", [])
    badge_ids = [b["badge_id"] for b in earned]

    # Auto-grant community badge for registered users
    if "community" not in badge_ids:
        earned.append({"badge_id": "community", "earned_at": datetime.now(timezone.utc).isoformat()})
        badge_ids.append("community")

    # Check follow count for follow-based badges
    follow_count = await db.followed_schedine.count_documents({"user_id": user_id})
    if follow_count >= 1 and "first_follow" not in badge_ids:
        earned.append({"badge_id": "first_follow", "earned_at": datetime.now(timezone.utc).isoformat(), "new": True})
        badge_ids.append("first_follow")
    if follow_count >= 10 and "ten_follows" not in badge_ids:
        earned.append({"badge_id": "ten_follows", "earned_at": datetime.now(timezone.utc).isoformat(), "new": True})
        badge_ids.append("ten_follows")

    # Check wins for first_win badge
    total_wins = user_doc.get("total_wins", 0)
    if total_wins >= 1 and "first_win" not in badge_ids:
        earned.append({"badge_id": "first_win", "earned_at": datetime.now(timezone.utc).isoformat(), "new": True})
        badge_ids.append("first_win")

    # Check ROI for profit_master badge
    total_profit = user_doc.get("total_profit", 0)
    total_bets_count = user_doc.get("total_bets", 0)
    if total_bets_count > 0:
        roi = (total_profit / (total_bets_count * 50)) * 100  # rough ROI estimate
        if roi > 20 and "profit_master" not in badge_ids:
            earned.append({"badge_id": "profit_master", "earned_at": datetime.now(timezone.utc).isoformat(), "new": True})
            badge_ids.append("profit_master")

    await db.users.update_one({"user_id": user_id}, {"$set": {"badges": earned}})

    # Clear "new" flag after reading so popup doesn't re-trigger
    cleared = [{"badge_id": b["badge_id"], "earned_at": b.get("earned_at", ""), "new": False} for b in earned]
    await db.users.update_one({"user_id": user_id}, {"$set": {"badges": cleared}})

    # Calculate points from definitions
    points = 0
    for b in earned:
        defn = next((d for d in BADGE_DEFINITIONS if d["badge_id"] == b["badge_id"]), None)
        if defn:
            points += defn.get("points", 100)

    progress = len(badge_ids) / TOTAL_BADGES * 100
    all_complete = len(badge_ids) >= TOTAL_BADGES

    return {
        "badges": earned,
        "total_points": points,
        "definitions": BADGE_DEFINITIONS,
        "progress": round(progress, 1),
        "all_complete": all_complete,
        "prize": PRIZE_ALL_BADGES if all_complete else {"description": f"Completa tutti i {TOTAL_BADGES} badge per vincere 1 mese gratis!", "remaining": TOTAL_BADGES - len(badge_ids)},
    }


@router.post("/badges/check-elite/{user_id}")
async def check_elite_badge(user_id: str):
    """Grant elite badge when user uses Elite AI"""
    user_doc = await db.users.find_one({"user_id": user_id})
    if not user_doc:
        return {"granted": False}

    badges = user_doc.get("badges", [])
    badge_ids = [b["badge_id"] for b in badges]
    if "elite_user" not in badge_ids:
        badges.append({"badge_id": "elite_user", "earned_at": datetime.now(timezone.utc).isoformat(), "new": True})
        await db.users.update_one({"user_id": user_id}, {"$set": {"badges": badges}})
        return {"granted": True, "badge": next(b for b in BADGE_DEFINITIONS if b["badge_id"] == "elite_user")}
    return {"granted": False}


@router.post("/badges/check-streak/{user_id}")
async def check_streak_badge(user_id: str):
    """Check and grant streak badges (3 and 5)"""
    user_doc = await db.users.find_one({"user_id": user_id})
    if not user_doc:
        return {"granted": []}

    badges = user_doc.get("badges", [])
    badge_ids = [b["badge_id"] for b in badges]
    wins = user_doc.get("total_wins", 0)
    granted = []

    if wins >= 3 and "streak_3" not in badge_ids:
        badges.append({"badge_id": "streak_3", "earned_at": datetime.now(timezone.utc).isoformat(), "new": True})
        granted.append(next(b for b in BADGE_DEFINITIONS if b["badge_id"] == "streak_3"))

    if wins >= 5 and "streak_5" not in badge_ids:
        badges.append({"badge_id": "streak_5", "earned_at": datetime.now(timezone.utc).isoformat(), "new": True})
        granted.append(next(b for b in BADGE_DEFINITIONS if b["badge_id"] == "streak_5"))

    if granted:
        await db.users.update_one({"user_id": user_id}, {"$set": {"badges": badges}})

    return {"granted": granted}
