import { countries, type Country, type Continent } from '@/lib/data/countries';
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
  const allContinents: Continent[] = ['Africa', 'Americas', 'Asia', 'Europe', 'Oceania'];
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

// ── Public API ─────────────────────────────────────────────────────────────

type QuestionType = TriviaQuestion['type'];

const GENERATORS: Record<QuestionType, (c: Country, seed: number) => TriviaQuestion> = {
  capital: capitalQuestion,
  continent: continentQuestion,
  population: populationQuestion,
  language: languageQuestion,
  currency: currencyQuestion,
  borders: bordersQuestion,
};

const QUESTION_ORDER: QuestionType[] = ['capital', 'continent', 'population', 'language', 'currency', 'borders'];

/**
 * Generates `count` trivia questions for the given country.
 * The selection is deterministic for a given country so the same questions
 * always appear, but the 4 choices within each question are shuffled.
 *
 * @param country  The target country being invaded.
 * @param count    Number of questions to generate (max 6, default 5).
 */
export function generateTriviaQuestions(country: Country, count = 5): TriviaQuestion[] {
  const baseSeed = strToSeed(country.iso);
  const types = QUESTION_ORDER.slice(0, Math.min(count, QUESTION_ORDER.length));
  return types.map((type, i) => GENERATORS[type](country, baseSeed + i * 997));
}
