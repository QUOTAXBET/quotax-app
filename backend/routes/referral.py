from fastapi import APIRouter, HTTPException
from datetime import datetime, timezone
import random
import string
import logging
from services.database import db

logger = logging.getLogger(__name__)
router = APIRouter()

REFERRAL_MILESTONES = [
    {"count": 1, "badge": "Primo invito", "reward": None, "emoji": "🏆", "popup": "🏆 Hai invitato il tuo primo amico!"},
    {"count": 5, "badge": "5 amici invitati", "reward": "pro_1month", "emoji": "🔥", "popup": "🔥 Hai invitato 5 amici — hai sbloccato 1 mese PRO gratuito!"},
    {"count": 10, "badge": "10 amici invitati", "reward": "elite_1month", "emoji": "💎", "popup": "💎 Hai invitato 10 amici — hai sbloccato 1 mese ELITE gratuito!"},
]


def _generate_code() -> str:
    """Generate a unique referral code like QX-A1B2C3"""
    chars = string.ascii_uppercase + string.digits
    suffix = ''.join(random.choices(chars, k=6))
    return f"QX-{suffix}"


@router.get("/referral/{user_id}")
async def get_referral_info(user_id: str):
    """Get referral code, stats, and rewards for a user"""
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Utente non trovato")

    # Generate referral code if user doesn't have one
    referral_code = user.get("referral_code")
    if not referral_code:
        # Generate unique code
        for _ in range(10):
            code = _generate_code()
            existing = await db.users.find_one({"referral_code": code})
            if not existing:
                referral_code = code
                break
        if not referral_code:
            referral_code = f"QX-{user_id[:6].upper()}"

        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"referral_code": referral_code}}
        )

    # Count successful referrals
    referral_count = await db.referrals.count_documents({"referrer_id": user_id})

    # Get referral list
    referrals = await db.referrals.find(
        {"referrer_id": user_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(20).to_list(20)

    # Calculate milestones
    milestones = []
    for m in REFERRAL_MILESTONES:
        milestones.append({
            "count": m["count"],
            "badge": m["badge"],
            "reward": m["reward"],
            "emoji": m["emoji"],
            "popup": m["popup"],
            "unlocked": referral_count >= m["count"],
        })

    # Next milestone
    next_milestone = None
    for m in REFERRAL_MILESTONES:
        if referral_count < m["count"]:
            next_milestone = {
                "count": m["count"],
                "badge": m["badge"],
                "emoji": m["emoji"],
                "remaining": m["count"] - referral_count,
            }
            break

    # Rewards claimed
    rewards_claimed = user.get("referral_rewards_claimed", [])

    return {
        "referral_code": referral_code,
        "referral_count": referral_count,
        "referrals": referrals,
        "milestones": milestones,
        "next_milestone": next_milestone,
        "rewards_claimed": rewards_claimed,
    }


@router.post("/referral/apply")
async def apply_referral_code(data: dict):
    """Apply a referral code when a new user registers"""
    code = data.get("code", "").strip().upper()
    new_user_id = data.get("user_id", "").strip()

    if not code or not new_user_id:
        raise HTTPException(status_code=400, detail="Codice e user_id richiesti")

    # Find referrer by code
    referrer = await db.users.find_one({"referral_code": code}, {"_id": 0})
    if not referrer:
        raise HTTPException(status_code=404, detail="Codice referral non valido")

    # Prevent self-referral
    if referrer.get("user_id") == new_user_id:
        raise HTTPException(status_code=400, detail="Non puoi usare il tuo stesso codice")

    # Check if already referred
    existing = await db.referrals.find_one({
        "referred_id": new_user_id
    })
    if existing:
        raise HTTPException(status_code=400, detail="Hai già utilizzato un codice referral")

    # Create referral record
    referral = {
        "referrer_id": referrer["user_id"],
        "referred_id": new_user_id,
        "code": code,
        "created_at": datetime.now(timezone.utc),
    }
    await db.referrals.insert_one(referral)

    # Update referred user
    await db.users.update_one(
        {"user_id": new_user_id},
        {"$set": {"referred_by": referrer["user_id"], "referred_code": code}}
    )

    # Count new total
    new_count = await db.referrals.count_documents({"referrer_id": referrer["user_id"]})

    # Check milestone achievements
    new_badges = []
    rewards_claimed = referrer.get("referral_rewards_claimed", [])

    for m in REFERRAL_MILESTONES:
        if new_count >= m["count"] and m["badge"] not in rewards_claimed:
            new_badges.append({
                "badge": m["badge"],
                "emoji": m["emoji"],
                "popup": m["popup"],
                "reward": m["reward"],
            })
            rewards_claimed.append(m["badge"])

            # Apply reward
            if m["reward"] == "pro_1month":
                await db.users.update_one(
                    {"user_id": referrer["user_id"]},
                    {"$set": {"subscription_tier": "pro", "referral_reward_active": "pro_1month"}}
                )
                logger.info(f"Referral reward: {referrer['user_id']} upgraded to Pro (1 month)")
            elif m["reward"] == "elite_1month":
                await db.users.update_one(
                    {"user_id": referrer["user_id"]},
                    {"$set": {"subscription_tier": "premium", "referral_reward_active": "elite_1month"}}
                )
                logger.info(f"Referral reward: {referrer['user_id']} upgraded to Elite (1 month)")

    # Save claimed rewards
    if new_badges:
        await db.users.update_one(
            {"user_id": referrer["user_id"]},
            {"$set": {"referral_rewards_claimed": rewards_claimed}}
        )

    # Create notification for referrer
    await db.notifications.insert_one({
        "user_id": referrer["user_id"],
        "type": "referral",
        "message": "🎉 Un amico si è registrato con il tuo codice!",
        "read": False,
        "created_at": datetime.now(timezone.utc),
    })

    if new_badges:
        for badge in new_badges:
            await db.notifications.insert_one({
                "user_id": referrer["user_id"],
                "type": "referral_reward",
                "message": badge["popup"],
                "read": False,
                "created_at": datetime.now(timezone.utc),
            })

    return {
        "success": True,
        "message": "Codice referral applicato con successo!",
        "referrer_name": referrer.get("name", "Un utente"),
        "new_badges": new_badges,
    }


@router.post("/referral/claim-reward")
async def claim_reward(data: dict):
    """Claim a referral reward"""
    user_id = data.get("user_id", "").strip()
    reward_badge = data.get("badge", "").strip()

    if not user_id or not reward_badge:
        raise HTTPException(status_code=400, detail="Dati mancanti")

    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Utente non trovato")

    referral_count = await db.referrals.count_documents({"referrer_id": user_id})

    for m in REFERRAL_MILESTONES:
        if m["badge"] == reward_badge and referral_count >= m["count"]:
            rewards_claimed = user.get("referral_rewards_claimed", [])
            if reward_badge not in rewards_claimed:
                rewards_claimed.append(reward_badge)
                update = {"referral_rewards_claimed": rewards_claimed}
                if m["reward"] == "pro_1month":
                    update["subscription_tier"] = "pro"
                elif m["reward"] == "elite_1month":
                    update["subscription_tier"] = "premium"
                await db.users.update_one({"user_id": user_id}, {"$set": update})
                return {"success": True, "message": m["popup"]}

    raise HTTPException(status_code=400, detail="Reward non disponibile")
