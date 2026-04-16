from fastapi import APIRouter, Header, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Literal, Optional
import uuid

from ..config import settings
from ..services.generation import GenerationService
from ..services.queue import queue_service

router = APIRouter(tags=["generation"])

ArticleFormat = Literal[
    "blog", "listicle", "how-to", "news", "comparison", "opinion", "product-review", "pillar"
]
ContentTone = Literal[
    "authoritative", "conversational", "professional", "friendly", "urgency", "educational"
]


class GenerateArticleRequest(BaseModel):
    format: ArticleFormat
    language: str = "pt-BR"
    tone: ContentTone
    primaryKeyword: str
    secondaryKeywords: list[str] = []
    targetAudience: Optional[str] = None
    wordCount: Optional[int] = None
    promptTemplateId: Optional[str] = None
    projectId: Optional[str] = None


def verify_worker_secret(x_worker_secret: str = Header(...)) -> str:
    if x_worker_secret != settings.worker_secret:
        raise HTTPException(status_code=401, detail="Invalid worker secret")
    return x_worker_secret


@router.post("/generate/article")
async def generate_article(
    request: GenerateArticleRequest,
    background_tasks: BackgroundTasks,
    x_worker_secret: str = Header(...),
    x_tenant_id: str = Header(...),
    x_user_id: str = Header(...),
) -> dict:
    verify_worker_secret(x_worker_secret)

    job_id = str(uuid.uuid4())

    # Store initial job state in Redis
    await queue_service.set_job_status(
        tenant_id=x_tenant_id,
        job_id=job_id,
        status="queued",
        progress=0,
    )

    # Run generation in background
    background_tasks.add_task(
        GenerationService.generate_article,
        job_id=job_id,
        tenant_id=x_tenant_id,
        user_id=x_user_id,
        request=request,
    )

    return {"jobId": job_id}
