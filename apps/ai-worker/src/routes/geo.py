"""
GEO (Generative Engine Optimization) collection + diagnostic routes.
"""
import hashlib
from datetime import datetime
from typing import Literal, Optional

import httpx
from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from ..config import settings
from ..services.geo_engine import (
    analyze_mention,
    calculate_share_of_source,
    extract_cited_sources,
    query_engine,
)
from ..services.site_diagnostic import diagnose_site

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


# ---------------------------------------------------------------------------
# Diagnostic routes
# ---------------------------------------------------------------------------


class DiagnoseRequest(BaseModel):
    url: str
    tenantId: str
    monitorId: str


class FindingResult(BaseModel):
    category: str
    status: str  # "pass" | "warn" | "fail"
    message: str
    action: str


class DiagnosticResult(BaseModel):
    geoReadinessScore: int
    findings: list[FindingResult]


@router.post("/diagnose/site", response_model=DiagnosticResult)
async def diagnose_site_route(
    request: DiagnoseRequest,
    x_worker_secret: str = Header(...),
) -> DiagnosticResult:
    if x_worker_secret != settings.worker_secret:
        raise HTTPException(status_code=401, detail="Invalid worker secret")
    raw = await diagnose_site(request.url)
    return DiagnosticResult(
        geoReadinessScore=int(raw.get("geoReadinessScore", 0)),
        findings=[FindingResult(**f) for f in raw.get("findings", [])],
    )


# ---------------------------------------------------------------------------
# Action plan routes
# ---------------------------------------------------------------------------

_action_plan_cache: dict[str, tuple[dict, datetime]] = {}
_ACTION_PLAN_TTL = 24 * 3600  # seconds


class ActionPlanRequest(BaseModel):
    tenantId: str
    monitorId: str
    brandName: str
    promptContext: str
    diagnosticFindings: list[dict] = []


class ActionItem(BaseModel):
    title: str
    description: str
    priority: str  # "high" | "medium" | "low"
    effort: str    # "low" | "medium" | "high"
    category: str


class ActionPlanResult(BaseModel):
    planId: str
    generatedAt: str
    actions: list[ActionItem]


@router.post("/action-plan/generate", response_model=ActionPlanResult)
async def generate_action_plan(
    request: ActionPlanRequest,
    x_worker_secret: str = Header(...),
) -> ActionPlanResult:
    if x_worker_secret != settings.worker_secret:
        raise HTTPException(status_code=401, detail="Invalid worker secret")

    cache_key = hashlib.md5(
        f"{request.tenantId}:{request.monitorId}:{request.promptContext}".encode()
    ).hexdigest()

    if cache_key in _action_plan_cache:
        cached, cached_at = _action_plan_cache[cache_key]
        if (datetime.utcnow() - cached_at).total_seconds() < _ACTION_PLAN_TTL:
            return ActionPlanResult(**cached)

    if not settings.openai_api_key:
        raise HTTPException(status_code=503, detail="OpenAI API key not configured")

    findings_summary = ""
    if request.diagnosticFindings:
        fails = [f for f in request.diagnosticFindings if f.get("status") == "fail"]
        warns = [f for f in request.diagnosticFindings if f.get("status") == "warn"]
        findings_summary = (
            f"\nDiagnóstico GEO atual:\n"
            f"- Falhas críticas: {[f['category'] for f in fails]}\n"
            f"- Avisos: {[f['category'] for f in warns]}"
        )

    system_prompt = (
        "Você é um especialista em GEO (Generative Engine Optimization). "
        "Gere exatamente 5 ações concretas e priorizadas para melhorar a presença da marca "
        "em IAs generativas (ChatGPT, Claude, Gemini, Perplexity). "
        "Responda APENAS com JSON válido, sem texto adicional, no formato:\n"
        '{"actions": [{"title": "...", "description": "...", "priority": "high|medium|low", '
        '"effort": "low|medium|high", "category": "..."}, ...]}'
    )
    user_prompt = (
        f"Marca: {request.brandName}\n"
        f"Contexto: {request.promptContext}"
        f"{findings_summary}\n\n"
        "Gere 5 ações de GEO priorizadas."
    )

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            "https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {settings.openai_api_key}"},
            json={
                "model": "gpt-4o-mini",
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                "temperature": 0.7,
                "max_tokens": 1200,
            },
        )
        resp.raise_for_status()
        data = resp.json()

    raw_content = data["choices"][0]["message"]["content"]
    try:
        import json as _json
        parsed = _json.loads(raw_content)
        actions_raw = parsed.get("actions", [])
    except Exception:
        raise HTTPException(status_code=502, detail="LLM returned invalid JSON")

    actions = [
        ActionItem(
            title=a.get("title", ""),
            description=a.get("description", ""),
            priority=a.get("priority", "medium"),
            effort=a.get("effort", "medium"),
            category=a.get("category", "Geral"),
        )
        for a in actions_raw[:5]
    ]

    import uuid
    result = ActionPlanResult(
        planId=str(uuid.uuid4()),
        generatedAt=datetime.utcnow().isoformat() + "Z",
        actions=actions,
    )
    _action_plan_cache[cache_key] = (result.model_dump(), datetime.utcnow())
    return result
