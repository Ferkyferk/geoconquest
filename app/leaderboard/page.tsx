'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

// ── Types ──────────────────────────────────────────────────────────────────
interface DailyEntry {
  rank: number;
  userId: string;
  name: string;
  image: string | null;
  score: number;
  countriesConquered: string[];
}

interface AllTimeEntry {
  rank: number;
  userId: string;
  name: string;
  image: string | null;
  rating: number;
  gamesPlayed: number;
}

type Tab = 'daily' | 'alltime';

// ── Skeleton ───────────────────────────────────────────────────────────────
function SkeletonRow({ delay = 0 }: { delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay }}
      className="flex items-center gap-3 px-4 py-3 border-b border-game-border last:border-0"
    >
      <div className="w-6 h-3 rounded bg-game-border animate-pulse flex-shrink-0" />
      <div className="w-8 h-8 rounded-full bg-game-border animate-pulse flex-shrink-0" />
      <div className="flex-1 flex flex-col gap-1.5">
        <div className="h-3 w-32 rounded bg-game-border animate-pulse" />
        <div className="h-2.5 w-20 rounded bg-game-border/60 animate-pulse" />
      </div>
      <div className="w-16 h-4 rounded bg-game-border animate-pulse" />
    </motion.div>
  );
}

function LeaderboardSkeleton() {
  return (
    <div className="rounded-xl border border-game-border bg-game-surface overflow-hidden">
      {Array.from({ length: 8 }, (_, i) => (
        <SkeletonRow key={i} delay={i * 0.04} />
      ))}
    </div>
  );
}

// ── Avatar ─────────────────────────────────────────────────────────────────
function Avatar({ name, image, size = 32 }: { name: string; image: string | null; size?: number }) {
  if (image) {
    return (
      <Image
        src={image}
        alt={name}
        width={size}
        height={size}
        className="rounded-full ring-1 ring-game-gold/20 flex-shrink-0"
      />
    );
  }
  return (
    <div
      className="rounded-full bg-game-gold/20 ring-1 ring-game-gold/30 flex items-center justify-center flex-shrink-0 font-cinzel font-bold text-game-gold"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {(name ?? 'U')[0].toUpperCase()}
    </div>
  );
}

// ── Medal colors ───────────────────────────────────────────────────────────
function RankBadge({ rank }: { rank: number }) {
  const gold   = rank === 1;
  const silver = rank === 2;
  const bronze = rank === 3;
  return (
    <span
      className={`font-cinzel font-bold text-sm tabular-nums w-6 text-right flex-shrink-0 ${
        gold ? 'text-yellow-400' : silver ? 'text-gray-300' : bronze ? 'text-amber-600' : 'text-game-muted'
      }`}
    >
      {rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : `#${rank}`}
    </span>
  );
}

// ── Daily row ──────────────────────────────────────────────────────────────
function DailyRow({ entry, index }: { entry: DailyEntry; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3, ease: 'easeOut' }}
      className="flex items-center gap-3 px-4 py-3 border-b border-game-border last:border-0 hover:bg-game-bg/50 transition-colors"
    >
      <RankBadge rank={entry.rank} />
      <Avatar name={entry.name} image={entry.image} />
      <div className="flex-1 min-w-0">
        <p className="font-barlow font-semibold text-sm text-game-text truncate">{entry.name}</p>
        <p className="font-barlow text-[11px] text-game-muted">
          {entry.countriesConquered.length + 1} countr{entry.countriesConquered.length === 0 ? 'y' : 'ies'}
        </p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="font-cinzel font-bold text-game-gold tabular-nums">{entry.score.toLocaleString()}</p>
        <p className="font-barlow text-[10px] text-game-muted uppercase tracking-wider">pts</p>
      </div>
    </motion.div>
  );
}

// ── All-time row ───────────────────────────────────────────────────────────
function AllTimeRow({ entry, index }: { entry: AllTimeEntry; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3, ease: 'easeOut' }}
      className="flex items-center gap-3 px-4 py-3 border-b border-game-border last:border-0 hover:bg-game-bg/50 transition-colors"
    >
      <RankBadge rank={entry.rank} />
      <Avatar name={entry.name} image={entry.image} />
      <div className="flex-1 min-w-0">
        <p className="font-barlow font-semibold text-sm text-game-text truncate">{entry.name}</p>
        <p className="font-barlow text-[11px] text-game-muted">{entry.gamesPlayed} games</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="font-cinzel font-bold text-game-gold tabular-nums">{entry.rating}</p>
        <p className="font-barlow text-[10px] text-game-muted uppercase tracking-wider">rating</p>
      </div>
    </motion.div>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="rounded-xl border border-game-border bg-game-surface py-16 text-center">
      <p className="text-4xl mb-3" aria-hidden>🌍</p>
      <p className="font-cinzel font-bold text-game-muted text-sm tracking-widest">NO CONQUERORS YET</p>
      <p className="font-barlow text-xs text-game-border mt-1">Be the first to claim your territory.</p>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────
export default function LeaderboardPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('daily');
  const [daily, setDaily] = useState<DailyEntry[] | null>(null);
  const [alltime, setAlltime] = useState<AllTimeEntry[] | null>(null);
  const [loadingDaily, setLoadingDaily] = useState(true);
  const [loadingAlltime, setLoadingAlltime] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDaily = useCallback(async () => {
    if (daily) return;
    setLoadingDaily(true);
    setError(null);
    try {
      const res = await fetch('/api/leaderboard/daily');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to load');
      setDaily(json.data.scores ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setLoadingDaily(false);
    }
  }, [daily]);

  const fetchAlltime = useCallback(async () => {
    if (alltime) return;
    setLoadingAlltime(true);
    setError(null);
    try {
      const res = await fetch('/api/leaderboard/alltime');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to load');
      setAlltime(json.data.ratings ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setLoadingAlltime(false);
    }
  }, [alltime]);

  useEffect(() => { fetchDaily(); }, [fetchDaily]);

  const handleTabChange = (t: Tab) => {
    setTab(t);
    if (t === 'alltime') fetchAlltime();
  };

  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <main className="min-h-screen bg-game-bg font-barlow">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-game-border bg-game-bg/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-xl items-center gap-4 px-4 py-3">
          <button
            onClick={() => router.push('/')}
            className="text-game-muted hover:text-game-text transition-colors text-sm"
            aria-label="Back to menu"
          >
            ←
          </button>
          <h1 className="font-cinzel font-black text-game-gold tracking-widest text-base flex-1 text-center">
            LEADERBOARD
          </h1>
          <div className="w-5" />
        </div>
      </header>

      <div className="mx-auto max-w-xl px-4 py-6 flex flex-col gap-4">

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl bg-game-surface border border-game-border">
          {(['daily', 'alltime'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => handleTabChange(t)}
              className={`
                flex-1 py-2 rounded-lg font-cinzel font-bold text-xs tracking-widest uppercase
                transition-all duration-200 focus:outline-none
                ${tab === t
                  ? 'bg-game-gold text-game-bg shadow-sm'
                  : 'text-game-muted hover:text-game-text'}
              `}
            >
              {t === 'daily' ? '📅 Today' : '👑 All-Time'}
            </button>
          ))}
        </div>

        {/* Tab subheading */}
        <AnimatePresence mode="wait">
          <motion.p
            key={tab}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="font-barlow text-xs text-game-muted text-center -mt-1"
          >
            {tab === 'daily'
              ? `Top scores for ${today}`
              : 'All-time skill ratings (ELO-based)'}
          </motion.p>
        </AnimatePresence>

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            {error && (
              <div className="rounded-xl border border-game-red/30 bg-game-red/10 px-4 py-3 text-center">
                <p className="font-barlow text-sm text-game-red">{error}</p>
                <button
                  onClick={() => { setError(null); if (tab === 'daily') { setDaily(null); fetchDaily(); } else { setAlltime(null); fetchAlltime(); } }}
                  className="font-barlow text-xs text-game-muted hover:text-game-text mt-2 transition-colors"
                >
                  Try again
                </button>
              </div>
            )}

            {!error && tab === 'daily' && (
              loadingDaily ? <LeaderboardSkeleton /> :
              !daily?.length ? <EmptyState /> :
              <div className="rounded-xl border border-game-border bg-game-surface overflow-hidden">
                {daily.map((entry, i) => <DailyRow key={entry.userId} entry={entry} index={i} />)}
              </div>
            )}

            {!error && tab === 'alltime' && (
              loadingAlltime ? <LeaderboardSkeleton /> :
              !alltime?.length ? <EmptyState /> :
              <div className="rounded-xl border border-game-border bg-game-surface overflow-hidden">
                {alltime.map((entry, i) => <AllTimeRow key={entry.userId} entry={entry} index={i} />)}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Footer note */}
        <p className="font-barlow text-[11px] text-game-border text-center">
          Scores reset daily at midnight UTC
        </p>
      </div>
    </main>
  );
}
