import { NextRequest, NextResponse } from 'next/server'

const API_URL = process.env['INTERNAL_API_URL'] ?? 'http://ads-api:4000'

export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get('orffia-refresh')?.value

  // Best-effort: revoke on backend
  if (refreshToken) {
    await fetch(`${API_URL}/api/v1/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    }).catch(() => null)
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.delete('orffia-refresh')
  return response
}
