import { countries, countriesByIso, countriesByName, type Country } from '@/lib/data/countries';
import { STARTING_LIVES, STARTING_MULTIPLIER } from '@/lib/game/scoring';

// ── Types ──────────────────────────────────────────────────────────────────

export type GamePhase = 'idle' | 'selecting' | 'trivia' | 'result' | 'game-over';

export interface TriviaQuestion {
  id: string;
  question: string;
  choices: string[];
  correctAnswer: string;
  type: 'capital' | 'continent' | 'population' | 'language' | 'currency' | 'borders';
}

export interface GameState {
  homeland: string;       // ISO code
  conquered: string[];    // ISO codes
  failed: string[];       // ISO codes of failed invasions (not eligible this session)
  score: number;
  multiplier: number;
  streak: number;
  lives: number;
  phase: GamePhase;
  currentTarget: string | null; // ISO code of country being invaded
  date: string;           // YYYY-MM-DD
}

export type GuessResult =
  | { valid: true; country: Country }
  | { valid: false; country: Country | null; reason: 'not-found' | 'already-conquered' | 'not-neighbor' | 'failed' };

// ── Daily seed ─────────────────────────────────────────────────────────────

/** Deterministic PRNG (mulberry32). Returns a function that yields [0, 1). */
function mulberry32(seed: number): () => number {
  let s = seed;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Converts a YYYY-MM-DD date string to a stable 32-bit seed. */
function dateStringToSeed(dateStr: string): number {
  let hash = 5381;
  for (let i = 0; i < dateStr.length; i++) {
    hash = ((hash << 5) + hash + dateStr.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/**
 * Returns the same homeland country for every player on the given date.
 * Excludes micro-states (population < 500 000) for better gameplay.
 */
export function getDailyCountry(date: Date = new Date()): Country {
  const dateStr = date.toISOString().split('T')[0];
  const seed = dateStringToSeed(dateStr);
  const rand = mulberry32(seed);
  const playable = countries.filter((c) => c.population >= 500000);
  const index = Math.floor(rand() * playable.length);
  return playable[index];
}

// ── Territory helpers ──────────────────────────────────────────────────────

/** All ISO codes the player currently controls (homeland + conquered). */
export function getTerritory(homeland: string, conquered: string[]): Set<string> {
  return new Set([homeland, ...conquered]);
}

/**
 * Returns all countries that border the player's territory and have not yet
 * been conquered or attempted (and failed) this session.
 */
export function getAvailableInvasionTargets(
  homeland: string,
  conquered: string[],
  failed: string[]
): Country[] {
  const territory = getTerritory(homeland, conquered);
  const failedSet = new Set(failed);
  const available = new Set<string>();

  for (const iso of territory) {
    const country = countriesByIso[iso];
    if (!country) continue;
    for (const neighborIso of country.neighbors) {
      if (!territory.has(neighborIso) && !failedSet.has(neighborIso)) {
        available.add(neighborIso);
      }
    }
  }

  return Array.from(available)
    .map((iso) => countriesByIso[iso])
    .filter(Boolean);
}

/**
 * Validates a player's invasion guess.
 * Normalises the input so "united states", "US", and "United States" all match.
 */
export function checkNeighborGuess(
  guess: string,
  homeland: string,
  conquered: string[],
  failed: string[]
): GuessResult {
  const normalised = guess.trim().toLowerCase();
  const country = countriesByName[normalised]
    ?? countries.find((c) => c.iso.toLowerCase() === normalised);

  if (!country) return { valid: false, country: null, reason: 'not-found' };

  const territory = getTerritory(homeland, conquered);
  if (territory.has(country.iso)) {
    return { valid: false, country, reason: 'already-conquered' };
  }

  if (new Set(failed).has(country.iso)) {
    return { valid: false, country, reason: 'failed' };
  }

  const available = getAvailableInvasionTargets(homeland, conquered, failed);
  if (!available.some((c) => c.iso === country.iso)) {
    return { valid: false, country, reason: 'not-neighbor' };
  }

  return { valid: true, country };
}

// ── Score calculation ──────────────────────────────────────────────────────

/** Applies a multiplier to a base point value, rounded to nearest integer. */
export function calculateScore(basePoints: number, multiplier: number): number {
  return Math.round(basePoints * multiplier);
}

// ── Initial state factory ──────────────────────────────────────────────────

export function createInitialGameState(date?: Date): GameState {
  const d = date ?? new Date();
  return {
    homeland: getDailyCountry(d).iso,
    conquered: [],
    failed: [],
    score: 0,
    multiplier: STARTING_MULTIPLIER,
    streak: 0,
    lives: STARTING_LIVES,
    phase: 'idle',
    currentTarget: null,
    date: d.toISOString().split('T')[0],
  };
}
