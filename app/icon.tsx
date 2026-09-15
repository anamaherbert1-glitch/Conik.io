import { ImageResponse } from 'next/og'

export const size = { width: 512, height: 512 }
export const contentType = 'image/png'

/** Favicon / app icon Conik — logo C orange en dégradé */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(180deg, #FFF8F1 0%, #FFE8D6 100%)',
          borderRadius: 112,
        }}
      >
        <svg
          width="340"
          height="340"
          viewBox="0 0 340 340"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="g" x1="40" y1="40" x2="300" y2="300" gradientUnits="userSpaceOnUse">
              <stop stopColor="#FF9F43" />
              <stop offset="0.45" stopColor="#F97316" />
              <stop offset="1" stopColor="#EA580C" />
            </linearGradient>
          </defs>
          {/* Abstract C mark */}
          <path
            fill="url(#g)"
            d="M170 28C92 28 28 92 28 170C28 248 92 312 170 312C212 312 250 294 274 266L230 230C216 246 194 256 170 256C122 256 84 218 84 170C84 122 122 84 170 84C194 84 216 94 230 110L274 74C250 46 212 28 170 28Z"
          />
          {/* Inner flowing accent (lower lobe) */}
          <path
            fill="url(#g)"
            d="M96 200C88 236 112 278 156 292C176 298 196 294 212 282L188 250C180 256 170 258 160 254C140 246 126 226 130 206L96 200Z"
            opacity="0.92"
          />
        </svg>
      </div>
    ),
    { ...size },
  )
}
