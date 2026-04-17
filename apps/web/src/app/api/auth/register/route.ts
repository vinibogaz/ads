import { NextRequest, NextResponse } from 'next/server'

const API_URL = process.env['INTERNAL_API_URL'] ?? 'http://synthex-api:4000'
const REFRESH_TTL = 60 * 60 * 24 * 7

export async function POST(request: NextRequest) {
  const body = await request.json()

  const res = await fetch(`${API_URL}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  const data = await res.json()
  const response = NextResponse.json(data, { status: res.status })

  if (res.ok && data?.data?.refreshToken) {
    response.cookies.set('synthex-refresh', data.data.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: REFRESH_TTL,
      path: '/',
    })
  }

  return response
}
