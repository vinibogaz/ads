"""Motor real de consulta GEO — consulta APIs de LLMs."""
import hashlib
import logging
import re
from datetime import datetime
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

_cache: dict[str, tuple[str, datetime]] = {}
CACHE_TTL_HOURS = 24

ENGINES: dict[str, dict] = {
    "chatgpt": {
        "url": "https://api.openai.com/v1/chat/completions",
        "model": "gpt-4o-mini",
        "auth_header": "Authorization",
        "auth_prefix": "Bearer ",
        "env_var": "OPENAI_API_KEY",
    },
    "claude": {
        "url": "https://api.anthropic.com/v1/messages",
        "model": "claude-3-haiku-20240307",
        "auth_header": "x-api-key",
        "auth_prefix": "",
        "env_var": "ANTHROPIC_API_KEY",
    },
    "gemini": {
        "url": "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
        "model": "gemini-2.0-flash",
        "auth_header": None,
        "auth_prefix": "",
        "env_var": "GOOGLE_AI_API_KEY",
    },
    "perplexity": {
        "url": "https://api.perplexity.ai/chat/completions",
        "model": "sonar",
        "auth_header": "Authorization",
        "auth_prefix": "Bearer ",
        "env_var": "PERPLEXITY_API_KEY",
    },
}


def _cache_key(engine: str, prompt: str) -> str:
    return hashlib.md5(f"{engine}:{prompt}".encode()).hexdigest()


async def query_engine(engine: str, prompt: str, api_keys: dict) -> Optional[str]:
    cfg = ENGINES.get(engine)
    if not cfg:
        return None
    key = api_keys.get(cfg["env_var"])
    if not key:
        return None
    ck = _cache_key(engine, prompt)
    if ck in _cache:
        cached_text, cached_at = _cache[ck]
        if (datetime.utcnow() - cached_at).total_seconds() < CACHE_TTL_HOURS * 3600:
            return cached_text
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            if engine == "gemini":
                url = f"{cfg['url']}?key={key}"
                r = await client.post(url, json={"contents": [{"parts": [{"text": prompt}]}]})
                r.raise_for_status()
                text = r.json()["candidates"][0]["content"]["parts"][0]["text"]
            elif engine == "claude":
                r = await client.post(
                    cfg["url"],
                    json={
                        "model": cfg["model"],
                        "max_tokens": 1024,
                        "messages": [{"role": "user", "content": prompt}],
                    },
                    headers={cfg["auth_header"]: key, "anthropic-version": "2023-06-01"},
                )
                r.raise_for_status()
                text = r.json()["content"][0]["text"]
            else:
                r = await client.post(
                    cfg["url"],
                    json={
                        "model": cfg["model"],
                        "messages": [{"role": "user", "content": prompt}],
                        "max_tokens": 1024,
                    },
                    headers={cfg["auth_header"]: f"{cfg['auth_prefix']}{key}"},
                )
                r.raise_for_status()
                text = r.json()["choices"][0]["message"]["content"]
            _cache[ck] = (text, datetime.utcnow())
            return text
        except Exception as e:
            logger.error(f"[GEO ENGINE ERROR] {engine}: {e}")
            return None


def analyze_mention(response_text: str, brand: str) -> dict:
    if not response_text:
        return {"mentioned": False, "position": -1, "sentiment": 0.0, "context": ""}
    text_lower = response_text.lower()
    brand_lower = brand.lower()
    mentioned = brand_lower in text_lower
    sentences = re.split(r"[.!?\n]", response_text)
    position = -1
    context = ""
    for i, s in enumerate(sentences):
        if brand_lower in s.lower():
            position = i + 1
            context = s.strip()[:200]
            break
    positive = len(
        re.findall(
            r"\b(melhor|excelente|líder|destaque|recomend|principal|top|ótim|confiáv|segur)\w*",
            context,
            re.I,
        )
    )
    negative = len(
        re.findall(
            r"\b(pior|ruim|fraco|problem|desvantag|caro|limitad|reclamaç)\w*",
            context,
            re.I,
        )
    )
    sentiment = round(min(1.0, max(-1.0, (positive - negative) * 0.25)), 2)
    return {"mentioned": mentioned, "position": position, "sentiment": sentiment, "context": context}


def extract_cited_sources(response_text: str) -> list[str]:
    if not response_text:
        return []
    return list(set(re.findall(r"https?://[^\s\)\"\'>\]\,]+", response_text)))


def calculate_share_of_source(cited_sources: list[str], brand_domain: str) -> float:
    if not cited_sources or not brand_domain:
        return 0.0
    brand_domain_clean = (
        brand_domain.lower()
        .replace("https://", "")
        .replace("http://", "")
        .replace("www.", "")
        .rstrip("/")
    )
    brand_citations = sum(1 for url in cited_sources if brand_domain_clean in url.lower())
    return round((brand_citations / len(cited_sources)) * 100, 2)
