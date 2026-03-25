// ── Constants ──────────────────────────────────────────────────────────────
export const ANNEX_POINTS = 100;
export const TRIVIA_POINTS = 50;
export const MULTIPLIER_INCREMENT = 0.5;
export const STARTING_MULTIPLIER = 1;
export const STARTING_LIVES = 3;
export const CONTINENT_BONUS = 1000;
export const WORLD_DOMINATION_BONUS = 25000;

// ── Pure score functions ───────────────────────────────────────────────────

/** Points awarded when a country is successfully annexed. */
export function calculateAnnexScore(multiplier: number): number {
  return Math.round(ANNEX_POINTS * multiplier);
}

/** Points awarded per correct trivia answer during an invasion. */
export function calculateTriviaScore(multiplier: number): number {
  return Math.round(TRIVIA_POINTS * multiplier);
}

/** Points awarded when the player conquers every country in a continent. */
export function calculateContinentBonus(multiplier: number): number {
  return Math.round(CONTINENT_BONUS * multiplier);
}

/** Flat bonus for conquering every country in the world. */
export function calculateWorldDominationBonus(): number {
  return WORLD_DOMINATION_BONUS;
}

/**
 * Increment the streak multiplier after a successful annexation.
 * Multiplier grows by MULTIPLIER_INCREMENT each consecutive success.
 */
export function incrementMultiplier(multiplier: number): number {
  return Math.round((multiplier + MULTIPLIER_INCREMENT) * 10) / 10;
}

/** Reset multiplier to starting value (called on wrong guess or failed trivia). */
export function resetMultiplier(): number {
  return STARTING_MULTIPLIER;
}

/**
 * Decrement lives and reset multiplier on a failure.
 * Returns the new lives count and the reset multiplier.
 */
export function applyFailure(lives: number): { lives: number; multiplier: number } {
  return {
    lives: Math.max(0, lives - 1),
    multiplier: resetMultiplier(),
  };
}

/** Returns true if the game is over (no lives remaining). */
export function isGameOver(lives: number): boolean {
  return lives <= 0;
}
