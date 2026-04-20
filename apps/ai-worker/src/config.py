from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Server
    port: int = 8000
    debug: bool = False
    worker_secret: str  # shared with API

    # AI Models
    openai_api_key: str = ""
    anthropic_api_key: str = ""
    google_ai_api_key: str = ""
    perplexity_api_key: str = ""
    primary_model: str = "gpt-4o"
    fallback_model: str = "claude-3-5-sonnet-20241022"

    # Redis
    redis_url: str = "redis://localhost:6379"

    # Database
    database_url: str

    # Internal API callback URL (used to persist generated content)
    api_internal_url: str = "http://api:4000"

    # Limits
    max_article_tokens: int = 8000
    max_concurrent_jobs: int = 10


settings = Settings()  # type: ignore[call-arg]
