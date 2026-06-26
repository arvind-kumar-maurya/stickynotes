from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import random
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import Optional
import uuid
from datetime import datetime, timezone

from emergentintegrations.llm.chat import LlmChat, UserMessage


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="KitchenNotes API")
api_router = APIRouter(prefix="/api")


# ---------- Models ----------
class GenerateQuoteRequest(BaseModel):
    customer_name: str = Field(..., min_length=1, max_length=80)
    order_number: int = Field(..., ge=1, le=999999)
    kitchen_name: str = Field(..., min_length=1, max_length=80)
    gemini_api_key: str = Field(..., min_length=10)
    tone: Optional[str] = None  # warm | funny | motivational | None=random


class GenerateQuoteResponse(BaseModel):
    id: str
    quote: str
    tone: str
    customer_name: str
    order_number: int
    kitchen_name: str
    created_at: str


# ---------- Helpers ----------
TONES = ["warm", "funny", "motivational"]

TONE_HINTS = {
    "warm": "Be warm, heartfelt and grateful. Make them feel loved like family.",
    "funny": "Be light, playful and witty. A clever desi joke or a cheeky pun about food/cooking is great. Keep it tasteful.",
    "motivational": "Be uplifting, energetic and motivational. Spread good vibes like a chai-time pep talk.",
}


def build_system_prompt(kitchen_name: str, tone: str) -> str:
    return (
        f"You are a friendly Indian cloud kitchen owner writing a tiny handwritten sticky note "
        f"to place on a customer's food order from '{kitchen_name}'. "
        "Write in casual HINGLISH (Roman script — Hindi + English mixed, like Indians chat on WhatsApp). "
        f"Tone: {tone}. {TONE_HINTS[tone]} "
        "STRICT RULES: "
        "1) Maximum 2 short lines, under 22 words total. "
        "2) Address the customer by their first name once. "
        "3) Do NOT use any emojis, hashtags, asterisks or quotation marks. "
        "4) Do NOT mention the order number — that is printed separately. "
        "5) End with a tiny sign-off mentioning the kitchen name on a new line, prefixed with — (em dash). "
        "6) Output ONLY the note text. No preface, no explanation."
    )


async def call_gemini(api_key: str, system_prompt: str, user_text: str) -> str:
    chat = LlmChat(
        api_key=api_key,
        session_id=f"kitchennotes-{uuid.uuid4()}",
        system_message=system_prompt,
    ).with_model("gemini", "gemini-2.5-flash")

    msg = UserMessage(text=user_text)
    reply = await chat.send_message(msg)
    return (reply or "").strip()


# ---------- Routes ----------
@api_router.get("/")
async def root():
    return {"message": "KitchenNotes API up"}


@api_router.post("/generate-quote", response_model=GenerateQuoteResponse)
async def generate_quote(req: GenerateQuoteRequest):
    tone = req.tone if req.tone in TONES else random.choice(TONES)
    system_prompt = build_system_prompt(req.kitchen_name, tone)

    user_text = (
        f"Customer first name: {req.customer_name.strip().split()[0]}\n"
        f"Kitchen name: {req.kitchen_name}\n"
        f"Write the sticky note now."
    )

    try:
        quote = await call_gemini(req.gemini_api_key, system_prompt, user_text)
    except Exception as e:
        logger.exception("Gemini call failed")
        raise HTTPException(status_code=400, detail=f"Gemini error: {str(e)[:200]}")

    if not quote:
        raise HTTPException(status_code=502, detail="Empty response from Gemini")

    # Light cleanup: strip wrapping quotes / asterisks the model sometimes adds
    quote = quote.strip().strip('"').strip("'").strip("*").strip()

    doc = {
        "id": str(uuid.uuid4()),
        "quote": quote,
        "tone": tone,
        "customer_name": req.customer_name,
        "order_number": req.order_number,
        "kitchen_name": req.kitchen_name,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    try:
        await db.quotes.insert_one({**doc})
    except Exception:
        logger.exception("Mongo insert failed (non-fatal)")

    return GenerateQuoteResponse(**doc)


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
