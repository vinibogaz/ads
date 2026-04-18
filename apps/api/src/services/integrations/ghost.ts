/**
 * Ghost CMS integration — publishes articles via Ghost Admin API.
 * Auth: Staff API Key (format: "key_id:secret") → JWT signed client-side.
 */
import crypto from 'crypto'

interface GhostCredentials {
  url: string        // e.g. https://myblog.ghost.io
  staffApiKey: string // format: "keyId:secret"
}

interface ArticlePayload {
  title: string
  html: string
  status?: 'draft' | 'published'
  metaTitle?: string | null
  metaDescription?: string | null
  slug?: string | null
}

function buildGhostJwt(staffApiKey: string): string {
  const [id, secret] = staffApiKey.split(':')
  if (!id || !secret) throw new Error('Invalid Ghost Staff API Key format (expected id:secret)')

  const iat = Math.floor(Date.now() / 1000)
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT', kid: id })).toString('base64url')
  const payload = Buffer.from(JSON.stringify({ iat, exp: iat + 300, aud: '/admin/' })).toString('base64url')
  const sig = crypto
    .createHmac('sha256', Buffer.from(secret, 'hex'))
    .update(`${header}.${payload}`)
    .digest('base64url')

  return `${header}.${payload}.${sig}`
}

export async function ghostPublish(
  credentials: GhostCredentials,
  article: ArticlePayload,
): Promise<{ postId: string; url: string }> {
  const jwt = buildGhostJwt(credentials.staffApiKey)
  const baseUrl = credentials.url.replace(/\/$/, '')

  const body = {
    posts: [
      {
        title: article.title,
        html: article.html,
        status: article.status ?? 'draft',
        ...(article.slug ? { slug: article.slug } : {}),
        ...(article.metaTitle ? { meta_title: article.metaTitle } : {}),
        ...(article.metaDescription ? { meta_description: article.metaDescription } : {}),
      },
    ],
  }

  const res = await fetch(`${baseUrl}/ghost/api/admin/posts/`, {
    method: 'POST',
    headers: {
      'Authorization': `Ghost ${jwt}`,
      'Content-Type': 'application/json',
      'Accept-Version': 'v5.0',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Ghost API error ${res.status}: ${err}`)
  }

  const data = await res.json() as { posts: Array<{ id: string; url: string }> }
  const post = data.posts[0]!
  return { postId: post.id, url: post.url }
}

export async function ghostTest(credentials: GhostCredentials): Promise<boolean> {
  try {
    const jwt = buildGhostJwt(credentials.staffApiKey)
    const baseUrl = credentials.url.replace(/\/$/, '')
    const res = await fetch(`${baseUrl}/ghost/api/admin/site/`, {
      headers: { 'Authorization': `Ghost ${jwt}`, 'Accept-Version': 'v5.0' },
    })
    return res.ok
  } catch {
    return false
  }
}
