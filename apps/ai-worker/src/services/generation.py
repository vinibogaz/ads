import re
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
5. Generate FAQ section with Schema.org markup at the end
6. Auto-generate meta title (max 60 chars) and meta description (max 160 chars) with keyword
7. Use subheadings (H2, H3) every 300-400 words
8. Internal link placeholder: [LINK: relevant anchor text]

OUTPUT FORMAT (JSON):
{
  "title": "H1 title with keyword",
  "metaTitle": "SEO title max 60 chars",
  "metaDescription": "Meta description max 160 chars with keyword",
  "content": "Full article in markdown",
  "wordCount": 1234,
  "seoChecks": {
    "keywordInH1": true,
    "keywordInFirstParagraph": true,
    "assertiveStatementsRate": 0.35,
    "hasConcretData": true,
    "hasFaqSchema": true
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

            user_prompt = f"""
Write a {req.format} article about: **{req.primaryKeyword}**  # type: ignore[attr-defined]

{format_instruction}

Secondary keywords to include naturally: {', '.join(req.secondaryKeywords) if req.secondaryKeywords else 'none'}  # type: ignore[attr-defined]
Target audience: {req.targetAudience or 'general audience'}  # type: ignore[attr-defined]
Language: {req.language}  # type: ignore[attr-defined]
Tone: {req.tone}  # type: ignore[attr-defined]
{word_count_instruction}

Remember: Primary keyword is "{req.primaryKeyword}". It MUST appear in H1 and first paragraph.  # type: ignore[attr-defined]
"""

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

            # Compute SEO score
            seo_score = GenerationService._compute_seo_score(
                result.get("content", ""),
                req.primaryKeyword,  # type: ignore[attr-defined]
                result.get("seoChecks", {}),
            )
            result["seoScore"] = seo_score

            await queue_service.set_job_status(
                tenant_id,
                job_id,
                "completed",
                100,
                result=result,
            )

            logger.info("Article generation completed", job_id=job_id, seo_score=seo_score)

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
        import json
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
        import json
        content = response.content[0].text if response.content else "{}"
        # Extract JSON from response
        json_match = re.search(r'\{.*\}', content, re.DOTALL)
        if json_match:
            return json.loads(json_match.group())
        return json.loads(content)

    @staticmethod
    def _compute_seo_score(content: str, keyword: str, checks: dict) -> int:
        score = 0
        keyword_lower = keyword.lower()

        # Keyword in H1 (20pts)
        h1_match = re.search(r'^#\s+(.+)$', content, re.MULTILINE)
        if h1_match and keyword_lower in h1_match.group(1).lower():
            score += 20

        # Keyword in first paragraph (15pts)
        paragraphs = content.split('\n\n')
        first_text = next((p for p in paragraphs if p and not p.startswith('#')), '')
        if keyword_lower in first_text.lower():
            score += 15

        # Assertive statements (15pts)
        assertive_rate = checks.get("assertiveStatementsRate", 0)
        if isinstance(assertive_rate, (int, float)) and assertive_rate >= 0.3:
            score += 15

        # Concrete data (15pts)
        has_data = bool(re.search(r'\d+%|\d+\s*(million|billion|thousand|study|research)', content, re.IGNORECASE))
        if has_data:
            score += 15

        # FAQ Schema (15pts)
        if 'faq' in content.lower() or 'schema' in content.lower():
            score += 15

        # Meta title + description (10pts)
        if checks.get("hasMetaTitle") and checks.get("hasMetaDescription"):
            score += 10

        # Headings structure (10pts)
        heading_count = len(re.findall(r'^#{2,3}\s+', content, re.MULTILINE))
        if heading_count >= 3:
            score += 10

        return min(score, 100)
