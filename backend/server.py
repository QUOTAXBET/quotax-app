from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import httpx
import random
import asyncio
from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ==================== MODELS ====================

class User(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    subscription_tier: str = "free"  # free, base, pro, premium
    subscription_expires: Optional[datetime] = None
    wallet_balance: float = 1000.0
    total_bets: int = 0
    total_wins: int = 0
    total_profit: float = 0.0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ==================== MOCK DATA - REALISTIC STATS ====================

PLATFORM_STATS = {
    "roi_7d": 23.4,
    "roi_30d": 47.8,
    "win_rate": 68.5,
    "total_bets": 342,
    "total_wins": 234,
    "streak": 5,
    "bankroll_history": [
        {"date": "2025-07-01", "value": 10000},
        {"date": "2025-07-02", "value": 10450},
        {"date": "2025-07-03", "value": 10280},
        {"date": "2025-07-04", "value": 10890},
        {"date": "2025-07-05", "value": 11340},
        {"date": "2025-07-06", "value": 11120},
        {"date": "2025-07-07", "value": 12340},
    ],
    "last_win": {"amount": 187.50, "time": "2 min fa"},
    "active_users": random.randint(124, 256),
}

SOCCER_LEAGUES = {
    "Serie A": ["Inter", "Milan", "Juventus", "Napoli", "Roma", "Lazio", "Atalanta", "Fiorentina"],
    "Premier League": ["Man City", "Arsenal", "Liverpool", "Man United", "Chelsea", "Tottenham", "Newcastle"],
    "La Liga": ["Real Madrid", "Barcelona", "Atletico Madrid", "Sevilla", "Real Sociedad", "Villarreal"],
    "Bundesliga": ["Bayern Monaco", "Borussia Dortmund", "RB Leipzig", "Leverkusen"],
    "Champions League": ["Real Madrid", "Man City", "Bayern Monaco", "PSG", "Inter", "Barcelona"],
}

NBA_TEAMS = ["Lakers", "Celtics", "Warriors", "Heat", "Bucks", "Nuggets", "76ers", "Suns", "Mavericks", "Nets"]

UFC_FIGHTERS = {
    "Heavyweight": ["Jon Jones", "Tom Aspinall", "Ciryl Gane"],
    "Middleweight": ["Dricus Du Plessis", "Israel Adesanya", "Sean Strickland"],
    "Lightweight": ["Islam Makhachev", "Charles Oliveira", "Dustin Poirier"],
}

def generate_schedine(count: int = 10, include_premium: bool = True) -> List[Dict]:
    """Generate realistic betting slips"""
    schedine = []
    statuses = ["won", "won", "won", "won", "lost", "pending", "pending"]  # 70% win rate
    
    for i in range(count):
        is_premium = i > 3 and include_premium  # First 4 visible, rest premium
        num_matches = random.randint(2, 5)
        
        matches = []
        total_odds = 1.0
        
        for _ in range(num_matches):
            sport = random.choice(["soccer", "nba", "ufc"])
            
            if sport == "soccer":
                league = random.choice(list(SOCCER_LEAGUES.keys()))
                teams = SOCCER_LEAGUES[league]
                home, away = random.sample(teams, 2)
                bet_type = random.choice(["1", "X", "2", "1X", "X2", "GOL", "OVER 2.5"])
            elif sport == "nba":
                league = "NBA"
                home, away = random.sample(NBA_TEAMS, 2)
                bet_type = random.choice(["1", "2", "OVER", "UNDER"])
            else:
                division = random.choice(list(UFC_FIGHTERS.keys()))
                league = f"UFC {division}"
                fighters = UFC_FIGHTERS[division]
                home, away = random.sample(fighters, 2)
                bet_type = random.choice(["1", "2"])
            
            odds = round(random.uniform(1.25, 2.80), 2)
            total_odds *= odds
            
            matches.append({
                "sport": sport,
                "league": league,
                "home": home,
                "away": away,
                "bet_type": bet_type,
                "odds": odds,
                "match_time": (datetime.now(timezone.utc) + timedelta(hours=random.randint(-48, 72))).isoformat()
            })
        
        status = random.choice(statuses)
        stake = random.choice([10, 20, 25, 50, 100])
        potential_win = round(stake * total_odds, 2)
        
        schedina = {
            "schedina_id": f"sch_{uuid.uuid4().hex[:8]}",
            "matches": matches,
            "total_odds": round(total_odds, 2),
            "stake": stake,
            "potential_win": potential_win,
            "actual_win": potential_win if status == "won" else 0,
            "status": status,
            "is_premium": is_premium,
            "confidence": random.randint(65, 95),
            "ai_analysis": f"Value bet identificato. Probabilità stimata {random.randint(55, 75)}%. Quote sottovalutate del {random.randint(5, 20)}%.",
            "created_at": (datetime.now(timezone.utc) - timedelta(hours=random.randint(1, 168))).isoformat(),
            "viewers": random.randint(8, 45),
        }
        schedine.append(schedina)
    
    return schedine

def generate_live_matches() -> List[Dict]:
    """Generate live matches"""
    matches = []
    
    for _ in range(random.randint(3, 6)):
        sport = random.choice(["soccer", "nba"])
        
        if sport == "soccer":
            league = random.choice(list(SOCCER_LEAGUES.keys()))
            teams = SOCCER_LEAGUES[league]
            home, away = random.sample(teams, 2)
            score = f"{random.randint(0,3)}-{random.randint(0,3)}"
            minute = random.randint(1, 90)
        else:
            league = "NBA"
            home, away = random.sample(NBA_TEAMS, 2)
            score = f"{random.randint(80,120)}-{random.randint(80,120)}"
            minute = f"Q{random.randint(1,4)}"
        
        odds_trend = random.choice(["up", "down", "stable"])
        
        matches.append({
            "match_id": f"live_{uuid.uuid4().hex[:8]}",
            "sport": sport,
            "league": league,
            "home": home,
            "away": away,
            "score": score,
            "minute": minute,
            "odds_home": round(random.uniform(1.5, 4.0), 2),
            "odds_draw": round(random.uniform(2.5, 4.5), 2) if sport == "soccer" else None,
            "odds_away": round(random.uniform(1.5, 4.0), 2),
            "odds_trend": odds_trend,
            "is_hot": random.random() > 0.6,
            "alert": "Quota in calo!" if odds_trend == "down" else None,
        })
    
    return matches

def generate_ai_predictions() -> List[Dict]:
    """Generate AI predictions (premium only)"""
    predictions = []
    
    for _ in range(8):
        sport = random.choice(["soccer", "nba", "ufc"])
        
        if sport == "soccer":
            league = random.choice(list(SOCCER_LEAGUES.keys()))
            teams = SOCCER_LEAGUES[league]
            home, away = random.sample(teams, 2)
        elif sport == "nba":
            league = "NBA"
            home, away = random.sample(NBA_TEAMS, 2)
        else:
            division = random.choice(list(UFC_FIGHTERS.keys()))
            league = f"UFC {division}"
            home, away = random.sample(UFC_FIGHTERS[division], 2)
        
        predicted_outcome = random.choice(["home", "away"] if sport != "soccer" else ["home", "draw", "away"])
        confidence = random.randint(60, 92)
        
        predictions.append({
            "prediction_id": f"ai_{uuid.uuid4().hex[:8]}",
            "sport": sport,
            "league": league,
            "home": home,
            "away": away,
            "predicted_outcome": predicted_outcome,
            "confidence": confidence,
            "probability": round(random.uniform(0.55, 0.78), 2),
            "value_rating": round(random.uniform(1.05, 1.35), 2),
            "is_value_bet": random.random() > 0.4,
            "analysis": f"Analisi AI: {home if predicted_outcome == 'home' else away} favorito. Edge stimato: +{random.randint(5, 18)}%",
            "odds": round(random.uniform(1.4, 3.2), 2),
            "match_time": (datetime.now(timezone.utc) + timedelta(hours=random.randint(1, 48))).isoformat(),
        })
    
    return predictions

# ==================== AUTH HELPERS ====================

async def get_current_user(request: Request) -> Optional[User]:
    session_token = request.cookies.get("session_token")
    if not session_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header.split(" ")[1]
    
    if not session_token:
        return None
    
    session_doc = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
    if not session_doc:
        return None
    
    expires_at = session_doc["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    
    if expires_at < datetime.now(timezone.utc):
        return None
    
    user_doc = await db.users.find_one({"user_id": session_doc["user_id"]}, {"_id": 0})
    if not user_doc:
        return None
    
    return User(**user_doc)

async def require_user(request: Request) -> User:
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Accesso richiesto")
    return user

async def require_premium(request: Request) -> User:
    user = await require_user(request)
    if user.subscription_tier not in ["base", "pro", "premium"]:
        raise HTTPException(status_code=403, detail="Abbonamento richiesto")
    return user

# ==================== AUTH ENDPOINTS ====================

@api_router.post("/auth/session")
async def create_session(request: Request, response: Response):
    try:
        body = await request.json()
        session_id = body.get("session_id")
        
        if not session_id:
            raise HTTPException(status_code=400, detail="session_id richiesto")
        
        async with httpx.AsyncClient() as client:
            auth_response = await client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": session_id}
            )
            
            if auth_response.status_code != 200:
                raise HTTPException(status_code=401, detail="Sessione non valida")
            
            auth_data = auth_response.json()
        
        email = auth_data.get("email")
        name = auth_data.get("name")
        picture = auth_data.get("picture")
        emergent_session_token = auth_data.get("session_token")
        
        existing_user = await db.users.find_one({"email": email}, {"_id": 0})
        
        if existing_user:
            user_id = existing_user["user_id"]
            await db.users.update_one(
                {"user_id": user_id},
                {"$set": {"name": name, "picture": picture}}
            )
            # Returning user — check if upsell email should be sent
            await _check_upsell_email(user_id, existing_user)
        else:
            user_id = f"user_{uuid.uuid4().hex[:12]}"
            new_user = {
                "user_id": user_id,
                "email": email,
                "name": name,
                "picture": picture,
                "subscription_tier": "free",
                "subscription_expires": None,
                "wallet_balance": 1000.0,
                "total_bets": 0,
                "total_wins": 0,
                "total_profit": 0.0,
                "created_at": datetime.now(timezone.utc)
            }
            await db.users.insert_one(new_user)
            # New user — send welcome email automatically
            await _queue_email("welcome", email, name, user_id)
        
        session_token = emergent_session_token or f"session_{uuid.uuid4().hex}"
        expires_at = datetime.now(timezone.utc) + timedelta(days=7)
        
        await db.user_sessions.insert_one({
            "session_id": str(uuid.uuid4()),
            "user_id": user_id,
            "session_token": session_token,
            "expires_at": expires_at,
            "created_at": datetime.now(timezone.utc)
        })
        
        response.set_cookie(
            key="session_token",
            value=session_token,
            httponly=True,
            secure=True,
            samesite="none",
            path="/",
            max_age=7 * 24 * 60 * 60
        )
        
        user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
        
        return {"user": user_doc, "session_token": session_token}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Session creation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/auth/me")
async def get_me(user: User = Depends(require_user)):
    return user.dict()

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    response.delete_cookie(key="session_token", path="/")
    return {"message": "Logout effettuato"}

# ==================== PUBLIC ENDPOINTS (GUEST) ====================

@api_router.get("/public/stats")
async def get_public_stats():
    """Stats for homepage - builds trust"""
    return {
        **PLATFORM_STATS,
        "active_users": random.randint(124, 256),
        "last_win": {"amount": round(random.uniform(50, 350), 2), "time": f"{random.randint(1, 15)} min fa"},
    }

@api_router.get("/public/preview-schedine")
async def get_preview_schedine():
    """Limited schedine for guests - creates curiosity"""
    all_schedine = generate_schedine(8, include_premium=True)
    
    # For guests: show 1 complete winning, 2 partial, rest blurred
    preview = []
    for i, sch in enumerate(all_schedine[:5]):
        if i == 0 and sch["status"] == "won":
            # First winning one is fully visible
            preview.append({**sch, "is_locked": False, "is_blurred": False})
        elif i < 3:
            # Next 2 are partially visible
            preview.append({**sch, "is_locked": True, "is_blurred": True})
        else:
            # Rest are locked
            preview.append({**sch, "is_locked": True, "is_blurred": True, "matches": []})
    
    return preview

@api_router.get("/public/bankroll-preview")
async def get_bankroll_preview():
    """Bankroll chart preview - slightly blurred for guests"""
    return {
        "data": PLATFORM_STATS["bankroll_history"],
        "is_complete": False,
        "message": "Registrati per vedere lo storico completo"
    }

# ==================== FREE USER ENDPOINTS ====================

@api_router.get("/schedine")
async def get_schedine(request: Request):
    """Schedine for logged in users"""
    user = await get_current_user(request)
    
    all_schedine = generate_schedine(12, include_premium=True)
    
    if not user:
        # Guest - very limited
        return [s for s in all_schedine[:3] if s["status"] == "won"][:1]
    
    if user.subscription_tier == "free":
        # Free user - some locked
        result = []
        for i, sch in enumerate(all_schedine):
            if i < 4:
                result.append({**sch, "is_locked": False})
            else:
                result.append({**sch, "is_locked": True, "ai_analysis": None})
        return result
    
    # Paid user - based on tier
    if user.subscription_tier == "base":
        return [{**s, "is_locked": i > 6, "ai_analysis": None if i > 6 else s["ai_analysis"]} 
                for i, s in enumerate(all_schedine)]
    
    # Pro/Premium - full access
    return [{**s, "is_locked": False} for s in all_schedine]

@api_router.get("/dashboard/stats")
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
        # Limited data for free users
        stats["roi_30d"] = None
        stats["bankroll_history"] = stats["bankroll_history"][:3]
        stats["show_upgrade_prompt"] = True
    
    return stats

# ==================== LIVE ENDPOINTS ====================

@api_router.get("/live")
async def get_live_matches(request: Request):
    """Live matches"""
    user = await get_current_user(request)
    matches = generate_live_matches()
    
    if not user or user.subscription_tier in ["free", "base"]:
        # Limited info for free/base users
        for match in matches:
            match["odds_trend"] = None
            match["alert"] = None
    
    return matches

# ==================== AI PREDICTIONS (PREMIUM) ====================

@api_router.get("/ai/predictions")
async def get_ai_predictions(request: Request):
    """AI predictions - premium only"""
    user = await get_current_user(request)
    predictions = generate_ai_predictions()
    
    if not user:
        # Guest - show teaser
        return {
            "locked": True,
            "preview": predictions[:2],
            "message": "Registrati per accedere alle previsioni AI"
        }
    
    if user.subscription_tier == "free":
        return {
            "locked": True,
            "preview": predictions[:2],
            "message": "Passa a Premium per accedere alle previsioni AI"
        }
    
    if user.subscription_tier == "base":
        return {
            "locked": False,
            "predictions": predictions[:4],
            "limited": True,
            "message": "Upgrade a Pro per tutte le previsioni"
        }
    
    # Pro/Premium - full access
    return {
        "locked": False,
        "predictions": predictions,
        "limited": False
    }

# ==================== SUBSCRIPTION ENDPOINTS ====================

SUBSCRIPTION_PLANS = [
    {
        "id": "pro",
        "name": "Pro",
        "price": 9.99,
        "period": "mese",
        "features": [
            "Tutte le schedine AI complete",
            "Pronostici con analisi AI",
            "Top Picks giornalieri",
            "ROI e statistiche avanzate",
            "Supporto prioritario",
        ],
        "highlighted": True,
        "badge": "Più Popolare",
    },
    {
        "id": "premium",
        "name": "Elite",
        "price": 29.99,
        "period": "mese",
        "features": [
            "Tutto del Pro incluso",
            "Elite AI — domande illimitate",
            "Notifiche live match",
            "Value bet alerts in tempo reale",
            "Accesso anticipato ai pronostici",
            "Badge esclusivi + Classifica VIP",
            "Supporto VIP diretto",
        ],
        "highlighted": False,
        "badge": "Massimo Valore",
    },
]

@api_router.get("/subscription/plans")
async def get_subscription_plans():
    """Get available subscription plans"""
    return {
        "plans": SUBSCRIPTION_PLANS,
        "trial": {
            "available": True,
            "text": "Prova 3 giorni a solo 1€",
            "days": 3,
            "price": 1.00,
        }
    }

@api_router.post("/subscription/subscribe")
async def subscribe(request: Request, user: User = Depends(require_user)):
    """Subscribe to a plan (mock - no real payment)"""
    body = await request.json()
    plan_id = body.get("plan_id")
    
    if plan_id not in ["pro", "premium"]:
        raise HTTPException(status_code=400, detail="Piano non valido")
    
    # Mock subscription
    expires_at = datetime.now(timezone.utc) + timedelta(days=30)
    
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {
            "subscription_tier": plan_id,
            "subscription_expires": expires_at,
        }}
    )
    
    return {
        "success": True,
        "message": f"Abbonamento {plan_id.upper()} attivato!",
        "expires_at": expires_at.isoformat()
    }

# ==================== SOCIAL PROOF ====================

@api_router.get("/social/activity")
async def get_social_activity():
    """Social activity for FOMO"""
    activities = [
        {"type": "win", "user": "Marco T.", "amount": round(random.uniform(50, 200), 2), "time": f"{random.randint(1, 10)} min fa"},
        {"type": "win", "user": "Luca P.", "amount": round(random.uniform(100, 500), 2), "time": f"{random.randint(5, 20)} min fa"},
        {"type": "subscribe", "user": "Giuseppe R.", "plan": "Pro", "time": f"{random.randint(10, 30)} min fa"},
        {"type": "win", "user": "Andrea B.", "amount": round(random.uniform(75, 300), 2), "time": f"{random.randint(15, 45)} min fa"},
    ]
    
    return {
        "activities": activities,
        "viewing_now": random.randint(89, 234),
        "subscribed_today": random.randint(12, 45),
    }

@api_router.post("/schedine/follow")
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
        "user_id": user.user_id,
        "schedina_id": schedina_id,
        "created_at": datetime.now(timezone.utc),
    })
    return {"followed": True}


@api_router.get("/schedine/followed")
async def get_followed_schedine(user: User = Depends(require_user)):
    """Get user's followed schedine stats"""
    followed = await db.followed_schedine.find({"user_id": user.user_id}, {"_id": 0}).to_list(100)
    followed_ids = [f["schedina_id"] for f in followed]
    
    # Mock stats based on followed count
    total_followed = len(followed_ids)
    wins = max(0, int(total_followed * 0.65))
    roi = round(random.uniform(8.0, 28.0), 1) if total_followed > 0 else 0.0
    streak = random.randint(0, min(wins, 5)) if wins > 0 else 0
    
    return {
        "followed_count": total_followed,
        "wins": wins,
        "roi_personal": roi,
        "streak": streak,
        "followed_ids": followed_ids,
    }


# ==================== MATCHES ENDPOINTS ====================

def generate_matches(sport_filter: str = "all") -> List[Dict]:
    """Generate realistic upcoming matches"""
    matches = []
    
    # Soccer matches
    if sport_filter in ["all", "soccer"]:
        for league_name, teams in SOCCER_LEAGUES.items():
            num_matches = random.randint(1, 3)
            for _ in range(num_matches):
                home, away = random.sample(teams, 2)
                match_date = datetime.now(timezone.utc) + timedelta(hours=random.randint(2, 96))
                matches.append({
                    "match_id": f"m_{uuid.uuid4().hex[:8]}",
                    "sport": "soccer",
                    "league": league_name,
                    "home_team": home,
                    "away_team": away,
                    "match_date": match_date.isoformat(),
                    "odds_home": round(random.uniform(1.3, 3.5), 2),
                    "odds_draw": round(random.uniform(2.8, 4.5), 2),
                    "odds_away": round(random.uniform(1.5, 4.0), 2),
                    "status": "upcoming",
                })
    
    # NBA matches
    if sport_filter in ["all", "nba"]:
        for _ in range(random.randint(2, 5)):
            home, away = random.sample(NBA_TEAMS, 2)
            match_date = datetime.now(timezone.utc) + timedelta(hours=random.randint(2, 72))
            matches.append({
                "match_id": f"m_{uuid.uuid4().hex[:8]}",
                "sport": "nba",
                "league": "NBA",
                "home_team": home,
                "away_team": away,
                "match_date": match_date.isoformat(),
                "odds_home": round(random.uniform(1.4, 2.8), 2),
                "odds_draw": None,
                "odds_away": round(random.uniform(1.4, 2.8), 2),
                "status": "upcoming",
            })
    
    # UFC matches
    if sport_filter in ["all", "ufc"]:
        for division, fighters in UFC_FIGHTERS.items():
            if len(fighters) >= 2:
                home, away = random.sample(fighters, 2)
                match_date = datetime.now(timezone.utc) + timedelta(hours=random.randint(12, 168))
                matches.append({
                    "match_id": f"m_{uuid.uuid4().hex[:8]}",
                    "sport": "ufc",
                    "league": f"UFC {division}",
                    "home_team": home,
                    "away_team": away,
                    "match_date": match_date.isoformat(),
                    "odds_home": round(random.uniform(1.3, 3.0), 2),
                    "odds_draw": None,
                    "odds_away": round(random.uniform(1.3, 3.0), 2),
                    "status": "upcoming",
                })
    
    random.shuffle(matches)
    return matches[:15]  # Limit to 15 matches


def generate_predictions_for_matches(matches: List[Dict]) -> List[Dict]:
    """Generate AI predictions for matches"""
    predictions = []
    
    motivations = {
        "soccer": [
            "L'AI rileva superiorità difensiva nelle ultime 5 partite e vantaggio nelle statistiche testa a testa.",
            "Forma recente dominante: 4 vittorie consecutive e miglior attacco del campionato nelle ultime giornate.",
            "Pattern storico favorevole: in trasferte simili, questa squadra vince il 72% delle volte dal 2022.",
            "Analisi xG (Expected Goals): media di 2.1 xG per partita vs 0.9 subiti. Edge statistico chiaro.",
            "Il modello rileva stanchezza avversaria (3 partite in 8 giorni) e assenze chiave in difesa.",
        ],
        "nba": [
            "Rendimento casalingo eccezionale: 8-2 nelle ultime 10 in casa. Vantaggio canestri + rimbalzi offensivi.",
            "L'AI rileva un mismatch tattico favorevole: roster profondo vs rotazioni corte dell'avversario.",
            "Back-to-back per l'avversario con trasferta lunga. Calo medio del 12% nel 4° quarto rilevato dal modello.",
            "Trend ATS (Against The Spread) favorevole: copertura nel 75% delle ultime 12 partite.",
            "Star player in forma: ultimi 5 match sopra media stagionale di 8 punti. Impact rating al massimo.",
        ],
        "ufc": [
            "Analisi striking: vantaggio del 23% nella precisione dei colpi significativi nelle ultime 3 fight.",
            "Il modello rileva superiorità nel grappling e nel takedown defense (94% nelle ultime 5 fight).",
            "Stile favorevole nel matchup: striker vs grappler con deficit nel takedown. Modello prevede KO/TKO.",
            "Analisi cardio: fighter con miglior resistenza al 3° round. L'avversario cala del 35% dopo il 2° round.",
            "Record in questa weight class: 7-1 con finish rate del 75%. Vantaggio di reach significativo.",
        ],
    }
    
    for match in matches:
        predicted_outcome = random.choice(["home", "away"] if match["sport"] != "soccer" else ["home", "draw", "away"])
        confidence = random.randint(55, 92)
        
        if predicted_outcome == "home":
            odds = match["odds_home"]
        elif predicted_outcome == "away":
            odds = match["odds_away"]
        else:
            odds = match.get("odds_draw", 3.0) or 3.0
        
        risk = "low" if confidence > 75 else "medium" if confidence > 60 else "high"
        
        sport_motivations = motivations.get(match["sport"], motivations["soccer"])
        
        predictions.append({
            "prediction_id": f"pred_{uuid.uuid4().hex[:8]}",
            "match_id": match["match_id"],
            "sport": match["sport"],
            "league": match["league"],
            "home_team": match["home_team"],
            "away_team": match["away_team"],
            "predicted_outcome": predicted_outcome,
            "confidence": confidence,
            "odds": odds,
            "risk_level": risk,
            "ai_motivation": random.choice(sport_motivations),
            "analysis": f"L'analisi AI indica {match['home_team'] if predicted_outcome == 'home' else match['away_team'] if predicted_outcome == 'away' else 'Pareggio'} come esito più probabile. Edge stimato: +{random.randint(5, 18)}%",
            "value_bet": random.random() > 0.5,
        })
    
    return predictions

# Cache matches per request cycle to keep predictions aligned
_cached_matches: Dict[str, Any] = {"data": None, "time": None}

def get_cached_matches(sport_filter: str = "all") -> List[Dict]:
    """Cache matches for 60 seconds so predictions stay aligned"""
    import time
    now = time.time()
    cache_key = f"{sport_filter}"
    
    if (_cached_matches.get("key") == cache_key and 
        _cached_matches.get("time") and 
        now - _cached_matches["time"] < 60):
        return _cached_matches["data"]
    
    matches = generate_matches(sport_filter)
    _cached_matches["data"] = matches
    _cached_matches["time"] = now
    _cached_matches["key"] = cache_key
    return matches


@api_router.get("/matches")
async def get_all_matches():
    """Get all upcoming matches"""
    return get_cached_matches("all")


@api_router.get("/matches/{sport}")
async def get_matches_by_sport(sport: str):
    """Get matches by sport"""
    if sport not in ["soccer", "nba", "ufc"]:
        raise HTTPException(status_code=400, detail="Sport non valido")
    return get_cached_matches(sport)


@api_router.get("/predictions")
async def get_all_predictions():
    """Get AI predictions for all matches"""
    matches = get_cached_matches("all")
    return generate_predictions_for_matches(matches)


@api_router.get("/predictions/{sport}")
async def get_predictions_by_sport(sport: str):
    """Get AI predictions by sport"""
    if sport not in ["soccer", "nba", "ufc"]:
        raise HTTPException(status_code=400, detail="Sport non valido")
    matches = get_cached_matches(sport)
    return generate_predictions_for_matches(matches)


# ==================== BETS ENDPOINTS ====================

@api_router.post("/bets/simulate")
async def simulate_bet(request: Request):
    """Simulate a bet - available to all users"""
    body = await request.json()
    match_id = body.get("match_id")
    bet_type = body.get("bet_type")
    stake = body.get("stake", 0)
    
    if not match_id or not bet_type or stake <= 0:
        raise HTTPException(status_code=400, detail="Parametri non validi")
    
    # Find match odds
    all_matches = get_cached_matches("all")
    match = None
    for m in all_matches:
        if m["match_id"] == match_id:
            match = m
            break
    
    if not match:
        raise HTTPException(status_code=404, detail="Partita non trovata")
    
    # Get odds based on bet type
    if bet_type == "home":
        odds = match["odds_home"]
    elif bet_type == "away":
        odds = match["odds_away"]
    elif bet_type == "draw":
        odds = match.get("odds_draw", 3.0) or 3.0
    else:
        raise HTTPException(status_code=400, detail="Tipo scommessa non valido")
    
    # Calculate simulation
    win_probability = round(1 / odds * 100, 1)
    potential_payout = round(stake * odds, 2)
    potential_profit = round(potential_payout - stake, 2)
    expected_value = round((potential_payout * win_probability / 100) - stake, 2)
    
    return {
        "match_id": match_id,
        "bet_type": bet_type,
        "stake": stake,
        "odds": odds,
        "potential_payout": potential_payout,
        "potential_profit": potential_profit,
        "win_probability": win_probability,
        "expected_value": expected_value,
        "risk_level": "low" if win_probability > 50 else "medium" if win_probability > 35 else "high",
    }


@api_router.post("/bets")
async def place_bet(request: Request, user: User = Depends(require_user)):
    """Place a virtual bet"""
    body = await request.json()
    match_id = body.get("match_id")
    bet_type = body.get("bet_type")
    stake = body.get("stake", 0)
    
    if not match_id or not bet_type or stake <= 0:
        raise HTTPException(status_code=400, detail="Parametri non validi")
    
    if stake > user.wallet_balance:
        raise HTTPException(status_code=400, detail="Saldo insufficiente")
    
    # Find match
    all_matches = get_cached_matches("all")
    match = None
    for m in all_matches:
        if m["match_id"] == match_id:
            match = m
            break
    
    if not match:
        raise HTTPException(status_code=404, detail="Partita non trovata")
    
    # Get odds
    if bet_type == "home":
        odds = match["odds_home"]
    elif bet_type == "away":
        odds = match["odds_away"]
    elif bet_type == "draw":
        odds = match.get("odds_draw", 3.0) or 3.0
    else:
        raise HTTPException(status_code=400, detail="Tipo scommessa non valido")
    
    # Simulate result (random for now)
    won = random.random() < (1 / odds)
    payout = round(stake * odds, 2) if won else 0
    profit = round(payout - stake, 2)
    
    # Update wallet
    new_balance = user.wallet_balance - stake + payout
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {"wallet_balance": round(new_balance, 2)},
         "$inc": {"total_bets": 1, "total_wins": 1 if won else 0, "total_profit": profit}}
    )
    
    # Save bet
    bet = {
        "bet_id": f"bet_{uuid.uuid4().hex[:8]}",
        "user_id": user.user_id,
        "match_id": match_id,
        "match_info": f"{match['home_team']} vs {match['away_team']}",
        "league": match["league"],
        "sport": match["sport"],
        "bet_type": bet_type,
        "odds": odds,
        "stake": stake,
        "payout": payout,
        "profit": profit,
        "won": won,
        "created_at": datetime.now(timezone.utc),
    }
    await db.bets.insert_one(bet)
    
    return {
        "success": True,
        "won": won,
        "payout": payout,
        "profit": profit,
        "new_balance": round(new_balance, 2),
        "message": f"{'Hai vinto +€' + str(payout) + '!' if won else 'Scommessa persa. Ritenta!'}",
    }


@api_router.get("/bets/history")
async def get_bet_history(user: User = Depends(require_user)):
    """Get user bet history"""
    bets = await db.bets.find({"user_id": user.user_id}, {"_id": 0}).sort("created_at", -1).limit(50).to_list(50)
    return bets


@api_router.get("/user/wallet")
async def get_wallet(user: User = Depends(require_user)):
    """Get user wallet info"""
    return {
        "balance": user.wallet_balance,
        "total_bets": user.total_bets,
        "total_wins": user.total_wins,
        "total_profit": user.total_profit,
    }


@api_router.post("/user/wallet/reset")
async def reset_wallet(user: User = Depends(require_user)):
    """Reset user wallet"""
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {"wallet_balance": 1000.0, "total_bets": 0, "total_wins": 0, "total_profit": 0.0}}
    )
    return {"success": True, "balance": 1000.0}


@api_router.get("/opportunities")
async def get_daily_opportunities():
    """Get 1-3 curated high-value daily opportunities"""
    matches = get_cached_matches("all")
    predictions = generate_predictions_for_matches(matches)
    
    # Filter for high-confidence predictions and sort
    high_value = [p for p in predictions if p["confidence"] >= 60]
    high_value.sort(key=lambda x: x["confidence"], reverse=True)
    
    opportunities = []
    for i, pred in enumerate(high_value[:3]):
        match = None
        for m in matches:
            if m["match_id"] == pred["match_id"]:
                match = m
                break
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
            "match_id": match["match_id"],
            "sport": match["sport"],
            "league": match["league"],
            "home_team": match["home_team"],
            "away_team": match["away_team"],
            "match_date": match["match_date"],
            "predicted_outcome": pred["predicted_outcome"],
            "confidence": pred["confidence"],
            "odds": pred["odds"],
            "edge_percentage": edge_pct,
            "risk_level": pred["risk_level"],
            "value_rating": "HIGH VALUE" if pred["confidence"] >= 70 else "VALUE BET",
            "explanation": random.choice(explanations),
            "ai_analysis": f"Il modello EdgeBet AI ha analizzato {random.randint(150, 500)} fattori per questa partita. Edge stimato: +{edge_pct}% rispetto alle quote di mercato. Confidenza del modello: {pred['confidence']}%.",
            "rank": i + 1,
        })
    
    return {
        "date": datetime.now(timezone.utc).strftime("%d/%m/%Y"),
        "total": len(opportunities),
        "opportunities": opportunities,
        "viewers": random.randint(80, 250),
    }


# ==================== ELITE AI PREDICTION ====================

class EliteAskRequest(BaseModel):
    query: str
    sport: Optional[str] = None

ELITE_SYSTEM_PROMPT = """Sei EdgeBet AI, un esperto analista sportivo basato su dati e statistica avanzata.
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

@api_router.post("/elite/ask")
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
            "query": req.query,
            "response": response,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "model": "EdgeBet AI v2.0"
        }
    except Exception as e:
        logger.error(f"Elite AI error: {e}")
        # Fallback mock response
        return {
            "query": req.query,
            "response": f"🏆 PREVISIONE: Basandomi sull'analisi dei dati disponibili per '{req.query}', il nostro modello AI suggerisce di attendere ulteriori dati prima di effettuare una previsione definitiva.\n\n📊 PROBABILITÀ: In fase di calcolo\n⚠️ RISCHIO: Medio\n💰 QUOTA CONSIGLIATA: Verificare le quote aggiornate\n🧠 ANALISI: Il sistema sta elaborando i dati. Riprova tra qualche secondo.",
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "model": "EdgeBet AI v2.0 (fallback)"
        }


# Elite AI Chat History
@api_router.post("/elite/save")
async def save_elite_chat(request: Request):
    """Save an Elite AI chat message to history"""
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

@api_router.get("/elite/history/{user_id}")
async def get_elite_history(user_id: str, limit: int = 20):
    """Get Elite AI chat history for a user"""
    cursor = db.elite_chats.find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit)
    chats = await cursor.to_list(length=limit)
    return {"history": chats, "count": len(chats)}


# ==================== GAMIFICATION & BADGES ====================

BADGE_DEFINITIONS = [
    {"badge_id": "first_follow", "name": "Prima Schedina", "description": "Hai seguito la tua prima schedina!", "icon": "bookmark", "category": "beginner"},
    {"badge_id": "ten_follows", "name": "Collezionista", "description": "Hai seguito 10 schedine!", "icon": "layers", "category": "intermediate"},
    {"badge_id": "streak_3", "name": "Serie Vincente", "description": "3 previsioni corrette di fila!", "icon": "flame", "category": "intermediate"},
    {"badge_id": "streak_7", "name": "Inarrestabile", "description": "7 giorni consecutivi di utilizzo!", "icon": "rocket", "category": "advanced"},
    {"badge_id": "top_pick_win", "name": "Occhio d'Aquila", "description": "Un Top Pick che hai seguito ha vinto!", "icon": "eye", "category": "intermediate"},
    {"badge_id": "elite_user", "name": "Membro Elite", "description": "Hai usato la funzione Elite AI!", "icon": "diamond", "category": "elite"},
    {"badge_id": "profit_master", "name": "Re del Profitto", "description": "ROI personale sopra il 20%!", "icon": "trending-up", "category": "advanced"},
    {"badge_id": "community", "name": "Membro della Community", "description": "Ti sei registrato su EdgeBet!", "icon": "people", "category": "beginner"},
]

@api_router.get("/badges/definitions")
async def get_badge_definitions():
    """Get all badge definitions"""
    return {"badges": BADGE_DEFINITIONS}

@api_router.get("/badges/user/{user_id}")
async def get_user_badges(user_id: str):
    """Get badges earned by a user"""
    user_doc = await db.users.find_one({"user_id": user_id})
    if not user_doc:
        return {"badges": [], "total_points": 0}

    earned = user_doc.get("badges", [])
    # Auto-grant community badge for registered users
    if "community" not in [b["badge_id"] for b in earned]:
        badge = {"badge_id": "community", "earned_at": datetime.now(timezone.utc).isoformat()}
        earned.append(badge)
        await db.users.update_one({"user_id": user_id}, {"$set": {"badges": earned}})

    # Check follow count for follow-based badges
    follow_count = user_doc.get("followed_count", 0)
    badge_ids = [b["badge_id"] for b in earned]
    if follow_count >= 1 and "first_follow" not in badge_ids:
        earned.append({"badge_id": "first_follow", "earned_at": datetime.now(timezone.utc).isoformat(), "new": True})
    if follow_count >= 10 and "ten_follows" not in badge_ids:
        earned.append({"badge_id": "ten_follows", "earned_at": datetime.now(timezone.utc).isoformat(), "new": True})

    await db.users.update_one({"user_id": user_id}, {"$set": {"badges": earned}})

    points = len(earned) * 100
    return {"badges": earned, "total_points": points, "definitions": BADGE_DEFINITIONS}

@api_router.post("/badges/check-elite/{user_id}")
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


# ==================== LEADERBOARD ====================

@api_router.get("/leaderboard")
async def get_leaderboard():
    """Get user leaderboard (mock + real users)"""
    # Mock leaderboard with realistic Italian names
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

    return {
        "leaderboard": mock_leaders,
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "total_users": 1247
    }


# ==================== NOTIFICATIONS ====================

NOTIFICATION_TYPES = {
    "value_bet": {
        "title": "Value Bet Rilevata",
        "body": "🔥 Nuova value bet disponibile — edge alto rilevato ora",
        "icon": "flame",
        "color": "#FF6B35",
        "timing": "immediato",
        "category": "alert",
    },
    "confidence_drop": {
        "title": "Fiducia Ridotta",
        "body": "⚠️ L'AI ha ridotto la fiducia su una giocata — controlla subito",
        "icon": "warning",
        "color": "#FFB800",
        "timing": "real-time",
        "category": "alert",
    },
    "nuova_schedina": {
        "title": "Schedine del Giorno",
        "body": "🎯 Nuove schedine AI disponibili oggi",
        "icon": "layers",
        "color": "#00FF88",
        "timing": "10:00",
        "category": "daily",
    },
    "pre_evento": {
        "title": "Match in Arrivo",
        "body": "⏳ Sta per iniziare — controlla le tue giocate",
        "icon": "time",
        "color": "#00B4D8",
        "timing": "30 min prima",
        "category": "event",
    },
    "quota_calo": {
        "title": "Quota in Calo",
        "body": "📉 Quota in calo — potresti perdere valore",
        "icon": "trending-down",
        "color": "#FF3B30",
        "timing": "immediato",
        "category": "alert",
    },
    "inattivita": {
        "title": "Non Perderle",
        "body": "👀 Nuove opportunità oggi — non perderle",
        "icon": "eye",
        "color": "#9B59B6",
        "timing": "24h",
        "category": "engagement",
    },
    "badge": {
        "title": "Badge Sbloccato!",
        "body": "🏆 Hai sbloccato un nuovo badge!",
        "icon": "trophy",
        "color": "#FFD700",
        "timing": "immediato",
        "category": "gamification",
    },
    "upsell": {
        "title": "Passa a Premium",
        "body": "🔒 Stai perdendo le analisi migliori — sbloccale ora",
        "icon": "lock-closed",
        "color": "#FFD700",
        "timing": "periodico",
        "category": "marketing",
    },
}

@api_router.get("/notifications/types")
async def get_notification_types():
    """Get all notification type definitions"""
    return {"types": NOTIFICATION_TYPES}


@api_router.get("/notifications/{user_id}")
async def get_user_notifications(user_id: str, limit: int = 50):
    """Get notifications for a user"""
    cursor = db.notifications.find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit)
    notifs = await cursor.to_list(length=limit)

    # If no notifications exist, seed some demo ones
    if len(notifs) == 0:
        demo_notifs = _generate_demo_notifications(user_id)
        if demo_notifs:
            await db.notifications.insert_many(demo_notifs)
            # Re-fetch without _id
            cursor = db.notifications.find(
                {"user_id": user_id}, {"_id": 0}
            ).sort("created_at", -1).limit(limit)
            notifs = await cursor.to_list(length=limit)

    unread_count = await db.notifications.count_documents({"user_id": user_id, "read": False})
    return {"notifications": notifs, "unread_count": unread_count}


@api_router.post("/notifications/mark-read/{notification_id}")
async def mark_notification_read(notification_id: str):
    """Mark a single notification as read"""
    await db.notifications.update_one(
        {"notification_id": notification_id},
        {"$set": {"read": True}}
    )
    return {"success": True}


@api_router.post("/notifications/mark-all-read/{user_id}")
async def mark_all_read(user_id: str):
    """Mark all notifications as read for a user"""
    result = await db.notifications.update_many(
        {"user_id": user_id, "read": False},
        {"$set": {"read": True}}
    )
    return {"success": True, "updated": result.modified_count}


@api_router.get("/notifications/preferences/{user_id}")
async def get_notification_preferences(user_id: str):
    """Get notification preferences for a user"""
    prefs = await db.notification_prefs.find_one({"user_id": user_id}, {"_id": 0})
    if not prefs:
        default_prefs = {
            "user_id": user_id,
            "value_bet": True,
            "confidence_drop": True,
            "nuova_schedina": True,
            "pre_evento": True,
            "quota_calo": True,
            "inattivita": True,
            "badge": True,
            "upsell": False,
            "push_enabled": True,
            "quiet_hours_start": "23:00",
            "quiet_hours_end": "07:00",
        }
        await db.notification_prefs.insert_one({**default_prefs})
        prefs = await db.notification_prefs.find_one({"user_id": user_id}, {"_id": 0})
    return {"preferences": prefs}


@api_router.put("/notifications/preferences/{user_id}")
async def update_notification_preferences(user_id: str, request: Request):
    """Update notification preferences"""
    body = await request.json()
    await db.notification_prefs.update_one(
        {"user_id": user_id},
        {"$set": body},
        upsert=True
    )
    return {"success": True}


@api_router.delete("/notifications/{notification_id}")
async def delete_notification(notification_id: str):
    """Delete a notification"""
    await db.notifications.delete_one({"notification_id": notification_id})
    return {"success": True}


def _generate_demo_notifications(user_id: str) -> list:
    """Generate demo notifications for new users"""
    now = datetime.now(timezone.utc)
    demos = [
        {
            "notification_id": str(uuid.uuid4()),
            "user_id": user_id,
            "type": "value_bet",
            "title": "Value Bet Rilevata",
            "body": "🔥 Nuova value bet disponibile — edge alto rilevato ora",
            "detail": "Man City vs Arsenal: Edge +5.6% su Arsenal @2.61",
            "icon": "flame",
            "color": "#FF6B35",
            "read": False,
            "created_at": (now - timedelta(minutes=12)).isoformat(),
            "action_url": "/live",
        },
        {
            "notification_id": str(uuid.uuid4()),
            "user_id": user_id,
            "type": "nuova_schedina",
            "title": "Schedine del Giorno",
            "body": "🎯 Nuove schedine AI disponibili oggi",
            "detail": "3 nuove schedine con confidence >75%",
            "icon": "layers",
            "color": "#00FF88",
            "read": False,
            "created_at": (now - timedelta(hours=2)).isoformat(),
            "action_url": "/schedine",
        },
        {
            "notification_id": str(uuid.uuid4()),
            "user_id": user_id,
            "type": "confidence_drop",
            "title": "Fiducia Ridotta",
            "body": "⚠️ L'AI ha ridotto la fiducia su una giocata — controlla subito",
            "detail": "Lakers vs Celtics: confidence da 78% a 62%",
            "icon": "warning",
            "color": "#FFB800",
            "read": False,
            "created_at": (now - timedelta(hours=4)).isoformat(),
            "action_url": "/",
        },
        {
            "notification_id": str(uuid.uuid4()),
            "user_id": user_id,
            "type": "pre_evento",
            "title": "Match in Arrivo",
            "body": "⏳ Sta per iniziare — controlla le tue giocate",
            "detail": "Inter vs Milan inizia tra 30 minuti",
            "icon": "time",
            "color": "#00B4D8",
            "read": True,
            "created_at": (now - timedelta(hours=6)).isoformat(),
            "action_url": "/",
        },
        {
            "notification_id": str(uuid.uuid4()),
            "user_id": user_id,
            "type": "quota_calo",
            "title": "Quota in Calo",
            "body": "📉 Quota in calo — potresti perdere valore",
            "detail": "Real Madrid @1.95 → @1.78 nelle ultime 2 ore",
            "icon": "trending-down",
            "color": "#FF3B30",
            "read": True,
            "created_at": (now - timedelta(hours=10)).isoformat(),
            "action_url": "/",
        },
        {
            "notification_id": str(uuid.uuid4()),
            "user_id": user_id,
            "type": "badge",
            "title": "Badge Sbloccato!",
            "body": "🏆 Hai sbloccato un nuovo badge!",
            "detail": "Badge 'Membro della Community' ottenuto",
            "icon": "trophy",
            "color": "#FFD700",
            "read": True,
            "created_at": (now - timedelta(days=1)).isoformat(),
            "action_url": "/profile",
        },
        {
            "notification_id": str(uuid.uuid4()),
            "user_id": user_id,
            "type": "upsell",
            "title": "Passa a Premium",
            "body": "🔒 Stai perdendo le analisi migliori — sbloccale ora",
            "detail": "Sblocca tutte le schedine AI e le analisi Elite",
            "icon": "lock-closed",
            "color": "#FFD700",
            "read": True,
            "created_at": (now - timedelta(days=2)).isoformat(),
            "action_url": "/subscribe",
        },
    ]
    return demos


# ==================== EMAIL MARKETING ====================

EMAIL_TEMPLATES = {
    "welcome": {
        "template_id": "welcome",
        "name": "Welcome",
        "subject": "Benvenuto su EdgeBet — inizia da qui",
        "preview_text": "Scopri come usare l'AI per analizzare le migliori quote ogni giorno.",
        "body_html": """
<div style="max-width:600px;margin:0 auto;background:#0B0F14;color:#E5E7EB;font-family:-apple-system,BlinkMacSystemFont,sans-serif;border-radius:16px;overflow:hidden;">
  <div style="background:linear-gradient(135deg,#0B0F14,#1A2332);padding:40px 32px;text-align:center;">
    <div style="font-size:32px;font-weight:900;color:#00FF88;">EdgeBet</div>
    <div style="color:#6B7280;font-size:14px;margin-top:8px;">L'AI che batte i bookmaker</div>
  </div>
  <div style="padding:32px;">
    <h2 style="color:#FFFFFF;font-size:22px;margin:0 0 16px;">Benvenuto su EdgeBet!</h2>
    <p style="color:#9CA3AF;font-size:15px;line-height:1.6;margin:0 0 20px;">Scopri come usare l'AI per analizzare le migliori quote ogni giorno.</p>
    <div style="background:#111820;border-radius:12px;padding:20px;margin:0 0 24px;">
      <div style="color:#00FF88;font-weight:700;margin-bottom:12px;">✅ Cosa puoi fare ora:</div>
      <div style="color:#E5E7EB;font-size:14px;line-height:2;">
        • Consulta i pronostici AI su Calcio, NBA e UFC<br/>
        • Segui le schedine AI con un tap<br/>
        • Scopri i Top Picks con il miglior edge<br/>
        • Sblocca badge e scala la classifica
      </div>
    </div>
    <a href="#" style="display:inline-block;background:#00FF88;color:#0B0F14;font-weight:700;padding:14px 32px;border-radius:12px;text-decoration:none;font-size:16px;">Inizia Ora</a>
  </div>
  <div style="padding:20px 32px;border-top:1px solid #1F2933;text-align:center;">
    <div style="color:#4B5563;font-size:12px;">EdgeBet — Pronostici AI basati su dati, non su opinioni</div>
  </div>
</div>""",
        "trigger": "Registrazione utente",
        "timing": "Immediato",
        "category": "onboarding",
    },
    "upsell": {
        "template_id": "upsell",
        "name": "Upsell Pro/Elite",
        "subject": "Stai perdendo le migliori opportunità",
        "preview_text": "Le analisi più complete sono disponibili solo per utenti Pro ed Elite.",
        "body_html": """
<div style="max-width:600px;margin:0 auto;background:#0B0F14;color:#E5E7EB;font-family:-apple-system,BlinkMacSystemFont,sans-serif;border-radius:16px;overflow:hidden;">
  <div style="background:linear-gradient(135deg,#0B0F14,#1A2332);padding:40px 32px;text-align:center;">
    <div style="font-size:32px;font-weight:900;color:#00FF88;">EdgeBet</div>
    <div style="font-size:40px;margin-top:12px;">🔒</div>
  </div>
  <div style="padding:32px;">
    <h2 style="color:#FFFFFF;font-size:22px;margin:0 0 16px;">Stai perdendo le migliori opportunità</h2>
    <p style="color:#9CA3AF;font-size:15px;line-height:1.6;margin:0 0 20px;">Le analisi più complete sono disponibili solo per utenti Pro ed Elite.</p>
    <div style="background:#111820;border-radius:12px;padding:20px;margin:0 0 16px;">
      <div style="color:#FFD700;font-weight:700;margin-bottom:12px;">⭐ Piano Pro — €9,99/mese</div>
      <div style="color:#9CA3AF;font-size:14px;line-height:1.8;">
        • Tutte le schedine AI complete<br/>
        • Pronostici con analisi AI<br/>
        • Top Picks giornalieri
      </div>
    </div>
    <div style="background:#111820;border-radius:12px;padding:20px;margin:0 0 24px;border:1px solid rgba(255,215,0,0.2);">
      <div style="color:#FFD700;font-weight:700;margin-bottom:12px;">💎 Piano Elite — €29,99/mese</div>
      <div style="color:#9CA3AF;font-size:14px;line-height:1.8;">
        • Tutto del Pro incluso<br/>
        • Elite AI — domande illimitate<br/>
        • Value bet alerts in tempo reale<br/>
        • Badge esclusivi + Classifica VIP
      </div>
    </div>
    <a href="#" style="display:inline-block;background:#FFD700;color:#0B0F14;font-weight:700;padding:14px 32px;border-radius:12px;text-decoration:none;font-size:16px;">Sblocca Ora</a>
  </div>
  <div style="padding:20px 32px;border-top:1px solid #1F2933;text-align:center;">
    <div style="color:#4B5563;font-size:12px;">EdgeBet — Non perdere il tuo vantaggio</div>
  </div>
</div>""",
        "trigger": "Utente free dopo 3 giorni",
        "timing": "3 giorni dopo registrazione",
        "category": "conversion",
    },
    "reminder": {
        "template_id": "reminder",
        "name": "Reminder Schedine",
        "subject": "Nuove schedine disponibili oggi",
        "preview_text": "Le schedine AI di oggi sono pronte — non perderle!",
        "body_html": """
<div style="max-width:600px;margin:0 auto;background:#0B0F14;color:#E5E7EB;font-family:-apple-system,BlinkMacSystemFont,sans-serif;border-radius:16px;overflow:hidden;">
  <div style="background:linear-gradient(135deg,#0B0F14,#1A2332);padding:40px 32px;text-align:center;">
    <div style="font-size:32px;font-weight:900;color:#00FF88;">EdgeBet</div>
    <div style="font-size:40px;margin-top:12px;">🎯</div>
  </div>
  <div style="padding:32px;">
    <h2 style="color:#FFFFFF;font-size:22px;margin:0 0 16px;">Nuove schedine disponibili oggi</h2>
    <p style="color:#9CA3AF;font-size:15px;line-height:1.6;margin:0 0 20px;">Le schedine AI di oggi sono pronte — non perderle!</p>
    <div style="background:#111820;border-radius:12px;padding:20px;margin:0 0 24px;">
      <div style="color:#00FF88;font-weight:700;margin-bottom:12px;">📊 Oggi per te:</div>
      <div style="color:#E5E7EB;font-size:14px;line-height:2;">
        • 3 schedine singole con confidence >80%<br/>
        • 2 schedine multiple ad alta quota<br/>
        • 1 Top Pick con edge +8.3%
      </div>
    </div>
    <a href="#" style="display:inline-block;background:#00FF88;color:#0B0F14;font-weight:700;padding:14px 32px;border-radius:12px;text-decoration:none;font-size:16px;">Vedi le Schedine</a>
  </div>
  <div style="padding:20px 32px;border-top:1px solid #1F2933;text-align:center;">
    <div style="color:#4B5563;font-size:12px;">Ricevi questa email ogni mattina alle 10:00</div>
  </div>
</div>""",
        "trigger": "Ogni mattina",
        "timing": "Ore 10:00 giornaliero",
        "category": "engagement",
    },
    "elite": {
        "template_id": "elite",
        "name": "Elite Exclusive",
        "subject": "Solo Elite vede queste opportunità",
        "preview_text": "Opportunità esclusive che solo i membri Elite possono vedere.",
        "body_html": """
<div style="max-width:600px;margin:0 auto;background:#0B0F14;color:#E5E7EB;font-family:-apple-system,BlinkMacSystemFont,sans-serif;border-radius:16px;overflow:hidden;">
  <div style="background:linear-gradient(135deg,#1A1A2E,#16213E);padding:40px 32px;text-align:center;border-bottom:2px solid #FFD700;">
    <div style="font-size:32px;font-weight:900;color:#FFD700;">EdgeBet Elite</div>
    <div style="font-size:40px;margin-top:12px;">💎</div>
  </div>
  <div style="padding:32px;">
    <h2 style="color:#FFD700;font-size:22px;margin:0 0 16px;">Solo Elite vede queste opportunità</h2>
    <p style="color:#9CA3AF;font-size:15px;line-height:1.6;margin:0 0 20px;">Opportunità esclusive che solo i membri Elite possono vedere.</p>
    <div style="background:#111820;border:1px solid rgba(255,215,0,0.2);border-radius:12px;padding:20px;margin:0 0 16px;">
      <div style="color:#FFD700;font-weight:700;margin-bottom:8px;">🔥 Value Bet Esclusiva</div>
      <div style="color:#E5E7EB;font-size:16px;font-weight:700;">Arsenal vs Man City — Arsenal @2.61</div>
      <div style="color:#00FF88;font-size:14px;margin-top:8px;">Edge: +5.6% | Confidence: 92%</div>
    </div>
    <div style="background:#111820;border:1px solid rgba(255,215,0,0.2);border-radius:12px;padding:20px;margin:0 0 24px;">
      <div style="color:#FFD700;font-weight:700;margin-bottom:8px;">🎯 Schedina Elite del Giorno</div>
      <div style="color:#E5E7EB;font-size:14px;line-height:1.8;">
        • Inter ML @1.45<br/>
        • Over 2.5 Bayern @1.60<br/>
        • Lakers +3.5 @1.90
      </div>
      <div style="color:#00FF88;font-size:16px;font-weight:800;margin-top:12px;">Quota totale: @4.41</div>
    </div>
    <a href="#" style="display:inline-block;background:#FFD700;color:#0B0F14;font-weight:700;padding:14px 32px;border-radius:12px;text-decoration:none;font-size:16px;">Apri nell'App</a>
  </div>
  <div style="padding:20px 32px;border-top:1px solid rgba(255,215,0,0.2);text-align:center;">
    <div style="color:#FFD700;font-size:12px;">EdgeBet Elite — Il vantaggio che nessun altro ha</div>
  </div>
</div>""",
        "trigger": "Utenti Elite — nuove opportunità esclusive",
        "timing": "Quando disponibile",
        "category": "exclusive",
    },
}


@api_router.get("/emails/templates")
async def get_email_templates():
    """Get all email marketing templates"""
    return {"templates": list(EMAIL_TEMPLATES.values())}


@api_router.get("/emails/template/{template_id}")
async def get_email_template(template_id: str):
    """Get a specific email template"""
    template = EMAIL_TEMPLATES.get(template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template non trovato")
    return {"template": template}


@api_router.post("/emails/send-test")
async def send_test_email(request: Request):
    """Simulate sending a test email (mock)"""
    body = await request.json()
    template_id = body.get("template_id", "welcome")
    to_email = body.get("email", "test@example.com")
    
    template = EMAIL_TEMPLATES.get(template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template non trovato")
    
    # Store in DB as "sent" email (mock)
    email_record = {
        "email_id": str(uuid.uuid4()),
        "template_id": template_id,
        "to_email": to_email,
        "subject": template["subject"],
        "status": "sent",
        "sent_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.sent_emails.insert_one(email_record)
    
    return {
        "success": True,
        "message": f"Email '{template['subject']}' inviata a {to_email} (simulazione)",
        "email_id": email_record["email_id"],
    }


@api_router.get("/emails/history")
async def get_email_history(limit: int = 20):
    """Get sent email history"""
    cursor = db.sent_emails.find({}, {"_id": 0}).sort("sent_at", -1).limit(limit)
    emails = await cursor.to_list(length=limit)
    return {"emails": emails, "count": len(emails)}


# ==================== AUTO EMAIL HELPERS ====================

async def _queue_email(template_id: str, to_email: str, user_name: str, user_id: str):
    """Queue/send an automated email (mock - stores in DB, ready for real service)"""
    template = EMAIL_TEMPLATES.get(template_id)
    if not template:
        return

    email_record = {
        "email_id": str(uuid.uuid4()),
        "template_id": template_id,
        "user_id": user_id,
        "to_email": to_email,
        "user_name": user_name,
        "subject": template["subject"],
        "trigger": template["trigger"],
        "status": "queued",
        "queued_at": datetime.now(timezone.utc).isoformat(),
        "sent_at": None,
        "auto": True,
    }
    await db.sent_emails.insert_one(email_record)
    logger.info(f"[EMAIL AUTO] {template_id} queued for {to_email} ({user_name})")

    # In production, this would call SendGrid/Mailgun here
    # For now, mark as "sent" immediately (simulation)
    await db.sent_emails.update_one(
        {"email_id": email_record["email_id"]},
        {"$set": {"status": "sent", "sent_at": datetime.now(timezone.utc).isoformat()}}
    )
    logger.info(f"[EMAIL AUTO] {template_id} sent to {to_email}")


async def _check_upsell_email(user_id: str, user_doc: dict):
    """Check if upsell email should be sent to returning free user"""
    if user_doc.get("subscription_tier") not in ["free", None]:
        return

    created_at = user_doc.get("created_at")
    if not created_at:
        return

    # Check if user registered more than 3 days ago
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at.replace("Z", "+00:00"))

    days_since = (datetime.now(timezone.utc) - created_at).days
    if days_since < 3:
        return

    # Check if upsell was already sent
    existing = await db.sent_emails.find_one({
        "user_id": user_id,
        "template_id": "upsell",
        "auto": True
    })
    if existing:
        return

    email = user_doc.get("email")
    name = user_doc.get("name", "Utente")
    if email:
        await _queue_email("upsell", email, name, user_id)


# Endpoint to check email queue status (for admin/debug)
@api_router.get("/emails/queue")
async def get_email_queue():
    """Get auto-sent email queue with status"""
    cursor = db.sent_emails.find({"auto": True}, {"_id": 0}).sort("queued_at", -1).limit(50)
    emails = await cursor.to_list(length=50)
    stats = {
        "total_sent": await db.sent_emails.count_documents({"auto": True, "status": "sent"}),
        "total_queued": await db.sent_emails.count_documents({"auto": True, "status": "queued"}),
        "welcome_sent": await db.sent_emails.count_documents({"auto": True, "template_id": "welcome"}),
        "upsell_sent": await db.sent_emails.count_documents({"auto": True, "template_id": "upsell"}),
        "reminder_sent": await db.sent_emails.count_documents({"auto": True, "template_id": "reminder"}),
        "elite_sent": await db.sent_emails.count_documents({"auto": True, "template_id": "elite"}),
    }
    return {"emails": emails, "stats": stats}


# ==================== ROOT ====================

@api_router.get("/")
async def root():
    return {"message": "EdgeBet API", "version": "2.0.0"}

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
