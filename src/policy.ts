import { COMMON_PASSWORDS, KEYBOARD_PATTERNS } from './constants';
import type { PasswordPolicy, ResolvedPasswordPolicy } from './types';
import { clamp, normalizeOptionalPositiveInteger, normalizePositiveInteger } from './utils';

export const DEFAULT_POLICY: ResolvedPasswordPolicy = {
  minLength: 8,
  minScore: 60,
  requireUppercase: false,
  requireLowercase: false,
  requireNumber: false,
  requireSpecialChar: false,
  blockCommonPasswords: true,
  blockUserInputs: true,
  blockKeyboardPatterns: true,
  blockRepeatedCharacters: true,
  blockSequentialCharacters: true,
  userInputs: [],
  commonPasswords: COMMON_PASSWORDS,
  keyboardPatterns: KEYBOARD_PATTERNS,
  bannedSubstrings: [],
  repeatedCharacterLimit: 3,
  sequenceLength: 4,
  keyboardPatternLength: 4,
  userInputMinLength: 3,
  customRules: [],
};

export function definePasswordPolicy(policy: PasswordPolicy): PasswordPolicy {
  return policy;
}

export function resolvePolicy(policy: PasswordPolicy = {}): ResolvedPasswordPolicy {
  const maxLength = normalizeOptionalPositiveInteger(policy.maxLength);

  return {
    minLength: normalizePositiveInteger(policy.minLength, DEFAULT_POLICY.minLength),
    ...(maxLength === undefined ? {} : { maxLength }),
    minScore: clamp(normalizePositiveInteger(policy.minScore, DEFAULT_POLICY.minScore), 0, 100),
    requireUppercase: policy.requireUppercase ?? DEFAULT_POLICY.requireUppercase,
    requireLowercase: policy.requireLowercase ?? DEFAULT_POLICY.requireLowercase,
    requireNumber: policy.requireNumber ?? DEFAULT_POLICY.requireNumber,
    requireSpecialChar: policy.requireSpecialChar ?? DEFAULT_POLICY.requireSpecialChar,
    blockCommonPasswords: policy.blockCommonPasswords ?? DEFAULT_POLICY.blockCommonPasswords,
    blockUserInputs: policy.blockUserInputs ?? DEFAULT_POLICY.blockUserInputs,
    blockKeyboardPatterns: policy.blockKeyboardPatterns ?? DEFAULT_POLICY.blockKeyboardPatterns,
    blockRepeatedCharacters:
      policy.blockRepeatedCharacters ?? DEFAULT_POLICY.blockRepeatedCharacters,
    blockSequentialCharacters:
      policy.blockSequentialCharacters ?? DEFAULT_POLICY.blockSequentialCharacters,
    userInputs: [...(policy.userInputs ?? DEFAULT_POLICY.userInputs)],
    commonPasswords: [...DEFAULT_POLICY.commonPasswords, ...(policy.commonPasswords ?? [])],
    keyboardPatterns: [...DEFAULT_POLICY.keyboardPatterns, ...(policy.keyboardPatterns ?? [])],
    bannedSubstrings: [...(policy.bannedSubstrings ?? DEFAULT_POLICY.bannedSubstrings)],
    repeatedCharacterLimit: Math.max(
      2,
      normalizePositiveInteger(
        policy.repeatedCharacterLimit,
        DEFAULT_POLICY.repeatedCharacterLimit,
      ),
    ),
    sequenceLength: Math.max(
      3,
      normalizePositiveInteger(policy.sequenceLength, DEFAULT_POLICY.sequenceLength),
    ),
    keyboardPatternLength: Math.max(
      3,
      normalizePositiveInteger(policy.keyboardPatternLength, DEFAULT_POLICY.keyboardPatternLength),
    ),
    userInputMinLength: Math.max(
      2,
      normalizePositiveInteger(policy.userInputMinLength, DEFAULT_POLICY.userInputMinLength),
    ),
    customRules: [...(policy.customRules ?? DEFAULT_POLICY.customRules)],
  };
}
