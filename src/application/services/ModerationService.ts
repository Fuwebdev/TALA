/**
 * ModerationService.ts
 * Application-level content moderation service combining local regex/normalization
 * with the OpenRouter AI moderation endpoint (/api/moderate).
 */

import { LocalProfanityMatcher } from '../../infrastructure/moderation/LocalProfanityMatcher';

export interface ModerationEvaluationResult {
  allowed: boolean;
  decision: 'ALLOW' | 'BLOCK' | 'REVIEW';
  category: string;
  message: string;
  matchedLanguage?: string;
  reason?: string;
}

export interface AutomatedSafetyCheckResult {
  isFlagged: boolean;
  suggestedAction: 'none' | 'flag' | 'block';
  flaggedKeywords: string[];
}

export class ModerationService {
  private static SPAM_PATTERNS = [
    /09\d{9}/, // PH Mobile phone numbers
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/, // Email addresses
    /student\s*id/i,
    /gcash/i,
  ];

  /**
   * Evaluates text for profanity, insults, vulgarity, and abuse.
   * Calls /api/moderate with instant fallback to LocalProfanityMatcher.
   */
  public static async evaluateText(text: string): Promise<ModerationEvaluationResult> {
    if (!text || text.trim().length === 0) {
      return {
        allowed: false,
        decision: 'BLOCK',
        category: 'empty',
        message: 'Content cannot be empty.',
      };
    }

    const trimmed = text.trim();

    // 1. Fast Client-Side Pre-Check: Local Profanity Matcher
    const localMatch = LocalProfanityMatcher.match(trimmed);
    if (localMatch.isMatched && localMatch.entry) {
      return {
        allowed: false,
        decision: 'BLOCK',
        category: localMatch.entry.category,
        message: 'Your message contains inappropriate language. Please remove offensive words and try again.',
        matchedLanguage: localMatch.entry.language,
        reason: `Matched prohibited term: ${localMatch.matchedWord}`,
      };
    }

    // 2. Check PII / Spam patterns
    const piiCheck = this.evaluateThoughtContent(trimmed);
    if (piiCheck.isFlagged) {
      return {
        allowed: false,
        decision: 'BLOCK',
        category: 'harassment',
        message: 'Your message contains sensitive personal information or phone numbers. Please remove it.',
        reason: piiCheck.flaggedKeywords.join(', '),
      };
    }

    // 3. Call Server Moderation API (/api/moderate) for OpenRouter AI semantic classification
    try {
      const res = await fetch('/api/moderate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: trimmed }),
      });

      if (res.ok) {
        const data = await res.json();
        return {
          allowed: Boolean(data.allowed),
          decision: data.decision || (data.allowed ? 'ALLOW' : 'BLOCK'),
          category: data.category || 'none',
          message:
            data.message ||
            (data.allowed
              ? 'Your message is acceptable.'
              : 'Your message contains inappropriate language. Please remove offensive words and try again.'),
          matchedLanguage: data.matched_language,
          reason: data.reason,
        };
      }
    } catch (networkErr) {
      console.warn('[ModerationService] /api/moderate network unreachable, using local validation:', networkErr);
    }

    // Fallback: If network is unreachable and local check passed, allow content
    return {
      allowed: true,
      decision: 'ALLOW',
      category: 'none',
      message: 'Your message is acceptable.',
    };
  }

  /**
   * Backward-compatible PII and spam pattern check.
   */
  public static evaluateThoughtContent(body: string): AutomatedSafetyCheckResult {
    const flaggedKeywords: string[] = [];

    for (const pattern of this.SPAM_PATTERNS) {
      if (pattern.test(body)) {
        flaggedKeywords.push('PII/Contact Info Detected');
      }
    }

    if (flaggedKeywords.length > 0) {
      return {
        isFlagged: true,
        suggestedAction: 'flag',
        flaggedKeywords,
      };
    }

    return {
      isFlagged: false,
      suggestedAction: 'none',
      flaggedKeywords: [],
    };
  }
}
