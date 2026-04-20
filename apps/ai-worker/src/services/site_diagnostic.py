"""
GEO Site Diagnostic — crawls a URL and evaluates 8 GEO readiness criteria.
Returns { geoReadinessScore: int (0-100), findings: list[dict] }
"""
import hashlib
import json
import logging
import re
from datetime import datetime
from typing import Literal
from urllib.parse import urljoin, urlparse

import httpx
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

Status = Literal["pass", "warn", "fail"]

_cache: dict[str, tuple[dict, datetime]] = {}
CACHE_TTL_HOURS = 24

CRITERIA_WEIGHTS: dict[str, int] = {
    "json_ld": 15,
    "robots_txt": 15,
    "meta_tags": 10,
    "headings": 10,
    "faq_content": 10,
    "eeat_signals": 15,
    "sitemap": 10,
    "conversational": 15,
}


def _cache_key(url: str) -> str:
    return hashlib.md5(url.encode()).hexdigest()


def _is_cache_valid(cached_at: datetime) -> bool:
    return (datetime.utcnow() - cached_at).total_seconds() < CACHE_TTL_HOURS * 3600


async def _fetch(url: str, timeout: float = 10.0) -> str:
    headers = {"User-Agent": "OrffiaBot/1.0 (GEO Diagnostic)"}
    async with httpx.AsyncClient(follow_redirects=True, timeout=timeout) as client:
        resp = await client.get(url, headers=headers)
        resp.raise_for_status()
        return resp.text


def _check_json_ld(soup: BeautifulSoup) -> tuple[Status, str, str]:
    scripts = soup.find_all("script", type="application/ld+json")
    if not scripts:
        return (
            "fail",
            "Nenhum JSON-LD / Schema.org encontrado",
            "Adicione Schema.org (Organization, FAQPage, Article) via <script type='application/ld+json'>",
        )
    valid = 0
    for s in scripts:
        try:
            content = s.string or ""
            if content.strip():
                json.loads(content)
                valid += 1
        except Exception:
            pass
    if valid == 0:
        return (
            "warn",
            f"{len(scripts)} tag(s) JSON-LD encontrada(s) mas com sintaxe inválida",
            "Corrija a sintaxe JSON dos schemas existentes",
        )
    return (
        "pass",
        f"{valid} schema(s) JSON-LD válido(s) encontrado(s)",
        "Continue mantendo e expandindo os schemas Schema.org",
    )


def _check_robots_txt(robots_content: str) -> tuple[Status, str, str]:
    if not robots_content:
        return (
            "warn",
            "Arquivo robots.txt não encontrado ou inacessível",
            "Crie um robots.txt explicitamente permitindo GPTBot, ClaudeBot e PerplexityBot",
        )
    target_bots = ["gptbot", "claudebot", "perplexitybot", "anthropic-ai", "google-extended"]
    lines = robots_content.lower().split("\n")
    current_agents: list[str] = []
    disallowed_agents: set[str] = set()

    for line in lines:
        line = line.strip()
        if line.startswith("user-agent:"):
            current_agents = [line.split(":", 1)[1].strip()]
        elif line.startswith("disallow:"):
            disallow_path = line.split(":", 1)[1].strip()
            if disallow_path in ("/", "/*"):
                for a in current_agents:
                    disallowed_agents.add(a)

    blocked_bots = [b for b in target_bots if b in disallowed_agents or "*" in disallowed_agents]
    if blocked_bots:
        return (
            "fail",
            f"AI bots bloqueados no robots.txt: {', '.join(blocked_bots)}",
            "Remova ou ajuste as regras Disallow para permitir GPTBot, ClaudeBot e PerplexityBot",
        )
    return (
        "pass",
        "Nenhum AI bot (GPTBot, ClaudeBot, PerplexityBot) bloqueado no robots.txt",
        "Monitore periodicamente para garantir que novas IAs não sejam bloqueadas",
    )


def _check_meta_tags(soup: BeautifulSoup) -> tuple[Status, str, str]:
    missing = []
    meta_desc = soup.find("meta", attrs={"name": "description"})
    if not meta_desc or not (meta_desc.get("content") or "").strip():
        missing.append("meta description")
    og_title = soup.find("meta", attrs={"property": "og:title"})
    og_desc = soup.find("meta", attrs={"property": "og:description"})
    if not og_title:
        missing.append("og:title")
    if not og_desc:
        missing.append("og:description")

    if len(missing) >= 3:
        return (
            "fail",
            f"Meta tags ausentes: {', '.join(missing)}",
            "Adicione meta description, og:title e og:description em todas as páginas",
        )
    if missing:
        return (
            "warn",
            f"Meta tags parcialmente presentes. Faltando: {', '.join(missing)}",
            f"Adicione as meta tags ausentes: {', '.join(missing)}",
        )
    return (
        "pass",
        "Meta tags essenciais presentes (description, og:title, og:description)",
        "Considere adicionar og:image e twitter:card para completar o Open Graph",
    )


def _check_headings(soup: BeautifulSoup) -> tuple[Status, str, str]:
    h1s = soup.find_all("h1")
    h2s = soup.find_all("h2")

    if not h1s:
        return (
            "fail",
            "Nenhuma tag H1 encontrada na página",
            "Adicione um H1 claro e descritivo como título principal",
        )
    if len(h1s) > 1:
        return (
            "warn",
            f"{len(h1s)} tags H1 encontradas (recomendado: apenas 1)",
            "Use apenas um H1 por página para hierarquia de conteúdo adequada",
        )
    if not h2s:
        return (
            "warn",
            "Apenas H1 encontrado, sem subtítulos H2",
            "Adicione H2s para estruturar o conteúdo em seções claras",
        )
    return (
        "pass",
        f"Estrutura de headings adequada: {len(h1s)} H1, {len(h2s)} H2(s)",
        "Hierarquia de títulos bem implementada para leitura por IAs",
    )


def _check_faq(soup: BeautifulSoup) -> tuple[Status, str, str]:
    scripts = soup.find_all("script", type="application/ld+json")
    for s in scripts:
        try:
            content = json.loads(s.string or "")
            schema_type = content.get("@type", "")
            if "FAQ" in schema_type:
                return (
                    "pass",
                    "FAQPage Schema.org encontrado",
                    "FAQ markup implementado corretamente para citação por IA generativa",
                )
        except Exception:
            pass

    page_text = soup.get_text(separator=" ").lower()
    has_faq_section = any(
        kw in page_text for kw in ["faq", "perguntas frequentes", "frequently asked"]
    )
    has_questions = bool(
        re.search(
            r"\b(como|por que|quando|onde|quem|o que|qual|quanto)\b.{10,100}\?",
            page_text,
        )
    )

    if has_faq_section and has_questions:
        return (
            "warn",
            "Conteúdo FAQ detectado mas sem Schema.org FAQPage",
            "Adicione Schema.org FAQPage para indexação por IAs generativas",
        )
    if has_questions:
        return (
            "warn",
            "Perguntas naturais detectadas mas sem markup FAQ estruturado",
            "Marque perguntas e respostas com Schema.org FAQPage",
        )
    return (
        "fail",
        "Sem conteúdo FAQ ou perguntas naturais detectado",
        "Adicione seção FAQ com Schema.org FAQPage para aumentar citações por IAs",
    )


def _check_eeat(soup: BeautifulSoup) -> tuple[Status, str, str]:
    signals = []
    raw_text = soup.get_text(separator=" ")

    author_pattern = re.compile(
        r"\b(escrito por|autor[:\s]|by\s+[A-Z]|author[:\s]|redação)\b", re.IGNORECASE
    )
    if author_pattern.search(raw_text):
        signals.append("autor")

    date_meta = soup.find("meta", attrs={"property": "article:published_time"})
    time_tag = soup.find("time")
    if date_meta or time_tag:
        signals.append("data de publicação")

    expertise_terms = [
        "especialista", "expert", "certificado", "anos de experiência",
        "founder", "ceo", "diretor", "phd", "doutor",
    ]
    text_lower = raw_text.lower()
    if any(t in text_lower for t in expertise_terms):
        signals.append("expertise")

    if len(signals) >= 3:
        return (
            "pass",
            f"Sinais E-E-A-T detectados: {', '.join(signals)}",
            "Bons sinais de autoridade e expertise para IA generativa",
        )
    if signals:
        return (
            "warn",
            f"Sinais E-E-A-T parciais: {', '.join(signals)}",
            "Adicione informações de autor, data de publicação e credenciais de expertise",
        )
    return (
        "fail",
        "Nenhum sinal E-E-A-T detectado (autor, data, expertise)",
        "Adicione bio do autor, datas de publicação e credenciais para aumentar credibilidade",
    )


def _check_sitemap(sitemap_content: str, sitemap_url: str) -> tuple[Status, str, str]:
    if not sitemap_content:
        return (
            "fail",
            "Sitemap XML não encontrado",
            f"Crie um sitemap.xml em {sitemap_url} e registre no Google Search Console",
        )
    loc_count = sitemap_content.count("<loc>")
    if loc_count == 0:
        return (
            "warn",
            "Sitemap encontrado mas sem URLs (<loc>) válidas",
            "Adicione URLs ao sitemap.xml com as páginas principais",
        )
    return (
        "pass",
        f"Sitemap válido com {loc_count} URL(s) indexadas",
        "Mantenha o sitemap atualizado com todas as páginas importantes",
    )


def _check_conversational(soup: BeautifulSoup) -> tuple[Status, str, str]:
    text = soup.get_text(separator=" ")

    question_pattern = re.compile(
        r"\b(como|por que|por quê|quando|onde|quem|o que|qual|quanto|"
        r"how|why|when|where|who|what|which|can|does)\b.{5,150}\?",
        re.IGNORECASE,
    )
    questions = question_pattern.findall(text)

    conv_pattern = re.compile(
        r"\b(você pode|como funciona|saiba mais|descubra|aprenda|entenda|"
        r"veja como|neste artigo|neste guia|passo a passo)\b",
        re.IGNORECASE,
    )
    conv_count = len(conv_pattern.findall(text))
    total = len(questions) + conv_count

    if total >= 5:
        return (
            "pass",
            f"Linguagem conversacional presente: {len(questions)} pergunta(s), {conv_count} frase(s) conversacional(is)",
            "Bom nível de linguagem natural para citação por IAs",
        )
    if total >= 2:
        return (
            "warn",
            f"Linguagem conversacional limitada: {len(questions)} pergunta(s), {conv_count} frase(s)",
            "Expanda com mais perguntas naturais e respostas diretas",
        )
    return (
        "fail",
        "Pouca ou nenhuma linguagem conversacional detectada",
        "Reescreva seções em formato pergunta-resposta para aumentar citações por IA",
    )


def _score_from_findings(findings: list[dict]) -> int:
    key_map = {
        "JSON-LD / Schema.org": "json_ld",
        "Robots.txt": "robots_txt",
        "Meta Tags": "meta_tags",
        "Headings": "headings",
        "FAQ Content": "faq_content",
        "E-E-A-T Signals": "eeat_signals",
        "Sitemap": "sitemap",
        "Linguagem Conversacional": "conversational",
    }
    total = 0
    for f in findings:
        weight = CRITERIA_WEIGHTS.get(key_map.get(f["category"], ""), 0)
        if f["status"] == "pass":
            total += weight
        elif f["status"] == "warn":
            total += weight // 2
    return min(100, max(0, total))


async def diagnose_site(url: str) -> dict:
    """
    Crawls a public URL and evaluates 8 GEO readiness criteria.
    Returns { geoReadinessScore: int, findings: list[dict] }
    Caches results for CACHE_TTL_HOURS hours.
    """
    ck = _cache_key(url)
    if ck in _cache:
        result, cached_at = _cache[ck]
        if _is_cache_valid(cached_at):
            return result

    parsed = urlparse(url)
    base_url = f"{parsed.scheme}://{parsed.netloc}"

    try:
        html = await _fetch(url)
    except Exception as exc:
        logger.warning("Failed to fetch %s: %s", url, exc)
        return {
            "geoReadinessScore": 0,
            "findings": [
                {
                    "category": "Crawl",
                    "status": "fail",
                    "message": f"Não foi possível acessar a URL: {exc}",
                    "action": "Verifique se a URL está acessível publicamente",
                }
            ],
        }

    soup = BeautifulSoup(html, "html.parser")

    robots_content = ""
    try:
        robots_content = await _fetch(urljoin(base_url, "/robots.txt"))
    except Exception:
        pass

    sitemap_url = urljoin(base_url, "/sitemap.xml")
    sitemap_content = ""
    try:
        sitemap_content = await _fetch(sitemap_url)
    except Exception:
        pass

    findings: list[dict] = []

    s, m, a = _check_json_ld(soup)
    findings.append({"category": "JSON-LD / Schema.org", "status": s, "message": m, "action": a})

    s, m, a = _check_robots_txt(robots_content)
    findings.append({"category": "Robots.txt", "status": s, "message": m, "action": a})

    s, m, a = _check_meta_tags(soup)
    findings.append({"category": "Meta Tags", "status": s, "message": m, "action": a})

    s, m, a = _check_headings(soup)
    findings.append({"category": "Headings", "status": s, "message": m, "action": a})

    s, m, a = _check_faq(soup)
    findings.append({"category": "FAQ Content", "status": s, "message": m, "action": a})

    s, m, a = _check_eeat(soup)
    findings.append({"category": "E-E-A-T Signals", "status": s, "message": m, "action": a})

    s, m, a = _check_sitemap(sitemap_content, sitemap_url)
    findings.append({"category": "Sitemap", "status": s, "message": m, "action": a})

    s, m, a = _check_conversational(soup)
    findings.append({"category": "Linguagem Conversacional", "status": s, "message": m, "action": a})

    score = _score_from_findings(findings)
    result = {"geoReadinessScore": score, "findings": findings}
    _cache[ck] = (result, datetime.utcnow())
    return result
