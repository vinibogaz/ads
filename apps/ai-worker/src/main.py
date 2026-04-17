from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .routes import generate, jobs, health, geo
from .services.queue import queue_service
import structlog

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting ORFFIA AI Worker", version="0.1.0")
    await queue_service.connect()
    yield
    await queue_service.disconnect()
    logger.info("ORFFIA AI Worker stopped")


app = FastAPI(
    title="ORFFIA AI Worker",
    description="Content generation microservice — GPT-4o / Claude 3.5 Sonnet",
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.debug else None,
    redoc_url=None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3001"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(generate.router, prefix="/api")
app.include_router(jobs.router, prefix="/api")
app.include_router(geo.router, prefix="/api")
