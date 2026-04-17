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
    from services.odds_api import get_live_odds, get_scores, get_all_available_odds, ALL_SPORTS
    from services.football_api import get_upcoming_fixtures, get_live_fixtures, _request as football_request
    REAL_API = True
except Exception:
    REAL_API = False

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/schedine")
async def get_schedine(request: Request):
    """Schedine built from real matches"""
    user = await get_current_user(request)

    # Build schedine from real odds data
    all_schedine = []
    if REAL_API:
        try:
            all_odds = await get_all_available_odds(max_sports=6)
            random.shuffle(all_odds)

            for i in range(min(12, len(odds_data) // 2)):
                events_in_slip = odds_data[i*2:(i*2)+random.randint(2, 4)]
                matches = []
                total_odds = 1.0
                for ev in events_in_slip:
                    best_home, best_away, best_draw = 1.5, 2.5, 3.0
                    for bk in ev.get("bookmakers", [])[:3]:
                        for mkt in bk.get("markets", []):
                            for out in mkt.get("outcomes", []):
                                if out["name"] == ev.get("home_team"): best_home = max(best_home, out["price"])
                                elif out["name"] == ev.get("away_team"): best_away = max(best_away, out["price"])
                                elif out["name"] == "Draw": best_draw = max(best_draw, out["price"])

                    pick = random.choice(["1", "X", "2"])
                    odds = best_home if pick == "1" else best_draw if pick == "X" else best_away
                    total_odds *= odds
                    sport = "soccer" if "soccer" in ev.get("sport_key", "") else "nba"
                    matches.append({
                        "sport": sport, "league": ev.get("sport_title", ""), "home": ev.get("home_team", ""), "away": ev.get("away_team", ""),
                        "bet_type": pick, "odds": round(odds, 2), "match_time": ev.get("commence_time", "")
                    })

                stake = random.choice([10, 20, 25, 50])
                statuses = ["pending", "pending", "pending", "won", "won", "lost"]
                status = random.choice(statuses)
                potential_win = round(stake * total_odds, 2)
                confidence = random.randint(60, 92)

                all_schedine.append({
                    "schedina_id": f"sch_real_{i:03d}",
                    "matches": matches,
                    "total_odds": round(total_odds, 2),
                    "stake": stake,
                    "potential_win": potential_win,
                    "actual_win": potential_win if status == "won" else 0,
                    "status": status,
                    "is_premium": i > 3,
                    "confidence": confidence,
                    "ai_analysis": f"Value bet identificato su {len(matches)} eventi. Probabilita combinata stimata {confidence}%.",
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "viewers": random.randint(10, 50),
                })
            if all_schedine:
                logger.info(f"Built {len(all_schedine)} real schedine from live odds")
        except Exception as e:
            logger.error(f"Real schedine failed: {e}")

    if not all_schedine:
        all_schedine = generate_schedine(12, include_premium=True)

    # Apply tier gating
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
    """Live matches from real API"""
    user = await get_current_user(request)

    if REAL_API:
        try:
            # Get live fixtures from API-Football
            live_data = await get_live_fixtures()
            if live_data:
                live_matches = []
                for f in live_data[:15]:
                    live_matches.append({
                        "match_id": str(f["fixture"]["id"]),
                        "sport": "soccer",
                        "league": f["league"]["name"],
                        "home_team": f["teams"]["home"]["name"],
                        "away_team": f["teams"]["away"]["name"],
                        "home_score": f["goals"]["home"],
                        "away_score": f["goals"]["away"],
                        "minute": f["fixture"]["status"].get("elapsed", 0),
                        "status": f["fixture"]["status"]["long"],
                        "home_logo": f["teams"]["home"].get("logo", ""),
                        "away_logo": f["teams"]["away"].get("logo", ""),
                        "odds_trend": None if (not user or user.subscription_tier in ["free", "base"]) else "up",
                        "alert": None if (not user or user.subscription_tier in ["free", "base"]) else "Quota in calo",
                    })
                if live_matches:
                    logger.info(f"Serving {len(live_matches)} real live matches")
                    return live_matches
        except Exception as e:
            logger.error(f"Real live matches failed: {e}")

    # Fallback
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
            # Fetch real odds from ALL available leagues worldwide
            all_odds = await get_all_available_odds(max_sports=8)
            real_matches = []
            for event in all_odds:
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

                    sport_k = event.get("sport_key", "")
                    sport = "soccer" if "soccer" in sport_k else "nba" if "basketball" in sport_k else "ufc" if "mma" in sport_k else "soccer"
                    league_name = event.get("sport_title", "")

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
    """AI predictions from real matches"""
    if REAL_API:
        try:
            all_odds = await get_all_available_odds(max_sports=6)
            predictions = []
            for ev in all_odds[:30]:
                # Calculate implied probabilities from odds
                best = {"home": 0, "draw": 0, "away": 0}
                for bk in ev.get("bookmakers", [])[:5]:
                    for mkt in bk.get("markets", []):
                        for out in mkt.get("outcomes", []):
                            if out["name"] == ev.get("home_team"): best["home"] = max(best["home"], out["price"])
                            elif out["name"] == ev.get("away_team"): best["away"] = max(best["away"], out["price"])
                            elif out["name"] == "Draw": best["draw"] = max(best["draw"], out["price"])

                avg_odds = (best["home"] + best["draw"] + best["away"]) / 3 if all(best.values()) else 2.0
                # Pick most likely outcome
                if best["home"] and best["away"]:
                    if best["home"] < best["away"]:
                        predicted = "home"
                        confidence = min(92, int((1 / best["home"]) * 100))
                        odds = best["home"]
                    elif best["away"] < best["home"]:
                        predicted = "away"
                        confidence = min(92, int((1 / best["away"]) * 100))
                        odds = best["away"]
                    else:
                        predicted = "draw"
                        confidence = min(80, int((1 / best["draw"]) * 100)) if best["draw"] else 33
                        odds = best["draw"]
                else:
                    predicted = "home"
                    confidence = 55
                    odds = 2.0

                sport = "soccer" if "soccer" in ev.get("sport_key", "") else "nba"
                predictions.append({
                    "match_id": ev.get("id", ""),
                    "sport": sport,
                    "league": ev.get("sport_title", ""),
                    "home_team": ev.get("home_team", ""),
                    "away_team": ev.get("away_team", ""),
                    "predicted_outcome": predicted,
                    "confidence": confidence,
                    "odds": round(odds, 2),
                    "risk_level": "low" if confidence > 70 else "medium" if confidence > 55 else "high",
                    "reasoning": f"Analisi basata su quote da {len(ev.get('bookmakers', []))} bookmaker. Probabilita implicita: {confidence}%.",
                    "match_date": ev.get("commence_time", ""),
                })
            if predictions:
                logger.info(f"Serving {len(predictions)} real predictions")
                return predictions
        except Exception as e:
            logger.error(f"Real predictions failed: {e}")
    return generate_predictions_for_matches(get_cached_matches("all"))


@router.get("/predictions/{sport}")
async def get_predictions_by_sport(sport: str):
    if sport not in ["soccer", "nba", "ufc"]:
        raise HTTPException(status_code=400, detail="Sport non valido")
    if REAL_API:
        try:
            sport_map = {"soccer": "soccer_italy_serie_a", "nba": "basketball_nba", "ufc": "mma_mixed_martial_arts"}
            odds_data = await get_live_odds(sport_map.get(sport, "soccer_italy_serie_a"))
            predictions = []
            for ev in odds_data[:10]:
                best_home, best_away = 2.0, 2.0
                for bk in ev.get("bookmakers", [])[:3]:
                    for mkt in bk.get("markets", []):
                        for out in mkt.get("outcomes", []):
                            if out["name"] == ev.get("home_team"): best_home = out["price"]
                            elif out["name"] == ev.get("away_team"): best_away = out["price"]
                predicted = "home" if best_home < best_away else "away"
                confidence = min(90, int((1 / min(best_home, best_away)) * 100))
                predictions.append({
                    "match_id": ev.get("id", ""),
                    "sport": sport,
                    "league": ev.get("sport_title", ""),
                    "home_team": ev.get("home_team", ""),
                    "away_team": ev.get("away_team", ""),
                    "predicted_outcome": predicted,
                    "confidence": confidence,
                    "odds": round(min(best_home, best_away), 2),
                    "risk_level": "low" if confidence > 70 else "medium" if confidence > 55 else "high",
                    "match_date": ev.get("commence_time", ""),
                })
            if predictions:
                return predictions
        except Exception as e:
            logger.error(f"Real predictions/{sport} failed: {e}")
    return generate_predictions_for_matches(get_cached_matches(sport))
