from fastapi import APIRouter, HTTPException, Request, Depends
import random
import uuid
from datetime import datetime, timezone
from services.database import db
from services.mock_data import get_cached_matches
from services.auth_helpers import require_user
from models.schemas import User

router = APIRouter()


@router.post("/bets/simulate")
async def simulate_bet(request: Request):
    """Simulate a bet - available to all users"""
    body = await request.json()
    match_id = body.get("match_id")
    bet_type = body.get("bet_type")
    stake = body.get("stake", 0)

    if not match_id or not bet_type or stake <= 0:
        raise HTTPException(status_code=400, detail="Parametri non validi")

    all_matches = get_cached_matches("all")
    match = next((m for m in all_matches if m["match_id"] == match_id), None)
    if not match:
        raise HTTPException(status_code=404, detail="Partita non trovata")

    if bet_type == "home":
        odds = match["odds_home"]
    elif bet_type == "away":
        odds = match["odds_away"]
    elif bet_type == "draw":
        odds = match.get("odds_draw", 3.0) or 3.0
    else:
        raise HTTPException(status_code=400, detail="Tipo scommessa non valido")

    win_probability = round(1 / odds * 100, 1)
    potential_payout = round(stake * odds, 2)
    potential_profit = round(potential_payout - stake, 2)
    expected_value = round((potential_payout * win_probability / 100) - stake, 2)

    return {
        "match_id": match_id, "bet_type": bet_type, "stake": stake, "odds": odds,
        "potential_payout": potential_payout, "potential_profit": potential_profit,
        "win_probability": win_probability, "expected_value": expected_value,
        "risk_level": "low" if win_probability > 50 else "medium" if win_probability > 35 else "high",
    }


@router.post("/bets")
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

    all_matches = get_cached_matches("all")
    match = next((m for m in all_matches if m["match_id"] == match_id), None)
    if not match:
        raise HTTPException(status_code=404, detail="Partita non trovata")

    if bet_type == "home":
        odds = match["odds_home"]
    elif bet_type == "away":
        odds = match["odds_away"]
    elif bet_type == "draw":
        odds = match.get("odds_draw", 3.0) or 3.0
    else:
        raise HTTPException(status_code=400, detail="Tipo scommessa non valido")

    won = random.random() < (1 / odds)
    payout = round(stake * odds, 2) if won else 0
    profit = round(payout - stake, 2)

    new_balance = user.wallet_balance - stake + payout
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {"wallet_balance": round(new_balance, 2)},
         "$inc": {"total_bets": 1, "total_wins": 1 if won else 0, "total_profit": profit}}
    )

    bet = {
        "bet_id": f"bet_{uuid.uuid4().hex[:8]}",
        "user_id": user.user_id, "match_id": match_id,
        "match_info": f"{match['home_team']} vs {match['away_team']}",
        "league": match["league"], "sport": match["sport"],
        "bet_type": bet_type, "odds": odds, "stake": stake,
        "payout": payout, "profit": profit, "won": won,
        "created_at": datetime.now(timezone.utc),
    }
    await db.bets.insert_one(bet)

    win_msg = f"Hai vinto +\u20ac{payout}!" if won else "Scommessa persa. Ritenta!"

    return {
        "success": True, "won": won, "payout": payout, "profit": profit,
        "new_balance": round(new_balance, 2),
        "message": win_msg,
    }


@router.get("/bets/history")
async def get_bet_history(user: User = Depends(require_user)):
    return await db.bets.find({"user_id": user.user_id}, {"_id": 0}).sort("created_at", -1).limit(50).to_list(50)


@router.get("/user/wallet")
async def get_wallet(user: User = Depends(require_user)):
    return {
        "balance": user.wallet_balance, "total_bets": user.total_bets,
        "total_wins": user.total_wins, "total_profit": user.total_profit,
    }


@router.post("/user/wallet/reset")
async def reset_wallet(user: User = Depends(require_user)):
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {"wallet_balance": 1000.0, "total_bets": 0, "total_wins": 0, "total_profit": 0.0}}
    )
    return {"success": True, "balance": 1000.0}
