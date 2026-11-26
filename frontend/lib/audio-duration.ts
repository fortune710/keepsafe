export const MAX_AUDIO_DURATION_SECONDS = 30 * 60;

export function isAudioDurationAllowed(seconds: number): boolean {
  return Number.isFinite(seconds) && seconds >= 0 && seconds <= MAX_AUDIO_DURATION_SECONDS;
}

export function formatAudioDuration(seconds: number): string {
  const total = Number.isFinite(seconds) && seconds >= 0 ? Math.floor(seconds) : 0;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}
