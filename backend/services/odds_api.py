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

SPORT_MAP = {
    "soccer": "soccer_italy_serie_a",
    "soccer_epl": "soccer_epl",
    "soccer_la_liga": "soccer_spain_la_liga",
    "soccer_champions": "soccer_uefa_champs_league",
    "nba": "basketball_nba",
    "ufc": "mma_mixed_martial_arts",
}


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
