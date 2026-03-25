'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-game-bg flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="w-full max-w-sm text-center flex flex-col items-center gap-6"
      >
        <motion.div
          animate={{ rotate: [0, -10, 10, -6, 6, 0] }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-6xl leading-none"
          aria-hidden
        >
          💀
        </motion.div>

        <div className="flex flex-col gap-2">
          <h1 className="font-cinzel font-black text-2xl text-game-gold tracking-widest">
            CAMPAIGN LOST
          </h1>
          <p className="font-barlow text-game-muted text-sm leading-relaxed max-w-[260px]">
            Something went wrong on the battlefield. Your progress has been saved — try again.
          </p>
          {error.digest && (
            <p className="font-barlow text-[10px] text-game-border mt-1 font-mono">
              ref: {error.digest}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2 w-full">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={reset}
            className="
              w-full rounded-xl bg-game-gold hover:bg-game-gold-lt
              py-3 font-cinzel font-bold tracking-widest text-sm text-game-bg uppercase
              transition-colors focus:outline-none focus:ring-2 focus:ring-game-gold/50
            "
          >
            ⚔ Try Again
          </motion.button>
          <motion.a
            whileHover={{ scale: 1.02 }}
            href="/"
            className="
              w-full rounded-xl border border-game-border bg-transparent
              py-2.5 font-barlow text-sm text-game-muted text-center block
              hover:border-game-gold/50 hover:text-game-gold
              transition-colors focus:outline-none
            "
          >
            ← Main Menu
          </motion.a>
        </div>
      </motion.div>
    </div>
  );
}
