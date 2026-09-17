import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export default async function OpenGraphImage({ request }: { request: NextRequest }) {
  const image = request.nextUrl.searchParams.get('image') || ''
  const title = request.nextUrl.searchParams.get('title') || 'Conik'

  return new ImageResponse(
    <div style={{ width: '1200px', height: '630px', display: 'flex', background: '#f8fafc', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
      {image ? (
        <img src={image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '28px' }} />
      ) : (
        <div style={{ display: 'flex', fontSize: 64, fontWeight: 700 }}>{title}</div>
      )}
    </div>,
    { width: 1200, height: 630 },
  )
}
