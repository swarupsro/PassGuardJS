import { useMemo, useState } from 'react';
import { analyzePassword } from 'passguardjs';

export function PasswordField() {
  const [password, setPassword] = useState('');

  const result = useMemo(
    () =>
      analyzePassword(password, {
        minLength: 12,
        requireUppercase: true,
        requireLowercase: true,
        requireNumber: true,
        requireSpecialChar: true,
        userInputs: ['swarup', 'swarup@example.com'],
      }),
    [password],
  );

  return (
    <div>
      <label htmlFor="password">Password</label>
      <input
        id="password"
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />
      <meter min={0} max={100} value={result.score} />
      <p>
        {result.score}/100 - {result.strength}
      </p>
      {!result.isValid && (
        <ul>
          {result.suggestions.map((suggestion) => (
            <li key={suggestion}>{suggestion}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
