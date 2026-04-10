from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone


class User(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    subscription_tier: str = "free"  # free, base, pro, premium
    subscription_expires: Optional[datetime] = None
    wallet_balance: float = 1000.0
    total_bets: int = 0
    total_wins: int = 0
    total_profit: float = 0.0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class EliteAskRequest(BaseModel):
    query: str
    sport: Optional[str] = None
