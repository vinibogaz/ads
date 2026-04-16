from fastapi import APIRouter, Header, HTTPException
from ..services.queue import queue_service

router = APIRouter(tags=["jobs"])


@router.get("/jobs/{job_id}")
async def get_job_status(
    job_id: str,
    x_tenant_id: str = Header(...),
) -> dict:
    job = await queue_service.get_job_status(x_tenant_id, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job
