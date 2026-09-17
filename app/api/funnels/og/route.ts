import { NextRequest, NextResponse } from 'next/server'
import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  const title = request.nextUrl.searchParams.get('title') || 'Conik'
  const image = request.nextUrl.searchParams.get('image') || ''

  return new ImageResponse(
    <div
      style={{
        width: '1200px',
        height: '630px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f8fafc',
        padding: '40px',
      }}
    >
      {image ? (
        <img
          src={image}
          alt=""
          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '28px' }}
        />
      ) : (
        <div style={{ display: 'flex', fontSize: 64, fontWeight: 700 }}>{title}</div>
      )}
    </div>,
    { width: 1200, height: 630 },
  )
}
