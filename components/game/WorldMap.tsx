'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
  Line,
  Marker,
} from 'react-simple-maps';
import { motion, AnimatePresence } from 'framer-motion';
import { countriesByIso } from '@/lib/data/countries';

// ── TopoJSON ───────────────────────────────────────────────────────────────
const GEO_URL = '/world-110m.json';

// ── ISO alpha-2 → numeric (ISO 3166-1) ────────────────────────────────────
// The 110m Natural Earth TopoJSON uses numeric IDs.
const ALPHA2_TO_NUMERIC: Record<string, string> = {
  AF: '004', AL: '008', DZ: '012', AO: '024', AZ: '031', AR: '032', AU: '036',
  AT: '040', BH: '044', BD: '050', AM: '051', BE: '056', BT: '064', BO: '068',
  BA: '070', BW: '072', BR: '076', BZ: '084', SB: '090', BN: '096', BG: '100',
  MM: '104', BI: '108', BY: '112', KH: '116', CM: '120', CA: '124', CF: '140',
  LK: '144', TD: '148', CL: '152', CN: '156', TW: '158', CO: '170', CG: '178',
  CD: '180', CR: '188', HR: '191', CU: '192', CY: '196', CZ: '203', BJ: '204',
  DK: '208', DO: '214', EC: '218', SV: '222', GQ: '226', ET: '231', ER: '232',
  EE: '233', FJ: '242', FI: '246', FR: '250', DJ: '262', GA: '266', GE: '268',
  GM: '270', DE: '276', GH: '288', GR: '300', GT: '320', GN: '324', GY: '328',
  HT: '332', HN: '340', HU: '348', IS: '352', IN: '356', ID: '360', IR: '364',
  IQ: '368', IE: '372', IL: '376', IT: '380', CI: '384', JM: '388', JP: '392',
  KZ: '398', JO: '400', KE: '404', KP: '408', KR: '410', KW: '414', KG: '417',
  LA: '418', LB: '422', LS: '426', LV: '428', LR: '430', LY: '434', LT: '440',
  LU: '442', MG: '450', MW: '454', MY: '458', ML: '466', MR: '478', MX: '484',
  MN: '496', MD: '498', ME: '499', MA: '504', MZ: '508', OM: '512', NA: '516',
  NP: '524', NL: '528', VU: '548', NZ: '554', NI: '558', NE: '562', NG: '566',
  NO: '578', PK: '586', PA: '591', PG: '598', PY: '600', PE: '604', PH: '608',
  PL: '616', PT: '620', GW: '624', TL: '626', QA: '634', RO: '642', RU: '643',
  RW: '646', SA: '682', SN: '686', RS: '688', SL: '694', SK: '703', VN: '704',
  SI: '705', SO: '706', ZA: '710', ZW: '716', ES: '724', SS: '728', SD: '729',
  SR: '740', SZ: '748', SE: '752', CH: '756', SY: '760', TJ: '762', TH: '764',
  TG: '768', TT: '780', AE: '784', TN: '788', TR: '792', TM: '795', UG: '800',
  UA: '804', MK: '807', EG: '818', GB: '826', TZ: '834', US: '840', BF: '854',
  UY: '858', UZ: '860', VE: '862', YE: '887', ZM: '894',
};

const NUMERIC_TO_ALPHA2: Record<string, string> = Object.fromEntries(
  Object.entries(ALPHA2_TO_NUMERIC).map(([a2, num]) => [num, a2])
);

// Countries too small to appear in the 110m TopoJSON — rendered as dot markers.
// Includes microstates, small island nations, and Kosovo (split from Serbia in TopoJSON).
const MICROSTATE_ISOS = new Set([
  // European microstates
  'AD', 'LI', 'MC', 'SM', 'VA', 'MT',
  // Kosovo (not separate in 110m TopoJSON)
  'XK',
  // Small island nations — Asia
  'MV', 'SG', 'BH',
  // Small island nations — Africa
  'CV', 'KM', 'MU', 'ST', 'SC',
  // Small island nations — Caribbean
  'AG', 'BB', 'BS', 'DM', 'GD', 'KN', 'LC', 'VC',
  // Small island nations — Oceania
  'WS', 'TO', 'KI', 'MH', 'FM', 'NR', 'PW', 'TV',
]);

// ── Colors ─────────────────────────────────────────────────────────────────
const COLORS = {
  homeland: '#F59E0B',       // amber gold
  homelandGlow: 'rgba(245, 158, 11, 0.5)',
  conquered: '#16A34A',      // green-700
  conqueredHover: '#15803D',
  invadable: '#DC2626',      // red-600
  invadableHover: '#B91C1C',
  neutral: '#374151',        // gray-700
  neutralHover: '#4B5563',
  border: '#111827',         // gray-900
  connectionLine: 'rgba(250, 204, 21, 0.55)',
  labelFill: '#F9FAFB',
  labelStroke: '#111827',
};

// ── Types ──────────────────────────────────────────────────────────────────
export interface WorldMapProps {
  /** ISO alpha-2 code of the player's starting country */
  homeland: string;
  /** ISO alpha-2 codes of all conquered countries */
  conquered: Set<string>;
  /** ISO alpha-2 codes explicitly reachable for invasion (optional override) */
  invadable?: Set<string>;
  /** Called when the user clicks a country on the map */
  onCountryClick?: (iso: string) => void;
  className?: string;
}

// ── Component ──────────────────────────────────────────────────────────────
export function WorldMap({
  homeland,
  conquered,
  invadable: invadableProp,
  onCountryClick,
  className = '',
}: WorldMapProps) {
  const [zoom, setZoom] = useState(1);
  const [center, setCenter] = useState<[number, number]>([10, 15]);
  const [tooltip, setTooltip] = useState<{ name: string; x: number; y: number } | null>(null);

  // Track which countries were just conquered so we can pulse them
  const prevConqueredRef = useRef<Set<string>>(new Set());
  const [newlyConquered, setNewlyConquered] = useState<Set<string>>(new Set());

  useEffect(() => {
    const prev = prevConqueredRef.current;
    const fresh = new Set<string>();
    for (const iso of conquered) {
      if (!prev.has(iso)) fresh.add(iso);
    }
    prevConqueredRef.current = new Set(conquered);
    if (fresh.size === 0) return;
    setNewlyConquered(fresh);
    const t = setTimeout(() => setNewlyConquered(new Set()), 1800);
    return () => clearTimeout(t);
  }, [conquered]);

  // Derive invadable set from territory neighbors when not provided
  const invadableSet = useMemo<Set<string>>(() => {
    if (invadableProp) return invadableProp;
    const territory = new Set([homeland, ...conquered]);
    const reachable = new Set<string>();
    for (const iso of territory) {
      const c = countriesByIso[iso];
      if (!c) continue;
      for (const n of c.neighbors) {
        if (!territory.has(n)) reachable.add(n);
      }
    }
    return reachable;
  }, [homeland, conquered, invadableProp]);

  // Dashed connection lines between adjacent territory countries
  const connectionPairs = useMemo(() => {
    const territory = new Set([homeland, ...conquered]);
    const seen = new Set<string>();
    const pairs: Array<[string, string]> = [];
    for (const iso of territory) {
      const c = countriesByIso[iso];
      if (!c) continue;
      for (const n of c.neighbors) {
        if (!territory.has(n)) continue;
        const key = [iso, n].sort().join('|');
        if (!seen.has(key)) {
          seen.add(key);
          pairs.push([iso, n]);
        }
      }
    }
    return pairs;
  }, [homeland, conquered]);

  // Territory countries that have a label (homeland + all conquered)
  const labeledCountries = useMemo(() => {
    return [homeland, ...conquered]
      .map((iso) => countriesByIso[iso])
      .filter(Boolean);
  }, [homeland, conquered]);

  // Resolve country state for styling — works for both numeric TopoJSON IDs and ISO codes
  const getCountryStateByIso = useCallback(
    (iso: string): 'homeland' | 'conquered' | 'invadable' | 'neutral' => {
      if (iso === homeland) return 'homeland';
      if (conquered.has(iso)) return 'conquered';
      if (invadableSet.has(iso)) return 'invadable';
      return 'neutral';
    },
    [homeland, conquered, invadableSet]
  );

  const getCountryState = useCallback(
    (numericId: string): 'homeland' | 'conquered' | 'invadable' | 'neutral' => {
      const iso = NUMERIC_TO_ALPHA2[numericId];
      if (!iso) return 'neutral';
      return getCountryStateByIso(iso);
    },
    [getCountryStateByIso]
  );

  // Microstate dot markers — countries too small for the TopoJSON
  const microstateMarkers = useMemo(() => {
    return [...MICROSTATE_ISOS]
      .map((iso) => {
        const c = countriesByIso[iso];
        if (!c) return null;
        return { iso, country: c };
      })
      .filter(Boolean) as Array<{ iso: string; country: NonNullable<typeof countriesByIso[string]> }>;
  }, []);

  const getFill = (state: ReturnType<typeof getCountryState>) => {
    switch (state) {
      case 'homeland': return COLORS.homeland;
      case 'conquered': return COLORS.conquered;
      case 'invadable': return COLORS.invadable;
      default: return COLORS.neutral;
    }
  };

  const getHoverFill = (state: ReturnType<typeof getCountryState>) => {
    switch (state) {
      case 'homeland': return '#FCD34D';
      case 'conquered': return COLORS.conqueredHover;
      case 'invadable': return COLORS.invadableHover;
      default: return COLORS.neutralHover;
    }
  };

  const handleCountryClick = useCallback(
    (numericId: string) => {
      const iso = NUMERIC_TO_ALPHA2[numericId];
      if (iso && onCountryClick) onCountryClick(iso);
    },
    [onCountryClick]
  );

  const handleZoomIn = () => setZoom((z) => Math.min(z * 1.5, 12));
  const handleZoomOut = () => setZoom((z) => Math.max(z / 1.5, 1));
  const handleReset = () => { setZoom(1); setCenter([10, 15]); };

  return (
    <div
      className={`relative w-full bg-gray-950 rounded-xl overflow-hidden ${className}`}
      style={{ touchAction: 'none' }}
    >

      {/* SVG Filters (injected into the page, referenced by id from the map) */}
      <svg width={0} height={0} style={{ position: 'absolute' }}>
        <defs>
          <filter id="homeland-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="conquered-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      </svg>

      {/* Map */}
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{ scale: 130, center: [10, 15] }}
        style={{ width: '100%', height: '100%' }}
      >
        <ZoomableGroup
          zoom={zoom}
          center={center}
          onMoveEnd={({ zoom: z, coordinates }) => {
            setZoom(z);
            setCenter(coordinates as [number, number]);
          }}
          minZoom={1}
          maxZoom={12}
        >
          {/* Ocean background sphere */}
          <rect x="-800" y="-500" width="1600" height="1000" fill="#0F172A" />

          {/* Country fills */}
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const numId = geo.id as string;
                const state = getCountryState(numId);
                const iso = NUMERIC_TO_ALPHA2[numId];
                const isNewlyConq = iso ? newlyConquered.has(iso) : false;
                const isHomeland = state === 'homeland';

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    onClick={() => handleCountryClick(numId)}
                    onMouseEnter={(e: React.MouseEvent<SVGPathElement>) => {
                      if (state !== 'homeland' && state !== 'conquered') return;
                      const name = iso ? (countriesByIso[iso]?.name ?? iso) : 'Unknown';
                      const rect = (e.target as SVGPathElement)
                        .closest('svg')
                        ?.getBoundingClientRect();
                      setTooltip({
                        name,
                        x: e.clientX - (rect?.left ?? 0),
                        y: e.clientY - (rect?.top ?? 0),
                      });
                    }}
                    onMouseLeave={() => setTooltip(null)}
                    style={{
                      default: {
                        fill: getFill(state),
                        stroke: COLORS.border,
                        strokeWidth: 0.4,
                        outline: 'none',
                        cursor: state === 'invadable' ? 'pointer' : 'default',
                        filter: isHomeland
                          ? 'url(#homeland-glow)'
                          : isNewlyConq
                          ? 'url(#conquered-glow)'
                          : 'none',
                        transition: 'fill 0.3s ease',
                      },
                      hover: {
                        fill: getHoverFill(state),
                        stroke: COLORS.border,
                        strokeWidth: 0.5,
                        outline: 'none',
                        cursor: state === 'invadable' ? 'pointer' : 'default',
                        filter: isHomeland ? 'url(#homeland-glow)' : 'none',
                      },
                      pressed: {
                        fill: getHoverFill(state),
                        stroke: COLORS.border,
                        strokeWidth: 0.5,
                        outline: 'none',
                      },
                    }}
                  />
                );
              })
            }
          </Geographies>

          {/* Dot markers for microstates & small island nations not visible in TopoJSON */}
          {microstateMarkers.map(({ iso, country }) => {
            const state = getCountryStateByIso(iso);
            const fill = getFill(state);
            const hoverFill = getHoverFill(state);
            const isClickable = state === 'invadable';
            const isHomeland = state === 'homeland';
            const isNewlyConq = newlyConquered.has(iso);
            const dotRadius = 3 / Math.sqrt(zoom);
            return (
              <Marker
                key={`dot-${iso}`}
                coordinates={[country.coordinates.lng, country.coordinates.lat]}
              >
                <circle
                  cx={0}
                  cy={0}
                  r={dotRadius}
                  fill={fill}
                  stroke={COLORS.border}
                  strokeWidth={0.3 / zoom}
                  style={{
                    cursor: isClickable ? 'pointer' : 'default',
                    filter: isHomeland
                      ? 'url(#homeland-glow)'
                      : isNewlyConq
                      ? 'url(#conquered-glow)'
                      : 'none',
                    transition: 'fill 0.3s ease',
                  }}
                  onClick={() => onCountryClick?.(iso)}
                  onMouseEnter={(e: React.MouseEvent<SVGCircleElement>) => {
                    (e.target as SVGCircleElement).setAttribute('fill', hoverFill);
                    if (state === 'homeland' || state === 'conquered') {
                      const name = country.name;
                      const rect = (e.target as SVGCircleElement)
                        .closest('svg')
                        ?.getBoundingClientRect();
                      setTooltip({
                        name,
                        x: e.clientX - (rect?.left ?? 0),
                        y: e.clientY - (rect?.top ?? 0),
                      });
                    }
                  }}
                  onMouseLeave={(e: React.MouseEvent<SVGCircleElement>) => {
                    (e.target as SVGCircleElement).setAttribute('fill', fill);
                    setTooltip(null);
                  }}
                />
              </Marker>
            );
          })}

          {/* Dashed connection lines between adjacent territory countries */}
          {connectionPairs.map(([a, b]) => {
            const ca = countriesByIso[a]?.coordinates;
            const cb = countriesByIso[b]?.coordinates;
            if (!ca || !cb) return null;
            return (
              <Line
                key={`${a}-${b}`}
                from={[ca.lng, ca.lat]}
                to={[cb.lng, cb.lat]}
                stroke={COLORS.connectionLine}
                strokeWidth={0.8 / zoom}
                strokeDasharray={`${3 / zoom} ${3 / zoom}`}
                strokeLinecap="round"
              />
            );
          })}

          {/* Pulse rings on newly conquered countries */}
          <AnimatePresence>
            {[...newlyConquered].map((iso) => {
              const c = countriesByIso[iso];
              if (!c) return null;
              return (
                <Marker
                  key={`pulse-${iso}`}
                  coordinates={[c.coordinates.lng, c.coordinates.lat]}
                >
                  {[0, 1].map((i) => (
                    <motion.circle
                      key={i}
                      cx={0}
                      cy={0}
                      fill="transparent"
                      stroke="#22C55E"
                      strokeWidth={1.5}
                      initial={{ r: 4, opacity: 0.9 }}
                      animate={{ r: 20, opacity: 0 }}
                      transition={{
                        duration: 1.4,
                        delay: i * 0.4,
                        ease: 'easeOut',
                      }}
                    />
                  ))}
                </Marker>
              );
            })}
          </AnimatePresence>

          {/* Country name labels — counter-scaled so they stay fixed size at any zoom */}
          {labeledCountries.map((country) => {
            if (!country) return null;
            const isHomeland = country.iso === homeland;
            // Abbreviate long names to avoid sprawling labels over small countries
            const label = country.name.length > 12 ? country.iso : country.name;
            return (
              <Marker
                key={`label-${country.iso}`}
                coordinates={[country.coordinates.lng, country.coordinates.lat]}
              >
                {/*
                  ZoomableGroup scales its children by `zoom`. Wrapping in
                  scale(1/zoom) cancels that out, keeping the label at a
                  constant screen size regardless of zoom level.
                */}
                <g
                  transform={`scale(${1 / zoom})`}
                  style={{ pointerEvents: 'none' }}
                >
                  <text
                    textAnchor="middle"
                    dy="-3"
                    style={{
                      fontSize: '8px',
                      fill: isHomeland ? '#FEF3C7' : '#DCFCE7',
                      fontWeight: isHomeland ? 700 : 500,
                      fontFamily: 'sans-serif',
                      stroke: '#0F172A',
                      strokeWidth: '3.5px',
                      paintOrder: 'stroke fill',
                      letterSpacing: '0.03em',
                    }}
                  >
                    {label}
                  </text>
                </g>
              </Marker>
            );
          })}
        </ZoomableGroup>
      </ComposableMap>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="pointer-events-none absolute z-20 rounded bg-gray-900 border border-gray-700 px-2 py-1 text-xs text-white shadow-lg"
          style={{ left: tooltip.x + 10, top: tooltip.y - 28 }}
        >
          {tooltip.name}
        </div>
      )}

      {/* Zoom controls */}
      <div className="absolute right-3 top-3 flex flex-col gap-1 z-10">
        <button
          onClick={handleZoomIn}
          className="flex h-9 w-9 sm:h-7 sm:w-7 items-center justify-center rounded bg-gray-800/90 text-white hover:bg-gray-700 active:bg-gray-600 border border-gray-600 text-base sm:text-sm font-bold leading-none"
          aria-label="Zoom in"
        >
          +
        </button>
        <button
          onClick={handleZoomOut}
          className="flex h-9 w-9 sm:h-7 sm:w-7 items-center justify-center rounded bg-gray-800/90 text-white hover:bg-gray-700 active:bg-gray-600 border border-gray-600 text-base sm:text-sm font-bold leading-none"
          aria-label="Zoom out"
        >
          −
        </button>
        <button
          onClick={handleReset}
          className="flex h-9 w-9 sm:h-7 sm:w-7 items-center justify-center rounded bg-gray-800/90 text-gray-300 hover:bg-gray-700 active:bg-gray-600 border border-gray-600 text-sm sm:text-xs leading-none"
          aria-label="Reset view"
          title="Reset view"
        >
          ⊙
        </button>
      </div>

      {/* Territory count badge */}
      <div className="absolute left-3 top-3 z-10 rounded bg-gray-900/80 border border-gray-700 px-2 py-1 text-xs text-gray-300">
        <span className="text-amber-400 font-bold">{1 + conquered.size}</span>
        {' '}countr{conquered.size === 0 ? 'y' : 'ies'} controlled
      </div>

      {/* Legend */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 sm:gap-4 rounded-lg bg-gray-900/90 border border-gray-700 px-2 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-xs text-gray-300 whitespace-nowrap">
        <LegendItem color={COLORS.homeland} label="Home" glow />
        <LegendItem color={COLORS.conquered} label="Conquered" />
        <LegendItem color={COLORS.invadable} label="Invadable" />
        <LegendItem color={COLORS.neutral} label="Neutral" />
        <div className="hidden sm:flex items-center gap-1.5">
          <svg width="22" height="8">
            <line
              x1="0" y1="4" x2="22" y2="4"
              stroke={COLORS.connectionLine}
              strokeWidth="1.5"
              strokeDasharray="3 3"
              strokeLinecap="round"
            />
          </svg>
          <span>Territory link</span>
        </div>
      </div>
    </div>
  );
}

// ── Legend Item ────────────────────────────────────────────────────────────
function LegendItem({
  color,
  label,
  glow = false,
}: {
  color: string;
  label: string;
  glow?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <div
        className="h-3 w-3 rounded-sm flex-shrink-0"
        style={{
          backgroundColor: color,
          boxShadow: glow ? `0 0 6px ${color}` : undefined,
        }}
      />
      <span>{label}</span>
    </div>
  );
}
