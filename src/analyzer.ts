import { analyzeWithResolvedPolicy } from './analyze';
import { checkBreachedPassword, type BreachCheckOptions } from './breach';
import { resolvePolicy } from './policy';
import { uniquePush } from './utils';
import type {
  AnalyzePasswordResult,
  PasswordCheckResult,
  PasswordPolicy,
  ResolvedPasswordPolicy,
} from './types';

export interface AsyncAnalyzeOptions {
  breach?: boolean | BreachCheckOptions;
  failOnBreachCheckError?: boolean;
}

export interface AsyncAnalyzePasswordResult extends AnalyzePasswordResult {
  breachCount: number | null;
}

export interface PasswordAnalyzer {
  readonly policy: ResolvedPasswordPolicy;
  analyze: (password: string) => AnalyzePasswordResult;
  analyzeAsync: (
    password: string,
    options?: AsyncAnalyzeOptions,
  ) => Promise<AsyncAnalyzePasswordResult>;
  isValid: (password: string) => boolean;
}

export function createAnalyzer(policy: PasswordPolicy = {}): PasswordAnalyzer {
  const resolved = resolvePolicy(policy);

  const analyze = (password: string): AnalyzePasswordResult =>
    analyzeWithResolvedPolicy(password, resolved);

  const analyzeAsync = async (
    password: string,
    options: AsyncAnalyzeOptions = {},
  ): Promise<AsyncAnalyzePasswordResult> => {
    const base = analyze(password);

    if (options.breach === undefined || options.breach === false) {
      return { ...base, breachCount: null };
    }

    const breachOptions = options.breach === true ? {} : options.breach;
    const checks: Record<string, PasswordCheckResult> = { ...base.checks };
    const issues = [...base.issues];
    const suggestions = [...base.suggestions];
    let breachCount: number | null = null;
    let isValid = base.isValid;

    try {
      const result = await checkBreachedPassword(password, breachOptions);

      breachCount = result.count;
      checks.breached = {
        passed: !result.breached,
        issue: 'Password has appeared in a known data breach',
        suggestion: 'Choose a password that has never been exposed in a breach',
        metadata: { count: result.count },
      };

      if (result.breached) {
        isValid = false;
        uniquePush(issues, 'Password has appeared in a known data breach');
        uniquePush(suggestions, 'Choose a password that has never been exposed in a breach');
      }
    } catch {
      if (options.failOnBreachCheckError === true) {
        isValid = false;
        checks.breached = {
          passed: false,
          issue: 'Password could not be checked against known breaches',
          suggestion: 'Try again later',
        };
        uniquePush(issues, 'Password could not be checked against known breaches');
        uniquePush(suggestions, 'Try again later');
      }
    }

    return { ...base, isValid, issues, suggestions, checks, breachCount };
  };

  return {
    policy: resolved,
    analyze,
    analyzeAsync,
    isValid: (password) => analyze(password).isValid,
  };
}

export async function analyzePasswordAsync(
  password: string,
  policy: PasswordPolicy = {},
  options: AsyncAnalyzeOptions = {},
): Promise<AsyncAnalyzePasswordResult> {
  return createAnalyzer(policy).analyzeAsync(password, options);
}
