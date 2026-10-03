export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

const uniquePushSets = new WeakMap<string[], Set<string>>();

export function uniquePush(target: string[], value: string | undefined): void {
  if (value === undefined || value.length === 0) {
    return;
  }

  let seen = uniquePushSets.get(target);

  if (seen === undefined || seen.size !== target.length) {
    seen = new Set(target);
    uniquePushSets.set(target, seen);
  }

  if (!seen.has(value)) {
    seen.add(value);
    target.push(value);
  }
}

const CONFUSABLES: Readonly<Record<string, string>> = {
  а: 'a',
  в: 'b',
  е: 'e',
  к: 'k',
  м: 'm',
  н: 'h',
  о: 'o',
  р: 'p',
  с: 'c',
  т: 't',
  у: 'y',
  х: 'x',
  і: 'i',
  ј: 'j',
  ѕ: 's',
  α: 'a',
  ο: 'o',
  ρ: 'p',
  ν: 'v',
  ι: 'i',
  κ: 'k',
  τ: 't',
  υ: 'u',
  χ: 'x',
};

const LEET_REPLACEMENTS: Readonly<Record<string, string>> = {
  '!': 'i',
  '|': 'i',
  '@': 'a',
  $: 's',
  '+': 't',
  '(': 'c',
  '0': 'o',
  '1': 'i',
  '3': 'e',
  '4': 'a',
  '5': 's',
  '7': 't',
  '8': 'b',
  '9': 'g',
};

export function normalizeForComparison(value: string): string {
  const folded = value
    .normalize('NFKC')
    .replace(/[\u200B-\u200D\u2060\uFEFF]/g, '')
    .trim()
    .toLowerCase();

  return Array.from(folded, (char) => CONFUSABLES[char] ?? char).join('');
}

export function compactAlphanumeric(value: string): string {
  return normalizeForComparison(value).replace(/[^a-z0-9]/g, '');
}

export function toLeetComparable(value: string): string {
  return Array.from(normalizeForComparison(value), (char) => LEET_REPLACEMENTS[char] ?? char)
    .join('')
    .replace(/[^a-z0-9]/g, '');
}

export function uniqueNormalizedList(values: readonly string[]): string[] {
  const normalized = new Set<string>();

  for (const value of values) {
    if (typeof value !== 'string') {
      continue;
    }

    const item = normalizeForComparison(value);

    if (item.length > 0) {
      normalized.add(item);
    }
  }

  return [...normalized];
}

export function normalizePositiveInteger(value: number | undefined, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }

  const integer = Math.floor(value);

  return integer > 0 ? integer : fallback;
}

export function normalizeNonNegativeInteger(value: number | undefined, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(0, Math.floor(value));
}

export function normalizeOptionalPositiveInteger(value: number | undefined): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return undefined;
  }

  const integer = Math.floor(value);

  return integer > 0 ? integer : undefined;
}
