import {
  ANNEX_POINTS,
  TRIVIA_POINTS,
  MULTIPLIER_INCREMENT,
  STARTING_MULTIPLIER,
  STARTING_LIVES,
  CONTINENT_BONUS,
  WORLD_DOMINATION_BONUS,
  calculateAnnexScore,
  calculateTriviaScore,
  calculateContinentBonus,
  calculateWorldDominationBonus,
  incrementMultiplier,
  resetMultiplier,
  applyFailure,
  isGameOver,
} from '../scoring';

describe('constants', () => {
  test('ANNEX_POINTS is 100', () => expect(ANNEX_POINTS).toBe(100));
  test('TRIVIA_POINTS is 50', () => expect(TRIVIA_POINTS).toBe(50));
  test('MULTIPLIER_INCREMENT is 0.5', () => expect(MULTIPLIER_INCREMENT).toBe(0.5));
  test('STARTING_MULTIPLIER is 1', () => expect(STARTING_MULTIPLIER).toBe(1));
  test('STARTING_LIVES is 3', () => expect(STARTING_LIVES).toBe(3));
  test('CONTINENT_BONUS is 1000', () => expect(CONTINENT_BONUS).toBe(1000));
  test('WORLD_DOMINATION_BONUS is 25000', () => expect(WORLD_DOMINATION_BONUS).toBe(25000));
});

describe('calculateAnnexScore', () => {
  test('1x multiplier returns 100', () => expect(calculateAnnexScore(1)).toBe(100));
  test('2x multiplier returns 200', () => expect(calculateAnnexScore(2)).toBe(200));
  test('1.5x multiplier returns 150', () => expect(calculateAnnexScore(1.5)).toBe(150));
  test('3.5x multiplier returns 350', () => expect(calculateAnnexScore(3.5)).toBe(350));
});

describe('calculateTriviaScore', () => {
  test('1x multiplier returns 50', () => expect(calculateTriviaScore(1)).toBe(50));
  test('2x multiplier returns 100', () => expect(calculateTriviaScore(2)).toBe(100));
  test('1.5x multiplier returns 75', () => expect(calculateTriviaScore(1.5)).toBe(75));
});

describe('calculateContinentBonus', () => {
  test('1x multiplier returns 1000', () => expect(calculateContinentBonus(1)).toBe(1000));
  test('2x multiplier returns 2000', () => expect(calculateContinentBonus(2)).toBe(2000));
  test('3.5x multiplier returns 3500', () => expect(calculateContinentBonus(3.5)).toBe(3500));
});

describe('calculateWorldDominationBonus', () => {
  test('always returns 25000', () => expect(calculateWorldDominationBonus()).toBe(25000));
});

describe('incrementMultiplier', () => {
  test('1 -> 1.5', () => expect(incrementMultiplier(1)).toBe(1.5));
  test('1.5 -> 2', () => expect(incrementMultiplier(1.5)).toBe(2));
  test('2 -> 2.5', () => expect(incrementMultiplier(2)).toBe(2.5));
  test('avoids floating point drift (e.g. 1.9999 -> 2.5)', () => {
    // Run 10 consecutive increments starting from 1
    let m = 1;
    for (let i = 0; i < 10; i++) m = incrementMultiplier(m);
    expect(m).toBe(6);
  });
});

describe('resetMultiplier', () => {
  test('always returns STARTING_MULTIPLIER', () => expect(resetMultiplier()).toBe(STARTING_MULTIPLIER));
});

describe('applyFailure', () => {
  test('decrements lives by 1', () => expect(applyFailure(3).lives).toBe(2));
  test('resets multiplier to 1', () => expect(applyFailure(3).multiplier).toBe(1));
  test('lives floor is 0, not negative', () => expect(applyFailure(0).lives).toBe(0));
  test('lives floor at 1 -> 0', () => expect(applyFailure(1).lives).toBe(0));
});

describe('isGameOver', () => {
  test('0 lives is game over', () => expect(isGameOver(0)).toBe(true));
  test('1 life is not game over', () => expect(isGameOver(1)).toBe(false));
  test('3 lives is not game over', () => expect(isGameOver(3)).toBe(false));
});

describe('score accumulation scenario', () => {
  test('3-streak annexation produces correct total', () => {
    // Start: multiplier=1
    // Annex 1 (correct trivia): 100*1 + 50*1 = 150, multiplier -> 1.5
    // Annex 2: 100*1.5 + 50*1.5 = 225, multiplier -> 2
    // Annex 3: 100*2 + 50*2 = 300, multiplier -> 2.5
    let score = 0;
    let m = 1;
    for (let i = 0; i < 3; i++) {
      score += calculateAnnexScore(m) + calculateTriviaScore(m);
      m = incrementMultiplier(m);
    }
    expect(score).toBe(150 + 225 + 300);
    expect(m).toBe(2.5);
  });
});
