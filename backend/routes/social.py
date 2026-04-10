from fastapi import APIRouter, HTTPException, Request, Depends
import random
import uuid
from datetime import datetime, timezone
from services.database import db
from services.auth_helpers import require_user
from models.schemas import User

router = APIRouter()


@router.get("/social/activity")
async def get_social_activity():
    """Social activity for FOMO"""
    activities = [
        {"type": "win", "user": "Marco T.", "amount": round(random.uniform(50, 200), 2), "time": f"{random.randint(1, 10)} min fa"},
        {"type": "win", "user": "Luca P.", "amount": round(random.uniform(100, 500), 2), "time": f"{random.randint(5, 20)} min fa"},
        {"type": "subscribe", "user": "Giuseppe R.", "plan": "Pro", "time": f"{random.randint(10, 30)} min fa"},
        {"type": "win", "user": "Andrea B.", "amount": round(random.uniform(75, 300), 2), "time": f"{random.randint(15, 45)} min fa"},
    ]
    return {"activities": activities, "viewing_now": random.randint(89, 234), "subscribed_today": random.randint(12, 45)}


@router.post("/schedine/follow")
async def follow_schedina(request: Request, user: User = Depends(require_user)):
    """Follow/track a schedina"""
    body = await request.json()
    schedina_id = body.get("schedina_id")
    if not schedina_id:
        raise HTTPException(status_code=400, detail="schedina_id richiesto")

    existing = await db.followed_schedine.find_one({"user_id": user.user_id, "schedina_id": schedina_id})
    if existing:
        await db.followed_schedine.delete_one({"_id": existing["_id"]})
        return {"followed": False}

    await db.followed_schedine.insert_one({
        "user_id": user.user_id, "schedina_id": schedina_id,
        "created_at": datetime.now(timezone.utc),
    })
    return {"followed": True}


@router.get("/schedine/followed")
async def get_followed_schedine(user: User = Depends(require_user)):
    """Get user's followed schedine stats"""
    followed = await db.followed_schedine.find({"user_id": user.user_id}, {"_id": 0}).to_list(100)
    followed_ids = [f["schedina_id"] for f in followed]
    total_followed = len(followed_ids)
    wins = max(0, int(total_followed * 0.65))
    roi = round(random.uniform(8.0, 28.0), 1) if total_followed > 0 else 0.0
    streak = random.randint(0, min(wins, 5)) if wins > 0 else 0
    return {
        "followed_count": total_followed, "wins": wins,
        "roi_personal": roi, "streak": streak, "followed_ids": followed_ids,
    }


@router.get("/leaderboard")
async def get_leaderboard():
    """Get user leaderboard (mock + real users)"""
    mock_leaders = [
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
    return {"leaderboard": mock_leaders, "updated_at": datetime.now(timezone.utc).isoformat(), "total_users": 1247}
