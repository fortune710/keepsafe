import { useEffect, useState } from 'react';

interface UseCountdownResult {
  remainingMs: number;
  isExpired: boolean;
  formatted: string;
}

function formatRemaining(ms: number): string {
  if (ms <= 0) return '0m';

  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  const seconds = Math.floor((ms % 60000) / 1000);
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

/**
 * Ticks once a second toward `targetIso`. One interval per mounted card - list sizes here
 * (a user's pending capsules) are small, so per-item intervals over a single global ticker
 * keeps this self-contained.
 */
export function useCountdown(targetIso: string | null): UseCountdownResult {
  const targetMs = targetIso ? new Date(targetIso).getTime() : null;
  const [remainingMs, setRemainingMs] = useState(() =>
    targetMs !== null ? Math.max(targetMs - Date.now(), 0) : 0,
  );

  useEffect(() => {
    if (targetMs === null) {
      setRemainingMs(0);
      return;
    }

    setRemainingMs(Math.max(targetMs - Date.now(), 0));

    const interval = setInterval(() => {
      setRemainingMs(Math.max(targetMs - Date.now(), 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [targetMs]);

  return {
    remainingMs,
    isExpired: remainingMs <= 0,
    formatted: formatRemaining(remainingMs),
  };
}
