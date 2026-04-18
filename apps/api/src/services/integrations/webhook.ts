/**
 * Generic webhook integration — dispatches article payload to a configured URL.
 * Used for: n8n, Zapier, and any other webhook-based integration.
 */

interface WebhookCredentials {
  url: string
  secret?: string  // optional HMAC-SHA256 signature header
}

interface ArticlePayload {
  articleId: string
  title: string
  content: string
  slug?: string | null
  metaTitle?: string | null
  metaDescription?: string | null
  keywords?: string[]
  seoScore?: number | null
  format: string
  scheduledAt?: string
}

export async function webhookDispatch(
  credentials: WebhookCredentials,
  article: ArticlePayload,
): Promise<{ ok: boolean; status: number }> {
  const body = JSON.stringify({ source: 'orffia', ...article })

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'ORFFIA-Webhook/1.0',
  }

  if (credentials.secret) {
    const sig = await computeHmac(body, credentials.secret)
    headers['X-ORFFIA-Signature'] = `sha256=${sig}`
  }

  const res = await fetch(credentials.url, { method: 'POST', headers, body })
  return { ok: res.ok, status: res.status }
}

export async function webhookTest(credentials: WebhookCredentials): Promise<boolean> {
  try {
    const res = await fetch(credentials.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: 'orffia', type: 'ping' }),
    })
    return res.status < 500
  } catch {
    return false
  }
}

async function computeHmac(payload: string, secret: string): Promise<string> {
  const { createHmac } = await import('crypto')
  return createHmac('sha256', secret).update(payload).digest('hex')
}
