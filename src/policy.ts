import { COMMON_PASSWORDS, KEYBOARD_PATTERNS } from './constants';
import type {
  PasswordPolicy,
  PersonalInfoInput,
  PersonalInfoValue,
  PhoneCountryCodeAlias,
  ResolvedPasswordPolicy,
} from './types';
import {
  clamp,
  normalizeNonNegativeInteger,
  normalizeOptionalPositiveInteger,
  normalizePositiveInteger,
  uniquePush,
} from './utils';

const MIN_PHONE_DIGITS = 7;

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
  phoneCountryCodeAliases: [{ countryCode: '880', localPrefix: '0' }],
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
  const phoneCountryCodeAliases = collectPhoneCountryCodeAliases(
    policy.phoneCountryCodeAliases ?? DEFAULT_POLICY.phoneCountryCodeAliases,
  );
  const personalInfo = collectPersonalInfo(policy.personalInfo, phoneCountryCodeAliases);

  return {
    minLength: normalizePositiveInteger(policy.minLength, DEFAULT_POLICY.minLength),
    ...(maxLength === undefined ? {} : { maxLength }),
    minScore: clamp(normalizeNonNegativeInteger(policy.minScore, DEFAULT_POLICY.minScore), 0, 100),
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
    phoneCountryCodeAliases,
    userInputs: collectUserInputs(policy.userInputs ?? DEFAULT_POLICY.userInputs, personalInfo),
    commonPasswords:
      policy.commonPasswords === undefined
        ? DEFAULT_POLICY.commonPasswords
        : [...DEFAULT_POLICY.commonPasswords, ...policy.commonPasswords],
    keyboardPatterns:
      policy.keyboardPatterns === undefined
        ? DEFAULT_POLICY.keyboardPatterns
        : [...DEFAULT_POLICY.keyboardPatterns, ...policy.keyboardPatterns],
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

function collectPersonalInfo(
  personalInfo: PasswordPolicy['personalInfo'],
  phoneCountryCodeAliases: readonly PhoneCountryCodeAlias[],
): string[] {
  const values: string[] = [];

  if (personalInfo === undefined) {
    return values;
  }

  if (isPersonalInfoList(personalInfo)) {
    addPhoneNumberValue(values, personalInfo, phoneCountryCodeAliases, true);
    return values;
  }

  addPersonalInfoValue(values, personalInfo.name);
  addPersonalInfoValue(values, personalInfo.birthYear);
  addPersonalInfoValue(values, personalInfo.email);
  addPersonalInfoValue(values, personalInfo.username);
  addPhoneNumberValue(values, personalInfo.phoneNumber, phoneCountryCodeAliases, false);
  addPersonalInfoValue(values, personalInfo.location);

  return values;
}

function collectPhoneCountryCodeAliases(
  aliases: readonly PhoneCountryCodeAlias[],
): PhoneCountryCodeAlias[] {
  const values: PhoneCountryCodeAlias[] = [];
  const seen = new Set<string>();

  for (const alias of aliases) {
    const countryCode = digitsOnly(alias.countryCode);
    const localPrefix = alias.localPrefix === undefined ? undefined : digitsOnly(alias.localPrefix);

    if (countryCode.length === 0) {
      continue;
    }

    const key = `${countryCode}:${localPrefix ?? ''}`;

    if (!seen.has(key)) {
      seen.add(key);
      values.push(localPrefix === undefined ? { countryCode } : { countryCode, localPrefix });
    }
  }

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

function addPhoneNumberValue(
  target: string[],
  value: PersonalInfoValue | undefined,
  phoneCountryCodeAliases: readonly PhoneCountryCodeAlias[],
  requirePhoneLikeValue: boolean,
): void {
  if (value === undefined) {
    return;
  }

  if (isPersonalInfoValueList(value)) {
    for (const item of value) {
      addPhoneNumberPrimitive(target, item, phoneCountryCodeAliases, requirePhoneLikeValue);
    }

    return;
  }

  addPhoneNumberPrimitive(target, value, phoneCountryCodeAliases, requirePhoneLikeValue);
}

function addPhoneNumberPrimitive(
  target: string[],
  value: string | number,
  phoneCountryCodeAliases: readonly PhoneCountryCodeAlias[],
  requirePhoneLikeValue: boolean,
): void {
  addPersonalInfoPrimitive(target, value);

  const rawValue = String(value);
  const digits = digitsOnly(rawValue);

  if (
    digits.length < MIN_PHONE_DIGITS ||
    (requirePhoneLikeValue && !looksLikePhoneNumber(rawValue, digits))
  ) {
    return;
  }

  const digitForms: string[] = [];
  uniquePush(digitForms, digits);

  if (digits.startsWith('00') && digits.length > 2) {
    uniquePush(digitForms, digits.slice(2));
  }

  for (const digitForm of digitForms) {
    uniquePush(target, digitForm);

    for (const alias of phoneCountryCodeAliases) {
      if (digitForm.startsWith(alias.countryCode) && digitForm.length > alias.countryCode.length) {
        const nationalNumber = digitForm.slice(alias.countryCode.length);

        if (alias.localPrefix !== undefined) {
          uniquePush(target, `${alias.localPrefix}${nationalNumber}`);
        }

        uniquePush(target, nationalNumber);
      }
    }

    if (digitForm.startsWith('0') && !digitForm.startsWith('00') && digitForm.length > 1) {
      uniquePush(target, digitForm.slice(1));
    }
  }
}

function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

function looksLikePhoneNumber(rawValue: string, digits: string): boolean {
  return digits.length >= 10 || /^\s*(?:\+|00)/.test(rawValue) || /[\s().-]/.test(rawValue);
}

function isPersonalInfoList(value: PersonalInfoInput): value is readonly (string | number)[] {
  return Array.isArray(value);
}

function isPersonalInfoValueList(value: PersonalInfoValue): value is readonly (string | number)[] {
  return Array.isArray(value);
}
