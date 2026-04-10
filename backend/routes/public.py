from fastapi import APIRouter
import random
from services.mock_data import PLATFORM_STATS, generate_schedine

router = APIRouter()


@router.get("/public/stats")
async def get_public_stats():
    """Stats for homepage - builds trust"""
    return {
        **PLATFORM_STATS,
        "active_users": random.randint(124, 256),
        "last_win": {"amount": round(random.uniform(50, 350), 2), "time": f"{random.randint(1, 15)} min fa"},
    }


@router.get("/public/preview-schedine")
async def get_preview_schedine():
    """Limited schedine for guests - creates curiosity"""
    all_schedine = generate_schedine(8, include_premium=True)
    preview = []
    for i, sch in enumerate(all_schedine[:5]):
        if i == 0 and sch["status"] == "won":
            preview.append({**sch, "is_locked": False, "is_blurred": False})
        elif i < 3:
            preview.append({**sch, "is_locked": True, "is_blurred": True})
        else:
            preview.append({**sch, "is_locked": True, "is_blurred": True, "matches": []})
    return preview


@router.get("/public/bankroll-preview")
async def get_bankroll_preview():
    """Bankroll chart preview - slightly blurred for guests"""
    return {
        "data": PLATFORM_STATS["bankroll_history"],
        "is_complete": False,
        "message": "Registrati per vedere lo storico completo"
    }
