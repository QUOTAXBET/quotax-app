from fastapi import APIRouter, HTTPException, Request, Response, Depends
import httpx
import uuid
import logging
from datetime import datetime, timezone, timedelta
from services.database import db
from services.auth_helpers import require_user
from services.email_service import queue_email, check_upsell_email
from models.schemas import User

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/auth/session")
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
            await check_upsell_email(user_id, existing_user)
        else:
            user_id = f"user_{uuid.uuid4().hex[:12]}"
            new_user = {
                "user_id": user_id, "email": email, "name": name, "picture": picture,
                "subscription_tier": "free", "subscription_expires": None,
                "wallet_balance": 1000.0, "total_bets": 0, "total_wins": 0,
                "total_profit": 0.0, "created_at": datetime.now(timezone.utc)
            }
            await db.users.insert_one(new_user)
            await queue_email("welcome", email, name, user_id)

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
            key="session_token", value=session_token,
            httponly=True, secure=True, samesite="none", path="/",
            max_age=7 * 24 * 60 * 60
        )

        user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
        return {"user": user_doc, "session_token": session_token}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Session creation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/auth/me")
async def get_me(user: User = Depends(require_user)):
    return user.dict()


@router.post("/auth/logout")
async def logout(request: Request, response: Response):
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    response.delete_cookie(key="session_token", path="/")
    return {"message": "Logout effettuato"}
