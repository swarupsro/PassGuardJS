import { describe, expect, it } from 'vitest';
import { analyzePassword, definePasswordPolicy, strengthFromScore } from '../src';

describe('analyzePassword', () => {
  it('returns a detailed weak result for a short common password under a strict policy', () => {
    const result = analyzePassword('Admin@123', {
      minLength: 12,
      requireUppercase: true,
      requireLowercase: true,
      requireNumber: true,
      requireSpecialChar: true,
      blockCommonPasswords: true,
      userInputs: ['swarup', 'swarup@example.com'],
    });

    expect(result.score).toBe(42);
    expect(result.strength).toBe('Weak');
    expect(result.isValid).toBe(false);
    expect(result.issues).toContain('Password is too short');
    expect(result.issues).toContain('Password is commonly used');
    expect(result.suggestions).toContain('Use at least 12 characters');
    expect(result.checks.minLength?.passed).toBe(false);
    expect(result.checks.commonPassword?.passed).toBe(false);
  });

  it('accepts a strong framework-independent password with default blocking rules', () => {
    const result = analyzePassword('R7!vQ2#zL9$pT4@xM6', {
      minLength: 14,
      requireUppercase: true,
      requireLowercase: true,
      requireNumber: true,
      requireSpecialChar: true,
    });

    expect(result.score).toBe(90);
    expect(result.strength).toBe('Very Strong');
    expect(result.isValid).toBe(true);
    expect(result.issues).toEqual([]);
    expect(result.suggestions).toEqual([]);
  });

  it('detects personal information without echoing the personal token in the issue', () => {
    const result = analyzePassword('Swarup!2026#Secure', {
      minLength: 12,
      userInputs: ['swarup@example.com', '+8801712345678'],
    });

    expect(result.isValid).toBe(false);
    expect(result.checks.userInputs?.passed).toBe(false);
    expect(result.issues).toContain('Password contains personal information');
    expect(result.issues.join(' ')).not.toContain('swarup@example.com');
  });

  it('detects keyboard patterns, repeated characters, and sequential characters', () => {
    const keyboard = analyzePassword('Qwerty-93!River');
    const repeated = analyzePassword('Aaaaaa-93!River');
    const sequential = analyzePassword('Abcdef-93!River');

    expect(keyboard.checks.keyboardPattern?.passed).toBe(false);
    expect(repeated.checks.repeatedCharacters?.passed).toBe(false);
    expect(sequential.checks.sequentialCharacters?.passed).toBe(false);
  });

  it('enforces required character classes when requested', () => {
    const result = analyzePassword('longbutplain', {
      minScore: 0,
      requireUppercase: true,
      requireLowercase: true,
      requireNumber: true,
      requireSpecialChar: true,
    });

    expect(result.isValid).toBe(false);
    expect(result.checks.uppercase?.passed).toBe(false);
    expect(result.checks.lowercase?.passed).toBe(true);
    expect(result.checks.number?.passed).toBe(false);
    expect(result.checks.specialChar?.passed).toBe(false);
  });

  it('supports custom organization policies', () => {
    const enterprisePolicy = definePasswordPolicy({
      minScore: 0,
      customRules: [
        {
          id: 'no-company-name',
          validate: (_password, context) => ({
            passed: !context.compactPassword.includes('acme'),
            issue: 'Password contains a restricted organization term',
            suggestion: 'Remove organization-specific words',
            penalty: 25,
          }),
        },
      ],
    });

    const result = analyzePassword('Acme!2026#Vault', enterprisePolicy);

    expect(result.isValid).toBe(false);
    expect(result.checks['custom:no-company-name']?.passed).toBe(false);
    expect(result.issues).toContain('Password contains a restricted organization term');
  });
});

describe('strengthFromScore', () => {
  it('maps score ranges to stable strength labels', () => {
    expect(strengthFromScore(0)).toBe('Very Weak');
    expect(strengthFromScore(20)).toBe('Weak');
    expect(strengthFromScore(50)).toBe('Medium');
    expect(strengthFromScore(70)).toBe('Strong');
    expect(strengthFromScore(90)).toBe('Very Strong');
  });
});
