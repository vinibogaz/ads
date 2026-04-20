"""
GEO (Generative Engine Optimization) collection route — real LLM engine.
"""
from datetime import datetime
from typing import Literal, Optional

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from ..config import settings
from ..services.geo_engine import (
    analyze_mention,
    calculate_share_of_source,
    extract_cited_sources,
    query_engine,
)

router = APIRouter(tags=["geo"])

Engine = Literal["chatgpt", "gemini", "claude", "perplexity", "grok"]


class CollectRequest(BaseModel):
    monitorId: str
    tenantId: str
    brandName: str
    brandDomain: str = ""
    keywords: list[str]
    engines: list[Engine]


class MentionResult(BaseModel):
    engine: str
    keyword: str
    prompt: str = ""
    response: str = ""
    mentioned: bool
    sentiment: float = 0.0
    position: int = -1
    context: str = ""
    positionRank: Optional[int] = None
    confidence: float = 0.0
    citedSources: list[str] = []


class SnapshotResult(BaseModel):
    monitorId: str
    tenantId: str
    collectedAt: str
    overallScore: float
    mentions: list[MentionResult]
    engineScores: dict[str, float]
    citedSources: list[str] = []
    shareOfVoice: float = 0.0
    shareOfSource: float = 0.0
    avgSentiment: float = 0.0
    avgPosition: float = 0.0


@router.post("/collect/geo", response_model=SnapshotResult)
async def collect_geo(
    request: CollectRequest,
    x_worker_secret: str = Header(...),
) -> SnapshotResult:
    if x_worker_secret != settings.worker_secret:
        raise HTTPException(status_code=401, detail="Invalid worker secret")

    if not request.keywords:
        raise HTTPException(status_code=422, detail="At least one keyword is required")

    api_keys = {
        "OPENAI_API_KEY": settings.openai_api_key,
        "ANTHROPIC_API_KEY": settings.anthropic_api_key,
        "GOOGLE_AI_API_KEY": settings.google_ai_api_key,
        "PERPLEXITY_API_KEY": settings.perplexity_api_key,
    }

    engines = request.engines or ["chatgpt", "gemini", "claude", "perplexity"]

    mentions: list[MentionResult] = []
    all_sources: list[str] = []

    for keyword in request.keywords[:5]:
        prompt = keyword
        for engine in engines:
            response_text = await query_engine(engine, prompt, api_keys)
            analysis = analyze_mention(response_text or "", request.brandName)
            sources = extract_cited_sources(response_text or "")
            all_sources.extend(sources)
            mentions.append(
                MentionResult(
                    engine=engine,
                    keyword=keyword,
                    mentioned=analysis["mentioned"],
                    position=analysis["position"],
                    sentiment=analysis["sentiment"],
                    context=analysis["context"],
                    citedSources=sources,
                )
            )

    total_queries = len(mentions)
    total_mentions = sum(1 for m in mentions if m.mentioned)
    share_of_voice = round((total_mentions / total_queries) * 100, 1) if total_queries > 0 else 0.0

    brand_domain = request.brandDomain or ""
    share_of_source = calculate_share_of_source(all_sources, brand_domain)

    sentiments = [m.sentiment for m in mentions if m.mentioned]
    avg_sentiment = round(sum(sentiments) / len(sentiments) * 100, 1) if sentiments else 0.0

    positions = [m.position for m in mentions if m.mentioned and m.position > 0]
    avg_position = round(sum(positions) / len(positions), 2) if positions else 0.0

    engine_scores: dict[str, float] = {}
    for engine in engines:
        eng_mentions = [m for m in mentions if m.engine == engine]
        if eng_mentions:
            engine_scores[engine] = round(
                sum(1 for m in eng_mentions if m.mentioned) / len(eng_mentions) * 100, 1
            )
        else:
            engine_scores[engine] = 0.0

    return SnapshotResult(
        monitorId=request.monitorId,
        tenantId=request.tenantId,
        collectedAt=datetime.utcnow().isoformat() + "Z",
        overallScore=share_of_voice,
        engineScores=engine_scores,
        mentions=mentions,
        citedSources=list(set(all_sources)),
        shareOfVoice=share_of_voice,
        shareOfSource=share_of_source,
        avgSentiment=avg_sentiment,
        avgPosition=avg_position,
    )
