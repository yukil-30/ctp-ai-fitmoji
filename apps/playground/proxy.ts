import { type NextRequest, NextResponse } from 'next/server'

export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === '/' && request.method === 'POST') {
    const payload = await readPayload(request)

    console.log('POST / payload:', payload)

    return NextResponse.json({
      ok: true,
      message: 'payload received',
    })
  }

  if (request.nextUrl.pathname === '/') {
    return NextResponse.next()
  }

  return NextResponse.json({
    ok: true,
    message: 'hello, fitmoji',
  })
}

export const config = {
  matcher: ['/', '/api'],
}

async function readPayload(request: NextRequest) {
  const contentType = request.headers.get('content-type') ?? ''

  try {
    if (contentType.includes('application/json')) {
      return await request.json()
    }

    if (
      contentType.includes('application/x-www-form-urlencoded') ||
      contentType.includes('multipart/form-data')
    ) {
      return Object.fromEntries(await request.formData())
    }

    return await request.text()
  } catch (error) {
    console.error('Failed to read POST / payload:', error)
    return null
  }
}
