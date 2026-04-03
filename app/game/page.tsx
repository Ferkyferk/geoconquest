'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import Image from 'next/image';
import { WorldMap } from '@/components/game/WorldMap';
import { CountryInput } from '@/components/game/CountryInput';
import { TriviaPanel, type TriviaResult } from '@/components/game/TriviaPanel';
import { ResultScreen } from '@/components/game/ResultScreen';
import { AnimatedNumber } from '@/components/game/AnimatedNumber';
import { PageTransition } from '@/components/PageTransition';
import { countriesByIso, countries, type Continent } from '@/lib/data/countries';
import {
  createInitialGameState,
  checkNeighborGuess,
  getAvailableInvasionTargets,
  isOnCooldown,
  type GameState,
  type GamePhase,
} from '@/lib/game/engine';
import {
  WORLD_DOMINATION_BONUS,
  incrementMultiplier,
  applyFailure,
  isGameOver,
  calculateAnnexScore,
  calculateTriviaScore,
  calculateContinentBonus,
} from '@/lib/game/scoring';
import { generateTriviaQuestions } from '@/lib/game/trivia';
import type { TriviaQuestion } from '@/lib/game/engine';

// ── Continent metadata ─────────────────────────────────────────────────────
const CONTINENT_ORDER: Continent[] = ['Africa', 'North America', 'South America', 'Asia', 'Europe', 'Oceania'];
const CONTINENT_EMOJI: Record<Continent, string> = {
  'Africa':        '🌍',
  'North America': '🌎',
  'South America': '🌎',
  'Asia':          '🌏',
  'Europe':        '🏛️',
  'Oceania':       '🏝️',
};

// ── Helpers ────────────────────────────────────────────────────────────────
function getFlagEmoji(iso: string): string {
  return iso
    .toUpperCase()
    .split('')
    .map((c) => String.fromCodePoint(c.charCodeAt(0) - 65 + 0x1f1e6))
    .join('');
}

function heartIcons(lives: number, maxLives: number) {
  return Array.from({ length: maxLives }, (_, i) => (
    <motion.span
      key={i}
      animate={i === lives && lives < maxLives ? { scale: [1.4, 1] } : {}}
      transition={{ duration: 0.3 }}
      className={`text-lg leading-none ${i < lives ? 'text-red-500' : 'text-game-border'}`}
    >
      {i < lives ? '❤' : '♡'}
    </motion.span>
  ));
}

type MessageType = 'success' | 'error' | 'info' | 'bonus';
interface UIMessage {
  text: string;
  type: MessageType;
}

const MESSAGE_COLORS: Record<MessageType, string> = {
  success: 'border-game-green/40 bg-game-green/10 text-game-green',
  error:   'border-game-red/40 bg-game-red/10 text-game-red',
  info:    'border-game-gold/40 bg-game-gold/10 text-game-gold',
  bonus:   'border-yellow-400/60 bg-yellow-400/15 text-yellow-300',
};

// ── Game Page ──────────────────────────────────────────────────────────────
export default function GamePage() {
  const router = useRouter();
  const { data: authSession } = useSession();
  const savedRef = useRef(false);

  // ── Multiplier glow animation ─────────────────────────────────────────────
  const multiplierControls = useAnimation();
  const prevMultiplierRef  = useRef<number | null>(null);

  // ── Core game state ──────────────────────────────────────────────────────
  const [game, setGame] = useState<GameState>(() => ({
    ...createInitialGameState(),
    phase: 'selecting' as GamePhase,
  }));

  // Extra state not in GameState
  const [triviaQuestions, setTriviaQuestions] = useState<TriviaQuestion[]>([]);
  const [continentBonuses, setContinentBonuses] = useState<Set<string>>(new Set());

  // ── UI state ─────────────────────────────────────────────────────────────
  const [inputValue, setInputValue]   = useState('');
  const [shaking, setShaking]         = useState(false);
  const [message, setMessage]         = useState<UIMessage | null>(null);
  const [prevScore, setPrevScore]     = useState(0);
  const [scoreAnimating, setScoreAnimating] = useState(false);
  const [continentAlert, setContinentAlert] = useState<{ continent: string; bonus: number } | null>(null);
  const messageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Derived values ────────────────────────────────────────────────────────
  const homeland     = countriesByIso[game.homeland];
  const currentTarget = game.currentTarget ? countriesByIso[game.currentTarget] : null;
  const conqueredSet = useMemo(() => new Set(game.conquered), [game.conquered]);

  const availableTargets = useMemo(
    () => getAvailableInvasionTargets(game.homeland, game.conquered, game.failed),
    [game.homeland, game.conquered, game.failed]
  );

  const totalCountries = countries.length;
  const territoryCount = 1 + game.conquered.length;

  // Count total countries per continent (static — computed once)
  const continentTotals = useMemo(() => {
    const totals: Partial<Record<Continent, number>> = {};
    for (const c of countries) {
      totals[c.continent] = (totals[c.continent] ?? 0) + 1;
    }
    return totals;
  }, []);

  // Territory countries grouped by continent (homeland + conquered)
  const territoryByContinent = useMemo(() => {
    const groups: Partial<Record<Continent, string[]>> = {};
    const allTerritory = [game.homeland, ...game.conquered];
    for (const iso of allTerritory) {
      const c = countriesByIso[iso];
      if (!c) continue;
      (groups[c.continent] ??= []).push(iso);
    }
    return groups;
  }, [game.homeland, game.conquered]);

  // ── Score pop animation ───────────────────────────────────────────────────
  useEffect(() => {
    if (game.score !== prevScore) {
      setScoreAnimating(true);
      setPrevScore(game.score);
      const t = setTimeout(() => setScoreAnimating(false), 400);
      return () => clearTimeout(t);
    }
  }, [game.score, prevScore]);

  // ── Multiplier glow ───────────────────────────────────────────────────────
  useEffect(() => {
    if (prevMultiplierRef.current !== null && game.multiplier > prevMultiplierRef.current) {
      multiplierControls.start({
        scale: [1, 1.45, 1.1, 1],
        textShadow: [
          '0 0 0px transparent',
          '0 0 18px #FFD700, 0 0 36px #D4AF37',
          '0 0 8px #D4AF37',
          '0 0 0px transparent',
        ],
        transition: { duration: 0.7, ease: 'easeOut' },
      });
    }
    prevMultiplierRef.current = game.multiplier;
  }, [game.multiplier, multiplierControls]);

  // ── Save session when game ends ───────────────────────────────────────────
  useEffect(() => {
    if (game.phase !== 'game-over') {
      savedRef.current = false; // reset for new game
      return;
    }
    if (savedRef.current || !authSession?.user?.id) return;
    savedRef.current = true;

    fetch('/api/game/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        score: game.score,
        countriesConquered: game.conquered,
        continentsConquered: continentBonuses.size,
        livesRemaining: game.lives,
        maxMultiplier: game.multiplier,
        maxStreak: game.streak,
      }),
    }).catch(() => {}); // fire-and-forget; failure is silent
  }, [game.phase, authSession]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Message helpers ───────────────────────────────────────────────────────
  const showMessage = useCallback((msg: UIMessage, durationMs = 3500) => {
    setMessage(msg);
    if (messageTimerRef.current) clearTimeout(messageTimerRef.current);
    messageTimerRef.current = setTimeout(() => setMessage(null), durationMs);
  }, []);

  const triggerShake = useCallback(() => {
    setShaking(true);
    setTimeout(() => setShaking(false), 500);
  }, []);

  // ── Continent bonus check ─────────────────────────────────────────────────
  function checkContinentBonuses(
    newConquered: string[],
    homeland: string,
    currentBonuses: Set<string>,
    multiplier: number
  ): { earned: number; newBonuses: Set<string>; messages: string[] } {
    const territory = new Set([homeland, ...newConquered]);
    const continents = ['Africa', 'North America', 'South America', 'Asia', 'Europe', 'Oceania'] as const;
    let earned = 0;
    const newBonuses = new Set(currentBonuses);
    const messages: string[] = [];

    for (const continent of continents) {
      if (newBonuses.has(continent)) continue;
      const allInContinent = countries.filter((c) => c.continent === continent);
      if (allInContinent.every((c) => territory.has(c.iso))) {
        earned += calculateContinentBonus(multiplier);
        newBonuses.add(continent);
        messages.push(`🌍 ${continent} conquered! +${calculateContinentBonus(multiplier)} pts`);
      }
    }
    return { earned, newBonuses, messages };
  }

  // ── Submit guess ──────────────────────────────────────────────────────────
  const handleSubmit = useCallback(
    (guess: string) => {
      if (game.phase !== 'selecting' || guess.trim() === '') return;

      const result = checkNeighborGuess(guess, game.homeland, game.conquered, game.failed);

      if (!result.valid) {
        const cooldownRemaining = result.country && result.reason === 'cooling-down'
          ? 3 - (game.conquered.length - (game.failed[result.country.iso] ?? 0))
          : 0;
        const msgs: Record<string, string> = {
          'not-found':        `"${guess}" is not a recognized country.`,
          'not-neighbor':     result.country
            ? `${result.country.name} doesn't border your territory.`
            : `That country doesn't border your territory.`,
          'already-conquered': result.country
            ? `${result.country.name} is already part of your empire.`
            : 'Already conquered.',
          'cooling-down':     result.country
            ? `${result.country.name} is still recovering from your last invasion. Annex ${cooldownRemaining} more ${cooldownRemaining === 1 ? 'country' : 'countries'} first.`
            : 'That country is still recovering from your last invasion.',
        };

        triggerShake();
        const { lives, multiplier } = applyFailure(game.lives);
        const gameOver = isGameOver(lives);

        setGame((prev) => ({
          ...prev,
          lives,
          multiplier,
          streak: 0,
          phase: gameOver ? 'game-over' : 'selecting',
        }));

        showMessage({
          text: (msgs[result.reason] ?? 'Invalid guess.') + (lives > 0 ? ' −1 life.' : ''),
          type: 'error',
        });
        setInputValue('');
        return;
      }

      // Valid target — start trivia
      const questions = generateTriviaQuestions(result.country, 5);
      setTriviaQuestions(questions);
      setGame((prev) => ({
        ...prev,
        currentTarget: result.country.iso,
        phase: 'trivia',
      }));
      setInputValue('');
    },
    [game, showMessage, triggerShake]
  );

  // ── Trivia complete ───────────────────────────────────────────────────────
  const handleTriviaComplete = useCallback(
    ({ won, correctCount }: TriviaResult) => {
      if (!game.currentTarget) return;

      if (won) {
        const triviaScore = correctCount * calculateTriviaScore(game.multiplier);
        const annexScore  = calculateAnnexScore(game.multiplier);
        const newConquered = [...game.conquered, game.currentTarget];
        const newMultiplier = incrementMultiplier(game.multiplier);
        const newStreak     = game.streak + 1;

        // Continent bonus
        const { earned: bonusEarned, newBonuses, messages: bonusMsgs } =
          checkContinentBonuses(newConquered, game.homeland, continentBonuses, newMultiplier);

        // World domination
        const territory = new Set([game.homeland, ...newConquered]);
        const worldDomination = territory.size >= totalCountries;
        const worldBonus = worldDomination ? WORLD_DOMINATION_BONUS : 0;

        const totalGained = triviaScore + annexScore + bonusEarned + worldBonus;
        const targetName  = countriesByIso[game.currentTarget]?.name ?? game.currentTarget;

        // Show continent bonus alert
        if (bonusMsgs.length > 0) {
          const newContinents = [...newBonuses].filter((c) => !continentBonuses.has(c));
          if (newContinents.length > 0) {
            setContinentAlert({ continent: newContinents[0], bonus: bonusEarned });
            setTimeout(() => setContinentAlert(null), 4000);
          }
        }

        setContinentBonuses(newBonuses);
        setGame((prev) => ({
          ...prev,
          conquered:     newConquered,
          score:         prev.score + totalGained,
          multiplier:    newMultiplier,
          streak:        newStreak,
          phase:         worldDomination ? 'game-over' : 'selecting',
          currentTarget: null,
        }));

        const bonusLine = bonusMsgs.length > 0 ? ` ${bonusMsgs.join(' ')}` : '';
        const worldLine = worldDomination ? ' 🌐 WORLD DOMINATION!' : '';
        showMessage({
          text: `${getFlagEmoji(game.currentTarget)} ${targetName} annexed! +${totalGained} pts  ×${newMultiplier.toFixed(1)}${bonusLine}${worldLine}`,
          type: bonusLine || worldLine ? 'bonus' : 'success',
        }, 4500);
      } else {
        // Failed trivia
        const triviaScore  = correctCount * calculateTriviaScore(game.multiplier);
        const { lives, multiplier } = applyFailure(game.lives);
        const gameOver = isGameOver(lives);
        const targetName = countriesByIso[game.currentTarget]?.name ?? game.currentTarget;

        setGame((prev) => ({
          ...prev,
          failed:        { ...prev.failed, [game.currentTarget!]: prev.conquered.length },
          score:         prev.score + triviaScore,
          lives,
          multiplier,
          streak:        0,
          phase:         gameOver ? 'game-over' : 'selecting',
          currentTarget: null,
        }));

        showMessage({
          text: `Invasion of ${targetName} failed. ${triviaScore > 0 ? `+${triviaScore} consolation pts. ` : ''}−1 life.`,
          type: 'error',
        });
      }
    },
    [game, continentBonuses, totalCountries, showMessage]
  );

  // ── Map click prefills input ──────────────────────────────────────────────
  const handleMapClick = useCallback(() => {}, []);

  // ── End campaign ──────────────────────────────────────────────────────────
  const handleEndCampaign = () => {
    setGame((prev) => ({ ...prev, phase: 'game-over' }));
  };

  const handleNewGame = () => {
    savedRef.current = false;
    setGame({ ...createInitialGameState(), phase: 'selecting' as GamePhase });
    setInputValue('');
    setMessage(null);
    setContinentBonuses(new Set());
    setTriviaQuestions([]);
    setPrevScore(0);
  };

  if (!homeland) return null;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <PageTransition>
    <div className="min-h-screen bg-game-bg flex flex-col font-barlow">

      {/* ── Sticky HUD ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-game-border bg-game-bg/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-2.5 flex-wrap">

          {/* Logo */}
          <span className="font-cinzel font-black text-game-gold tracking-widest text-base hidden sm:block">
            GeoConquest
          </span>
          <div className="hidden sm:block h-5 w-px bg-game-border" />

          {/* Score */}
          <div className="flex flex-col items-center min-w-[70px]">
            <span className="text-[10px] font-semibold tracking-widest text-game-muted uppercase">Score</span>
            <motion.span
              className={`font-cinzel font-bold text-game-gold-lt text-lg leading-tight tabular-nums ${scoreAnimating ? 'animate-score-pop' : ''}`}
            >
              <AnimatedNumber value={game.score} duration={400} />
            </motion.span>
          </div>

          <div className="h-5 w-px bg-game-border" />

          {/* Lives */}
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-[10px] font-semibold tracking-widest text-game-muted uppercase">Lives</span>
            <div className="flex gap-0.5">
              {heartIcons(game.lives, 3)}
            </div>
          </div>

          <div className="h-5 w-px bg-game-border" />

          {/* Multiplier */}
          <div className="flex flex-col items-center min-w-[48px]">
            <span className="text-[10px] font-semibold tracking-widest text-game-muted uppercase">Mult</span>
            <motion.span
              animate={multiplierControls}
              className="font-cinzel font-bold text-game-gold text-base leading-tight"
            >
              ×{game.multiplier.toFixed(1)}
            </motion.span>
          </div>

          <div className="h-5 w-px bg-game-border" />

          {/* Streak */}
          <div className="flex flex-col items-center min-w-[40px]">
            <span className="text-[10px] font-semibold tracking-widest text-game-muted uppercase">Streak</span>
            <span className="font-cinzel font-bold text-orange-400 text-base leading-tight">
              {game.streak > 0 ? `🔥${game.streak}` : '—'}
            </span>
          </div>

          <div className="h-5 w-px bg-game-border" />

          {/* Territory */}
          <div className="flex flex-col items-center min-w-[64px]">
            <span className="text-[10px] font-semibold tracking-widest text-game-muted uppercase">Territory</span>
            <span className="font-cinzel font-bold text-game-text text-base leading-tight">
              {territoryCount}
              <span className="text-game-muted font-barlow text-xs font-normal">/{totalCountries}</span>
            </span>
          </div>

          {/* User avatar (right-aligned, shown when signed in) */}
          {authSession?.user && (
            <>
              <div className="ml-auto flex items-center gap-2">
                {authSession.user.image ? (
                  <Image
                    src={authSession.user.image}
                    alt={authSession.user.name ?? 'User'}
                    width={26}
                    height={26}
                    className="rounded-full ring-1 ring-game-gold/30"
                  />
                ) : (
                  <div className="w-[26px] h-[26px] rounded-full bg-game-gold/20 ring-1 ring-game-gold/30 flex items-center justify-center">
                    <span className="font-cinzel font-bold text-[10px] text-game-gold">
                      {(authSession.user.name ?? 'U')[0].toUpperCase()}
                    </span>
                  </div>
                )}
                <span className="hidden sm:block font-barlow text-xs text-game-muted truncate max-w-[100px]">
                  {authSession.user.name?.split(' ')[0]}
                </span>
              </div>
              <div className="h-5 w-px bg-game-border" />
            </>
          )}

          {/* End Campaign button */}
          <button
            onClick={handleEndCampaign}
            className={`${authSession?.user ? '' : 'ml-auto'} text-xs font-barlow text-game-muted hover:text-game-red transition-colors tracking-wide`}
          >
            End Campaign
          </button>
        </div>
      </header>

      {/* ── Message Bar ────────────────────────────────────────────────── */}
      <AnimatePresence>
        {message && (
          <motion.div
            key="msg"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
            className={`border-b px-4 py-2 text-center text-sm font-semibold ${MESSAGE_COLORS[message.type]}`}
          >
            {message.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main content ───────────────────────────────────────────────── */}
      <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-4 flex flex-col gap-4">

        {/* World Map */}
        <WorldMap
          homeland={game.homeland}
          conquered={conqueredSet}
          invadable={new Set(availableTargets.map((c) => c.iso))}
          onCountryClick={handleMapClick}
          className="h-[360px] md:h-[440px]"
        />

        {/* ── Phase-gated lower section ───────────────────────────────── */}
        <AnimatePresence mode="wait">

          {/* Trivia Panel */}
          {game.phase === 'trivia' && currentTarget && (
            <motion.div
              key="trivia"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
            >
              <TriviaPanel
                questions={triviaQuestions}
                onComplete={handleTriviaComplete}
              />
            </motion.div>
          )}

          {/* Selecting / idle */}
          {(game.phase === 'selecting' || game.phase === 'idle') && (
            <motion.div
              key="selecting"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              className="flex flex-col gap-4"
            >
              {/* Homeland card + Input row */}
              <div className="flex flex-col sm:flex-row gap-4">

                {/* Homeland card */}
                <div className="rounded-xl border border-game-border bg-game-surface px-5 py-4 min-w-[180px]">
                  <p className="text-[10px] font-semibold tracking-widest text-game-muted uppercase mb-1">
                    Your Homeland
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-3xl leading-none">{getFlagEmoji(homeland.iso)}</span>
                    <div>
                      <p className="font-cinzel font-bold text-game-gold text-base leading-tight">
                        {homeland.name}
                      </p>
                      <p className="font-barlow text-xs text-game-muted mt-0.5">
                        {homeland.continent}
                      </p>
                    </div>
                  </div>
                  {Object.keys(game.failed).length > 0 && (() => {
                    const onCooldown = Object.keys(game.failed).filter(
                      (iso) => isOnCooldown(iso, game.failed, game.conquered.length)
                    ).length;
                    const total = Object.keys(game.failed).length;
                    return (
                      <p className="mt-2 text-[10px] text-game-red/70">
                        {total} failed invasion{total > 1 ? 's' : ''} today
                        {onCooldown > 0 && ` · ${onCooldown} on cooldown`}
                      </p>
                    );
                  })()}
                </div>

                {/* Country input */}
                <CountryInput
                  targets={availableTargets}
                  value={inputValue}
                  onChange={setInputValue}
                  onSubmit={handleSubmit}
                  disabled={game.phase !== 'selecting'}
                  shaking={shaking}
                />
              </div>

              {/* Conquered territories — grouped by continent */}
              {(game.conquered.length > 0 || game.homeland) && (
                <div className="flex flex-col gap-3">
                  <p className="text-[10px] font-semibold tracking-widest text-game-muted uppercase">
                    Territory &middot; {1 + game.conquered.length} {game.conquered.length === 0 ? 'country' : 'countries'}
                  </p>

                  {CONTINENT_ORDER.map((continent) => {
                    const isos = territoryByContinent[continent];
                    if (!isos?.length) return null;
                    const total = continentTotals[continent] ?? 0;
                    return (
                      <div key={continent}>
                        {/* Continent header */}
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-sm leading-none" aria-hidden>
                            {CONTINENT_EMOJI[continent]}
                          </span>
                          <span className="text-[10px] font-semibold tracking-widest text-game-muted uppercase">
                            {continent}
                          </span>
                          <span className="font-cinzel font-bold text-xs text-game-green leading-none">
                            {isos.length}
                          </span>
                          <span className="font-barlow text-[10px] text-game-border leading-none">
                            /{total}
                          </span>
                          <div className="flex-1 h-px bg-game-border" />
                        </div>

                        {/* Country chips */}
                        <div className="flex flex-wrap gap-1.5">
                          {isos.map((iso) => {
                            const c = countriesByIso[iso];
                            if (!c) return null;
                            const isHome = iso === game.homeland;
                            return (
                              <motion.span
                                key={iso}
                                initial={{ scale: 0.7, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className={`
                                  inline-flex items-center gap-1.5 rounded-full
                                  px-3 py-1 text-xs font-barlow
                                  ${isHome
                                    ? 'border border-game-gold/40 bg-game-gold/10 text-game-gold'
                                    : 'border border-game-green/30 bg-game-green/10 text-game-green'
                                  }
                                `}
                              >
                                <span>{getFlagEmoji(iso)}</span>
                                <span>{c.name}{isHome ? ' (Home)' : ''}</span>
                              </motion.span>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Hint: available targets count */}
              {availableTargets.length > 0 && (
                <p className="text-xs text-game-muted text-center">
                  Name a country that borders your territory to invade it
                </p>
              )}
              {availableTargets.length === 0 && game.conquered.length > 0 && (
                <p className="text-xs text-game-muted text-center">
                  No reachable countries — you&apos;ve hit a geographic dead end!
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* ── Continent Bonus Alert ──────────────────────────────────────── */}
      <AnimatePresence>
        {continentAlert && (
          <motion.div
            key="continent-alert"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          >
            <div className="rounded-2xl border-2 border-yellow-400/60 bg-gray-900/95 backdrop-blur-md px-8 py-6 text-center shadow-2xl shadow-yellow-400/20 pointer-events-auto">
              <motion.div
                initial={{ scale: 0.5, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
                className="text-5xl mb-3"
              >
                {CONTINENT_EMOJI[continentAlert.continent as Continent] ?? '🌍'}
              </motion.div>
              <p className="font-cinzel font-black text-2xl text-yellow-300 tracking-wider mb-1">
                Continent Conquered!
              </p>
              <p className="font-barlow text-lg text-yellow-100/80 mb-2">
                {continentAlert.continent}
              </p>
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="font-cinzel font-bold text-xl text-game-gold"
              >
                +{continentAlert.bonus} bonus pts
              </motion.p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Result Screen ───────────────────────────────────────────────── */}
      <AnimatePresence>
        {game.phase === 'game-over' && (
          <ResultScreen
            key="result"
            score={game.score}
            conquered={game.conquered}
            continentBonuses={continentBonuses}
            multiplier={game.multiplier}
            streak={game.streak}
            onNewConquest={handleNewGame}
            onLeaderboard={() => router.push('/leaderboard')}
            onMainMenu={() => router.push('/')}
          />
        )}
      </AnimatePresence>
    </div>
    </PageTransition>
  );
}
