import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'GeoConquest — Conquer the world, one neighbor at a time';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#1a1510',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 28,
          padding: '60px',
          fontFamily: 'Georgia, serif',
        }}
      >
        {/* Grid background */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'linear-gradient(#D4AF3706 1px, transparent 1px), linear-gradient(90deg, #D4AF3706 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        {/* Vignette overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(ellipse at center, transparent 40%, #1a1510 100%)',
          }}
        />

        {/* Icon */}
        <div style={{ fontSize: 100, lineHeight: 1, position: 'relative' }}>⚔</div>

        {/* Title */}
        <div
          style={{
            fontSize: 80,
            fontWeight: 900,
            color: '#D4AF37',
            letterSpacing: '0.18em',
            position: 'relative',
          }}
        >
          GEOCONQUEST
        </div>

        {/* Divider */}
        <div
          style={{
            width: 400,
            height: 1,
            background: '#3a3020',
            position: 'relative',
          }}
        />

        {/* Tagline */}
        <div
          style={{
            fontSize: 28,
            color: '#7C6E52',
            letterSpacing: '0.06em',
            position: 'relative',
          }}
        >
          Conquer the world, one neighbor at a time
        </div>
      </div>
    ),
    { ...size }
  );
}
