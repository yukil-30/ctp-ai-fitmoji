import { NextResponse } from 'next/server'

export function proxy() {
  return NextResponse.json({
    ok: true,
    message: 'hello, fitmoji',
  })
}

export const config = {
  matcher: '/api',
}
