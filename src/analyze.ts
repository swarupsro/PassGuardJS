import {
  containsBannedSubstring,
  containsCommonPassword,
  containsKeyboardPattern,
  containsUserInput,
  getCharacterStats,
  hasRepeatedCharacters,
  hasSequentialCharacters,
} from './patterns';
import { resolvePolicy } from './policy';
import { applyPenalties, calculateBaseScore, strengthFromScore } from './scoring';
import type {
  AnalyzePasswordResult,
  PasswordCheckResult,
  PasswordPolicy,
  PasswordRuleContext,
} from './types';
import { compactAlphanumeric, normalizeForComparison, toLeetComparable, uniquePush } from './utils';

const PERSONAL_INFO_MIN_LENGTH = 2;

export function analyzePassword(
  password: string,
  policy: PasswordPolicy = {},
): AnalyzePasswordResult {
  if (typeof password !== 'string') {
    throw new TypeError('PassGuardJS expected password to be a string.');
  }

  const resolvedPolicy = resolvePolicy(policy);
  const stats = getCharacterStats(password);
  const issues: string[] = [];
  const suggestions: string[] = [];
  const penalties: number[] = [];
  const checks: Record<string, PasswordCheckResult> = {};

  const addCheck = (id: string, result: PasswordCheckResult): void => {
    checks[id] = result;

    if (!result.passed) {
      uniquePush(issues, result.issue);
      uniquePush(suggestions, result.suggestion);

      if (result.penalty !== undefined) {
        penalties.push(result.penalty);
      }
    }
  };

  const missingLength = Math.max(0, resolvedPolicy.minLength - stats.length);

  addCheck('minLength', {
    passed: missingLength === 0,
    issue: 'Password is too short',
    suggestion: `Use at least ${resolvedPolicy.minLength} characters`,
    penalty: Math.min(25, missingLength * 4),
    metadata: {
      required: resolvedPolicy.minLength,
      actual: stats.length,
    },
  });

  if (resolvedPolicy.maxLength !== undefined) {
    addCheck('maxLength', {
      passed: stats.length <= resolvedPolicy.maxLength,
      issue: 'Password is too long',
      suggestion: `Use no more than ${resolvedPolicy.maxLength} characters`,
      penalty: 5,
      metadata: {
        required: resolvedPolicy.maxLength,
        actual: stats.length,
      },
    });
  }

  addCheck('uppercase', {
    passed: !resolvedPolicy.requireUppercase || stats.hasUppercase,
    issue: 'Password must include an uppercase letter',
    suggestion: 'Add at least one uppercase letter',
    penalty: 12,
    metadata: {
      required: resolvedPolicy.requireUppercase,
      present: stats.hasUppercase,
    },
  });

  addCheck('lowercase', {
    passed: !resolvedPolicy.requireLowercase || stats.hasLowercase,
    issue: 'Password must include a lowercase letter',
    suggestion: 'Add at least one lowercase letter',
    penalty: 12,
    metadata: {
      required: resolvedPolicy.requireLowercase,
      present: stats.hasLowercase,
    },
  });

  addCheck('number', {
    passed: !resolvedPolicy.requireNumber || stats.hasNumber,
    issue: 'Password must include a number',
    suggestion: 'Add at least one number',
    penalty: 12,
    metadata: {
      required: resolvedPolicy.requireNumber,
      present: stats.hasNumber,
    },
  });

  addCheck('specialChar', {
    passed: !resolvedPolicy.requireSpecialChar || stats.hasSpecialChar,
    issue: 'Password must include a special character',
    suggestion: 'Add at least one special character',
    penalty: 12,
    metadata: {
      required: resolvedPolicy.requireSpecialChar,
      present: stats.hasSpecialChar,
    },
  });

  if (resolvedPolicy.blockCommonPasswords) {
    const commonPasswordMatch = containsCommonPassword(password, resolvedPolicy.commonPasswords);

    addCheck('commonPassword', {
      passed: !commonPasswordMatch.found,
      issue: commonPasswordMatch.exact
        ? 'Password is commonly used'
        : 'Password contains a common password or word',
      suggestion: 'Avoid common words, leaked passwords, and predictable substitutions',
      penalty: commonPasswordMatch.exact ? 28 : 20,
      metadata: {
        exact: commonPasswordMatch.exact,
      },
    });
  }

  if (resolvedPolicy.blockUserInputs && resolvedPolicy.userInputs.length > 0) {
    const hasUserInput =
      containsUserInput(password, resolvedPolicy.userInputs, resolvedPolicy.userInputMinLength) ||
      containsShortPersonalInfo(password, resolvedPolicy);

    addCheck('userInputs', {
      passed: !hasUserInput,
      issue: 'Password contains personal information',
      suggestion: 'Avoid names, usernames, emails, phone numbers, and other personal details',
      penalty: 25,
    });
  }

  if (resolvedPolicy.blockKeyboardPatterns) {
    const hasKeyboardPattern = containsKeyboardPattern(
      password,
      resolvedPolicy.keyboardPatterns,
      resolvedPolicy.keyboardPatternLength,
    );

    addCheck('keyboardPattern', {
      passed: !hasKeyboardPattern,
      issue: 'Password contains a keyboard pattern',
      suggestion: 'Avoid keyboard walks such as qwerty, asdf, and zxcv',
      penalty: 18,
    });
  }

  if (resolvedPolicy.blockRepeatedCharacters) {
    const hasRepeats = hasRepeatedCharacters(password, resolvedPolicy.repeatedCharacterLimit);

    addCheck('repeatedCharacters', {
      passed: !hasRepeats,
      issue: 'Password contains repeated characters',
      suggestion: 'Avoid repeated characters such as aaaaaa or 111111',
      penalty: 18,
    });
  }

  if (resolvedPolicy.blockSequentialCharacters) {
    const hasSequence = hasSequentialCharacters(password, resolvedPolicy.sequenceLength);

    addCheck('sequentialCharacters', {
      passed: !hasSequence,
      issue: 'Password contains sequential characters',
      suggestion: 'Avoid sequences such as abcdef, 123456, or fedcba',
      penalty: 16,
    });
  }

  if (resolvedPolicy.bannedSubstrings.length > 0) {
    const hasBannedSubstring = containsBannedSubstring(password, resolvedPolicy.bannedSubstrings);

    addCheck('bannedSubstrings', {
      passed: !hasBannedSubstring,
      issue: 'Password contains a banned word or phrase',
      suggestion: 'Remove organization names, product names, or other banned words',
      penalty: 25,
    });
  }

  if (resolvedPolicy.customRules.length > 0) {
    const context: PasswordRuleContext = {
      compactPassword: compactAlphanumeric(password),
      leetNormalizedPassword: toLeetComparable(password),
      normalizedPassword: normalizeForComparison(password),
      policy: resolvedPolicy,
    };

    for (const rule of resolvedPolicy.customRules) {
      addCheck(`custom:${rule.id}`, rule.validate(password, context));
    }
  }

  const score = applyPenalties(calculateBaseScore(stats), penalties);
  const strength = strengthFromScore(score);

  addCheck('minScore', {
    passed: score >= resolvedPolicy.minScore,
    issue: 'Password strength score is below the required minimum',
    suggestion: 'Use a longer password with more random characters',
    metadata: {
      required: resolvedPolicy.minScore,
      actual: score,
    },
  });

  return {
    score,
    strength,
    isValid: Object.values(checks).every((check) => check.passed),
    issues,
    suggestions,
    checks,
  };
}

function containsShortPersonalInfo(
  password: string,
  policy: ReturnType<typeof resolvePolicy>,
): boolean {
  if (policy.userInputMinLength <= PERSONAL_INFO_MIN_LENGTH || policy.personalInfo.length === 0) {
    return false;
  }

  const shortPersonalInfo = policy.personalInfo.filter((value) => {
    const compactValue = compactAlphanumeric(value);

    return (
      compactValue.length >= PERSONAL_INFO_MIN_LENGTH &&
      compactValue.length < policy.userInputMinLength
    );
  });

  return (
    shortPersonalInfo.length > 0 &&
    containsUserInput(password, shortPersonalInfo, PERSONAL_INFO_MIN_LENGTH)
  );
}
