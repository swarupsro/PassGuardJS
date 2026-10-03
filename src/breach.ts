export interface BreachCheckOptions {
  endpoint?: string;
  fetch?: (
    input: string,
    init?: { headers?: Record<string, string>; signal?: AbortSignal },
  ) => Promise<{
    ok: boolean;
    status: number;
    text: () => Promise<string>;
  }>;
  signal?: AbortSignal;
  padding?: boolean;
}

export interface BreachCheckResult {
  breached: boolean;
  count: number;
}

const DEFAULT_ENDPOINT = 'https://api.pwnedpasswords.com/range/';

async function sha1Hex(value: string): Promise<string> {
  const subtle = (globalThis as { crypto?: Crypto }).crypto?.subtle;

  if (subtle === undefined) {
    throw new Error('PassGuardJS breach check requires globalThis.crypto.subtle.');
  }

  const digest = await subtle.digest('SHA-1', new TextEncoder().encode(value));

  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
}

export async function checkBreachedPassword(
  password: string,
  options: BreachCheckOptions = {},
): Promise<BreachCheckResult> {
  if (typeof password !== 'string') {
    throw new TypeError('PassGuardJS expected password to be a string.');
  }

  const doFetch = options.fetch ?? (globalThis as { fetch?: BreachCheckOptions['fetch'] }).fetch;

  if (doFetch === undefined) {
    throw new Error('PassGuardJS breach check requires a fetch implementation.');
  }

  const hash = await sha1Hex(password);
  const prefix = hash.slice(0, 5);
  const suffix = hash.slice(5);
  const headers: Record<string, string> =
    options.padding === false ? {} : { 'Add-Padding': 'true' };
  const init = options.signal === undefined ? { headers } : { headers, signal: options.signal };
  const response = await doFetch(`${options.endpoint ?? DEFAULT_ENDPOINT}${prefix}`, init);

  if (!response.ok) {
    throw new Error(`Breach check failed with status ${response.status}.`);
  }

  for (const line of (await response.text()).split(/\r?\n/)) {
    const [candidate, rawCount] = line.trim().split(':');

    if (candidate === suffix) {
      const count = Number.parseInt(rawCount ?? '0', 10);

      return { breached: count > 0, count: Number.isFinite(count) ? count : 0 };
    }
  }

  return { breached: false, count: 0 };
}
