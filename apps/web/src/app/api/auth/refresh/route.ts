import { NextRequest, NextResponse } from 'next/server'

const API_URL = process.env['INTERNAL_API_URL'] ?? 'http://ads-api:4000'
const REFRESH_TTL = 60 * 60 * 24 * 7

export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get('orffia-refresh')?.value

  if (!refreshToken) {
    return NextResponse.json({ error: 'NO_SESSION' }, { status: 401 })
  }

  const res = await fetch(`${API_URL}/api/v1/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  })

  const data = await res.json()
  const response = NextResponse.json(data, { status: res.status })

  if (res.ok && data?.data?.refreshToken) {
    response.cookies.set('orffia-refresh', data.data.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: REFRESH_TTL,
      path: '/',
    })
  } else if (!res.ok) {
    response.cookies.delete('orffia-refresh')
  }

  return response
}
