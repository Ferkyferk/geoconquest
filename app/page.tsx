'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession, signIn, signOut } from 'next-auth/react';
import { HowToPlay } from '@/components/game/HowToPlay';
import { PageTransition } from '@/components/PageTransition';
import Image from 'next/image';

// ── Decorative background ────────────────────────────────────────────────────
function BackgroundDecor() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(#D4AF37 1px, transparent 1px), linear-gradient(90deg, #D4AF37 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />
      <div className="absolute inset-0 bg-radial-vignette" />
    </div>
  );
}

// ── Menu button ──────────────────────────────────────────────────────────────
function MenuButton({
  onClick,
  primary = false,
  children,
}: {
  onClick: () => void;
  primary?: boolean;
  children: React.ReactNode;
}) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      className={`
        w-full rounded-xl px-8 py-4
        font-cinzel font-bold tracking-widest text-sm uppercase
        transition-colors focus:outline-none focus:ring-2
        ${primary
          ? 'bg-game-gold hover:bg-game-gold-lt text-game-bg focus:ring-game-gold/50'
          : 'border border-game-border bg-game-surface hover:border-game-gold/50 hover:bg-game-gold/5 text-game-text focus:ring-game-gold/30'
        }
      `}
    >
      {children}
    </motion.button>
  );
}

// ── Auth section ─────────────────────────────────────────────────────────────
function AuthSection() {
  const { data: session, status } = useSession();

  if (status === 'loading') return <div className="h-10" />;

  if (session?.user) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center justify-between w-full rounded-xl border border-game-border bg-game-surface px-4 py-2.5"
      >
        <div className="flex items-center gap-2.5">
          {session.user.image ? (
            <Image
              src={session.user.image}
              alt={session.user.name ?? 'User'}
              width={28}
              height={28}
              className="rounded-full ring-1 ring-game-gold/30"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-game-gold/20 ring-1 ring-game-gold/30 flex items-center justify-center">
              <span className="font-cinzel font-bold text-xs text-game-gold">
                {(session.user.name ?? 'U')[0].toUpperCase()}
              </span>
            </div>
          )}
          <span className="font-barlow text-sm text-game-text truncate max-w-[140px]">
            {session.user.name ?? session.user.email}
          </span>
        </div>
        <button
          onClick={() => signOut()}
          className="font-barlow text-xs text-game-muted hover:text-game-red transition-colors"
        >
          Sign out
        </button>
      </motion.div>
    );
  }

  return (
    <motion.button
      onClick={() => signIn('google')}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="
        w-full flex items-center justify-center gap-2.5
        rounded-xl border border-game-border bg-game-surface
        px-8 py-3 transition-colors
        hover:border-game-gold/40 hover:bg-game-gold/5
        focus:outline-none focus:ring-2 focus:ring-game-gold/30
      "
    >
      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden>
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
      <span className="font-barlow text-sm text-game-muted">Sign in to save scores &amp; track streaks</span>
    </motion.button>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function Home() {
  const router = useRouter();
  const [showHowToPlay, setShowHowToPlay] = useState(false);

  return (
    <PageTransition>
    <main className="relative min-h-screen bg-game-bg flex flex-col items-center justify-center p-6 overflow-hidden">
      <BackgroundDecor />

      <div className="relative z-10 flex flex-col items-center gap-8 w-full max-w-xs">

        {/* ── Logo ── */}
        <motion.div
          initial={{ opacity: 0, y: -24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="flex flex-col items-center gap-3 text-center"
        >
          <motion.div
            animate={{ rotate: [0, -4, 4, -2, 2, 0] }}
            transition={{ duration: 3, repeat: Infinity, repeatDelay: 4 }}
            className="text-6xl leading-none select-none"
            aria-hidden
          >
            ⚔
          </motion.div>
          <h1 className="font-cinzel font-black text-4xl text-game-gold tracking-widest leading-none">
            GEOCONQUEST
          </h1>
          <p className="font-barlow text-game-muted text-sm tracking-wide max-w-[220px] leading-relaxed">
            Conquer the world, one neighbor at a time
          </p>
        </motion.div>

        {/* ── Divider ── */}
        <div className="flex items-center gap-3 w-full">
          <div className="flex-1 h-px bg-game-border" />
          <span className="text-game-border text-xs">✦</span>
          <div className="flex-1 h-px bg-game-border" />
        </div>

        {/* ── Buttons ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex flex-col gap-3 w-full"
        >
          <MenuButton primary onClick={() => router.push('/game')}>
            ⚔ Begin Conquest
          </MenuButton>

          <MenuButton onClick={() => setShowHowToPlay(true)}>
            📖 How to Play
          </MenuButton>

          <MenuButton onClick={() => router.push('/leaderboard')}>
            🏅 Leaderboard
          </MenuButton>

          {/* ── Auth ── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
          >
            <AuthSection />
          </motion.div>
        </motion.div>

        {/* ── Footer ── */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="font-barlow text-[11px] text-game-border tracking-wide"
        >
          A new homeland every day
        </motion.p>
      </div>

      {/* ── How to Play modal ── */}
      <AnimatePresence>
        {showHowToPlay && <HowToPlay onClose={() => setShowHowToPlay(false)} />}
      </AnimatePresence>
    </main>
    </PageTransition>
  );
}
