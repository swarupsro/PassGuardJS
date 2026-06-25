import { IGNORED_USER_INPUT_TOKENS } from './constants';
import type { CharacterStats } from './types';
import {
  compactAlphanumeric,
  normalizeForComparison,
  toLeetComparable,
  uniqueNormalizedList,
  uniquePush,
} from './utils';

interface CommonPasswordMatch {
  found: boolean;
  exact: boolean;
}

export function getCharacterStats(password: string): CharacterStats {
  const characters = Array.from(password);

  return {
    length: characters.length,
    uniqueCharacters: new Set(characters).size,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecialChar: /[^A-Za-z0-9]/.test(password),
  };
}

export function containsCommonPassword(
  password: string,
  commonPasswords: readonly string[],
): CommonPasswordMatch {
  const compactPassword = compactAlphanumeric(password);
  const leetPassword = toLeetComparable(password);
  const commonItems = uniqueNormalizedList(commonPasswords).map((commonPassword) => ({
    compact: compactAlphanumeric(commonPassword),
    leet: toLeetComparable(commonPassword),
  }));

  for (const commonPassword of commonItems) {
    if (commonPassword.compact.length === 0) {
      continue;
    }

    if (compactPassword === commonPassword.compact || leetPassword === commonPassword.leet) {
      return { found: true, exact: true };
    }
  }

  for (const commonPassword of commonItems) {
    if (
      commonPassword.compact.length >= 6 &&
      (compactPassword.includes(commonPassword.compact) ||
        leetPassword.includes(commonPassword.leet))
    ) {
      return { found: true, exact: false };
    }
  }

  return { found: false, exact: false };
}

export function containsKeyboardPattern(
  password: string,
  keyboardPatterns: readonly string[],
  minLength: number,
): boolean {
  const compactPassword = compactAlphanumeric(password);

  if (compactPassword.length < minLength) {
    return false;
  }

  for (const pattern of uniqueNormalizedList(keyboardPatterns)) {
    const compactPattern = compactAlphanumeric(pattern);
    const directions = [compactPattern, Array.from(compactPattern).reverse().join('')];

    for (const direction of directions) {
      for (let length = direction.length; length >= minLength; length -= 1) {
        for (let index = 0; index <= direction.length - length; index += 1) {
          const candidate = direction.slice(index, index + length);

          if (candidate.length >= minLength && compactPassword.includes(candidate)) {
            return true;
          }
        }
      }
    }
  }

  return false;
}

export function hasRepeatedCharacters(password: string, limit: number): boolean {
  let previous = '';
  let runLength = 0;

  for (const char of Array.from(password)) {
    if (char === previous) {
      runLength += 1;
    } else {
      previous = char;
      runLength = 1;
    }

    if (runLength >= limit) {
      return true;
    }
  }

  return false;
}

export function hasSequentialCharacters(password: string, minLength: number): boolean {
  const compactPassword = compactAlphanumeric(password);
  let runLength = 1;
  let direction = 0;

  for (let index = 1; index < compactPassword.length; index += 1) {
    const previous = compactPassword[index - 1];
    const current = compactPassword[index];

    if (previous === undefined || current === undefined) {
      continue;
    }

    const previousCode = previous.charCodeAt(0);
    const currentCode = current.charCodeAt(0);
    const diff = currentCode - previousCode;
    const sameCharacterGroup = isSameCharacterGroup(previous, current);
    const nextDirection = sameCharacterGroup && Math.abs(diff) === 1 ? diff : 0;

    if (nextDirection !== 0 && (direction === 0 || direction === nextDirection)) {
      runLength += 1;
    } else if (nextDirection !== 0) {
      runLength = 2;
    } else {
      runLength = 1;
    }

    direction = nextDirection;

    if (runLength >= minLength) {
      return true;
    }
  }

  return false;
}

export function containsUserInput(
  password: string,
  userInputs: readonly string[],
  minLength: number,
): boolean {
  const tokens = getUserInputTokens(userInputs, minLength);
  const compactPassword = compactAlphanumeric(password);
  const leetPassword = toLeetComparable(password);

  for (const token of tokens) {
    const compactToken = compactAlphanumeric(token);
    const leetToken = toLeetComparable(token);

    if (compactPassword.includes(compactToken) || leetPassword.includes(leetToken)) {
      return true;
    }
  }

  return false;
}

export function containsBannedSubstring(
  password: string,
  bannedSubstrings: readonly string[],
): boolean {
  const compactPassword = compactAlphanumeric(password);
  const leetPassword = toLeetComparable(password);

  for (const substring of uniqueNormalizedList(bannedSubstrings)) {
    const compactSubstring = compactAlphanumeric(substring);
    const leetSubstring = toLeetComparable(substring);

    if (compactSubstring.length === 0) {
      continue;
    }

    if (compactPassword.includes(compactSubstring) || leetPassword.includes(leetSubstring)) {
      return true;
    }
  }

  return false;
}

function getUserInputTokens(userInputs: readonly string[], minLength: number): string[] {
  const tokens: string[] = [];
  const ignoredTokens = new Set<string>(IGNORED_USER_INPUT_TOKENS);

  for (const input of userInputs) {
    const normalized = normalizeForComparison(input);

    if (normalized.length === 0) {
      continue;
    }

    const [emailLocalPart] = normalized.split('@');

    if (emailLocalPart !== undefined) {
      addToken(tokens, emailLocalPart, minLength, ignoredTokens);
    }

    addToken(tokens, compactAlphanumeric(normalized), minLength, ignoredTokens);

    for (const token of normalized.split(/[^a-z0-9]+/)) {
      addToken(tokens, token, minLength, ignoredTokens);
    }
  }

  return tokens;
}

function addToken(
  target: string[],
  token: string,
  minLength: number,
  ignoredTokens: ReadonlySet<string>,
): void {
  const normalized = compactAlphanumeric(token);

  if (normalized.length >= minLength && !ignoredTokens.has(normalized)) {
    uniquePush(target, normalized);
  }
}

function isSameCharacterGroup(left: string, right: string): boolean {
  return (isDigit(left) && isDigit(right)) || (isAsciiLetter(left) && isAsciiLetter(right));
}

function isDigit(char: string): boolean {
  return char >= '0' && char <= '9';
}

function isAsciiLetter(char: string): boolean {
  return char >= 'a' && char <= 'z';
}
