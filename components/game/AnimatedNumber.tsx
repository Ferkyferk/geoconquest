'use client';

import { useEffect, useRef, useState } from 'react';

interface AnimatedNumberProps {
  value: number;
  /** If set, always counts from this value on each mount/change (use 0 for score reveals). */
  from?: number;
  duration?: number;
  className?: string;
}

export function AnimatedNumber({
  value,
  from,
  duration = 600,
  className,
}: AnimatedNumberProps) {
  const [display, setDisplay] = useState(from !== undefined ? from : value);
  const prevValueRef = useRef(from !== undefined ? from : value);
  const rafRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const startValue = from !== undefined ? from : prevValueRef.current;
    const endValue = value;
    prevValueRef.current = value;

    if (startValue === endValue) {
      setDisplay(endValue);
      return;
    }

    const startTime = performance.now();
    const delta = endValue - startValue;

    const update = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(startValue + delta * eased));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(update);
      }
    };

    if (rafRef.current !== undefined) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(update);

    return () => {
      if (rafRef.current !== undefined) cancelAnimationFrame(rafRef.current);
    };
  }, [value, from, duration]);

  return <span className={className}>{display.toLocaleString()}</span>;
}
