import re
import json
import xml.etree.ElementTree as ET
import httpx
from openai import AsyncOpenAI
from anthropic import AsyncAnthropic
import structlog

from ..config import settings
from .queue import queue_service

logger = structlog.get_logger()

openai_client = AsyncOpenAI(api_key=settings.openai_api_key)
anthropic_client = AsyncAnthropic(api_key=settings.anthropic_api_key)

# SEO/GEO rules that MUST be applied to all generated content
SEO_GEO_SYSTEM_PROMPT = """You are an expert SEO and GEO (Generative Engine Optimization) content writer.

MANDATORY SEO/GEO RULES — apply to EVERY article:
1. Keyword in H1 and first paragraph (first 100 words)
2. At least 30% assertive statements (use "X is Y" not "X might be Y")
3. Max 4-line paragraphs
4. Concrete data (statistics, numbers, studies) in at least 2 sections
5. Generate FAQ section with Schema.org JSON-LD at the end (inside a ```json code block)
6. Auto-generate meta title (max 60 chars) and meta description (max 160 chars) with keyword
7. Use subheadings (H2, H3) every 300-400 words
8. Internal links: use ONLY URLs from the provided internal link list (if any). Do NOT invent URLs.

OUTPUT FORMAT (JSON):
{
  "title": "H1 title with keyword",
  "metaTitle": "SEO title max 60 chars",
  "metaDescription": "Meta description max 160 chars with keyword",
  "content": "Full article in markdown with FAQ Schema at the end as ```json block",
  "wordCount": 1234,
  "seoChecks": {
    "keywordInH1": true,
    "keywordInFirstParagraph": true,
    "assertiveStatementsRate": 0.35,
    "hasConcretData": true,
    "hasFaqSchema": true,
    "hasMetaTitle": true,
    "hasMetaDescription": true
  }
}"""


ARTICLE_FORMAT_INSTRUCTIONS: dict[str, str] = {
    "blog": "Write a comprehensive blog post with personal insights and actionable tips.",
    "listicle": "Write a numbered list article (minimum 7 items). Each item needs a subheading + 2-3 paragraphs.",
    "how-to": "Write a step-by-step guide. Number each step. Include prerequisites and expected outcomes.",
    "news": "Write in inverted pyramid style. Lead with the most important facts. Cite sources.",
    "comparison": "Compare at least 3 options. Use a comparison table. Give a clear recommendation.",
    "opinion": "Take a clear stance. Use data to support arguments. Address counterarguments.",
    "product-review": "Follow: overview → features → pros/cons → verdict. Include rating (1-10).",
    "pillar": "Write a comprehensive pillar page (2500+ words). Cover the topic exhaustively with internal link anchors.",
}


class GenerationService:
    @staticmethod
    async def generate_article(
        job_id: str,
        tenant_id: str,
        user_id: str,
        request: object,
    ) -> None:
        try:
            await queue_service.set_job_status(tenant_id, job_id, "processing", 10)

            req = request  # type: ignore[assignment]
            format_instruction = ARTICLE_FORMAT_INSTRUCTIONS.get(
                req.format, "Write a high-quality article."  # type: ignore[attr-defined]
            )

            word_count_instruction = (
                f"Target word count: {req.wordCount} words."  # type: ignore[attr-defined]
                if req.wordCount  # type: ignore[attr-defined]
                else "Target word count: 1200-1500 words."
            )

            # Optional: pre-fetch sitemap for real cross-linking
            sitemap_context = ""
            sitemap_url = getattr(req, "sitemapUrl", None)  # type: ignore[attr-defined]
            if sitemap_url:
                internal_urls = await GenerationService._fetch_sitemap(sitemap_url)
                if internal_urls:
                    url_list = "\n".join(f"- {u['url']} ({u['title']})" for u in internal_urls[:40])
                    sitemap_context = f"\n\nINTERNAL LINKS AVAILABLE (use only these, never invent URLs):\n{url_list}"

            user_prompt = f"""
Write a {req.format} article about: **{req.primaryKeyword}**

{format_instruction}

Secondary keywords to include naturally: {', '.join(req.secondaryKeywords) if req.secondaryKeywords else 'none'}
Target audience: {req.targetAudience or 'general audience'}
Language: {req.language}
Tone: {req.tone}
{word_count_instruction}

Remember: Primary keyword is "{req.primaryKeyword}". It MUST appear in H1 and first paragraph.{sitemap_context}
"""  # type: ignore[attr-defined]

            await queue_service.set_job_status(tenant_id, job_id, "processing", 30)

            # Try primary model (GPT-4o), fallback to Claude
            result = None
            try:
                result = await GenerationService._generate_with_openai(user_prompt)
                await queue_service.set_job_status(tenant_id, job_id, "processing", 80)
            except Exception as openai_err:
                logger.warning("OpenAI failed, falling back to Claude", error=str(openai_err))
                result = await GenerationService._generate_with_claude(user_prompt)
                await queue_service.set_job_status(tenant_id, job_id, "processing", 80)

            # Extract JSON-LD schema from content body → store separately
            raw_content = result.get("content", "")
            clean_content, structured_data = GenerationService._extract_structured_data(raw_content)
            result["content"] = clean_content

            # Compute SEO score with per-factor breakdown
            seo_score, seo_breakdown = GenerationService._compute_seo_score_with_breakdown(
                clean_content,
                req.primaryKeyword,  # type: ignore[attr-defined]
                result.get("seoChecks", {}),
            )
            result["seoScore"] = seo_score
            result["seoBreakdown"] = seo_breakdown
            result["structuredData"] = structured_data

            # Persist article to PostgreSQL via Node API callback
            article_id = await GenerationService._persist_article(
                tenant_id=tenant_id,
                user_id=user_id,
                job_id=job_id,
                request=req,
                result=result,
            )

            await queue_service.set_job_status(
                tenant_id,
                job_id,
                "completed",
                100,
                result={**result, "articleId": article_id},
            )

            logger.info("Article generation completed", job_id=job_id, seo_score=seo_score, article_id=article_id)

        except Exception as e:
            logger.error("Article generation failed", job_id=job_id, error=str(e))
            await queue_service.set_job_status(
                tenant_id, job_id, "failed", 0, error=str(e)
            )

    @staticmethod
    async def _generate_with_openai(user_prompt: str) -> dict:
        response = await openai_client.chat.completions.create(
            model=settings.primary_model,
            messages=[
                {"role": "system", "content": SEO_GEO_SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            response_format={"type": "json_object"},
            max_tokens=settings.max_article_tokens,
            temperature=0.7,
        )
        content = response.choices[0].message.content or "{}"
        return json.loads(content)

    @staticmethod
    async def _generate_with_claude(user_prompt: str) -> dict:
        response = await anthropic_client.messages.create(
            model=settings.fallback_model,
            max_tokens=settings.max_article_tokens,
            system=SEO_GEO_SYSTEM_PROMPT + "\n\nRespond with valid JSON only.",
            messages=[{"role": "user", "content": user_prompt}],
        )
        content = response.content[0].text if response.content else "{}"
        json_match = re.search(r'\{.*\}', content, re.DOTALL)
        if json_match:
            return json.loads(json_match.group())
        return json.loads(content)

    @staticmethod
    def _extract_structured_data(content: str) -> tuple[str, dict | None]:
        """Extract JSON-LD/Schema.org block from markdown. Returns (clean_content, schema_dict)."""
        structured_data = None
        cleaned = content

        # Pattern 1: ```json ... ``` block containing @type or @context
        pattern1 = re.compile(
            r'```(?:json)?\s*(\{[^`]*?(?:"@type"|"@context")[^`]*?\})\s*```',
            re.DOTALL | re.IGNORECASE,
        )
        # Pattern 2: <script type="application/ld+json">...</script>
        pattern2 = re.compile(
            r'<script[^>]*application/ld\+json[^>]*>(.*?)</script>',
            re.DOTALL | re.IGNORECASE,
        )

        for pattern in (pattern1, pattern2):
            m = pattern.search(content)
            if m:
                try:
                    structured_data = json.loads(m.group(1))
                    cleaned = (content[: m.start()].rstrip() + "\n" + content[m.end() :]).strip()
                    break
                except (json.JSONDecodeError, Exception):
                    continue

        return cleaned, structured_data

    @staticmethod
    def _compute_seo_score_with_breakdown(content: str, keyword: str, checks: dict) -> tuple[int, dict]:
        """Compute SEO score and return (total_score, breakdown_dict)."""
        score = 0
        breakdown: dict[str, dict] = {}
        keyword_lower = keyword.lower()

        # H1 keyword match (20pts)
        h1_match = re.search(r'^#\s+(.+)$', content, re.MULTILINE)
        h1_ok = bool(h1_match and keyword_lower in h1_match.group(1).lower())
        breakdown['h1Keyword'] = {'pts': 20 if h1_ok else 0, 'max': 20, 'ok': h1_ok, 'label': 'Keyword no H1'}
        if h1_ok:
            score += 20

        # Keyword in first paragraph (15pts)
        paragraphs = content.split('\n\n')
        first_text = next((p for p in paragraphs if p.strip() and not p.startswith('#')), '')
        fp_ok = keyword_lower in first_text.lower()
        breakdown['firstParagraph'] = {'pts': 15 if fp_ok else 0, 'max': 15, 'ok': fp_ok, 'label': 'Keyword no 1º parágrafo'}
        if fp_ok:
            score += 15

        # Assertive statements rate (15pts)
        assertive_rate = checks.get('assertiveStatementsRate', 0) or 0
        assertive_ok = isinstance(assertive_rate, (int, float)) and float(assertive_rate) >= 0.3
        assertive_pct = round(float(assertive_rate) * 100)
        breakdown['assertiveStatements'] = {
            'pts': 15 if assertive_ok else 0, 'max': 15, 'ok': assertive_ok,
            'label': f'Assertividade ({assertive_pct}% — mín. 30%)',
        }
        if assertive_ok:
            score += 15

        # Concrete data / statistics (15pts)
        has_data = bool(re.search(
            r'\d+\s*%|\d+\s*(million|billion|thousand|milhão|bilhão|mil|estudo|pesquisa|study|research)',
            content, re.IGNORECASE,
        ))
        breakdown['concreteData'] = {'pts': 15 if has_data else 0, 'max': 15, 'ok': has_data, 'label': 'Dados concretos / estatísticas'}
        if has_data:
            score += 15

        # FAQ / Schema.org presence (15pts)
        has_faq = bool(re.search(r'faq|@type|schema\.org|FAQPage', content, re.IGNORECASE))
        breakdown['faqSchema'] = {'pts': 15 if has_faq else 0, 'max': 15, 'ok': has_faq, 'label': 'FAQ Schema.org presente'}
        if has_faq:
            score += 15

        # Meta title + meta description (10pts)
        has_meta = bool(checks.get('hasMetaTitle') and checks.get('hasMetaDescription'))
        breakdown['metaTags'] = {'pts': 10 if has_meta else 0, 'max': 10, 'ok': has_meta, 'label': 'Meta title + meta description'}
        if has_meta:
            score += 10

        # Heading structure — ≥3 H2/H3 (10pts)
        heading_count = len(re.findall(r'^#{2,3}\s+', content, re.MULTILINE))
        headings_ok = heading_count >= 3
        breakdown['headingsStructure'] = {
            'pts': 10 if headings_ok else 0, 'max': 10, 'ok': headings_ok,
            'label': f'Estrutura de headings ({heading_count} H2/H3)',
        }
        if headings_ok:
            score += 10

        final_score = min(score, 100)
        breakdown['total'] = final_score
        return final_score, breakdown

    @staticmethod
    async def _fetch_sitemap(base_url: str) -> list[dict]:
        """Fetch sitemap or RSS/Atom from base_url and return list of {url, title} for internal linking."""
        candidates = [
            f"{base_url.rstrip('/')}/sitemap.xml",
            f"{base_url.rstrip('/')}/sitemap_index.xml",
            f"{base_url.rstrip('/')}/feed",
            f"{base_url.rstrip('/')}/rss.xml",
        ]
        links: list[dict] = []

        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            for url in candidates:
                try:
                    resp = await client.get(url, headers={"User-Agent": "ORFFIA-Bot/1.0"})
                    if resp.status_code != 200:
                        continue
                    content_type = resp.headers.get("content-type", "")
                    text = resp.text

                    # Try XML parse (sitemap or RSS)
                    try:
                        root = ET.fromstring(text)
                        ns = {'sm': 'http://www.sitemaps.org/schemas/sitemap/0.9'}

                        # Sitemap format
                        for loc in root.findall('.//sm:loc', ns):
                            links.append({'url': loc.text or '', 'title': loc.text or ''})
                        if not links:
                            for loc in root.iter('{http://www.sitemaps.org/schemas/sitemap/0.9}loc'):
                                links.append({'url': loc.text or '', 'title': loc.text or ''})

                        # RSS format — extract titles
                        for item in root.iter('item'):
                            title_el = item.find('title')
                            link_el = item.find('link')
                            if link_el is not None:
                                links.append({
                                    'url': link_el.text or '',
                                    'title': title_el.text if title_el is not None else link_el.text or '',
                                })
                    except ET.ParseError:
                        pass

                    if links:
                        break
                except Exception:
                    continue

        # Return up to 50 unique non-empty URLs
        seen: set[str] = set()
        result = []
        for item in links:
            u = item.get('url', '').strip()
            if u and u not in seen:
                seen.add(u)
                result.append(item)
                if len(result) >= 50:
                    break
        return result

    @staticmethod
    async def _persist_article(
        tenant_id: str,
        user_id: str,
        job_id: str,
        request: object,
        result: dict,
    ) -> str:
        """POST generated article to Node API for DB persistence. Returns articleId."""
        req = request  # type: ignore[assignment]
        payload = {
            "jobId": job_id,
            "tenantId": tenant_id,
            "createdBy": user_id,
            "projectId": getattr(req, "projectId", None),
            "format": req.format,  # type: ignore[attr-defined]
            "title": result.get("title", req.primaryKeyword),  # type: ignore[attr-defined]
            "content": result.get("content", ""),
            "metaTitle": result.get("metaTitle"),
            "metaDescription": result.get("metaDescription"),
            "seoScore": result.get("seoScore"),
            "seoBreakdown": result.get("seoBreakdown"),
            "structuredData": result.get("structuredData"),
            "wordCount": result.get("wordCount"),
            "keywords": [req.primaryKeyword] + (req.secondaryKeywords or []),  # type: ignore[attr-defined]
            "generationParams": {
                "format": req.format,  # type: ignore[attr-defined]
                "primaryKeyword": req.primaryKeyword,  # type: ignore[attr-defined]
                "tone": req.tone,  # type: ignore[attr-defined]
                "language": req.language,  # type: ignore[attr-defined]
                "targetAudience": getattr(req, "targetAudience", None),
                "sitemapUrl": getattr(req, "sitemapUrl", None),
            },
        }
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{settings.api_internal_url}/api/v1/content/internal/articles",
                json=payload,
                headers={"X-Worker-Secret": settings.worker_secret},
            )
            resp.raise_for_status()
            data = resp.json()
            return data["data"]["articleId"]
