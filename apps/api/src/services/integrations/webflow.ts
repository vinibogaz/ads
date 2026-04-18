/**
 * Webflow CMS integration — publishes articles to a Webflow Collection via API v2.
 */

interface WebflowCredentials {
  apiToken: string
  siteId: string
  collectionId: string
  // fieldMap: maps ORFFIA fields to Webflow CMS field slugs
  fieldMap?: {
    title?: string
    body?: string
    metaTitle?: string
    metaDescription?: string
    slug?: string
  }
}

interface ArticlePayload {
  title: string
  content: string
  metaTitle?: string | null
  metaDescription?: string | null
  slug?: string | null
}

const DEFAULT_FIELD_MAP = {
  title: 'name',
  body: 'post-body',
  metaTitle: 'meta-title',
  metaDescription: 'meta-description',
  slug: 'slug',
}

export async function webflowPublish(
  credentials: WebflowCredentials,
  article: ArticlePayload,
): Promise<{ itemId: string }> {
  const fm = { ...DEFAULT_FIELD_MAP, ...(credentials.fieldMap ?? {}) }

  const fields: Record<string, string | boolean> = {
    [fm.title]: article.title,
    [fm.body]: article.content,
    _archived: false,
    _draft: false,
  }
  if (article.metaTitle) fields[fm.metaTitle] = article.metaTitle
  if (article.metaDescription) fields[fm.metaDescription] = article.metaDescription
  if (article.slug) fields[fm.slug] = article.slug

  const res = await fetch(
    `https://api.webflow.com/v2/collections/${credentials.collectionId}/items`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${credentials.apiToken}`,
        'Content-Type': 'application/json',
        'accept-version': '2.0.0',
      },
      body: JSON.stringify({ fieldData: fields }),
    },
  )

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Webflow API error ${res.status}: ${err}`)
  }

  const data = await res.json() as { id: string }
  return { itemId: data.id }
}

export async function webflowTest(credentials: WebflowCredentials): Promise<boolean> {
  try {
    const res = await fetch(`https://api.webflow.com/v2/sites/${credentials.siteId}`, {
      headers: { 'Authorization': `Bearer ${credentials.apiToken}`, 'accept-version': '2.0.0' },
    })
    return res.ok
  } catch {
    return false
  }
}
