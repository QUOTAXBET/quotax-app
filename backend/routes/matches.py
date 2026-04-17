from fastapi import APIRouter, HTTPException, Request, Depends
import random
import logging
from datetime import datetime, timezone
from services.database import db
from services.mock_data import (
    generate_schedine, generate_live_matches, generate_ai_predictions,
    get_cached_matches, generate_predictions_for_matches, PLATFORM_STATS, SUBSCRIPTION_PLANS
)
from services.auth_helpers import get_current_user, require_user, require_premium
from models.schemas import User

# Real API imports
try:
    from services.odds_api import get_live_odds, get_scores, SPORT_MAP
    from services.football_api import get_upcoming_fixtures, get_live_fixtures, _request as football_request
    REAL_API = True
except Exception:
    REAL_API = False

logger = logging.getLogger(__name__)
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
    """Get matches — tries real API first, falls back to mock"""
    if REAL_API:
        try:
            # Fetch real odds from The Odds API (Serie A + EPL + NBA)
            real_matches = []
            for sport_key in ["soccer_italy_serie_a", "soccer_epl", "basketball_nba"]:
                odds_data = await get_live_odds(sport_key)
                for event in odds_data[:8]:
                    # Get best odds from bookmakers
                    best_odds = {"home": 0, "draw": 0, "away": 0}
                    for bk in event.get("bookmakers", [])[:3]:
                        for market in bk.get("markets", []):
                            for outcome in market.get("outcomes", []):
                                if outcome["name"] == event.get("home_team"):
                                    best_odds["home"] = max(best_odds["home"], outcome["price"])
                                elif outcome["name"] == event.get("away_team"):
                                    best_odds["away"] = max(best_odds["away"], outcome["price"])
                                elif outcome["name"] == "Draw":
                                    best_odds["draw"] = max(best_odds["draw"], outcome["price"])

                    sport = "soccer" if "soccer" in sport_key else "nba" if "basketball" in sport_key else "ufc"
                    league_name = event.get("sport_title", sport_key)

                    real_matches.append({
                        "match_id": event.get("id", ""),
                        "sport": sport,
                        "league": league_name,
                        "home_team": event.get("home_team", ""),
                        "away_team": event.get("away_team", ""),
                        "match_date": event.get("commence_time", ""),
                        "odds_home": best_odds["home"] or round(random.uniform(1.4, 3.5), 2),
                        "odds_draw": best_odds["draw"] or round(random.uniform(2.5, 4.0), 2),
                        "odds_away": best_odds["away"] or round(random.uniform(1.8, 5.0), 2),
                        "status": "upcoming",
                        "bookmakers_count": len(event.get("bookmakers", [])),
                    })
            if real_matches:
                logger.info(f"Serving {len(real_matches)} real matches from Odds API")
                return real_matches
        except Exception as e:
            logger.error(f"Real API failed, falling back to mock: {e}")
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
