import json
from redis.asyncio import Redis
from ..config import settings

JOB_TTL_SECONDS = 3600  # 1 hour


class QueueService:
    def __init__(self) -> None:
        self._redis: Redis | None = None

    async def connect(self) -> None:
        self._redis = Redis.from_url(settings.redis_url, decode_responses=True)
        await self._redis.ping()

    async def disconnect(self) -> None:
        if self._redis:
            await self._redis.aclose()

    @property
    def redis(self) -> Redis:
        if not self._redis:
            raise RuntimeError("Redis not connected")
        return self._redis

    async def set_job_status(
        self,
        tenant_id: str,
        job_id: str,
        status: str,
        progress: int,
        result: dict | None = None,
        error: str | None = None,
    ) -> None:
        key = f"job:{tenant_id}:{job_id}"
        data: dict = {
            "jobId": job_id,
            "status": status,
            "progress": progress,
        }
        if result:
            data["result"] = result
        if error:
            data["error"] = error

        await self.redis.setex(key, JOB_TTL_SECONDS, json.dumps(data))

    async def get_job_status(self, tenant_id: str, job_id: str) -> dict | None:
        key = f"job:{tenant_id}:{job_id}"
        raw = await self.redis.get(key)
        return json.loads(raw) if raw else None


queue_service = QueueService()
