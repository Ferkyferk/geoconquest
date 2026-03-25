/**
 * ELO-like single-player skill rating.
 *
 * The player competes against a fixed "baseline" opponent rated 1000.
 * Their actual performance (S) is derived from the raw game score using a
 * smooth mapping: S = score / (score + PAR_SCORE), which yields:
 *   score =     0 → S = 0.00  (immediate game-over)
 *   score =  3000 → S = 0.50  (average game, neutral rating impact)
 *   score =  9000 → S = 0.75
 *   score = 27000 → S = 0.90
 *
 * Expected score E uses the standard ELO formula against the 1000 baseline.
 * Rating delta = K × (S − E). K decreases as games accumulate.
 */

const ELO_BASELINE = 1000
const ELO_DIVISOR  = 400
const PAR_SCORE    = 3000  // score that equals neutral (S = 0.5) performance

/** K-factor: high while provisional (few games), stabilises after 30. */
export function kFactor(gamesPlayed: number): number {
  if (gamesPlayed < 10) return 32
  if (gamesPlayed < 30) return 24
  return 16
}

/** Maps a raw score to a performance value in [0, 1). */
export function scoreToPerformance(score: number): number {
  if (score <= 0) return 0
  return score / (score + PAR_SCORE)
}

/** Expected score for a player at `rating` against the 1000-rated baseline. */
export function expectedScore(rating: number): number {
  return 1 / (1 + Math.pow(10, (ELO_BASELINE - rating) / ELO_DIVISOR))
}

/**
 * Returns the new rating after a completed game.
 *
 * @param currentRating  Player's rating before this game
 * @param gamesPlayed    Career game count before this game
 * @param score          Final game score
 * @returns              New rating (floor: 100)
 */
export function updateRating(
  currentRating: number,
  gamesPlayed: number,
  score: number,
): number {
  const K      = kFactor(gamesPlayed)
  const S      = scoreToPerformance(score)
  const E      = expectedScore(currentRating)
  const delta  = K * (S - E)
  return Math.max(100, Math.round(currentRating + delta))
}
