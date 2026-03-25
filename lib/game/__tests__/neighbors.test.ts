import { countries, countriesByIso } from '@/lib/data/countries';
import {
  getAvailableInvasionTargets,
  checkNeighborGuess,
  getDailyCountry,
} from '../engine';

// ── Data integrity ─────────────────────────────────────────────────────────

describe('country data integrity', () => {
  test('has 178 countries', () => expect(countries).toHaveLength(178));

  test('all neighbor ISO codes exist in the dataset', () => {
    const allIsos = new Set(countries.map((c) => c.iso));
    const broken: string[] = [];
    for (const c of countries) {
      for (const n of c.neighbors) {
        if (!allIsos.has(n)) broken.push(`${c.iso} -> ${n}`);
      }
    }
    expect(broken).toHaveLength(0);
  });

  test('neighbor relationships are bidirectional', () => {
    const nonBi: string[] = [];
    for (const c of countries) {
      for (const n of c.neighbors) {
        const neighbor = countriesByIso[n];
        if (neighbor && !neighbor.neighbors.includes(c.iso)) {
          nonBi.push(`${c.iso} -> ${n} (${neighbor.name} missing reverse)`);
        }
      }
    }
    expect(nonBi).toHaveLength(0);
  });

  test('no duplicate ISO codes', () => {
    const isos = countries.map((c) => c.iso);
    const unique = new Set(isos);
    expect(unique.size).toBe(isos.length);
  });

  test('all countries have required fields', () => {
    for (const c of countries) {
      expect(c.name).toBeTruthy();
      expect(c.iso).toMatch(/^[A-Z]{2}$|^XK$/);
      expect(c.capital).toBeTruthy();
      expect(c.continent).toBeTruthy();
      expect(typeof c.population).toBe('number');
      expect(c.primaryLanguage).toBeTruthy();
      expect(c.currency).toBeTruthy();
      expect(Array.isArray(c.neighbors)).toBe(true);
      expect(typeof c.coordinates.lat).toBe('number');
      expect(typeof c.coordinates.lng).toBe('number');
    }
  });
});

// ── getAvailableInvasionTargets ────────────────────────────────────────────

describe('getAvailableInvasionTargets', () => {
  test('returns all neighbors of homeland when nothing is conquered', () => {
    const france = countriesByIso['FR'];
    const targets = getAvailableInvasionTargets('FR', [], []);
    const targetIsos = targets.map((c) => c.iso);
    // France borders: BE, LU, DE, CH, IT, MC, ES, AD, GB
    for (const n of france.neighbors) {
      expect(targetIsos).toContain(n);
    }
  });

  test('excludes already-conquered countries', () => {
    const targets = getAvailableInvasionTargets('FR', ['DE'], []);
    expect(targets.map((c) => c.iso)).not.toContain('DE');
  });

  test('excludes failed countries', () => {
    const targets = getAvailableInvasionTargets('FR', [], ['BE']);
    expect(targets.map((c) => c.iso)).not.toContain('BE');
  });

  test('expands territory when a neighbor is conquered', () => {
    // Conquer Germany (DE) — should now also surface DE's neighbors
    const targets = getAvailableInvasionTargets('FR', ['DE'], []);
    const de = countriesByIso['DE'];
    // Poland (PL) is a neighbor of DE but not FR — should now be available
    expect(de.neighbors).toContain('PL');
    expect(targets.map((c) => c.iso)).toContain('PL');
  });

  test('does not include homeland in results', () => {
    const targets = getAvailableInvasionTargets('FR', ['DE'], []);
    expect(targets.map((c) => c.iso)).not.toContain('FR');
  });

  test('Iceland is reachable via sea connections to Norway and UK', () => {
    // Iceland was given sea connections (NO, GB) during the island-connectivity pass
    const targets = getAvailableInvasionTargets('IS', [], []);
    const isos = targets.map((c) => c.iso);
    expect(isos).toContain('NO');
    expect(isos).toContain('GB');
  });

  test('sea-connected countries are reachable', () => {
    // GB-FR sea connection
    const fromGB = getAvailableInvasionTargets('GB', [], []);
    expect(fromGB.map((c) => c.iso)).toContain('FR');
    expect(fromGB.map((c) => c.iso)).toContain('IE');

    // JP-KR and JP-RU sea connections
    const fromJP = getAvailableInvasionTargets('JP', [], []);
    expect(fromJP.map((c) => c.iso)).toContain('KR');
    expect(fromJP.map((c) => c.iso)).toContain('RU');
  });
});

// ── checkNeighborGuess ─────────────────────────────────────────────────────

describe('checkNeighborGuess', () => {
  test('valid guess returns { valid: true }', () => {
    const result = checkNeighborGuess('Germany', 'FR', [], []);
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.country.iso).toBe('DE');
  });

  test('is case-insensitive', () => {
    expect(checkNeighborGuess('germany', 'FR', [], []).valid).toBe(true);
    expect(checkNeighborGuess('GERMANY', 'FR', [], []).valid).toBe(true);
    expect(checkNeighborGuess('GerManY', 'FR', [], []).valid).toBe(true);
  });

  test('trims whitespace', () => {
    expect(checkNeighborGuess('  Germany  ', 'FR', [], []).valid).toBe(true);
  });

  test('unknown country returns not-found', () => {
    const result = checkNeighborGuess('Narnia', 'FR', [], []);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toBe('not-found');
  });

  test('already-conquered country returns already-conquered', () => {
    const result = checkNeighborGuess('Germany', 'FR', ['DE'], []);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toBe('already-conquered');
  });

  test('homeland itself returns already-conquered', () => {
    const result = checkNeighborGuess('France', 'FR', [], []);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toBe('already-conquered');
  });

  test('non-neighboring country returns not-neighbor', () => {
    // Japan has no connection to France (direct or via conquered territory)
    const result = checkNeighborGuess('Japan', 'FR', [], []);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toBe('not-neighbor');
  });

  test('failed country returns failed', () => {
    const result = checkNeighborGuess('Germany', 'FR', [], ['DE']);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toBe('failed');
  });

  test('neighbor becomes valid after territory expands', () => {
    // Poland is not a neighbor of France, but is after Germany is conquered
    const beforeConquest = checkNeighborGuess('Poland', 'FR', [], []);
    expect(beforeConquest.valid).toBe(false);

    const afterConquest = checkNeighborGuess('Poland', 'FR', ['DE'], []);
    expect(afterConquest.valid).toBe(true);
  });

  test('enclave countries reachable from surrounding nation', () => {
    // San Marino and Vatican are surrounded by Italy
    const targets = getAvailableInvasionTargets('IT', [], []);
    const isos = targets.map((c) => c.iso);
    expect(isos).toContain('SM');
    expect(isos).toContain('VA');
  });
});

// ── getDailyCountry ────────────────────────────────────────────────────────

describe('getDailyCountry', () => {
  test('returns a valid country', () => {
    const country = getDailyCountry(new Date('2025-01-01'));
    expect(country).toBeDefined();
    expect(country.iso).toBeTruthy();
  });

  test('is deterministic — same date always yields same country', () => {
    const d = new Date('2025-06-15');
    expect(getDailyCountry(d).iso).toBe(getDailyCountry(d).iso);
  });

  test('different dates produce a variety of countries', () => {
    const isos = new Set(
      Array.from({ length: 30 }, (_, i) => {
        const d = new Date(`2025-01-${String(i + 1).padStart(2, '0')}`);
        return getDailyCountry(d).iso;
      })
    );
    // With 30 different dates we should get at least 10 distinct countries
    expect(isos.size).toBeGreaterThan(10);
  });

  test('never returns a micro-state (pop < 500k)', () => {
    for (let day = 1; day <= 365; day++) {
      const d = new Date(2025, 0, day);
      const c = getDailyCountry(d);
      expect(c.population).toBeGreaterThanOrEqual(500000);
    }
  });
});
