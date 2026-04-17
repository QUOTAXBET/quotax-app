"""API-Football - Real football data (matches, stats, H2H, predictions)"""
import os
import httpx
import logging
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

BASE_URL = "https://v3.football.api-sports.io"
API_KEY = os.environ.get("API_FOOTBALL_KEY", "")
HEADERS = {"x-apisports-key": API_KEY}


async def _request(endpoint: str, params: dict) -> dict:
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(f"{BASE_URL}/{endpoint}", headers=HEADERS, params=params)
            if resp.status_code == 200:
                data = resp.json()
                return data.get("response", [])
            logger.warning(f"API-Football {endpoint} error {resp.status_code}")
    except Exception as e:
        logger.error(f"API-Football exception: {e}")
    return []


async def get_upcoming_fixtures(league_id: int = 135, days_ahead: int = 7) -> list:
    """Get upcoming matches for a league (135=Serie A, 39=EPL, 140=La Liga)"""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    end = (datetime.now(timezone.utc) + timedelta(days=days_ahead)).strftime("%Y-%m-%d")
    fixtures = await _request("fixtures", {"league": league_id, "season": 2025, "from": today, "to": end})
    results = []
    for f in fixtures:
        results.append({
            "fixture_id": f["fixture"]["id"],
            "home_team": f["teams"]["home"]["name"],
            "away_team": f["teams"]["away"]["name"],
            "home_logo": f["teams"]["home"]["logo"],
            "away_logo": f["teams"]["away"]["logo"],
            "league": f["league"]["name"],
            "league_logo": f["league"]["logo"],
            "date": f["fixture"]["date"],
            "status": f["fixture"]["status"]["long"],
            "venue": f["fixture"]["venue"]["name"] if f["fixture"].get("venue") else "",
        })
    return results


async def get_h2h(team1_id: int, team2_id: int, last: int = 5) -> list:
    """Get head-to-head history"""
    return await _request("fixtures/headtoheads", {"h2h": f"{team1_id}-{team2_id}", "last": last})


async def get_fixture_statistics(fixture_id: int) -> list:
    """Get match statistics (possession, shots, etc.)"""
    return await _request("fixtures/statistics", {"fixture": fixture_id})


async def get_predictions(fixture_id: int) -> list:
    """Get AI predictions from API-Football"""
    return await _request("predictions", {"fixture": fixture_id})


async def get_live_fixtures() -> list:
    """Get currently live matches"""
    return await _request("fixtures", {"live": "all"})


async def get_standings(league_id: int = 135, season: int = 2025) -> list:
    """Get league standings"""
    return await _request("standings", {"league": league_id, "season": season})


async def search_team(name: str) -> list:
    """Search for a team by name"""
    return await _request("teams", {"search": name})
