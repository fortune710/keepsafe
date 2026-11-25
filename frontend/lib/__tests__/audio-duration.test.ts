import { formatAudioDuration, isAudioDurationAllowed } from '../audio-duration';

test.each([[0, '00:00'], [0.372721, '00:00'], [65.9, '01:05'], [1800, '30:00']])('formats %s seconds as %s', (duration, expected) => {
  expect(formatAudioDuration(duration)).toBe(expected);
});

test.each([NaN, Infinity, -1])('renders invalid duration %s safely', (duration) => {
  expect(formatAudioDuration(duration)).toBe('00:00');
});

test.each([[1799, true], [1800, true], [1800.01, false], [-1, false], [NaN, false]])('checks recording length %s', (duration, expected) => {
  expect(isAudioDurationAllowed(duration)).toBe(expected);
});
