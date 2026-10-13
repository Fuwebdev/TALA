/**
 * textNormalization.ts
 * Normalization utility for detecting obfuscated and leetspeak profanities
 * while preserving the original input text for display.
 */

const LEET_MAP: Record<string, string> = {
  '@': 'a',
  '4': 'a',
  '8': 'b',
  '3': 'e',
  '1': 'i',
  '!': 'i',
  '|': 'i',
  '0': 'o',
  '5': 's',
  '$': 's',
  '7': 't',
  '+': 't',
  'v': 'u',
};

export interface NormalizedVariant {
  original: string;
  normalized: string;
  collapsedRepeats: string;
  strippedSeparators: string;
}

export function normalizeTextForModeration(input: string): NormalizedVariant {
  if (!input) {
    return {
      original: '',
      normalized: '',
      collapsedRepeats: '',
      strippedSeparators: '',
    };
  }

  // 1. Unicode decomposition & strip combining marks
  let text = input.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');

  // 2. Strip zero-width spaces, soft hyphens, and invisible formatting characters
  text = text.replace(/[\u200B-\u200D\uFEFF\u00AD]/g, '');

  // 3. Lowercase
  text = text.toLowerCase();

  // 4. Leetspeak substitution: map obfuscations to standard alphabet
  let leetSubstituted = '';
  for (const char of text) {
    if (LEET_MAP[char]) {
      leetSubstituted += LEET_MAP[char];
    } else if (char === '*' || char === '_' || char === '.') {
      // Treat asterisks or dots used inside words as wildcards/letters
      leetSubstituted += char;
    } else {
      leetSubstituted += char;
    }
  }

  // 5. Collapse consecutive repeats (3 or more -> 1 or 2, e.g. "puuuutaaaa" -> "puta", "fuuuuck" -> "fuck")
  const collapsed = leetSubstituted.replace(/(.)\1{2,}/g, '$1$1');
  const fullyCollapsed = leetSubstituted.replace(/(.)\1+/g, '$1');

  // 6. Strip internal spaces / separators (e.g. "p u t a" or "f.u.c.k" or "y * w a")
  const strippedSeparators = leetSubstituted.replace(/[\s\-_.*]+/g, '');

  return {
    original: input,
    normalized: leetSubstituted,
    collapsedRepeats: fullyCollapsed,
    strippedSeparators,
  };
}
