export type StrengthLevel = 'Very Weak' | 'Weak' | 'Medium' | 'Strong' | 'Very Strong';

export type CheckMetadataValue = string | number | boolean | readonly string[];

export interface PasswordCheckResult {
  passed: boolean;
  issue?: string;
  suggestion?: string;
  penalty?: number;
  metadata?: Record<string, CheckMetadataValue>;
}

export interface PasswordRuleResult {
  passed: boolean;
  issue?: string;
  suggestion?: string;
  penalty?: number;
  metadata?: Record<string, CheckMetadataValue>;
}

export interface PasswordRuleContext {
  compactPassword: string;
  leetNormalizedPassword: string;
  normalizedPassword: string;
  policy: ResolvedPasswordPolicy;
}

export interface PasswordRule {
  id: string;
  validate: (password: string, context: PasswordRuleContext) => PasswordRuleResult;
}

export interface PasswordPolicy {
  minLength?: number;
  maxLength?: number;
  minScore?: number;
  requireUppercase?: boolean;
  requireLowercase?: boolean;
  requireNumber?: boolean;
  requireSpecialChar?: boolean;
  blockCommonPasswords?: boolean;
  blockUserInputs?: boolean;
  blockKeyboardPatterns?: boolean;
  blockRepeatedCharacters?: boolean;
  blockSequentialCharacters?: boolean;
  userInputs?: readonly string[];
  commonPasswords?: readonly string[];
  keyboardPatterns?: readonly string[];
  bannedSubstrings?: readonly string[];
  repeatedCharacterLimit?: number;
  sequenceLength?: number;
  keyboardPatternLength?: number;
  userInputMinLength?: number;
  customRules?: readonly PasswordRule[];
}

export interface ResolvedPasswordPolicy {
  minLength: number;
  maxLength?: number;
  minScore: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumber: boolean;
  requireSpecialChar: boolean;
  blockCommonPasswords: boolean;
  blockUserInputs: boolean;
  blockKeyboardPatterns: boolean;
  blockRepeatedCharacters: boolean;
  blockSequentialCharacters: boolean;
  userInputs: readonly string[];
  commonPasswords: readonly string[];
  keyboardPatterns: readonly string[];
  bannedSubstrings: readonly string[];
  repeatedCharacterLimit: number;
  sequenceLength: number;
  keyboardPatternLength: number;
  userInputMinLength: number;
  customRules: readonly PasswordRule[];
}

export interface AnalyzePasswordResult {
  score: number;
  strength: StrengthLevel;
  isValid: boolean;
  issues: string[];
  suggestions: string[];
  checks: Record<string, PasswordCheckResult>;
}

export interface CharacterStats {
  length: number;
  uniqueCharacters: number;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
}
