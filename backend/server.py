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

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ==================== MODELS ====================

class User(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    wallet_balance: float = 1000.0  # Start with $1000 virtual money
    total_bets: int = 0
    total_wins: int = 0
    total_profit: float = 0.0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserSession(BaseModel):
    session_id: str
    user_id: str
    session_token: str
    expires_at: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Match(BaseModel):
    match_id: str
    sport: str  # soccer, nba, ufc
    league: str
    home_team: str
    away_team: str
    home_logo: Optional[str] = None
    away_logo: Optional[str] = None
    match_date: datetime
    status: str = "upcoming"  # upcoming, live, finished
    home_score: Optional[int] = None
    away_score: Optional[int] = None
    odds_home: float
    odds_draw: Optional[float] = None  # Not for UFC
    odds_away: float
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Prediction(BaseModel):
    prediction_id: str
    match_id: str
    sport: str
    predicted_outcome: str  # home, draw, away, over, under
    confidence: float  # 0-100
    reasoning: str
    odds: float
    expected_value: float
    risk_level: str  # low, medium, high
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Bet(BaseModel):
    bet_id: str
    user_id: str
    match_id: str
    sport: str
    bet_type: str  # home, draw, away, over, under
    stake: float
    odds: float
    potential_payout: float
    status: str = "pending"  # pending, won, lost
    actual_payout: float = 0.0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    settled_at: Optional[datetime] = None

class PreMadeBet(BaseModel):
    premade_id: str
    name: str
    description: str
    sport: str
    matches: List[str]  # List of match_ids
    total_odds: float
    confidence: float
    stake_recommendation: float
    potential_payout: float
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Request/Response Models
class BetCreate(BaseModel):
    match_id: str
    bet_type: str
    stake: float

class SimulateBetRequest(BaseModel):
    match_id: str
    bet_type: str
    stake: float

# ==================== MOCK DATA GENERATORS ====================

SOCCER_LEAGUES = {
    "Premier League": [
        "Manchester City", "Arsenal", "Liverpool", "Manchester United", 
        "Chelsea", "Tottenham", "Newcastle", "Brighton", "Aston Villa", "West Ham"
    ],
    "La Liga": [
        "Real Madrid", "Barcelona", "Atletico Madrid", "Sevilla", 
        "Real Sociedad", "Villarreal", "Athletic Bilbao", "Valencia"
    ],
    "Serie A": [
        "Inter Milan", "AC Milan", "Juventus", "Napoli", 
        "Roma", "Lazio", "Atalanta", "Fiorentina"
    ],
    "Bundesliga": [
        "Bayern Munich", "Borussia Dortmund", "RB Leipzig", "Bayer Leverkusen",
        "Wolfsburg", "Eintracht Frankfurt", "Union Berlin", "Freiburg"
    ],
    "Ligue 1": [
        "PSG", "Monaco", "Marseille", "Lyon", "Lille", "Nice", "Lens", "Rennes"
    ],
    "Champions League": [
        "Real Madrid", "Manchester City", "Bayern Munich", "PSG",
        "Inter Milan", "Barcelona", "Arsenal", "Borussia Dortmund"
    ]
}

NBA_TEAMS = [
    "Los Angeles Lakers", "Golden State Warriors", "Boston Celtics", "Miami Heat",
    "Phoenix Suns", "Milwaukee Bucks", "Denver Nuggets", "Philadelphia 76ers",
    "Brooklyn Nets", "Dallas Mavericks", "Memphis Grizzlies", "Cleveland Cavaliers",
    "New York Knicks", "Chicago Bulls", "Toronto Raptors", "Atlanta Hawks"
]

UFC_FIGHTERS = {
    "Heavyweight": ["Jon Jones", "Ciryl Gane", "Tom Aspinall", "Curtis Blaydes", "Sergei Pavlovich"],
    "Light Heavyweight": ["Alex Pereira", "Jamahal Hill", "Jiri Prochazka", "Magomed Ankalaev"],
    "Middleweight": ["Dricus Du Plessis", "Israel Adesanya", "Sean Strickland", "Robert Whittaker"],
    "Welterweight": ["Leon Edwards", "Kamaru Usman", "Belal Muhammad", "Colby Covington"],
    "Lightweight": ["Islam Makhachev", "Charles Oliveira", "Dustin Poirier", "Justin Gaethje"],
    "Featherweight": ["Ilia Topuria", "Alexander Volkanovski", "Max Holloway", "Brian Ortega"],
    "Bantamweight": ["Merab Dvalishvili", "Sean O'Malley", "Petr Yan", "Cory Sandhagen"]
}

def generate_odds():
    """Generate realistic betting odds"""
    base = random.uniform(1.2, 3.5)
    return round(base, 2)

def generate_match_id():
    return f"match_{uuid.uuid4().hex[:12]}"

def generate_prediction_id():
    return f"pred_{uuid.uuid4().hex[:12]}"

def generate_soccer_matches(count: int = 10) -> List[Dict]:
    matches = []
    for _ in range(count):
        league = random.choice(list(SOCCER_LEAGUES.keys()))
        teams = SOCCER_LEAGUES[league]
        home, away = random.sample(teams, 2)
        
        home_odds = generate_odds()
        draw_odds = round(random.uniform(2.8, 4.0), 2)
        away_odds = generate_odds()
        
        # Adjust odds to be more realistic
        total = 1/home_odds + 1/draw_odds + 1/away_odds
        margin = 0.05  # 5% bookmaker margin
        
        match = {
            "match_id": generate_match_id(),
            "sport": "soccer",
            "league": league,
            "home_team": home,
            "away_team": away,
            "match_date": datetime.now(timezone.utc) + timedelta(hours=random.randint(1, 72)),
            "status": "upcoming",
            "odds_home": home_odds,
            "odds_draw": draw_odds,
            "odds_away": away_odds,
            "created_at": datetime.now(timezone.utc)
        }
        matches.append(match)
    return matches

def generate_nba_matches(count: int = 8) -> List[Dict]:
    matches = []
    used_teams = set()
    
    for _ in range(count):
        available = [t for t in NBA_TEAMS if t not in used_teams]
        if len(available) < 2:
            used_teams.clear()
            available = NBA_TEAMS
        
        home, away = random.sample(available, 2)
        used_teams.add(home)
        used_teams.add(away)
        
        home_odds = generate_odds()
        away_odds = round(random.uniform(1.5, 3.0), 2)
        
        match = {
            "match_id": generate_match_id(),
            "sport": "nba",
            "league": "NBA",
            "home_team": home,
            "away_team": away,
            "match_date": datetime.now(timezone.utc) + timedelta(hours=random.randint(1, 48)),
            "status": "upcoming",
            "odds_home": home_odds,
            "odds_draw": None,
            "odds_away": away_odds,
            "created_at": datetime.now(timezone.utc)
        }
        matches.append(match)
    return matches

def generate_ufc_matches(count: int = 6) -> List[Dict]:
    matches = []
    
    for _ in range(count):
        division = random.choice(list(UFC_FIGHTERS.keys()))
        fighters = UFC_FIGHTERS[division]
        fighter1, fighter2 = random.sample(fighters, 2)
        
        home_odds = generate_odds()
        away_odds = round(random.uniform(1.4, 4.0), 2)
        
        match = {
            "match_id": generate_match_id(),
            "sport": "ufc",
            "league": f"UFC {division}",
            "home_team": fighter1,
            "away_team": fighter2,
            "match_date": datetime.now(timezone.utc) + timedelta(days=random.randint(1, 14)),
            "status": "upcoming",
            "odds_home": home_odds,
            "odds_draw": None,
            "odds_away": away_odds,
            "created_at": datetime.now(timezone.utc)
        }
        matches.append(match)
    return matches

def generate_prediction(match: Dict) -> Dict:
    """Generate AI-like prediction for a match"""
    sport = match["sport"]
    
    # Determine predicted outcome based on odds (lower odds = more likely to win)
    home_prob = 1 / match["odds_home"]
    away_prob = 1 / match["odds_away"]
    
    if sport == "soccer" and match.get("odds_draw"):
        draw_prob = 1 / match["odds_draw"]
        total_prob = home_prob + draw_prob + away_prob
        home_prob /= total_prob
        draw_prob /= total_prob
        away_prob /= total_prob
        
        if home_prob > draw_prob and home_prob > away_prob:
            outcome = "home"
            confidence = min(95, home_prob * 100 + random.uniform(-10, 15))
            odds = match["odds_home"]
        elif draw_prob > away_prob:
            outcome = "draw"
            confidence = min(85, draw_prob * 100 + random.uniform(-5, 10))
            odds = match["odds_draw"]
        else:
            outcome = "away"
            confidence = min(95, away_prob * 100 + random.uniform(-10, 15))
            odds = match["odds_away"]
    else:
        total_prob = home_prob + away_prob
        home_prob /= total_prob
        away_prob /= total_prob
        
        if home_prob > away_prob:
            outcome = "home"
            confidence = min(95, home_prob * 100 + random.uniform(-5, 15))
            odds = match["odds_home"]
        else:
            outcome = "away"
            confidence = min(95, away_prob * 100 + random.uniform(-5, 15))
            odds = match["odds_away"]
    
    confidence = max(45, round(confidence, 1))
    
    # Calculate expected value
    ev = (confidence / 100 * odds) - 1
    ev = round(ev * 100, 2)
    
    # Determine risk level
    if confidence >= 70:
        risk = "low"
    elif confidence >= 55:
        risk = "medium"
    else:
        risk = "high"
    
    # Generate reasoning
    reasonings = {
        "soccer": {
            "home": f"{match['home_team']} has strong home form and favorable head-to-head record. Recent performances suggest a likely win.",
            "away": f"{match['away_team']} is in excellent form and has historically performed well against {match['home_team']}.",
            "draw": f"Both teams are evenly matched. {match['home_team']} and {match['away_team']} have similar recent form."
        },
        "nba": {
            "home": f"{match['home_team']} has home court advantage and key players are in peak form. Statistical analysis favors them.",
            "away": f"{match['away_team']} has been dominant on the road. Their offensive efficiency rating surpasses {match['home_team']}."
        },
        "ufc": {
            "home": f"{match['home_team']} has better striking accuracy and grappling defense. Style matchup favors them.",
            "away": f"{match['away_team']} has superior cardio and finishing rate. Historical data suggests a likely victory."
        }
    }
    
    reasoning = reasonings.get(sport, {}).get(outcome, "Statistical analysis and historical data favor this outcome.")
    
    return {
        "prediction_id": generate_prediction_id(),
        "match_id": match["match_id"],
        "sport": sport,
        "predicted_outcome": outcome,
        "confidence": confidence,
        "reasoning": reasoning,
        "odds": odds,
        "expected_value": ev,
        "risk_level": risk,
        "created_at": datetime.now(timezone.utc)
    }

def generate_premade_bets(matches: List[Dict]) -> List[Dict]:
    """Generate pre-made bet combinations"""
    premade_bets = []
    
    # Group matches by sport
    by_sport = {}
    for m in matches:
        sport = m["sport"]
        if sport not in by_sport:
            by_sport[sport] = []
        by_sport[sport].append(m)
    
    bet_names = [
        ("Safe Play", "Low risk accumulator with high confidence picks", 0.7, 50),
        ("Value Hunter", "Medium risk bets with excellent expected value", 0.6, 30),
        ("Big Odds Special", "Higher risk for bigger rewards", 0.5, 20),
        ("Today's Best", "Top picks for maximum confidence", 0.75, 40),
        ("Expert Combo", "Carefully selected multi-sport accumulator", 0.65, 35)
    ]
    
    for name, desc, min_conf, stake_rec in bet_names:
        # Pick 2-4 random matches
        num_picks = random.randint(2, 4)
        selected_matches = random.sample(matches, min(num_picks, len(matches)))
        
        total_odds = 1.0
        match_ids = []
        avg_conf = 0
        
        for m in selected_matches:
            # Pick a random outcome
            if m["sport"] == "soccer" and m.get("odds_draw"):
                outcome = random.choice(["home", "draw", "away"])
                if outcome == "home":
                    odds = m["odds_home"]
                elif outcome == "draw":
                    odds = m["odds_draw"]
                else:
                    odds = m["odds_away"]
            else:
                outcome = random.choice(["home", "away"])
                odds = m["odds_home"] if outcome == "home" else m["odds_away"]
            
            total_odds *= odds
            match_ids.append(m["match_id"])
            avg_conf += random.uniform(55, 80)
        
        avg_conf = round(avg_conf / len(selected_matches), 1)
        total_odds = round(total_odds, 2)
        
        premade = {
            "premade_id": f"premade_{uuid.uuid4().hex[:8]}",
            "name": name,
            "description": desc,
            "sport": "mixed" if len(set(m["sport"] for m in selected_matches)) > 1 else selected_matches[0]["sport"],
            "matches": match_ids,
            "total_odds": total_odds,
            "confidence": avg_conf,
            "stake_recommendation": stake_rec,
            "potential_payout": round(stake_rec * total_odds, 2),
            "created_at": datetime.now(timezone.utc)
        }
        premade_bets.append(premade)
    
    return premade_bets

# ==================== AUTH HELPERS ====================

async def get_current_user(request: Request) -> User:
    """Get current user from session token"""
    # Try cookie first
    session_token = request.cookies.get("session_token")
    
    # Fallback to Authorization header
    if not session_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header.split(" ")[1]
    
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Find session
    session_doc = await db.user_sessions.find_one(
        {"session_token": session_token},
        {"_id": 0}
    )
    
    if not session_doc:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    # Check expiry
    expires_at = session_doc["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    
    # Get user
    user_doc = await db.users.find_one(
        {"user_id": session_doc["user_id"]},
        {"_id": 0}
    )
    
    if not user_doc:
        raise HTTPException(status_code=401, detail="User not found")
    
    return User(**user_doc)

# ==================== AUTH ENDPOINTS ====================

@api_router.post("/auth/session")
async def create_session(request: Request, response: Response):
    """Exchange session_id from Emergent Auth for session token"""
    try:
        body = await request.json()
        session_id = body.get("session_id")
        
        if not session_id:
            raise HTTPException(status_code=400, detail="session_id required")
        
        # Call Emergent Auth to get user data
        async with httpx.AsyncClient() as client:
            auth_response = await client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": session_id}
            )
            
            if auth_response.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid session_id")
            
            auth_data = auth_response.json()
        
        email = auth_data.get("email")
        name = auth_data.get("name")
        picture = auth_data.get("picture")
        emergent_session_token = auth_data.get("session_token")
        
        # Check if user exists
        existing_user = await db.users.find_one({"email": email}, {"_id": 0})
        
        if existing_user:
            user_id = existing_user["user_id"]
            # Update user info
            await db.users.update_one(
                {"user_id": user_id},
                {"$set": {"name": name, "picture": picture}}
            )
        else:
            # Create new user
            user_id = f"user_{uuid.uuid4().hex[:12]}"
            new_user = {
                "user_id": user_id,
                "email": email,
                "name": name,
                "picture": picture,
                "wallet_balance": 1000.0,
                "total_bets": 0,
                "total_wins": 0,
                "total_profit": 0.0,
                "created_at": datetime.now(timezone.utc)
            }
            await db.users.insert_one(new_user)
        
        # Create session
        session_token = emergent_session_token or f"session_{uuid.uuid4().hex}"
        expires_at = datetime.now(timezone.utc) + timedelta(days=7)
        
        await db.user_sessions.insert_one({
            "session_id": str(uuid.uuid4()),
            "user_id": user_id,
            "session_token": session_token,
            "expires_at": expires_at,
            "created_at": datetime.now(timezone.utc)
        })
        
        # Set cookie
        response.set_cookie(
            key="session_token",
            value=session_token,
            httponly=True,
            secure=True,
            samesite="none",
            path="/",
            max_age=7 * 24 * 60 * 60
        )
        
        # Get user data
        user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
        
        return {"user": user_doc, "session_token": session_token}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Session creation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/auth/me")
async def get_me(user: User = Depends(get_current_user)):
    """Get current user info"""
    return user.dict()

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    """Logout user"""
    session_token = request.cookies.get("session_token")
    
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    
    response.delete_cookie(key="session_token", path="/")
    return {"message": "Logged out successfully"}

# ==================== MATCHES ENDPOINTS ====================

@api_router.get("/matches")
async def get_all_matches():
    """Get all matches"""
    matches = await db.matches.find({}, {"_id": 0}).to_list(100)
    
    if not matches:
        # Generate mock data
        all_matches = []
        all_matches.extend(generate_soccer_matches(10))
        all_matches.extend(generate_nba_matches(8))
        all_matches.extend(generate_ufc_matches(6))
        
        # Save to database
        if all_matches:
            await db.matches.insert_many(all_matches)
        
        matches = all_matches
    
    return matches

@api_router.get("/matches/{sport}")
async def get_matches_by_sport(sport: str):
    """Get matches by sport"""
    if sport not in ["soccer", "nba", "ufc"]:
        raise HTTPException(status_code=400, detail="Invalid sport. Use: soccer, nba, ufc")
    
    matches = await db.matches.find({"sport": sport}, {"_id": 0}).to_list(100)
    
    if not matches:
        # Generate mock data for this sport
        if sport == "soccer":
            matches = generate_soccer_matches(10)
        elif sport == "nba":
            matches = generate_nba_matches(8)
        else:
            matches = generate_ufc_matches(6)
        
        if matches:
            await db.matches.insert_many(matches)
    
    return matches

@api_router.get("/match/{match_id}")
async def get_match(match_id: str):
    """Get a specific match"""
    match = await db.matches.find_one({"match_id": match_id}, {"_id": 0})
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    return match

# ==================== PREDICTIONS ENDPOINTS ====================

@api_router.get("/predictions")
async def get_all_predictions():
    """Get all predictions"""
    predictions = await db.predictions.find({}, {"_id": 0}).to_list(100)
    
    if not predictions:
        # Generate predictions for all matches
        matches = await db.matches.find({}, {"_id": 0}).to_list(100)
        
        if not matches:
            # First generate matches
            matches = await get_all_matches()
        
        predictions = [generate_prediction(m) for m in matches]
        
        if predictions:
            await db.predictions.insert_many([p for p in predictions])
    
    return predictions

@api_router.get("/predictions/{sport}")
async def get_predictions_by_sport(sport: str):
    """Get predictions by sport"""
    if sport not in ["soccer", "nba", "ufc"]:
        raise HTTPException(status_code=400, detail="Invalid sport. Use: soccer, nba, ufc")
    
    predictions = await db.predictions.find({"sport": sport}, {"_id": 0}).to_list(100)
    
    if not predictions:
        # Get matches first
        matches = await db.matches.find({"sport": sport}, {"_id": 0}).to_list(100)
        
        if not matches:
            matches = await get_matches_by_sport(sport)
        
        predictions = [generate_prediction(m) for m in matches]
        
        if predictions:
            await db.predictions.insert_many([p for p in predictions])
    
    return predictions

@api_router.get("/prediction/{match_id}")
async def get_prediction_for_match(match_id: str):
    """Get prediction for a specific match"""
    prediction = await db.predictions.find_one({"match_id": match_id}, {"_id": 0})
    
    if not prediction:
        match = await db.matches.find_one({"match_id": match_id}, {"_id": 0})
        if not match:
            raise HTTPException(status_code=404, detail="Match not found")
        
        prediction = generate_prediction(match)
        await db.predictions.insert_one(prediction)
    
    return prediction

# ==================== BETTING ENDPOINTS ====================

@api_router.post("/bets")
async def place_bet(bet_data: BetCreate, user: User = Depends(get_current_user)):
    """Place a new bet"""
    # Get match
    match = await db.matches.find_one({"match_id": bet_data.match_id}, {"_id": 0})
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    
    # Validate bet type
    valid_types = ["home", "away"]
    if match["sport"] == "soccer":
        valid_types.append("draw")
    
    if bet_data.bet_type not in valid_types:
        raise HTTPException(status_code=400, detail=f"Invalid bet type. Use: {valid_types}")
    
    # Check wallet balance
    if bet_data.stake > user.wallet_balance:
        raise HTTPException(status_code=400, detail="Insufficient balance")
    
    if bet_data.stake <= 0:
        raise HTTPException(status_code=400, detail="Stake must be positive")
    
    # Get odds
    if bet_data.bet_type == "home":
        odds = match["odds_home"]
    elif bet_data.bet_type == "draw":
        odds = match["odds_draw"]
    else:
        odds = match["odds_away"]
    
    potential_payout = round(bet_data.stake * odds, 2)
    
    # Create bet
    bet = {
        "bet_id": f"bet_{uuid.uuid4().hex[:12]}",
        "user_id": user.user_id,
        "match_id": bet_data.match_id,
        "sport": match["sport"],
        "bet_type": bet_data.bet_type,
        "stake": bet_data.stake,
        "odds": odds,
        "potential_payout": potential_payout,
        "status": "pending",
        "actual_payout": 0.0,
        "created_at": datetime.now(timezone.utc),
        "settled_at": None
    }
    
    await db.bets.insert_one(bet)
    
    # Update wallet
    new_balance = user.wallet_balance - bet_data.stake
    await db.users.update_one(
        {"user_id": user.user_id},
        {
            "$set": {"wallet_balance": new_balance},
            "$inc": {"total_bets": 1}
        }
    )
    
    return {
        "bet": {k: v for k, v in bet.items() if k != "_id"},
        "new_balance": new_balance
    }

@api_router.post("/bets/simulate")
async def simulate_bet(sim_data: SimulateBetRequest):
    """Simulate a bet without placing it (for non-logged in users or testing)"""
    match = await db.matches.find_one({"match_id": sim_data.match_id}, {"_id": 0})
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    
    # Get odds
    if sim_data.bet_type == "home":
        odds = match["odds_home"]
    elif sim_data.bet_type == "draw":
        odds = match.get("odds_draw", 0)
    else:
        odds = match["odds_away"]
    
    if not odds:
        raise HTTPException(status_code=400, detail="Invalid bet type for this match")
    
    potential_payout = round(sim_data.stake * odds, 2)
    profit = round(potential_payout - sim_data.stake, 2)
    
    # Get prediction for this match
    prediction = await db.predictions.find_one({"match_id": sim_data.match_id}, {"_id": 0})
    
    win_probability = 0
    if prediction:
        if prediction["predicted_outcome"] == sim_data.bet_type:
            win_probability = prediction["confidence"]
        else:
            win_probability = max(10, 100 - prediction["confidence"])
    else:
        win_probability = round((1 / odds) * 100, 1)
    
    expected_value = round((win_probability / 100 * potential_payout) - sim_data.stake, 2)
    
    return {
        "stake": sim_data.stake,
        "odds": odds,
        "potential_payout": potential_payout,
        "potential_profit": profit,
        "win_probability": win_probability,
        "expected_value": expected_value,
        "match": match
    }

@api_router.get("/bets/history")
async def get_bet_history(user: User = Depends(get_current_user)):
    """Get user's betting history"""
    bets = await db.bets.find(
        {"user_id": user.user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return bets

@api_router.post("/bets/{bet_id}/settle")
async def settle_bet(bet_id: str, won: bool, user: User = Depends(get_current_user)):
    """Manually settle a bet (for simulation)"""
    bet = await db.bets.find_one(
        {"bet_id": bet_id, "user_id": user.user_id},
        {"_id": 0}
    )
    
    if not bet:
        raise HTTPException(status_code=404, detail="Bet not found")
    
    if bet["status"] != "pending":
        raise HTTPException(status_code=400, detail="Bet already settled")
    
    actual_payout = bet["potential_payout"] if won else 0.0
    profit = actual_payout - bet["stake"] if won else -bet["stake"]
    
    await db.bets.update_one(
        {"bet_id": bet_id},
        {
            "$set": {
                "status": "won" if won else "lost",
                "actual_payout": actual_payout,
                "settled_at": datetime.now(timezone.utc)
            }
        }
    )
    
    # Update user stats
    update_query = {
        "$inc": {"total_profit": profit}
    }
    if won:
        update_query["$inc"]["total_wins"] = 1
        update_query["$inc"]["wallet_balance"] = actual_payout
    
    await db.users.update_one(
        {"user_id": user.user_id},
        update_query
    )
    
    # Get updated user
    updated_user = await db.users.find_one({"user_id": user.user_id}, {"_id": 0})
    
    return {
        "bet_id": bet_id,
        "status": "won" if won else "lost",
        "actual_payout": actual_payout,
        "profit": profit,
        "new_balance": updated_user["wallet_balance"]
    }

# ==================== PRE-MADE BETS ENDPOINTS ====================

@api_router.get("/premade-bets")
async def get_premade_bets():
    """Get pre-made bet combinations"""
    premade = await db.premade_bets.find({}, {"_id": 0}).to_list(20)
    
    if not premade:
        # Generate pre-made bets
        matches = await db.matches.find({}, {"_id": 0}).to_list(100)
        
        if not matches:
            matches = await get_all_matches()
        
        premade = generate_premade_bets(matches)
        
        if premade:
            await db.premade_bets.insert_many(premade)
    
    return premade

@api_router.get("/premade-bets/{sport}")
async def get_premade_bets_by_sport(sport: str):
    """Get pre-made bets filtered by sport"""
    if sport not in ["soccer", "nba", "ufc", "mixed"]:
        raise HTTPException(status_code=400, detail="Invalid sport")
    
    premade = await db.premade_bets.find({"sport": sport}, {"_id": 0}).to_list(20)
    return premade

# ==================== USER ENDPOINTS ====================

@api_router.get("/user/wallet")
async def get_wallet(user: User = Depends(get_current_user)):
    """Get user wallet info"""
    return {
        "balance": user.wallet_balance,
        "total_bets": user.total_bets,
        "total_wins": user.total_wins,
        "total_profit": user.total_profit,
        "win_rate": round((user.total_wins / user.total_bets * 100) if user.total_bets > 0 else 0, 1)
    }

@api_router.post("/user/wallet/reset")
async def reset_wallet(user: User = Depends(get_current_user)):
    """Reset user wallet to $1000"""
    await db.users.update_one(
        {"user_id": user.user_id},
        {
            "$set": {
                "wallet_balance": 1000.0,
                "total_bets": 0,
                "total_wins": 0,
                "total_profit": 0.0
            }
        }
    )
    
    # Clear bet history
    await db.bets.delete_many({"user_id": user.user_id})
    
    return {"message": "Wallet reset to $1000", "balance": 1000.0}

# ==================== DATA REFRESH ====================

@api_router.post("/refresh-data")
async def refresh_data():
    """Refresh all mock data"""
    # Clear existing data
    await db.matches.delete_many({})
    await db.predictions.delete_many({})
    await db.premade_bets.delete_many({})
    
    # Generate new data
    all_matches = []
    all_matches.extend(generate_soccer_matches(10))
    all_matches.extend(generate_nba_matches(8))
    all_matches.extend(generate_ufc_matches(6))
    
    await db.matches.insert_many(all_matches)
    
    predictions = [generate_prediction(m) for m in all_matches]
    await db.predictions.insert_many(predictions)
    
    premade = generate_premade_bets(all_matches)
    await db.premade_bets.insert_many(premade)
    
    return {
        "message": "Data refreshed",
        "matches": len(all_matches),
        "predictions": len(predictions),
        "premade_bets": len(premade)
    }

# ==================== STATS ENDPOINTS ====================

@api_router.get("/stats/overview")
async def get_overview_stats():
    """Get overview statistics"""
    total_matches = await db.matches.count_documents({})
    total_predictions = await db.predictions.count_documents({})
    
    # Get high confidence predictions
    high_conf = await db.predictions.count_documents({"confidence": {"$gte": 70}})
    
    # Get predictions by risk level
    low_risk = await db.predictions.count_documents({"risk_level": "low"})
    med_risk = await db.predictions.count_documents({"risk_level": "medium"})
    high_risk = await db.predictions.count_documents({"risk_level": "high"})
    
    return {
        "total_matches": total_matches,
        "total_predictions": total_predictions,
        "high_confidence_picks": high_conf,
        "risk_distribution": {
            "low": low_risk,
            "medium": med_risk,
            "high": high_risk
        }
    }

# ==================== ROOT ENDPOINT ====================

@api_router.get("/")
async def root():
    return {"message": "BetSmart AI API", "version": "1.0.0"}

# Include the router in the main app
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
