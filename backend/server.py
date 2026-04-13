from fastapi import FastAPI
from fastapi.responses import JSONResponse
from starlette.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from pathlib import Path
import logging

# Load env
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Setup
app = FastAPI(title="EdgeBet API", version="2.1.0")
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ==================== ROUTE IMPORTS ====================
from fastapi import APIRouter
api_router = APIRouter(prefix="/api")

from routes.auth import router as auth_router
from routes.public import router as public_router
from routes.matches import router as matches_router
from routes.bets import router as bets_router
from routes.social import router as social_router
from routes.gamification import router as gamification_router
from routes.notifications import router as notifications_router
from routes.elite import router as elite_router
from routes.opportunities import router as opportunities_router
from routes.emails import router as emails_router
from routes.dev import router as dev_router
from routes.value_bets import router as value_bets_router
from routes.stats import router as stats_router

# Include all route modules
api_router.include_router(auth_router)
api_router.include_router(public_router)
api_router.include_router(matches_router)
api_router.include_router(bets_router)
api_router.include_router(social_router)
api_router.include_router(gamification_router)
api_router.include_router(notifications_router)
api_router.include_router(elite_router)
api_router.include_router(opportunities_router)
api_router.include_router(emails_router)
api_router.include_router(dev_router)
api_router.include_router(value_bets_router)
api_router.include_router(stats_router)

@api_router.get("/")
async def root():
    return {"message": "EdgeBet API", "version": "2.1.0"}

app.include_router(api_router)

# ==================== MIDDLEWARE ====================
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================== LIFECYCLE ====================
from services.database import client

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
