"""The Odds API - Real sports odds from 40+ bookmakers"""
import os
import httpx
import logging
from datetime import datetime, timezone
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

BASE_URL = "https://api.the-odds-api.com/v4"
API_KEY = os.environ.get("THE_ODDS_API_KEY", "")

# ALL supported leagues/sports
ALL_SPORTS = [
    # Soccer - Europe
    "soccer_italy_serie_a",
    "soccer_epl",
    "soccer_spain_la_liga",
    "soccer_germany_bundesliga",
    "soccer_france_ligue_one",
    "soccer_uefa_champs_league",
    "soccer_uefa_europa_league",
    "soccer_netherlands_eredivisie",
    "soccer_portugal_primeira_liga",
    "soccer_turkey_super_league",
    "soccer_belgium_first_div",
    "soccer_switzerland_superleague",
    "soccer_scotland_premiership",
    # Soccer - Americas
    "soccer_brazil_serie_a",
    "soccer_brazil_serie_b",
    "soccer_argentina_primera_division",
    "soccer_usa_mls",
    "soccer_mexico_ligamx",
    # Soccer - Other
    "soccer_australia_aleague",
    "soccer_japan_j_league",
    "soccer_korea_kleague1",
    "soccer_china_superleague",
    # Other Sports
    "basketball_nba",
    "basketball_euroleague",
    "mma_mixed_martial_arts",
    "tennis_atp_french_open",
    "tennis_wta_french_open",
]


async def get_live_odds(sport_key: str = "soccer_italy_serie_a", regions: str = "eu", markets: str = "h2h") -> list:
    """Get real-time odds from bookmakers"""
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(f"{BASE_URL}/sports/{sport_key}/odds", params={
                "apiKey": API_KEY, "regions": regions, "markets": markets, "oddsFormat": "decimal"
            })
            if resp.status_code == 200:
                return resp.json()
            logger.warning(f"Odds API error {resp.status_code}: {resp.text[:200]}")
    except Exception as e:
        logger.error(f"Odds API exception: {e}")
    return []


async def get_scores(sport_key: str = "soccer_italy_serie_a", days_from: int = 3) -> list:
    """Get scores and results"""
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(f"{BASE_URL}/sports/{sport_key}/scores", params={
                "apiKey": API_KEY, "daysFrom": days_from
            })
            if resp.status_code == 200:
                return resp.json()
    except Exception as e:
        logger.error(f"Scores API exception: {e}")
    return []


async def get_available_sports() -> list:
    """Get list of available sports"""
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(f"{BASE_URL}/sports", params={"apiKey": API_KEY})
            if resp.status_code == 200:
                return resp.json()
    except Exception as e:
        logger.error(f"Sports API exception: {e}")
    return []


async def get_all_available_odds(max_sports: int = 8) -> list:
    """Fetch odds from multiple sports/leagues at once. Uses caching to save API calls."""
    import time
    global _odds_cache, _cache_time
    
    # Cache for 5 minutes to save API calls
    if hasattr(get_all_available_odds, '_cache') and hasattr(get_all_available_odds, '_cache_time'):
        if time.time() - get_all_available_odds._cache_time < 300:
            return get_all_available_odds._cache
    
    all_odds = []
    fetched = 0
    for sport_key in ALL_SPORTS:
        if fetched >= max_sports:
            break
        data = await get_live_odds(sport_key)
        if data:
            all_odds.extend(data)
            fetched += 1
            logger.info(f"Fetched {len(data)} events from {sport_key}")
    
    get_all_available_odds._cache = all_odds
    get_all_available_odds._cache_time = time.time()
    logger.info(f"Total: {len(all_odds)} events from {fetched} sports")
    return all_odds


def calculate_value_bets(odds_data: list, min_edge: float = 3.0) -> list:
    """Detect value bets by comparing bookmaker odds"""
    value_bets = []
    for event in odds_data:
        if not event.get("bookmakers"):
            continue

        home = event.get("home_team", "")
        away = event.get("away_team", "")

        # Collect all odds for each outcome
        outcome_odds = {}
        for bk in event["bookmakers"]:
            for market in bk.get("markets", []):
                for outcome in market.get("outcomes", []):
                    name = outcome["name"]
                    if name not in outcome_odds:
                        outcome_odds[name] = []
                    outcome_odds[name].append({"bookmaker": bk["title"], "odds": outcome["price"]})

        # Find value bets (highest odds vs average)
        for outcome_name, odds_list in outcome_odds.items():
            if len(odds_list) < 3:
                continue
            prices = [o["odds"] for o in odds_list]
            avg_odds = sum(prices) / len(prices)
            max_entry = max(odds_list, key=lambda x: x["odds"])
            edge = ((max_entry["odds"] / avg_odds) - 1) * 100

            if edge >= min_edge:
                value_bets.append({
                    "home_team": home,
                    "away_team": away,
                    "sport": event.get("sport_key", ""),
                    "league": event.get("sport_title", ""),
                    "outcome_label": outcome_name,
                    "bookmaker": max_entry["bookmaker"],
                    "bookmaker_odds": max_entry["odds"],
                    "ai_estimated_odds": round(avg_odds, 2),
                    "edge_percentage": round(edge, 1),
                    "risk_level": "low" if edge < 5 else "medium" if edge < 10 else "high",
                    "commence_time": event.get("commence_time", ""),
                })
    return sorted(value_bets, key=lambda x: x["edge_percentage"], reverse=True)[:10]
