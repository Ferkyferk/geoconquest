'use client';

import { useState } from 'react';
import { WorldMap } from './WorldMap';

// Demo: France as homeland, Germany + Spain conquered, UK + Italy + Belgium invadable
const DEMO_HOMELAND = 'FR';
const DEMO_CONQUERED = new Set(['DE', 'ES']);

export function MapPreview() {
  const [conquered, setConquered] = useState<Set<string>>(DEMO_CONQUERED);

  const handleClick = (iso: string) => {
    setConquered((prev) => {
      const next = new Set(prev);
      next.add(iso);
      return next;
    });
  };

  return (
    <div className="w-full max-w-4xl">
      <WorldMap
        homeland={DEMO_HOMELAND}
        conquered={conquered}
        onCountryClick={handleClick}
        className="h-[480px]"
      />
      <p className="mt-3 text-center text-sm text-gray-500">
        Click red countries to annex them · Scroll or drag to pan · Use +/− to zoom
      </p>
    </div>
  );
}
