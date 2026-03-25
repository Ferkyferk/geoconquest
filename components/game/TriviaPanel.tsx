'use client';

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { countriesByIso } from '@/lib/data/countries';
import type { TriviaQuestion } from '@/lib/game/engine';

// ── Constants ──────────────────────────────────────────────────────────────
const PASS_THRESHOLD = 3;       // correct answers needed to annex
const REVIEW_DELAY_MS = 1500;   // ms to show correct/wrong highlight before advancing
const CHOICE_KEYS = ['A', 'B', 'C', 'D'] as const;

// ── Helpers ────────────────────────────────────────────────────────────────
function getFlagEmoji(iso: string): string {
  return iso
    .toUpperCase()
    .split('')
    .map((c) => String.fromCodePoint(c.charCodeAt(0) - 65 + 0x1f1e6))
    .join('');
}

/** Derive the target country's ISO from the first question's id (e.g. "DE-capital"). */
function isoFromQuestions(questions: TriviaQuestion[]): string {
  return questions[0]?.id.split('-')[0] ?? '';
}

// ── Types ──────────────────────────────────────────────────────────────────
export interface TriviaResult {
  won: boolean;
  correctCount: number;
}

export interface TriviaPanelProps {
  questions: TriviaQuestion[];
  onComplete: (result: TriviaResult) => void;
}

type ReviewState = 'correct' | 'wrong' | null;

// ── Component ──────────────────────────────────────────────────────────────
export function TriviaPanel({ questions, onComplete }: TriviaPanelProps) {
  const [qIndex, setQIndex]           = useState(0);
  const [selected, setSelected]       = useState<string | null>(null);
  const [reviewState, setReviewState] = useState<ReviewState>(null);
  // history[i] = true means question i was answered correctly
  const [history, setHistory]         = useState<boolean[]>([]);
  // Non-null when an early exit (win or fail) has been detected
  const [earlyExit, setEarlyExit]     = useState<'won' | 'failed' | null>(null);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const q = questions[qIndex];
  const iso = isoFromQuestions(questions);
  const country = countriesByIso[iso];
  const countryName = country?.name ?? iso;
  const correctCount = history.filter(Boolean).length;

  const handleAnswer = useCallback(
    (choice: string) => {
      if (selected !== null) return;             // already answered this question
      if (timerRef.current) clearTimeout(timerRef.current);

      const isCorrect = choice === q.correctAnswer;
      const newHistory = [...history, isCorrect];
      const newCorrect = newHistory.filter(Boolean).length;
      const remaining  = questions.length - newHistory.length;

      setSelected(choice);
      setReviewState(isCorrect ? 'correct' : 'wrong');
      setHistory(newHistory);

      // Detect early exit conditions
      const earlyWin  = newCorrect >= PASS_THRESHOLD;
      const earlyFail = newCorrect + remaining < PASS_THRESHOLD;
      const isLast    = qIndex === questions.length - 1;

      if (earlyWin || earlyFail) {
        setEarlyExit(earlyWin ? 'won' : 'failed');
      }

      timerRef.current = setTimeout(() => {
        if (earlyWin || earlyFail || isLast) {
          onComplete({ won: newCorrect >= PASS_THRESHOLD, correctCount: newCorrect });
        } else {
          setQIndex((i) => i + 1);
          setSelected(null);
          setReviewState(null);
        }
      }, REVIEW_DELAY_MS);
    },
    [selected, q, history, questions, qIndex, onComplete]
  );

  if (!q) return null;

  // ── Derived display values ─────────────────────────────────────────────
  const wrongCount = history.length - correctCount;

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 320, damping: 28 }}
      className="rounded-xl border border-game-border bg-game-surface overflow-hidden"
    >
      {/* ── Invasion header ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 px-5 pt-4 pb-3 border-b border-game-border">
        <div>
          <p className="font-cinzel text-[10px] font-bold tracking-[0.2em] text-game-muted uppercase">
            Invading
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            {iso && (
              <span className="text-2xl leading-none" aria-hidden>
                {getFlagEmoji(iso)}
              </span>
            )}
            <h2 className="font-cinzel text-lg font-bold tracking-wide text-game-gold">
              {countryName.toUpperCase()}
            </h2>
          </div>
        </div>

        {/* Per-question history dots */}
        <div className="flex items-center gap-1.5" aria-label="Question history">
          {questions.map((_, i) => {
            const answered = i < history.length;
            const correct  = history[i] === true;
            const isCurrent = i === qIndex;
            return (
              <div
                key={i}
                className={`
                  h-2.5 w-2.5 rounded-full transition-colors duration-300
                  ${answered
                    ? correct
                      ? 'bg-game-green'
                      : 'bg-game-red'
                    : isCurrent
                    ? 'bg-game-gold'
                    : 'bg-game-border'}
                `}
              />
            );
          })}
        </div>
      </div>

      <div className="px-5 py-4 flex flex-col gap-5">

        {/* ── Question counter + correct-answer progress ──────────────── */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs font-barlow">
            <span className="text-game-muted">
              Question <span className="font-semibold text-game-text">{qIndex + 1}</span> of {questions.length}
            </span>
            <span className={`font-semibold tabular-nums ${
              correctCount >= PASS_THRESHOLD
                ? 'text-game-green'
                : wrongCount > questions.length - PASS_THRESHOLD
                ? 'text-game-red'
                : 'text-game-muted'
            }`}>
              {correctCount} / {PASS_THRESHOLD} correct needed
            </span>
          </div>

          {/* Three-segment bar representing the 3 needed correct answers */}
          <div className="flex gap-1.5" role="progressbar" aria-valuenow={correctCount} aria-valuemax={PASS_THRESHOLD}>
            {Array.from({ length: PASS_THRESHOLD }, (_, i) => (
              <motion.div
                key={i}
                className="h-2 flex-1 rounded-full"
                animate={{
                  backgroundColor: i < correctCount ? '#22C55E' : '#3a3020',
                  boxShadow: i < correctCount ? '0 0 6px rgba(34,197,94,0.4)' : 'none',
                }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
              />
            ))}
          </div>
        </div>

        {/* ── Question text ────────────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          <motion.p
            key={qIndex}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.18 }}
            className="font-barlow font-semibold text-game-text text-base leading-snug min-h-[2.5rem]"
          >
            {q.question}
          </motion.p>
        </AnimatePresence>

        {/* ── Answer buttons ───────────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={qIndex}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="grid grid-cols-2 gap-2.5"
          >
            {q.choices.map((choice, i) => {
              const label = CHOICE_KEYS[i];
              const isSelected  = selected === choice;
              const isCorrect   = choice === q.correctAnswer;
              const hasAnswered = selected !== null;

              let buttonClass =
                'group relative flex items-start gap-3 rounded-lg border px-4 py-3 text-left ' +
                'text-sm font-barlow transition-all duration-200 focus:outline-none ';

              if (!hasAnswered) {
                buttonClass +=
                  'border-game-border bg-game-bg text-game-text ' +
                  'hover:border-game-gold/70 hover:bg-game-gold/8 cursor-pointer active:scale-[0.98]';
              } else if (isCorrect) {
                buttonClass +=
                  'border-game-green bg-game-green/15 text-game-green font-semibold cursor-default';
              } else if (isSelected) {
                buttonClass +=
                  'border-game-red bg-game-red/15 text-game-red cursor-default';
              } else {
                buttonClass +=
                  'border-game-border bg-game-bg text-game-muted opacity-50 cursor-default';
              }

              return (
                <motion.button
                  key={choice}
                  onClick={() => handleAnswer(choice)}
                  disabled={hasAnswered}
                  whileTap={!hasAnswered ? { scale: 0.97 } : {}}
                  animate={
                    hasAnswered && isCorrect
                      ? { scale: [1, 1.06, 0.98, 1], transition: { duration: 0.45, ease: 'easeOut' } }
                      : hasAnswered && isSelected && !isCorrect
                      ? { x: [0, -6, 7, -5, 4, 0], transition: { duration: 0.4, ease: 'easeInOut' } }
                      : {}
                  }
                  className={buttonClass}
                >
                  {/* Letter badge */}
                  <span
                    className={`
                      flex h-5 w-5 flex-shrink-0 items-center justify-center rounded
                      text-[10px] font-bold leading-none mt-0.5 transition-colors
                      ${!hasAnswered
                        ? 'bg-game-border text-game-muted group-hover:bg-game-gold/20 group-hover:text-game-gold'
                        : isCorrect
                        ? 'bg-game-green/30 text-game-green'
                        : isSelected
                        ? 'bg-game-red/30 text-game-red'
                        : 'bg-game-border text-game-muted'}
                    `}
                  >
                    {label}
                  </span>
                  <span className="leading-snug">{choice}</span>

                  {/* Correct tick / wrong cross overlay */}
                  {hasAnswered && isCorrect && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="ml-auto text-game-green text-base leading-none"
                    >
                      ✓
                    </motion.span>
                  )}
                  {hasAnswered && isSelected && !isCorrect && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="ml-auto text-game-red text-base leading-none"
                    >
                      ✗
                    </motion.span>
                  )}
                </motion.button>
              );
            })}
          </motion.div>
        </AnimatePresence>

        {/* ── Feedback / early-exit banner ─────────────────────────────── */}
        <AnimatePresence>
          {reviewState && (
            <motion.div
              key="feedback"
              initial={{ opacity: 0, scale: 0.92, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -4 }}
              transition={{ type: 'spring', stiffness: 400, damping: 22 }}
              className={`rounded-lg px-4 py-2.5 text-sm font-barlow font-semibold text-center ${
                earlyExit === 'won'
                  ? 'bg-game-green/15 border border-game-green/40 text-game-green'
                  : earlyExit === 'failed'
                  ? 'bg-game-red/15 border border-game-red/40 text-game-red'
                  : reviewState === 'correct'
                  ? 'bg-game-green/10 text-game-green'
                  : 'bg-game-red/10 text-game-red'
              }`}
            >
              {earlyExit === 'won' && (
                <>✓ Correct! <span className="opacity-80 font-normal">— 3 correct reached · annexing territory…</span></>
              )}
              {earlyExit === 'failed' && (
                <>✗ {q.correctAnswer} <span className="opacity-80 font-normal">— too many wrong · invasion failed…</span></>
              )}
              {!earlyExit && reviewState === 'correct' && (
                <>✓ Correct!</>
              )}
              {!earlyExit && reviewState === 'wrong' && (
                <>✗ The answer was: <span className="font-semibold">{q.correctAnswer}</span></>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
