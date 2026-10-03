# PassGuardJS

[![npm version](https://img.shields.io/npm/v/passguardjs.svg)](https://www.npmjs.com/package/passguardjs)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-ready-3178c6.svg)](https://www.typescriptlang.org/)
[![Dependencies](https://img.shields.io/badge/dependencies-0-brightgreen.svg)](package.json)

PassGuardJS is a lightweight password strength and complexity validation library for
registration forms, password reset flows, profile settings, admin panels, and enterprise systems.

It is framework-independent, dependency-free at runtime, written in TypeScript, and ships both ESM
and CommonJS builds.

## Features

- Password strength score from `0` to `100`
- Strength labels: `Very Weak`, `Weak`, `Medium`, `Strong`, `Very Strong`
- Common password detection such as `password`, `admin123`, `qwerty`, and `12345678`
- Personal information detection from names, birth years, usernames, emails, phone numbers, and
  locations
- Keyboard pattern detection such as `qwerty`, `asdf`, and `zxcv`
- Repeated character detection such as `aaaaaa` and `111111`
- Sequential character detection such as `abcdef`, `123456`, and `fedcba`
- Minimum and maximum length checks
- Uppercase, lowercase, number, and special character requirements
- Custom policy configuration and custom validation rules
- Detailed validation result with issues, suggestions, and per-rule checks
- Entropy estimate and crack-time estimates (online, offline slow hash, offline fast hash)
- Secure password and passphrase generators backed by `crypto.getRandomValues`
- Optional Have I Been Pwned breach check using k-anonymity (only a 5-character hash prefix is sent)
- Ready-made policy presets: `NIST_800_63B`, `OWASP_ASVS`, `STRICT`
- `createAnalyzer(policy)` to resolve a policy once and reuse it on every keystroke
- Unicode-aware character classes and homoglyph (Cyrillic/Greek look-alike) normalization
- Fails closed: throwing custom rules and malformed policies never crash validation
- Works with Vanilla JS, React, Vue, Angular, Node.js, Deno, Bun, and edge runtimes
- Zero runtime dependencies, with a `<script>` bundle for plain HTML pages

## Installation

```bash
npm install passguardjs
```

## Quick Start

```ts
import { analyzePassword } from 'passguardjs';

const result = analyzePassword('Admin@123', {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecialChar: true,
  blockCommonPasswords: true,
  userInputs: ['swarup', 'swarup@example.com'],
});

console.log(result);
```

Personal information checks can use either a simple array or named fields:

```ts
const arrayResult = analyzePassword('Swarup@2000', {
  personalInfo: ['Swarup', '1995'],
});

const structuredResult = analyzePassword('Swarup.saha95!', {
  personalInfo: {
    name: 'Swarup Saha',
    birthYear: 2000,
    email: 'swarup.saha@example.com',
    username: 'swarup_saha95',
    phoneNumber: '+8801712345678',
    location: ['Dhaka', 'Bangladesh'],
  },
});
```

Example result:

```ts
{
  score: 42,
  strength: 'Weak',
  isValid: false,
  issues: [
    'Password is too short',
    'Password is commonly used',
    'Password strength score is below the required minimum'
  ],
  suggestions: [
    'Use at least 12 characters',
    'Avoid common words, leaked passwords, and predictable substitutions',
    'Use a longer password with more random characters'
  ],
  checks: {
    minLength: {
      passed: false,
      issue: 'Password is too short',
      suggestion: 'Use at least 12 characters',
      penalty: 12,
      metadata: { required: 12, actual: 9 }
    },
    commonPassword: {
      passed: false,
      issue: 'Password is commonly used',
      suggestion: 'Avoid common words, leaked passwords, and predictable substitutions',
      penalty: 28,
      metadata: { exact: true }
    }
  }
}
```

## API

### `analyzePassword(password, policy?)`

Analyzes a password and returns a detailed validation result.

```ts
import { analyzePassword, type PasswordPolicy } from 'passguardjs';

const policy: PasswordPolicy = {
  minLength: 14,
  minScore: 70,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecialChar: true,
  blockCommonPasswords: true,
  blockUserInputs: true,
  blockKeyboardPatterns: true,
  blockRepeatedCharacters: true,
  blockSequentialCharacters: true,
  personalInfo: {
    name: 'Alice Example',
    birthYear: 2000,
    email: 'alice@example.com',
    username: 'alice95',
    phoneNumber: '+1 415 555 0135',
    location: ['San Francisco', 'California'],
  },
  phoneCountryCodeAliases: [{ countryCode: '1' }],
  userInputs: ['alice', 'alice@example.com'],
};

const result = analyzePassword('Violet-Moon-73!Quartz', policy);
```

### `createAnalyzer(policy?)`

Resolves the policy once. Use it for live feedback as the user types.

```ts
import { createAnalyzer, OWASP_ASVS } from 'passguardjs';

const analyzer = createAnalyzer({ ...OWASP_ASVS, userInputs: ['alice@example.com'] });

analyzer.analyze('hunter2'); // sync result
analyzer.isValid('R7!vQ2#zL9$pT4@xM6'); // boolean
await analyzer.analyzeAsync('R7!vQ2#zL9$pT4@xM6', { breach: true });
```

### `generatePassword(options?)` and `generatePassphrase(options?)`

```ts
import { generatePassword, generatePassphrase } from 'passguardjs';

generatePassword({ length: 20 }); // 'k#7Qv-2mXr!Td9@Wp4Zs'
generatePassword({ length: 16, symbols: false, excludeAmbiguous: true });
generatePassphrase({ words: 5, separator: '-', includeNumber: true }); // 'Polar-Meadow-Echo42-Pillow-Elbow'
```

Both use rejection sampling over `crypto.getRandomValues` (no modulo bias) and throw if no secure
random source exists. Password options: `length`, `lowercase`, `uppercase`, `numbers`, `symbols`,
`excludeAmbiguous`, `exclude`. Passphrase options: `words`, `separator`, `capitalize`,
`includeNumber`, `wordList` (at least 128 unique words).

### Breach check (Have I Been Pwned)

```ts
import { analyzePasswordAsync, checkBreachedPassword } from 'passguardjs';

const { breached, count } = await checkBreachedPassword('password123');

const result = await analyzePasswordAsync('password123', { minLength: 12 }, { breach: true });
result.breachCount; // number, or null when the check was not run
```

Only the first 5 characters of the SHA-1 hash leave the device, and the request uses the
`Add-Padding` header. If the lookup fails, validation succeeds by default; set
`failOnBreachCheckError: true` to fail closed. Pass `breach: { fetch, endpoint, signal }` to use a
custom fetch or a self-hosted mirror.

### Policy presets

```ts
import { analyzePassword, NIST_800_63B, OWASP_ASVS, STRICT } from 'passguardjs';

analyzePassword('correct-horse-9-staple-quartz', NIST_800_63B);
```

- `NIST_800_63B`: no composition rules, blocks common/contextual/patterned passwords.
- `OWASP_ASVS`: 12 to 128 characters, no composition rules.
- `STRICT`: 14+ characters, all character classes, `minScore: 75`.

### Browser `<script>` tag

```html
<script src="https://cdn.jsdelivr.net/npm/passguardjs"></script>
<script>
  console.log(PassGuard.analyzePassword('Tr0ub4dor&3').strength);
</script>
```

### Result Shape

```ts
interface AnalyzePasswordResult {
  score: number;
  strength: 'Very Weak' | 'Weak' | 'Medium' | 'Strong' | 'Very Strong';
  isValid: boolean;
  entropyBits: number;
  crackTimes: {
    onlineThrottled: { seconds: number; display: string };
    onlineUnthrottled: { seconds: number; display: string };
    offlineSlowHash: { seconds: number; display: string };
    offlineFastHash: { seconds: number; display: string };
  };
  issues: string[];
  suggestions: string[];
  checks: Record<string, PasswordCheckResult>;
}
```

`isValid` is `true` only when all enabled checks pass and the final score is greater than or equal
to `minScore`. The score is capped by the entropy estimate, so a long but low-entropy password
cannot reach a high score. Entropy and crack times are heuristic estimates, not guarantees.

### Policy Options

| Option                      | Type                      | Default                         | Description                                                                                  |
| --------------------------- | ------------------------- | ------------------------------- | -------------------------------------------------------------------------------------------- |
| `minLength`                 | `number`                  | `8`                             | Minimum password length.                                                                     |
| `maxLength`                 | `number`                  | `undefined`                     | Optional maximum password length.                                                            |
| `minScore`                  | `number`                  | `60`                            | Minimum score required for `isValid`.                                                        |
| `requireUppercase`          | `boolean`                 | `false`                         | Require at least one uppercase letter (any script).                                          |
| `requireLowercase`          | `boolean`                 | `false`                         | Require at least one lowercase letter (any script).                                          |
| `requireNumber`             | `boolean`                 | `false`                         | Require at least one decimal digit (any script).                                             |
| `requireSpecialChar`        | `boolean`                 | `false`                         | Require at least one non-alphanumeric character.                                             |
| `blockCommonPasswords`      | `boolean`                 | `true`                          | Block built-in and custom common passwords.                                                  |
| `blockUserInputs`           | `boolean`                 | `true`                          | Block passwords containing personal input tokens.                                            |
| `blockKeyboardPatterns`     | `boolean`                 | `true`                          | Block keyboard walks such as `qwerty` and `asdf`.                                            |
| `blockRepeatedCharacters`   | `boolean`                 | `true`                          | Block repeated runs such as `aaaaaa`.                                                        |
| `blockSequentialCharacters` | `boolean`                 | `true`                          | Block sequential runs such as `abcdef` and `123456`.                                         |
| `personalInfo`              | `PersonalInfoInput`       | `[]`                            | Names, birth years, emails, usernames, phone numbers, and locations to block from passwords. |
| `phoneCountryCodeAliases`   | `PhoneCountryCodeAlias[]` | Bangladesh `880` with local `0` | Country-code aliases used when normalizing phone numbers.                                    |
| `userInputs`                | `string[]`                | `[]`                            | Generic personal inputs such as phone numbers or custom identifiers.                         |
| `commonPasswords`           | `string[]`                | `[]`                            | Extra common passwords to block in addition to the built-in list.                            |
| `keyboardPatterns`          | `string[]`                | `[]`                            | Extra keyboard-like patterns to block.                                                       |
| `bannedSubstrings`          | `string[]`                | `[]`                            | Organization-specific words or phrases to block.                                             |
| `repeatedCharacterLimit`    | `number`                  | `3`                             | A run of this many identical characters is blocked (`aaa` fails at `3`). Minimum `2`.        |
| `sequenceLength`            | `number`                  | `4`                             | A sequential run of this length is blocked (`abcd` fails at `4`). Minimum `3`.               |
| `keyboardPatternLength`     | `number`                  | `4`                             | Keyboard walks of this length are blocked at the start of a row; 5+ anywhere. Minimum `3`.   |
| `userInputMinLength`        | `number`                  | `3`                             | Minimum personal token length to compare.                                                    |
| `customRules`               | `PasswordRule[]`          | `[]`                            | Add organization-specific validators.                                                        |

## Strength Levels

| Score    | Strength      |
| -------- | ------------- |
| `0-19`   | `Very Weak`   |
| `20-49`  | `Weak`        |
| `50-69`  | `Medium`      |
| `70-89`  | `Strong`      |
| `90-100` | `Very Strong` |

## Custom Rules

```ts
import { analyzePassword, definePasswordPolicy } from 'passguardjs';

const enterprisePolicy = definePasswordPolicy({
  minLength: 14,
  minScore: 70,
  bannedSubstrings: ['companyname', 'productname'],
  customRules: [
    {
      id: 'no-year-only-ending',
      validate: (password) => ({
        passed: !/[0-9]{4}$/.test(password),
        issue: 'Password must not end with only a year',
        suggestion: 'Avoid predictable year suffixes',
        penalty: 15,
      }),
    },
  ],
});

const result = analyzePassword('CompanyName2026', enterprisePolicy);
```

## Framework Examples

### Vanilla JS

See [examples/vanilla/index.html](examples/vanilla/index.html).

### React

See [examples/react/PasswordField.tsx](examples/react/PasswordField.tsx).

### Node.js

See [examples/node/index.mjs](examples/node/index.mjs).

### Vue

```vue
<script setup lang="ts">
import { computed, ref } from 'vue';
import { analyzePassword } from 'passguardjs';

const password = ref('');
const result = computed(() =>
  analyzePassword(password.value, {
    minLength: 12,
    userInputs: ['swarup@example.com'],
  }),
);
</script>
```

### Angular

```ts
import { AbstractControl, ValidationErrors } from '@angular/forms';
import { analyzePassword } from 'passguardjs';

export function strongPasswordValidator(control: AbstractControl): ValidationErrors | null {
  const result = analyzePassword(control.value ?? '', {
    minLength: 12,
    requireUppercase: true,
    requireLowercase: true,
    requireNumber: true,
    requireSpecialChar: true,
  });

  return result.isValid ? null : { passwordStrength: result };
}
```

## CommonJS

```js
const { analyzePassword } = require('passguardjs');

const result = analyzePassword('Admin@123');
```

## Security Notes

- Run password validation on the client for user feedback and on the server for enforcement.
- Never log raw passwords or validation payloads containing passwords.
- PassGuardJS does not send data over the network.
- Use a slow password hashing algorithm such as Argon2id, bcrypt, or scrypt when storing passwords.
- For high-risk systems, combine this library with a breached-password check such as a k-anonymity
  Have I Been Pwned integration.
- Keep custom blocked terms generic in user-facing messages so personal or organization-specific
  data is not echoed back to the user.

## Development

```bash
npm install
npm run test
npm run lint
npm run build
```

## Publishing

Bump the version in `package.json` and push to `main`. The GitHub Actions workflow lints,
typechecks, tests, builds, and publishes to npm with provenance when the version is new.

The package ships `dist/index.js` (ESM), `dist/index.cjs` (CommonJS), matching `.d.ts` / `.d.cts`
types, and `dist/passguard.min.global.js` (browser global `PassGuard`).

## License

MIT
