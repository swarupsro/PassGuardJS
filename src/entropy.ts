import type { CrackTime, CrackTimes } from './types';

const ASCII_SYMBOL_POOL = 33;
const NON_ASCII_POOL = 100;
const REPEAT_WEIGHT = 0.25;

const GUESSES_PER_SECOND = {
  onlineThrottled: 100 / 3600,
  onlineUnthrottled: 10,
  offlineSlowHash: 1e4,
  offlineFastHash: 1e10,
} as const;

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const MONTH = 31 * DAY;
const YEAR = 12 * MONTH;
const CENTURY = 100 * YEAR;

export function estimateEntropyBits(password: string): number {
  const characters = Array.from(password);

  if (characters.length === 0) {
    return 0;
  }

  let pool = 0;

  if (/[a-z]/.test(password)) pool += 26;
  if (/[A-Z]/.test(password)) pool += 26;
  if (/[0-9]/.test(password)) pool += 10;
  if (/[\x20-\x2f\x3a-\x40\x5b-\x60\x7b-\x7e]/.test(password)) pool += ASCII_SYMBOL_POOL;
  if (/[^\p{ASCII}]/u.test(password)) pool += NON_ASCII_POOL;

  if (pool === 0) {
    pool = 10;
  }

  const unique = new Set(characters).size;
  const effectiveLength = unique + (characters.length - unique) * REPEAT_WEIGHT;

  return effectiveLength * Math.log2(pool);
}

export function estimateCrackTimes(entropyBits: number): CrackTimes {
  const averageGuesses = Math.pow(2, Math.max(0, entropyBits)) / 2;

  const toCrackTime = (rate: number): CrackTime => {
    const seconds = averageGuesses / rate;

    return { seconds, display: formatDuration(seconds) };
  };

  return {
    onlineThrottled: toCrackTime(GUESSES_PER_SECOND.onlineThrottled),
    onlineUnthrottled: toCrackTime(GUESSES_PER_SECOND.onlineUnthrottled),
    offlineSlowHash: toCrackTime(GUESSES_PER_SECOND.offlineSlowHash),
    offlineFastHash: toCrackTime(GUESSES_PER_SECOND.offlineFastHash),
  };
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds >= CENTURY) {
    return 'centuries';
  }

  if (seconds < 1) {
    return 'instantly';
  }

  const units: readonly [number, string][] = [
    [YEAR, 'year'],
    [MONTH, 'month'],
    [DAY, 'day'],
    [HOUR, 'hour'],
    [MINUTE, 'minute'],
    [1, 'second'],
  ];

  for (const [size, name] of units) {
    if (seconds >= size) {
      const amount = Math.round(seconds / size);

      return `${amount} ${name}${amount === 1 ? '' : 's'}`;
    }
  }

  return 'instantly';
}

export interface EntropyEstimate {
  entropyBits: number;
  crackTimes: CrackTimes;
}

export function estimateEntropy(password: string): EntropyEstimate {
  const entropyBits = roundBits(estimateEntropyBits(password));

  return { entropyBits, crackTimes: estimateCrackTimes(entropyBits) };
}

export function roundBits(bits: number): number {
  return Math.round(bits * 10) / 10;
}
