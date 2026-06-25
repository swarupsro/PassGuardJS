import { COMMON_PASSWORDS, KEYBOARD_PATTERNS } from './constants';
import type {
  PasswordPolicy,
  PersonalInfoInput,
  PersonalInfoValue,
  ResolvedPasswordPolicy,
} from './types';
import {
  clamp,
  normalizeOptionalPositiveInteger,
  normalizePositiveInteger,
  uniquePush,
} from './utils';

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
  personalInfo: [],
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
  const personalInfo = collectPersonalInfo(policy.personalInfo);

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
    personalInfo,
    userInputs: collectUserInputs(policy.userInputs ?? DEFAULT_POLICY.userInputs, personalInfo),
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

function collectPersonalInfo(personalInfo: PasswordPolicy['personalInfo']): string[] {
  const values: string[] = [];

  if (personalInfo === undefined) {
    return values;
  }

  if (isPersonalInfoList(personalInfo)) {
    addPhoneNumberValue(values, personalInfo);
    return values;
  }

  addPersonalInfoValue(values, personalInfo.name);
  addPersonalInfoValue(values, personalInfo.birthYear);
  addPersonalInfoValue(values, personalInfo.email);
  addPersonalInfoValue(values, personalInfo.username);
  addPhoneNumberValue(values, personalInfo.phoneNumber);
  addPersonalInfoValue(values, personalInfo.location);

  return values;
}

function collectUserInputs(
  userInputs: readonly string[],
  personalInfo: readonly string[],
): string[] {
  const values: string[] = [];

  for (const input of userInputs) {
    uniquePush(values, input);
  }

  for (const input of personalInfo) {
    uniquePush(values, input);
  }

  return values;
}

function addPersonalInfoValue(target: string[], value: PersonalInfoValue | undefined): void {
  if (value === undefined) {
    return;
  }

  if (isPersonalInfoValueList(value)) {
    for (const item of value) {
      addPersonalInfoPrimitive(target, item);
    }

    return;
  }

  addPersonalInfoPrimitive(target, value);
}

function addPersonalInfoPrimitive(target: string[], value: string | number): void {
  uniquePush(target, String(value));
}

function addPhoneNumberValue(target: string[], value: PersonalInfoValue | undefined): void {
  if (value === undefined) {
    return;
  }

  if (isPersonalInfoValueList(value)) {
    for (const item of value) {
      addPhoneNumberPrimitive(target, item);
    }

    return;
  }

  addPhoneNumberPrimitive(target, value);
}

function addPhoneNumberPrimitive(target: string[], value: string | number): void {
  addPersonalInfoPrimitive(target, value);

  const digits = String(value).replace(/\D/g, '');

  if (digits.length === 0) {
    return;
  }

  uniquePush(target, digits);

  if (digits.startsWith('00') && digits.length > 2) {
    uniquePush(target, digits.slice(2));
  }

  if (digits.startsWith('880') && digits.length > 3) {
    uniquePush(target, `0${digits.slice(3)}`);
    uniquePush(target, digits.slice(3));
  }

  if (digits.startsWith('0') && digits.length > 1) {
    uniquePush(target, digits.slice(1));
  }
}

function isPersonalInfoList(value: PersonalInfoInput): value is readonly (string | number)[] {
  return Array.isArray(value);
}

function isPersonalInfoValueList(value: PersonalInfoValue): value is readonly (string | number)[] {
  return Array.isArray(value);
}
