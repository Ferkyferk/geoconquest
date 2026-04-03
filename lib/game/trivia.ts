import { countries, countriesByIso, type Country, type Continent } from '@/lib/data/countries';
import type { TriviaQuestion } from '@/lib/game/engine';

// ── Helpers ────────────────────────────────────────────────────────────────

/** Stable seeded shuffle (Fisher-Yates) so questions are consistent per country. */
function seededShuffle<T>(arr: T[], seed: number): T[] {
  const out = [...arr];
  let s = seed;
  for (let i = out.length - 1; i > 0; i--) {
    s = Math.imul(s ^ (s >>> 15), s | 1);
    s ^= s + Math.imul(s ^ (s >>> 7), s | 61);
    s = ((s ^ (s >>> 14)) >>> 0);
    const j = s % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function strToSeed(str: string): number {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/** Pick `n` items from `pool` that satisfy `predicate`, falling back to the full pool. */
function pickDistractors<T>(
  pool: T[],
  predicate: (item: T) => boolean,
  exclude: (item: T) => boolean,
  count: number,
  seed: number
): T[] {
  const preferred = pool.filter((x) => predicate(x) && !exclude(x));
  const fallback = pool.filter((x) => !exclude(x));
  const candidates = preferred.length >= count ? preferred : fallback;
  return seededShuffle(candidates, seed).slice(0, count);
}

/** Format a population number into a human-readable label. */
function formatPop(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${Math.round(n / 1_000_000)}M`;
  return `${Math.round(n / 1_000)}K`;
}

// ── Question generators ────────────────────────────────────────────────────

function capitalQuestion(country: Country, seed: number): TriviaQuestion {
  const distractors = pickDistractors(
    countries,
    (c) => c.continent === country.continent,
    (c) => c.iso === country.iso,
    3,
    seed
  ).map((c) => c.capital);

  const choices = seededShuffle([country.capital, ...distractors], seed + 1);
  return {
    id: `${country.iso}-capital`,
    type: 'capital',
    question: `What is the capital of ${country.name}?`,
    choices,
    correctAnswer: country.capital,
  };
}

function continentQuestion(country: Country, seed: number): TriviaQuestion {
  const allContinents: Continent[] = ['Africa', 'North America', 'South America', 'Asia', 'Europe', 'Oceania'];
  const wrong = seededShuffle(
    allContinents.filter((c) => c !== country.continent),
    seed
  ).slice(0, 3);
  const choices = seededShuffle([country.continent, ...wrong], seed + 1);
  return {
    id: `${country.iso}-continent`,
    type: 'continent',
    question: `On which continent is ${country.name} located?`,
    choices,
    correctAnswer: country.continent,
  };
}

function populationQuestion(country: Country, seed: number): TriviaQuestion {
  const correctLabel = formatPop(country.population);
  const distractors = pickDistractors(
    countries,
    (c) => c.continent === country.continent,
    (c) => c.iso === country.iso || formatPop(c.population) === correctLabel,
    3,
    seed
  ).map((c) => formatPop(c.population));

  const choices = seededShuffle([correctLabel, ...distractors], seed + 1);
  return {
    id: `${country.iso}-population`,
    type: 'population',
    question: `What is the approximate population of ${country.name}?`,
    choices,
    correctAnswer: correctLabel,
  };
}

function languageQuestion(country: Country, seed: number): TriviaQuestion {
  const distractors = pickDistractors(
    countries,
    (c) => c.continent === country.continent,
    (c) => c.iso === country.iso || c.primaryLanguage === country.primaryLanguage,
    3,
    seed
  ).map((c) => c.primaryLanguage);

  const choices = seededShuffle([country.primaryLanguage, ...distractors], seed + 1);
  return {
    id: `${country.iso}-language`,
    type: 'language',
    question: `What is the primary language spoken in ${country.name}?`,
    choices,
    correctAnswer: country.primaryLanguage,
  };
}

function currencyQuestion(country: Country, seed: number): TriviaQuestion {
  const distractors = pickDistractors(
    countries,
    (c) => c.continent === country.continent,
    (c) => c.iso === country.iso || c.currency === country.currency,
    3,
    seed
  ).map((c) => c.currency);

  const choices = seededShuffle([country.currency, ...distractors], seed + 1);
  return {
    id: `${country.iso}-currency`,
    type: 'currency',
    question: `What currency does ${country.name} use?`,
    choices,
    correctAnswer: country.currency,
  };
}

function bordersQuestion(country: Country, seed: number): TriviaQuestion {
  const correct = country.neighbors.length.toString();
  const allCounts = new Set(countries.map((c) => c.neighbors.length));
  const wrongNumbers = seededShuffle(
    [...allCounts].filter((n) => n.toString() !== correct),
    seed
  )
    .slice(0, 3)
    .map(String);

  const choices = seededShuffle([correct, ...wrongNumbers], seed + 1);
  return {
    id: `${country.iso}-borders`,
    type: 'borders',
    question: `How many countries share a land (or sea) border with ${country.name}?`,
    choices,
    correctAnswer: correct,
  };
}

/** "Which of these countries borders X?" */
function neighborQuestion(country: Country, seed: number): TriviaQuestion | null {
  if (country.neighbors.length === 0) return null;
  const correctNeighborIso = seededShuffle(country.neighbors, seed)[0];
  const correctNeighbor = countriesByIso[correctNeighborIso];
  if (!correctNeighbor) return null;

  const neighborSet = new Set(country.neighbors);
  const distractors = pickDistractors(
    countries,
    (c) => c.continent === country.continent,
    (c) => c.iso === country.iso || neighborSet.has(c.iso),
    3,
    seed + 2
  ).map((c) => c.name);

  const choices = seededShuffle([correctNeighbor.name, ...distractors], seed + 1);
  return {
    id: `${country.iso}-neighbor`,
    type: 'neighbor',
    question: `Which of these countries borders ${country.name}?`,
    choices,
    correctAnswer: correctNeighbor.name,
  };
}

/** "Which of these countries does NOT border X?" */
function notNeighborQuestion(country: Country, seed: number): TriviaQuestion | null {
  if (country.neighbors.length < 2) return null;
  const neighborSet = new Set(country.neighbors);

  // Pick a non-neighbor from the same continent
  const nonNeighbors = countries.filter(
    (c) => c.iso !== country.iso && !neighborSet.has(c.iso) && c.continent === country.continent
  );
  if (nonNeighbors.length === 0) return null;

  const correctNonNeighbor = seededShuffle(nonNeighbors, seed)[0];

  // Pick 3 actual neighbors as distractors
  const neighborCountries = country.neighbors
    .map((iso) => countriesByIso[iso])
    .filter(Boolean) as Country[];
  const distractors = seededShuffle(neighborCountries, seed + 2).slice(0, 3).map((c) => c.name);

  if (distractors.length < 3) return null;

  const choices = seededShuffle([correctNonNeighbor.name, ...distractors], seed + 1);
  return {
    id: `${country.iso}-not-neighbor`,
    type: 'not-neighbor',
    question: `Which of these countries does NOT border ${country.name}?`,
    choices,
    correctAnswer: correctNonNeighbor.name,
  };
}

/** "Which neighboring country of X has the largest population?" */
function largestNeighborQuestion(country: Country, seed: number): TriviaQuestion | null {
  const neighborCountries = country.neighbors
    .map((iso) => countriesByIso[iso])
    .filter(Boolean) as Country[];

  if (neighborCountries.length < 4) return null;

  const sorted = [...neighborCountries].sort((a, b) => b.population - a.population);
  const correct = sorted[0];
  const distractors = seededShuffle(sorted.slice(1), seed).slice(0, 3).map((c) => c.name);

  const choices = seededShuffle([correct.name, ...distractors], seed + 1);
  return {
    id: `${country.iso}-largest-neighbor`,
    type: 'largest-neighbor',
    question: `Which neighboring country of ${country.name} has the largest population?`,
    choices,
    correctAnswer: correct.name,
  };
}

/** "Is X an island nation?" — only generated for countries where the answer is interesting */
function islandQuestion(country: Country, seed: number): TriviaQuestion | null {
  // Curated set of island nations for generating island-related questions
  const knownIslands = new Set([
    'CY', 'IS', 'MT', 'CU', 'DO', 'HT', 'JM', 'TT', 'BS', 'BB', 'AG', 'DM', 'GD', 'KN', 'LC', 'VC',
    'SG', 'LK', 'MV', 'BH', 'TW', 'PH', 'ID', 'JP', 'BN', 'TL',
    'MG', 'MU', 'CV', 'KM', 'SC', 'ST',
    'AU', 'NZ', 'FJ', 'PG', 'SB', 'VU', 'WS', 'TO', 'KI', 'MH', 'FM', 'NR', 'PW', 'TV',
  ]);

  const isIsland = knownIslands.has(country.iso);

  // Only interesting if the answer isn't obvious
  const sameContinent = countries.filter((c) => c.continent === country.continent && c.iso !== country.iso);
  const islandsInContinent = sameContinent.filter((c) => knownIslands.has(c.iso));
  const nonIslandsInContinent = sameContinent.filter((c) => !knownIslands.has(c.iso));

  if (islandsInContinent.length < 1 || nonIslandsInContinent.length < 1) return null;

  // Generate: "Which of these [continent] countries is an island nation?"
  if (isIsland) {
    const distractors = seededShuffle(nonIslandsInContinent, seed).slice(0, 3).map((c) => c.name);
    if (distractors.length < 3) return null;
    const choices = seededShuffle([country.name, ...distractors], seed + 1);
    return {
      id: `${country.iso}-island`,
      type: 'island',
      question: `Which of these ${country.continent === 'North America' || country.continent === 'South America' ? 'American' : country.continent === 'Oceania' ? 'Oceanian' : country.continent + 'n'} countries is an island nation?`,
      choices,
      correctAnswer: country.name,
    };
  }

  return null;
}

// ── Public API ─────────────────────────────────────────────────────────────

type QuestionType = TriviaQuestion['type'];

type QuestionGenerator = (c: Country, seed: number) => TriviaQuestion | null;

const ALL_GENERATORS: Array<{ type: QuestionType; gen: QuestionGenerator }> = [
  { type: 'capital', gen: capitalQuestion },
  { type: 'continent', gen: continentQuestion },
  { type: 'population', gen: populationQuestion },
  { type: 'language', gen: languageQuestion },
  { type: 'currency', gen: currencyQuestion },
  { type: 'borders', gen: bordersQuestion },
  { type: 'neighbor', gen: neighborQuestion },
  { type: 'not-neighbor', gen: notNeighborQuestion },
  { type: 'largest-neighbor', gen: largestNeighborQuestion },
  { type: 'island', gen: islandQuestion },
];

/**
 * Generates `count` trivia questions for the given country.
 * The selection is randomized using a date-based seed combined with the
 * country's ISO code, so the same player gets different questions each day
 * but all players see the same questions for a given country on a given day.
 *
 * @param country  The target country being invaded.
 * @param count    Number of questions to generate (default 5).
 */
export function generateTriviaQuestions(country: Country, count = 5): TriviaQuestion[] {
  const dateSeed = strToSeed(new Date().toISOString().split('T')[0]);
  const baseSeed = strToSeed(country.iso) + dateSeed;

  // Generate all possible questions for this country
  const allQuestions: TriviaQuestion[] = [];
  for (let i = 0; i < ALL_GENERATORS.length; i++) {
    const { gen } = ALL_GENERATORS[i];
    const q = gen(country, baseSeed + i * 997);
    if (q) allQuestions.push(q);
  }

  // Randomly select `count` questions from the pool
  const shuffled = seededShuffle(allQuestions, baseSeed + 7919);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}
