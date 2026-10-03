import { PASSPHRASE_WORDS } from './constants';

const LOWERCASE = 'abcdefghijkmnopqrstuvwxyz';
const UPPERCASE = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const DIGITS = '23456789';
const SYMBOLS = '!@#$%^&*()-_=+[]{};:,.?';
const AMBIGUOUS_LOWERCASE = 'l';
const AMBIGUOUS_UPPERCASE = 'IO';
const AMBIGUOUS_DIGITS = '01';

export interface GeneratePasswordOptions {
  length?: number;
  lowercase?: boolean;
  uppercase?: boolean;
  numbers?: boolean;
  symbols?: boolean;
  excludeAmbiguous?: boolean;
  exclude?: string;
}

export interface GeneratePassphraseOptions {
  words?: number;
  separator?: string;
  capitalize?: boolean;
  includeNumber?: boolean;
  wordList?: readonly string[];
}

type RandomSource = (size: number) => Uint32Array;

function getRandomSource(): RandomSource {
  const cryptoApi = (globalThis as { crypto?: Crypto }).crypto;

  if (cryptoApi === undefined || typeof cryptoApi.getRandomValues !== 'function') {
    throw new Error('PassGuardJS requires a secure random source (globalThis.crypto).');
  }

  return (size) => cryptoApi.getRandomValues(new Uint32Array(size));
}

function randomIndex(max: number, random: RandomSource): number {
  if (!Number.isInteger(max) || max <= 0 || max > 0x100000000) {
    throw new RangeError('Invalid random range.');
  }

  const limit = Math.floor(0x100000000 / max) * max;

  for (;;) {
    const value = random(1)[0] as number;

    if (value < limit) {
      return value % max;
    }
  }
}

function pick(source: string | readonly string[], random: RandomSource): string {
  return source[randomIndex(source.length, random)] as string;
}

function shuffle<T>(items: T[], random: RandomSource): T[] {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swapIndex = randomIndex(index + 1, random);
    const current = items[index] as T;

    items[index] = items[swapIndex] as T;
    items[swapIndex] = current;
  }

  return items;
}

function filterCharset(charset: string, options: GeneratePasswordOptions, ambiguous: string) {
  const exclude = new Set(Array.from(options.exclude ?? ''));

  if (options.excludeAmbiguous === true) {
    for (const char of ambiguous) {
      exclude.add(char);
    }
  }

  return Array.from(charset).filter((char) => !exclude.has(char));
}

export function generatePassword(options: GeneratePasswordOptions = {}): string {
  const length = options.length ?? 20;

  if (!Number.isInteger(length) || length < 4 || length > 1024) {
    throw new RangeError('PassGuardJS password length must be an integer between 4 and 1024.');
  }

  const useAmbiguous = options.excludeAmbiguous === true;
  const pools: string[][] = [];

  if (options.lowercase !== false) {
    pools.push(
      filterCharset(
        LOWERCASE + (useAmbiguous ? '' : AMBIGUOUS_LOWERCASE),
        options,
        AMBIGUOUS_LOWERCASE,
      ),
    );
  }

  if (options.uppercase !== false) {
    pools.push(
      filterCharset(
        UPPERCASE + (useAmbiguous ? '' : AMBIGUOUS_UPPERCASE),
        options,
        AMBIGUOUS_UPPERCASE,
      ),
    );
  }

  if (options.numbers !== false) {
    pools.push(
      filterCharset(DIGITS + (useAmbiguous ? '' : AMBIGUOUS_DIGITS), options, AMBIGUOUS_DIGITS),
    );
  }

  if (options.symbols !== false) {
    pools.push(filterCharset(SYMBOLS, options, ''));
  }

  const activePools = pools.filter((pool) => pool.length > 0);

  if (activePools.length === 0) {
    throw new Error('PassGuardJS cannot generate a password: no characters are available.');
  }

  if (length < activePools.length) {
    throw new RangeError(
      'PassGuardJS password length is too short for the selected character sets.',
    );
  }

  const random = getRandomSource();
  const combined = activePools.flat();
  const characters = activePools.map((pool) => pick(pool, random));

  while (characters.length < length) {
    characters.push(pick(combined, random));
  }

  return shuffle(characters, random).join('');
}

export function generatePassphrase(options: GeneratePassphraseOptions = {}): string {
  const count = options.words ?? 5;
  const separator = options.separator ?? '-';
  const wordList = [...new Set(options.wordList ?? PASSPHRASE_WORDS)];

  if (!Number.isInteger(count) || count < 3 || count > 32) {
    throw new RangeError('PassGuardJS passphrase word count must be an integer between 3 and 32.');
  }

  if (wordList.length < 128) {
    throw new RangeError(
      'PassGuardJS passphrase word list must contain at least 128 unique words.',
    );
  }

  const random = getRandomSource();
  const words: string[] = [];

  for (let index = 0; index < count; index += 1) {
    const word = pick(wordList, random);

    words.push(options.capitalize === false ? word : word.charAt(0).toUpperCase() + word.slice(1));
  }

  if (options.includeNumber === true) {
    const target = randomIndex(words.length, random);

    words[target] = `${words[target] as string}${randomIndex(100, random)}`;
  }

  return words.join(separator);
}

export function passphraseEntropyBits(
  wordCount: number,
  wordListSize = new Set(PASSPHRASE_WORDS).size,
): number {
  return Math.round(wordCount * Math.log2(wordListSize) * 10) / 10;
}
