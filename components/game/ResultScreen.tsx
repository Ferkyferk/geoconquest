'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { countriesByIso, countries } from '@/lib/data/countries';
import { AnimatedNumber } from '@/components/game/AnimatedNumber';

// ── Helpers ─────────────────────────────────────────────────────────────────
function getFlagEmoji(iso: string): string {
  return iso
    .toUpperCase()
    .split('')
    .map((c) => String.fromCodePoint(c.charCodeAt(0) - 65 + 0x1f1e6))
    .join('');
}

function performanceTier(conquered: number, total: number) {
  if (conquered >= total - 1) return { icon: '🌐', label: 'WORLD CONQUERED',  color: 'text-game-gold',  bg: 'bg-game-gold/10',  border: 'border-game-gold/30' };
  if (conquered >= 100)       return { icon: '👑', label: 'LEGENDARY EMPIRE', color: 'text-game-gold',  bg: 'bg-game-gold/10',  border: 'border-game-gold/30' };
  if (conquered >= 50)        return { icon: '🏆', label: 'GREAT CAMPAIGN',   color: 'text-game-gold',  bg: 'bg-game-gold/8',   border: 'border-game-gold/20' };
  if (conquered >= 20)        return { icon: '⚔',  label: 'RISING POWER',    color: 'text-game-text', bg: 'bg-game-border/30', border: 'border-game-border' };
  if (conquered >= 5)         return { icon: '🗡',  label: 'SKIRMISH',        color: 'text-game-muted', bg: 'bg-game-bg',        border: 'border-game-border' };
  return                             { icon: '💀', label: 'CAMPAIGN FAILED',  color: 'text-game-red',  bg: 'bg-game-red/10',   border: 'border-game-red/30' };
}

// ── Stat card ────────────────────────────────────────────────────────────────
function Stat({
  label,
  value,
  accent = false,
  delay = 0,
}: {
  label: string;
  value: string;
  accent?: boolean;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35, ease: 'easeOut' }}
      className="rounded-xl border border-game-border bg-game-bg px-3 py-3 text-center"
    >
      <p className={`font-cinzel font-bold text-lg leading-tight ${accent ? 'text-game-gold' : 'text-game-text'}`}>
        {value}
      </p>
      <p className="font-barlow text-[10px] text-game-muted uppercase tracking-wider mt-0.5">{label}</p>
    </motion.div>
  );
}

// ── Share text builder ───────────────────────────────────────────────────────
function buildShareText(
  homeland: string,
  score: number,
  conquered: string[],
  continentBonuses: Set<string>,
  multiplier: number,
  streak: number,
  dailyStreak: number,
): string {
  const homelandCountry = countriesByIso[homeland];
  const homelandName = homelandCountry?.name ?? homeland;
  const total = countries.length;
  const date = new Date().toLocaleDateString('en-US', { dateStyle: 'medium' });
  const tier = performanceTier(conquered.length, total);

  const lines: string[] = [
    `${tier.icon} GeoConquest — ${date}`,
    '',
    `Started in ${homelandName}`,
    `Conquered ${conquered.length + 1}/${total} countries`,
  ];

  if (continentBonuses.size > 0) {
    const continents = [...continentBonuses].join(', ');
    lines.push(`Continents: ${continents}`);
  }

  lines.push('');
  lines.push(`Score: ${score.toLocaleString()} | x${multiplier.toFixed(1)} | Streak ${streak}`);

  if (dailyStreak > 0) {
    lines.push(`Daily streak: ${dailyStreak} day${dailyStreak === 1 ? '' : 's'}`);
  }

  lines.push('');
  lines.push('Play at geoconquest.vercel.app');

  return lines.join('\n');
}

// ── Types ────────────────────────────────────────────────────────────────────
export interface ResultScreenProps {
  score: number;
  conquered: string[];
  continentBonuses: Set<string>;
  multiplier: number;
  streak: number;
  homeland: string;
  dailyStreak: number;
  onNewConquest: () => void;
  onLeaderboard: () => void;
  onMainMenu: () => void;
}

// ── Component ────────────────────────────────────────────────────────────────
export function ResultScreen({
  score,
  conquered,
  continentBonuses,
  multiplier,
  streak,
  homeland,
  dailyStreak,
  onNewConquest,
  onLeaderboard,
  onMainMenu,
}: ResultScreenProps) {
  const total = countries.length;
  const tier  = performanceTier(conquered.length, total);
  const date  = new Date().toLocaleDateString('en-US', { dateStyle: 'long' });
  const [copied, setCopied] = useState(false);

  const handleShare = useCallback(() => {
    const text = buildShareText(homeland, score, conquered, continentBonuses, multiplier, streak, dailyStreak);
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [homeland, score, conquered, continentBonuses, multiplier, streak, dailyStreak]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
    >
      <motion.div
        initial={{ scale: 0.92, y: 24 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.92, y: 24 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        className="w-full max-w-md rounded-2xl border border-game-border bg-game-surface shadow-2xl overflow-hidden"
      >
        {/* ── Header ── */}
        <div className={`px-6 pt-6 pb-5 text-center ${tier.bg} border-b ${tier.border}`}>
          <motion.div
            initial={{ scale: 0.2, opacity: 0, rotate: -25 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ delay: 0.05, type: 'spring', stiffness: 260, damping: 14 }}
            className="text-5xl leading-none mb-3"
          >
            {tier.icon}
          </motion.div>
          <h2 className={`font-cinzel font-black text-xl tracking-widest ${tier.color}`}>
            {tier.label}
          </h2>
          <p className="mt-1 font-barlow text-xs text-game-muted">{date}</p>
        </div>

        {/* ── Score ── */}
        <div className="px-6 pt-5 text-center">
          <motion.p
            initial={{ opacity: 0, y: 12, scale: 0.85 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.18, type: 'spring', stiffness: 280, damping: 22 }}
            className="font-cinzel font-black text-5xl text-game-gold-lt tabular-nums"
          >
            <AnimatedNumber value={score} from={0} duration={1400} />
          </motion.p>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="font-barlow text-xs text-game-muted mt-0.5 uppercase tracking-widest"
          >
            Final Score
          </motion.p>
        </div>

        {/* ── Stats grid ── */}
        <div className="px-6 pt-4 grid grid-cols-5 gap-2">
          <Stat label="Countries" value={String(conquered.length + 1)} accent delay={0.35} />
          <Stat label="Continents" value={String(continentBonuses.size)} delay={0.42} />
          <Stat label="Mult" value={`×${multiplier.toFixed(1)}`} delay={0.49} />
          <Stat label="Streak" value={String(streak)} delay={0.56} />
          <Stat label="Daily" value={dailyStreak > 0 ? `${dailyStreak}d` : '—'} delay={0.63} />
        </div>

        {/* ── Conquered countries ── */}
        {conquered.length > 0 && (
          <div className="px-6 pt-4">
            <p className="text-[10px] font-semibold tracking-widest text-game-muted uppercase mb-2">
              Conquered ({conquered.length})
            </p>
            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
              {conquered.map((iso) => {
                const c = countriesByIso[iso];
                return (
                  <motion.span
                    key={iso}
                    initial={{ scale: 0.7, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    className="inline-flex items-center gap-1 rounded-full border border-game-green/25 bg-game-green/10 px-2 py-0.5 text-xs font-barlow text-game-green"
                  >
                    {getFlagEmoji(iso)} {c?.name ?? iso}
                  </motion.span>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Continents ── */}
        {continentBonuses.size > 0 && (
          <div className="px-6 pt-3">
            <p className="text-[10px] font-semibold tracking-widest text-game-muted uppercase mb-2">
              Continents Conquered
            </p>
            <div className="flex flex-wrap gap-1.5">
              {[...continentBonuses].map((continent) => (
                <span
                  key={continent}
                  className="inline-flex items-center gap-1 rounded-full border border-game-gold/30 bg-game-gold/10 px-2 py-0.5 text-xs font-barlow text-game-gold"
                >
                  🌍 {continent}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── Actions ── */}
        <div className="px-6 py-5 flex flex-col gap-2 mt-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onNewConquest}
              className="
                rounded-xl bg-game-gold hover:bg-game-gold-lt
                py-3 font-cinzel font-bold tracking-widest text-sm text-game-bg uppercase
                transition-colors focus:outline-none focus:ring-2 focus:ring-game-gold/50
              "
            >
              New Conquest
            </button>
            <button
              onClick={handleShare}
              className={`
                rounded-xl py-3 font-cinzel font-bold tracking-widest text-sm uppercase
                transition-colors focus:outline-none focus:ring-2 focus:ring-game-green/50
                ${copied
                  ? 'bg-game-green text-game-bg'
                  : 'border border-game-green/40 bg-game-green/10 text-game-green hover:bg-game-green/20'
                }
              `}
            >
              {copied ? 'Copied!' : 'Share'}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onLeaderboard}
              className="
                rounded-xl border border-game-border bg-transparent
                py-2.5 font-barlow text-sm text-game-muted
                hover:border-game-gold/50 hover:text-game-gold
                transition-colors focus:outline-none
              "
            >
              Leaderboard
            </button>
            <button
              onClick={onMainMenu}
              className="
                rounded-xl border border-game-border bg-transparent
                py-2.5 font-barlow text-sm text-game-muted
                hover:border-game-muted hover:text-game-text
                transition-colors focus:outline-none
              "
            >
              Main Menu
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
