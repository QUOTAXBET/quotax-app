from fastapi import APIRouter, HTTPException, Request
from services.database import db

router = APIRouter()


@router.post("/dev/switch-tier")
async def dev_switch_tier(request: Request):
    """DEV ONLY: Switch user subscription tier for testing"""
    body = await request.json()
    user_id = body.get("user_id")
    tier = body.get("tier")

    if not user_id or not tier:
        raise HTTPException(status_code=400, detail="user_id e tier richiesti")

    if tier not in ["free", "pro", "premium"]:
        raise HTTPException(status_code=400, detail="Tier non valido. Usa: free, pro, premium")

    result = await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"subscription_tier": tier}}
    )

    if result.modified_count == 0:
        user = await db.users.find_one({"user_id": user_id})
        if not user:
            raise HTTPException(status_code=404, detail="Utente non trovato")

    user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    tier_names = {"free": "Free", "pro": "Pro (€9.99)", "premium": "Elite (€29.99)"}

    return {
        "success": True,
        "user_id": user_id,
        "new_tier": tier,
        "tier_name": tier_names.get(tier, tier),
        "message": f"Piano cambiato a {tier_names.get(tier, tier)}",
        "user": user_doc,
    }


@router.get("/dev/user/{user_id}")
async def dev_get_user(user_id: str):
    """DEV ONLY: Get full user data for debugging"""
    user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=404, detail="Utente non trovato")
    return {"user": user_doc}
