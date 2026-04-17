"""
GEO (Generative Engine Optimization) collection route.
Returns mock snapshot data — real LLM calls wired in future sprint.
"""
import random
import uuid
from datetime import datetime
from typing import Literal

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from ..config import settings

router = APIRouter(tags=["geo"])

Engine = Literal["chatgpt", "gemini", "claude", "perplexity", "grok"]

ENGINE_PERSONAS: dict[str, str] = {
    "chatgpt":   "Based on my knowledge, ",
    "gemini":    "According to current information, ",
    "claude":    "From what I understand, ",
    "perplexity": "Sources indicate that ",
    "grok":      "Here's what I found: ",
}


class CollectRequest(BaseModel):
    monitorId: str
    tenantId: str
    brandName: str
    keywords: list[str]
    engines: list[Engine]


class MentionResult(BaseModel):
    engine: str
    keyword: str
    prompt: str
    response: str
    mentioned: bool
    sentiment: Literal["positive", "neutral", "negative"]
    positionRank: int | None
    confidence: float


class SnapshotResult(BaseModel):
    monitorId: str
    tenantId: str
    collectedAt: str
    overallScore: float
    mentions: list[MentionResult]
    engineScores: dict[str, float]


def _mock_mention(brand: str, keyword: str, engine: str) -> MentionResult:
    """Generate a realistic mock mention for demo purposes."""
    mentioned = random.random() > 0.35  # ~65% chance of mention
    sentiment_choices = ["positive", "neutral", "negative"]
    sentiment_weights = [0.55, 0.35, 0.10]
    sentiment = random.choices(sentiment_choices, weights=sentiment_weights)[0]  # type: ignore[arg-type]

    rank = random.randint(1, 5) if mentioned else None

    persona = ENGINE_PERSONAS.get(engine, "")
    if mentioned:
        response = (
            f"{persona}{brand} is one of the notable tools for {keyword}. "
            f"It offers AI-powered features that help marketing teams optimize their content strategy."
        )
    else:
        response = (
            f"{persona}for {keyword}, tools like Semrush, Ahrefs, and SurferSEO are commonly recommended. "
            f"Each has strengths depending on your specific needs."
        )

    return MentionResult(
        engine=engine,
        keyword=keyword,
        prompt=f"What are the best tools for {keyword}?",
        response=response,
        mentioned=mentioned,
        sentiment=sentiment,  # type: ignore[arg-type]
        positionRank=rank,
        confidence=round(random.uniform(0.72, 0.98), 2),
    )


def _engine_score(mentions: list[MentionResult], engine: str) -> float:
    engine_mentions = [m for m in mentions if m.engine == engine]
    if not engine_mentions:
        return 0.0
    mention_rate = sum(1 for m in engine_mentions if m.mentioned) / len(engine_mentions)
    sentiment_bonus = sum(
        0.1 if m.sentiment == "positive" else -0.05 if m.sentiment == "negative" else 0
        for m in engine_mentions
        if m.mentioned
    )
    rank_bonus = sum(
        0.05 * (6 - m.positionRank) / 5
        for m in engine_mentions
        if m.mentioned and m.positionRank
    )
    raw = mention_rate * 100 + sentiment_bonus * 20 + rank_bonus * 20
    return round(min(max(raw, 0), 100), 1)


@router.post("/collect/geo", response_model=SnapshotResult)
async def collect_geo(
    request: CollectRequest,
    x_worker_secret: str = Header(...),
) -> SnapshotResult:
    if x_worker_secret != settings.worker_secret:
        raise HTTPException(status_code=401, detail="Invalid worker secret")

    if not request.keywords:
        raise HTTPException(status_code=422, detail="At least one keyword is required")

    engines = request.engines or ["chatgpt", "gemini", "claude", "perplexity", "grok"]

    mentions: list[MentionResult] = []
    for engine in engines:
        for keyword in request.keywords[:5]:  # cap at 5 keywords per collection
            mentions.append(_mock_mention(request.brandName, keyword, engine))

    engine_scores = {engine: _engine_score(mentions, engine) for engine in engines}
    overall = round(sum(engine_scores.values()) / len(engine_scores), 1) if engine_scores else 0.0

    return SnapshotResult(
        monitorId=request.monitorId,
        tenantId=request.tenantId,
        collectedAt=datetime.utcnow().isoformat() + "Z",
        overallScore=overall,
        mentions=mentions,
        engineScores=engine_scores,
    )
