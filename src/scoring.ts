import type { CharacterStats, StrengthLevel } from './types';
import { clamp } from './utils';

export function calculateBaseScore(stats: CharacterStats): number {
  const lengthScore = clamp(stats.length * 3, 0, 35);
  const varietyScore =
    (stats.hasLowercase ? 10 : 0) +
    (stats.hasUppercase ? 10 : 0) +
    (stats.hasNumber ? 10 : 0) +
    (stats.hasSpecialChar ? 12 : 0);
  const uniqueRatio = stats.length === 0 ? 0 : stats.uniqueCharacters / stats.length;
  const uniquenessScore = clamp(Math.round(uniqueRatio * 13), 0, 13);

  return clamp(Math.round(lengthScore + varietyScore + uniquenessScore), 0, 100);
}

export function applyPenalties(score: number, penalties: readonly number[]): number {
  const totalPenalty = penalties.reduce((total, penalty) => total + Math.max(0, penalty), 0);

  return clamp(Math.round(score - totalPenalty), 0, 100);
}

export function strengthFromScore(score: number): StrengthLevel {
  if (score < 20) {
    return 'Very Weak';
  }

  if (score < 50) {
    return 'Weak';
  }

  if (score < 70) {
    return 'Medium';
  }

  if (score < 90) {
    return 'Strong';
  }

  return 'Very Strong';
}
