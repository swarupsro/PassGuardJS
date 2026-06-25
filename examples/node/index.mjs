import { analyzePassword } from '../../dist/index.js';

const password = process.argv[2] ?? '';

const result = analyzePassword(password, {
  minLength: 12,
  minScore: 70,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecialChar: true,
  userInputs: ['swarup', 'swarup@example.com'],
});

if (!result.isValid) {
  console.error('Password rejected');
  console.error(result.issues.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Password accepted: ${result.score}/100 (${result.strength})`);
}
