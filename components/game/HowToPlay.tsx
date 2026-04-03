'use client';

import { motion } from 'framer-motion';
import { PASS_THRESHOLD, STARTING_LIVES } from '@/lib/game/howtoplay-constants';

// ── Section helper ──────────────────────────────────────────────────────────
function Section({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-lg leading-none">{icon}</span>
        <h3 className="font-cinzel font-bold text-game-gold tracking-wide text-sm uppercase">
          {title}
        </h3>
      </div>
      <div className="pl-7 font-barlow text-sm text-game-text leading-relaxed space-y-1">
        {children}
      </div>
    </div>
  );
}

function Rule({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex gap-2">
      <span className="text-game-gold mt-0.5 flex-shrink-0">·</span>
      <span>{children}</span>
    </p>
  );
}

// ── Component ──────────────────────────────────────────────────────────────
export interface HowToPlayProps {
  onClose: () => void;
}

export function HowToPlay({ onClose }: HowToPlayProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ scale: 0.93, y: 16 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.93, y: 16 }}
        transition={{ type: 'spring', stiffness: 340, damping: 28 }}
        className="w-full max-w-lg rounded-2xl border border-game-border bg-game-surface shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-game-border bg-game-bg">
          <h2 className="font-cinzel font-black text-game-gold tracking-widest text-base uppercase">
            How to Play
          </h2>
          <button
            onClick={onClose}
            className="text-game-muted hover:text-game-text transition-colors text-lg leading-none focus:outline-none"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">

          <Section icon="🎯" title="Objective">
            <Rule>You start with a randomly assigned homeland each day.</Rule>
            <Rule>Name neighboring countries to invade them and grow your empire.</Rule>
            <Rule>Conquer as many countries as possible before running out of lives.</Rule>
          </Section>

          <div className="border-t border-game-border/60" />

          <Section icon="🗺" title="Territory Expansion">
            <Rule>
              You can only invade countries that <span className="text-game-red font-semibold">border your territory</span> — your
              homeland or any country you&apos;ve already conquered.
            </Rule>
            <Rule>As you conquer more, your borders expand and new neighbors become reachable.</Rule>
            <Rule>Failed invasions go on cooldown — annex 3 more countries before you can retry them.</Rule>
          </Section>

          <div className="border-t border-game-border/60" />

          <Section icon="❓" title="Trivia Challenge">
            <Rule>
              Once you name a valid neighbor, you&apos;ll face <span className="text-game-gold font-semibold">5 trivia questions</span> about that country.
            </Rule>
            <Rule>
              Answer <span className="text-game-green font-semibold">{PASS_THRESHOLD} correctly</span> to annex the
              territory. Fail and you lose a life.
            </Rule>
            <Rule>Questions cover capitals, continents, population, language, currency, and borders.</Rule>
          </Section>

          <div className="border-t border-game-border/60" />

          <Section icon="🏆" title="Scoring">
            <Rule><span className="text-game-gold font-semibold">+100 pts</span> per country annexed.</Rule>
            <Rule><span className="text-game-gold font-semibold">+50 pts</span> per correct trivia answer.</Rule>
            <Rule>
              Your <span className="text-game-gold font-semibold">×multiplier</span> increases with every
              successful invasion — all points are scaled by it.
            </Rule>
            <Rule>
              <span className="text-game-gold font-semibold">+1,000 pts</span> bonus for conquering every country
              in a continent.
            </Rule>
            <Rule>
              <span className="text-game-gold font-semibold">+25,000 pts</span> for achieving world domination.
            </Rule>
          </Section>

          <div className="border-t border-game-border/60" />

          <Section icon="❤" title="Lives">
            <Rule>You start with <span className="text-game-red font-semibold">{STARTING_LIVES} lives</span>.</Rule>
            <Rule>A life is lost when you name an invalid country or fail a trivia challenge.</Rule>
            <Rule>Your multiplier resets to ×1.0 when you lose a life.</Rule>
            <Rule>The game ends when all lives are lost — or when you conquer the world.</Rule>
          </Section>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-game-border bg-game-bg">
          <button
            onClick={onClose}
            className="
              w-full rounded-xl bg-game-gold hover:bg-game-gold-lt
              py-3 font-cinzel font-bold tracking-widest text-sm text-game-bg uppercase
              transition-colors focus:outline-none focus:ring-2 focus:ring-game-gold/50
            "
          >
            Ready to Conquer
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
