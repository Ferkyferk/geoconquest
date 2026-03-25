'use client';

import { useCallback } from 'react';
import type { Country } from '@/lib/data/countries';

export interface CountryInputProps {
  /** Countries eligible for invasion. */
  targets: Country[];
  value: string;
  onChange: (value: string) => void;
  /** Called when the player confirms their choice (Enter or Invade button). */
  onSubmit: (value: string) => void;
  disabled?: boolean;
  shaking?: boolean;
}

export function CountryInput({
  targets,
  value,
  onChange,
  onSubmit,
  disabled = false,
  shaking = false,
}: CountryInputProps) {
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        onSubmit(value);
      }
    },
    [value, onSubmit]
  );

  return (
    <div className={`flex flex-col gap-2 flex-1 ${shaking ? 'animate-shake' : ''}`}>
      <label className="text-xs font-semibold tracking-widest text-game-muted uppercase">
        Target Country
      </label>

      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={
          targets.length > 0
            ? 'Type a neighboring country…'
            : 'No reachable countries'
        }
        autoComplete="off"
        className="
          w-full rounded-lg border border-game-border bg-game-surface
          px-4 py-3 text-game-text placeholder-game-muted
          font-barlow text-sm
          focus:outline-none focus:border-game-gold focus:ring-1 focus:ring-game-gold/40
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-colors
        "
      />

      {/* Invade button */}
      <button
        onClick={() => onSubmit(value)}
        disabled={disabled || value.trim().length === 0}
        className="
          relative overflow-hidden rounded-lg
          bg-game-red hover:bg-game-red-dk active:bg-game-red-dk
          disabled:opacity-40 disabled:cursor-not-allowed
          px-6 py-3 font-cinzel font-bold tracking-widest text-white text-sm
          transition-colors uppercase
          focus:outline-none focus:ring-2 focus:ring-game-red/60
        "
      >
        ⚔ Invade
      </button>
    </div>
  );
}
