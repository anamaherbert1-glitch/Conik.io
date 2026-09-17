import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0f1220 0%, #18254a 55%, #0b8f7a 100%)',
          color: '#ffffff',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '18px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '76px', fontWeight: 800, letterSpacing: '-3px' }}>
            Conik
          </div>
          <div style={{ fontSize: '30px', opacity: 0.9 }}>
            Marketing OS
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  )
}
