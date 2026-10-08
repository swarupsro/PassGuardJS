import { describe, expect, it } from 'vitest';
import {
  DEFAULT_POLICY,
  NIST_800_63B,
  OWASP_ASVS,
  PRESETS,
  STRICT,
  analyzePassword,
  analyzePasswordAsync,
  checkBreachedPassword,
  createAnalyzer,
  estimateCrackTimes,
  estimateEntropy,
  formatDuration,
  generatePassphrase,
  generatePassword,
  passphraseEntropyBits,
  resolvePolicy,
  strengthFromScore,
} from '../src';

describe('bug fixes', () => {
  it('does not let a duplicate custom rule id hide a failure', () => {
    const result = analyzePassword('R7!vQ2#zL9$pT4@xM6', {
      customRules: [
        { id: 'a', validate: () => ({ passed: false, issue: 'bad' }) },
        { id: 'a', validate: () => ({ passed: true }) },
      ],
    });

    expect(result.isValid).toBe(false);
    expect(Object.keys(result.checks).filter((key) => key.startsWith('custom:a'))).toHaveLength(2);
  });

  it('always gives a message for a failing custom rule without an issue', () => {
    const result = analyzePassword('R7!vQ2#zL9$pT4@xM6', {
      customRules: [{ id: 'x', validate: () => ({ passed: false }) }],
    });

    expect(result.isValid).toBe(false);
    expect(result.issues.length).toBeGreaterThan(0);
    expect(result.suggestions.length).toBeGreaterThan(0);
  });

  it('fails closed when a custom rule throws', () => {
    const result = analyzePassword('R7!vQ2#zL9$pT4@xM6', {
      customRules: [
        {
          id: 'boom',
          validate: () => {
            throw new Error('nope');
          },
        },
      ],
    });

    expect(result.isValid).toBe(false);
  });

  it('ignores NaN penalties instead of poisoning the score', () => {
    const result = analyzePassword('R7!vQ2#zL9$pT4@xM6', {
      customRules: [{ id: 'nan', validate: () => ({ passed: false, issue: 'x', penalty: NaN }) }],
    });

    expect(Number.isNaN(result.score)).toBe(false);
    expect(strengthFromScore(NaN)).toBe('Very Weak');
  });

  it('does not throw on malformed JavaScript policies', () => {
    const policy = {
      userInputs: [null, 'alice'],
      phoneCountryCodeAliases: [{ countryCode: 1 }, null],
      bannedSubstrings: [undefined, 'acme'],
      personalInfo: { name: [null, 'Alice'] },
    } as never;

    expect(() => analyzePassword('R7!vQ2#zL9$pT4@xM6', policy)).not.toThrow();
  });

  it('throws a TypeError for non-string passwords', () => {
    expect(() => analyzePassword(123 as never)).toThrow(TypeError);
  });

  it('freezes DEFAULT_POLICY', () => {
    expect(Object.isFrozen(DEFAULT_POLICY)).toBe(true);
  });

  it('detects Cyrillic homoglyph common passwords', () => {
    const result = analyzePassword('раssword', { minScore: 0 });

    expect(result.checks.commonPassword?.passed).toBe(false);
  });

  it('credits non-ASCII letters for character classes', () => {
    const result = analyzePassword('Привет-Мир-2026-xQ', {
      requireUppercase: true,
      requireLowercase: true,
      minScore: 0,
    });

    expect(result.checks.uppercase?.passed).toBe(true);
    expect(result.checks.lowercase?.passed).toBe(true);
  });

  it('does not flag ordinary words that merely contain a keyboard slice', () => {
    const result = analyzePassword('Liberty-Zq7!Xk9#Lm', { minScore: 0 });

    expect(result.checks.keyboardPattern?.passed).toBe(true);
  });

  it('still flags longer keyboard walks and short row prefixes', () => {
    expect(analyzePassword('xqwertyx9Z!').checks.keyboardPattern?.passed).toBe(false);
    expect(analyzePassword('qwer-Zq7!Xk9#').checks.keyboardPattern?.passed).toBe(false);
  });

  it('handles very long inputs quickly', () => {
    const started = Date.now();
    const result = analyzePassword('aB3$'.repeat(250_000));

    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(Date.now() - started).toBeLessThan(3000);
  });
});

describe('policy options', () => {
  it('enforces maxLength', () => {
    const result = analyzePassword('R7!vQ2#zL9$pT4@xM6', { maxLength: 10, minScore: 0 });

    expect(result.checks.maxLength?.passed).toBe(false);
  });

  it('enforces bannedSubstrings with leet normalization', () => {
    const result = analyzePassword('Xx-@cm3-Rocks-91', { bannedSubstrings: ['acme'], minScore: 0 });

    expect(result.checks.bannedSubstrings?.passed).toBe(false);
  });

  it('merges extra common passwords', () => {
    const result = analyzePassword('Zebra-Stripes-77', {
      commonPasswords: ['zebrastripes'],
      minScore: 0,
    });

    expect(result.checks.commonPassword?.passed).toBe(false);
  });

  it('supports block toggles', () => {
    const result = analyzePassword('Qwerty-93!River', {
      blockKeyboardPatterns: false,
      minScore: 0,
    });

    expect(result.checks.keyboardPattern).toBeUndefined();
  });
});

describe('entropy', () => {
  it('estimates higher entropy for longer random passwords', () => {
    expect(estimateEntropy('R7!vQ2#zL9$pT4@xM6').entropyBits).toBeGreaterThan(
      estimateEntropy('abcdef').entropyBits,
    );
  });

  it('reports entropy and crack times on results', () => {
    const result = analyzePassword('R7!vQ2#zL9$pT4@xM6');

    expect(result.entropyBits).toBeGreaterThan(80);
    expect(result.crackTimes.offlineFastHash.display).toBe('centuries');
  });

  it('caps score for low-entropy passwords', () => {
    const result = analyzePassword('aaaaaaaa', { blockRepeatedCharacters: false });

    expect(result.score).toBeLessThan(40);
  });

  it('formats durations', () => {
    expect(formatDuration(0.2)).toBe('instantly');
    expect(formatDuration(90)).toBe('2 minutes');
    expect(formatDuration(Infinity)).toBe('centuries');
  });

  it('estimates crack times accurately including zero entropy', () => {
    const zeroCrack = estimateCrackTimes(0);
    expect(zeroCrack.onlineThrottled.display).toBe('instantly');
    expect(zeroCrack.onlineThrottled.seconds).toBe(0);
    expect(zeroCrack.offlineFastHash.display).toBe('instantly');

    const highCrack = estimateCrackTimes(100);
    expect(highCrack.offlineFastHash.display).toBe('centuries');
  });

  it('calculates passphrase entropy bits', () => {
    expect(passphraseEntropyBits(5)).toBeGreaterThan(30);
    expect(passphraseEntropyBits(0)).toBe(0);
  });
});

describe('generators', () => {
  it('generates passwords with the requested length and all classes', () => {
    for (let index = 0; index < 50; index += 1) {
      const password = generatePassword({ length: 16 });

      expect(Array.from(password)).toHaveLength(16);
      expect(password).toMatch(/[a-z]/);
      expect(password).toMatch(/[A-Z]/);
      expect(password).toMatch(/[0-9]/);
      expect(password).toMatch(/[^A-Za-z0-9]/);
    }
  });

  it('respects class toggles and ambiguous-character exclusion', () => {
    const password = generatePassword({
      length: 200,
      symbols: false,
      excludeAmbiguous: true,
    });

    expect(password).toMatch(/^[A-Za-z0-9]+$/);
    expect(password).not.toMatch(/[lIO01]/);
  });

  it('generates different passwords each call', () => {
    expect(generatePassword()).not.toBe(generatePassword());
  });

  it('generated passwords pass the strict preset', () => {
    const analysis = analyzePassword(generatePassword({ length: 20 }), STRICT);

    expect(analysis.entropyBits).toBeGreaterThan(80);
  });

  it('rejects invalid options', () => {
    expect(() => generatePassword({ length: 2 })).toThrow(RangeError);
    expect(() =>
      generatePassword({ lowercase: false, uppercase: false, numbers: false, symbols: false }),
    ).toThrow();
  });

  it('generates passphrases', () => {
    const passphrase = generatePassphrase({ words: 5, includeNumber: true });

    expect(passphrase.split('-')).toHaveLength(5);
    expect(passphrase).toMatch(/[0-9]/);
    expect(() => generatePassphrase({ words: 1 })).toThrow(RangeError);
  });

  it('respects exclude character list in generatePassword', () => {
    const password = generatePassword({ length: 50, exclude: 'abcABC123!@#' });
    for (const char of 'abcABC123!@#') {
      expect(password).not.toContain(char);
    }
  });

  it('supports custom passphrase word list, separator, and capitalize: false', () => {
    const customList = Array.from({ length: 130 }, (_, i) => `word${i}`);
    const passphrase = generatePassphrase({
      words: 4,
      separator: '_',
      capitalize: false,
      wordList: customList,
    });
    const parts = passphrase.split('_');
    expect(parts).toHaveLength(4);
    expect(parts[0]).toMatch(/^word\d+$/);
  });
});

describe('breach check', () => {
  const fakeFetch =
    (body: string, ok = true) =>
    async () => ({ ok, status: ok ? 200 : 500, text: async () => body });

  it('detects a breached password using k-anonymity', async () => {
    const requested: string[] = [];
    const result = await checkBreachedPassword('password', {
      fetch: async (url) => {
        requested.push(url);

        return {
          ok: true,
          status: 200,
          text: async () =>
            '1E4C9B93F3F0682250B6CF8331B7EE68FD8:3861493\r\n0000000000000000000000000000000000A:1',
        };
      },
    });

    expect(result).toEqual({ breached: true, count: 3861493 });
    expect(requested[0]).toBe('https://api.pwnedpasswords.com/range/5BAA6');
  });

  it('reports unbreached passwords', async () => {
    const result = await checkBreachedPassword('x', { fetch: fakeFetch('ABC:1') });

    expect(result.breached).toBe(false);
  });

  it('throws on HTTP failure', async () => {
    await expect(checkBreachedPassword('x', { fetch: fakeFetch('', false) })).rejects.toThrow();
  });

  it('integrates into analyzePasswordAsync and can fail closed', async () => {
    const breached = await analyzePasswordAsync(
      'R7!vQ2#zL9$pT4@xM6',
      {},
      {
        breach: {
          fetch: async () => ({
            ok: true,
            status: 200,
            text: async () => 'ignored',
          }),
        },
      },
    );

    expect(breached.breachCount).toBe(0);

    const failing = await analyzePasswordAsync(
      'R7!vQ2#zL9$pT4@xM6',
      {},
      { breach: { fetch: fakeFetch('', false) }, failOnBreachCheckError: true },
    );

    expect(failing.isValid).toBe(false);

    const open = await analyzePasswordAsync(
      'R7!vQ2#zL9$pT4@xM6',
      {},
      { breach: { fetch: fakeFetch('', false) } },
    );

    expect(open.isValid).toBe(true);
  });

  it('matches lowercase hash candidates from API responses', async () => {
    const result = await checkBreachedPassword('password', {
      fetch: async () => ({
        ok: true,
        status: 200,
        text: async () => '1e4c9b93f3f0682250b6cf8331b7ee68fd8:42\r\n',
      }),
    });

    expect(result).toEqual({ breached: true, count: 42 });
  });

  it('supports padding: false', async () => {
    let sentHeaders: Record<string, string> | undefined;
    await checkBreachedPassword('x', {
      padding: false,
      fetch: async (_url, init) => {
        sentHeaders = init?.headers;
        return { ok: true, status: 200, text: async () => '' };
      },
    });

    expect(sentHeaders?.['Add-Padding']).toBeUndefined();
  });
});

describe('analyzer and presets', () => {
  it('createAnalyzer reuses a resolved policy', () => {
    const analyzer = createAnalyzer({ minLength: 12 });

    expect(analyzer.isValid('short')).toBe(false);
    expect(analyzer.policy.minLength).toBe(12);
    expect(analyzer.analyze('R7!vQ2#zL9$pT4@xM6').isValid).toBe(true);
  });

  it('NIST preset has no composition requirements', () => {
    expect(NIST_800_63B.requireUppercase).toBe(false);
    expect(analyzePassword('correct-horse-9-staple-quartz', NIST_800_63B).isValid).toBe(true);
  });

  it('resolves policy defaults and normalizes parameters', () => {
    const resolved = resolvePolicy({
      minLength: 16,
      minScore: 120,
      repeatedCharacterLimit: 1,
    });

    expect(resolved.minLength).toBe(16);
    expect(resolved.minScore).toBe(100);
    expect(resolved.repeatedCharacterLimit).toBe(2);
  });

  it('exports OWASP_ASVS and PRESETS', () => {
    expect(PRESETS.owasp).toBe(OWASP_ASVS);
    expect(PRESETS.nist).toBe(NIST_800_63B);
    expect(PRESETS.strict).toBe(STRICT);
    expect(OWASP_ASVS.minLength).toBe(12);
    expect(OWASP_ASVS.maxLength).toBe(128);
  });
});
