from fastapi import APIRouter
import random

router = APIRouter()


@router.get("/stats/user/{user_id}")
async def get_user_stats(user_id: str):
    """Get user performance stats (mock for demo)"""
    # Generate realistic simulated stats
    days = 30
    roi_history = []
    current_roi = 0.0
    for d in range(days):
        change = random.uniform(-3.5, 4.5)
        current_roi += change
        roi_history.append({
            "day": d + 1,
            "roi": round(current_roi, 1),
        })

    total_bets = random.randint(45, 120)
    wins = int(total_bets * random.uniform(0.58, 0.72))
    losses = total_bets - wins
    win_rate = round((wins / total_bets) * 100, 1)
    avg_stake = 50
    avg_odds = round(random.uniform(1.65, 2.20), 2)
    total_staked = total_bets * avg_stake
    profit = round(total_staked * (current_roi / 100), 2)

    weekly_roi = round(random.uniform(-2.0, 8.5), 1)
    monthly_roi = round(current_roi, 1)

    best_pick = {
        "match": f"{'Inter' if random.random() > 0.5 else 'Milan'} vs {'Juventus' if random.random() > 0.5 else 'Napoli'}",
        "outcome": "1",
        "odds": round(random.uniform(1.80, 3.50), 2),
        "profit": round(random.uniform(40, 200), 2),
    }

    return {
        "user_id": user_id,
        "total_bets": total_bets,
        "wins": wins,
        "losses": losses,
        "win_rate": win_rate,
        "roi_weekly": weekly_roi,
        "roi_monthly": monthly_roi,
        "profit_net": profit,
        "avg_odds": avg_odds,
        "avg_stake": avg_stake,
        "best_pick": best_pick,
        "roi_history": roi_history,
        "streak": random.randint(0, 7),
    }
