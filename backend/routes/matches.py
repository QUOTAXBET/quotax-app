from fastapi import APIRouter, HTTPException, Request, Depends
import random
from datetime import datetime, timezone
from services.database import db
from services.mock_data import (
    generate_schedine, generate_live_matches, generate_ai_predictions,
    get_cached_matches, generate_predictions_for_matches, PLATFORM_STATS, SUBSCRIPTION_PLANS
)
from services.auth_helpers import get_current_user, require_user, require_premium
from models.schemas import User

router = APIRouter()


@router.get("/schedine")
async def get_schedine(request: Request):
    """Schedine for logged in users"""
    user = await get_current_user(request)
    all_schedine = generate_schedine(12, include_premium=True)

    if not user:
        return [s for s in all_schedine[:3] if s["status"] == "won"][:1]

    if user.subscription_tier == "free":
        result = []
        for i, sch in enumerate(all_schedine):
            if i < 4:
                result.append({**sch, "is_locked": False})
            else:
                result.append({**sch, "is_locked": True, "ai_analysis": None})
        return result

    if user.subscription_tier == "base":
        return [{**s, "is_locked": i > 6, "ai_analysis": None if i > 6 else s["ai_analysis"]}
                for i, s in enumerate(all_schedine)]

    return [{**s, "is_locked": False} for s in all_schedine]


@router.get("/dashboard/stats")
async def get_dashboard_stats(user: User = Depends(require_user)):
    """Dashboard stats for logged in users"""
    stats = {
        "roi_7d": PLATFORM_STATS["roi_7d"],
        "roi_30d": PLATFORM_STATS["roi_30d"],
        "win_rate": PLATFORM_STATS["win_rate"],
        "total_bets": PLATFORM_STATS["total_bets"],
        "total_wins": PLATFORM_STATS["total_wins"],
        "streak": PLATFORM_STATS["streak"],
        "bankroll_history": PLATFORM_STATS["bankroll_history"],
    }
    if user.subscription_tier == "free":
        stats["roi_30d"] = None
        stats["bankroll_history"] = stats["bankroll_history"][:3]
        stats["show_upgrade_prompt"] = True
    return stats


@router.get("/live")
async def get_live_matches(request: Request):
    """Live matches"""
    user = await get_current_user(request)
    matches = generate_live_matches()
    if not user or user.subscription_tier in ["free", "base"]:
        for match in matches:
            match["odds_trend"] = None
            match["alert"] = None
    return matches


@router.get("/ai/predictions")
async def get_ai_predictions(request: Request):
    """AI predictions - premium only"""
    user = await get_current_user(request)
    predictions = generate_ai_predictions()

    if not user:
        return {"locked": True, "preview": predictions[:2], "message": "Registrati per accedere alle previsioni AI"}
    if user.subscription_tier == "free":
        return {"locked": True, "preview": predictions[:2], "message": "Passa a Premium per accedere alle previsioni AI"}
    if user.subscription_tier == "base":
        return {"locked": False, "predictions": predictions[:4], "limited": True, "message": "Upgrade a Pro per tutte le previsioni"}
    return {"locked": False, "predictions": predictions, "limited": False}


@router.get("/subscription/plans")
async def get_subscription_plans():
    """Get available subscription plans"""
    return {
        "plans": SUBSCRIPTION_PLANS,
        "tiers": {
            "guest": {
                "name": "Ospite",
                "pronostici": 1,
                "pronostici_analisi": False,
                "schedine": 1,
                "top_picks": 0,
                "description": "Accesso limitato"
            },
            "free": {
                "name": "Free",
                "pronostici": "limitati",
                "pronostici_analisi": False,
                "schedine": "2 a settimana",
                "top_picks": 2,
                "description": "Registrato gratis"
            },
            "pro": {
                "name": "Pro",
                "price": 9.99,
                "pronostici": "completi",
                "pronostici_analisi": True,
                "schedine": "illimitate",
                "top_picks": 2,
                "top_picks_note": "Sugli altri: Passa a Elite",
                "extras": ["Simulatore", "ROI tracking", "Grafico rendimento", "Affidabilità %"],
                "trial": "Prova 3 giorni a solo €1"
            },
            "premium": {
                "name": "Elite",
                "price": 29.99,
                "first_month_price": 19.99,
                "pronostici": "completi",
                "pronostici_analisi": True,
                "schedine": "illimitate",
                "top_picks": "tutti",
                "extras": ["Value bets", "Notifiche push", "AI custom", "Report settimanale"]
            }
        }
    }


@router.post("/subscription/subscribe")
async def subscribe(request: Request, user: User = Depends(require_user)):
    """Subscribe to a plan (mock - no real payment)"""
    body = await request.json()
    plan_id = body.get("plan_id")
    if plan_id not in ["pro", "premium"]:
        raise HTTPException(status_code=400, detail="Piano non valido")
    from datetime import timedelta
    expires_at = datetime.now(timezone.utc) + timedelta(days=30)
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {"subscription_tier": plan_id, "subscription_expires": expires_at}}
    )
    return {"success": True, "message": f"Abbonamento {plan_id.upper()} attivato!", "expires_at": expires_at.isoformat()}


@router.get("/matches")
async def get_all_matches():
    return get_cached_matches("all")


@router.get("/matches/{sport}")
async def get_matches_by_sport(sport: str):
    if sport not in ["soccer", "nba", "ufc"]:
        raise HTTPException(status_code=400, detail="Sport non valido")
    return get_cached_matches(sport)


@router.get("/predictions")
async def get_all_predictions():
    return generate_predictions_for_matches(get_cached_matches("all"))


@router.get("/predictions/{sport}")
async def get_predictions_by_sport(sport: str):
    if sport not in ["soccer", "nba", "ufc"]:
        raise HTTPException(status_code=400, detail="Sport non valido")
    return generate_predictions_for_matches(get_cached_matches(sport))
