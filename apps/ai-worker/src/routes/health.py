from fastapi import APIRouter
from datetime import datetime, timezone

router = APIRouter(tags=["health"])


@router.get("/health")
async def health_check() -> dict:
    return {
        "status": "ok",
        "service": "ai-worker",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
