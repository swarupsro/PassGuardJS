import type { PasswordPolicy } from './types';

export const NIST_800_63B: PasswordPolicy = Object.freeze({
  minLength: 8,
  minScore: 0,
  requireUppercase: false,
  requireLowercase: false,
  requireNumber: false,
  requireSpecialChar: false,
  blockCommonPasswords: true,
  blockUserInputs: true,
  blockKeyboardPatterns: true,
  blockRepeatedCharacters: true,
  blockSequentialCharacters: true,
});

export const OWASP_ASVS: PasswordPolicy = Object.freeze({
  minLength: 12,
  maxLength: 128,
  minScore: 0,
  blockCommonPasswords: true,
  blockUserInputs: true,
  blockKeyboardPatterns: true,
  blockRepeatedCharacters: true,
  blockSequentialCharacters: true,
});

export const STRICT: PasswordPolicy = Object.freeze({
  minLength: 14,
  maxLength: 128,
  minScore: 75,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecialChar: true,
  blockCommonPasswords: true,
  blockUserInputs: true,
  blockKeyboardPatterns: true,
  blockRepeatedCharacters: true,
  blockSequentialCharacters: true,
});

export const PRESETS = Object.freeze({
  nist: NIST_800_63B,
  owasp: OWASP_ASVS,
  strict: STRICT,
});

export type PresetName = keyof typeof PRESETS;
