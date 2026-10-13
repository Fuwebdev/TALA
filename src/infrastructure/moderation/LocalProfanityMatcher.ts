/**
 * LocalProfanityMatcher.ts
 * Word-boundary-aware, whitelist-protected local profanity matcher
 * for instant, zero-latency detection of prohibited terms.
 */

import { PROFANITY_DICTIONARY, PROFANITY_WHITELIST, ProfanityEntry } from './ProfanityDictionary';
import { normalizeTextForModeration, NormalizedVariant } from './textNormalization';

export interface LocalMatchResult {
  isMatched: boolean;
  entry?: ProfanityEntry;
  matchedWord?: string;
  isObfuscated?: boolean;
}

export class LocalProfanityMatcher {
  /**
   * Tests if an isolated word is whitelisted.
   */
  public static isWhitelisted(word: string): boolean {
    const clean = word.toLowerCase().trim();
    return PROFANITY_WHITELIST.has(clean);
  }

  /**
   * Evaluates text for profanity across original, leetspeak, collapsed, and stripped variants.
   */
  public static match(text: string): LocalMatchResult {
    if (!text || text.trim().length === 0) {
      return { isMatched: false };
    }

    const variants: NormalizedVariant = normalizeTextForModeration(text);
    const textVariants = [
      variants.original.toLowerCase(),
      variants.normalized,
      variants.collapsedRepeats,
    ];

    // 1. Check direct dictionary matches
    for (const entry of PROFANITY_DICTIONARY) {
      const term = entry.term.toLowerCase();

      // Multi-word phrase check (e.g. "putang ina", "son of a bitch", "hayop ka", "pesteng yawa")
      if (term.includes(' ')) {
        const escapedPhrase = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
        const phraseRegex = new RegExp(`(^|\\b|\\s)${escapedPhrase}(\\b|\\s|$)`, 'i');

        for (const variant of textVariants) {
          if (phraseRegex.test(variant)) {
            return {
              isMatched: true,
              entry,
              matchedWord: term,
            };
          }
        }
      } else {
        // Single word boundary check
        // Protect against wildcard/asterisk substitutions like p*ta, y*wa, sh*t, f*ck
        const patternWithWildcards = term.split('').map((char) => (char === 'a' || char === 'e' || char === 'i' || char === 'o' || char === 'u' ? `[${char}*@!]` : char)).join('[\\s._*-]*');
        const wordRegex = new RegExp(`(^|[^a-zA-Z0-9])(${term}|${patternWithWildcards})([^a-zA-Z0-9]|$)`, 'i');

        for (const variant of textVariants) {
          const match = variant.match(wordRegex);
          if (match && match[2]) {
            const matchedToken = match[2].trim().toLowerCase();
            // Verify token is not in whitelist
            if (!this.isWhitelisted(matchedToken)) {
              return {
                isMatched: true,
                entry,
                matchedWord: matchedToken,
              };
            }
          }
        }
      }
    }

    // 2. Check stripped separators for spaced-out / punctuation-evaded profanity (e.g., "p u t a", "f.u.c.k", "y*wa")
    const stripped = variants.strippedSeparators;
    for (const entry of PROFANITY_DICTIONARY) {
      const term = entry.term.replace(/\s+/g, '');
      if (term.length >= 3 && stripped.includes(term)) {
        // Double-check whitelist
        let isWhitelistedSub = false;
        for (const whitelisted of PROFANITY_WHITELIST) {
          if (stripped.includes(whitelisted)) {
            isWhitelistedSub = true;
            break;
          }
        }
        if (!isWhitelistedSub) {
          return {
            isMatched: true,
            entry,
            matchedWord: entry.term,
            isObfuscated: true,
          };
        }
      }
    }

    return { isMatched: false };
  }
}
