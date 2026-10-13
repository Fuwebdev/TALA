/**
 * api/moderate.ts
 * Production Vercel Serverless Function & reusable API handler for content moderation.
 * Endpoint: POST /api/moderate
 */

import { LocalProfanityMatcher } from '../src/infrastructure/moderation/LocalProfanityMatcher';
import { OpenRouterModerationService } from '../src/infrastructure/moderation/OpenRouterModerationService';

export interface ModerateRequestBody {
  text: string;
}

export interface ModerateResponseBody {
  allowed: boolean;
  decision: 'ALLOW' | 'BLOCK' | 'REVIEW';
  category: string;
  message: string;
  matched_language?: string;
  reason?: string;
}

export async function processModerationRequest(text: unknown): Promise<{
  status: number;
  body: ModerateResponseBody | { error: string };
}> {
  // 1. Input Validation
  if (typeof text !== 'string') {
    return {
      status: 400,
      body: { error: 'Invalid input: "text" field must be a string.' },
    };
  }

  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return {
      status: 400,
      body: { error: 'Invalid input: "text" cannot be empty.' },
    };
  }

  if (trimmed.length > 500) {
    return {
      status: 400,
      body: { error: 'Invalid input: text exceeds maximum length of 500 characters.' },
    };
  }

  // 2. Layer 1 & Layer 2: Fast Local Normalization and Profanity Matcher
  const localMatch = LocalProfanityMatcher.match(trimmed);
  if (localMatch.isMatched && localMatch.entry) {
    return {
      status: 200,
      body: {
        allowed: false,
        decision: 'BLOCK',
        category: localMatch.entry.category,
        message: 'Your message contains inappropriate language. Please remove offensive words and try again.',
        matched_language: localMatch.entry.language,
        reason: `Matched prohibited term: ${localMatch.matchedWord}`,
      },
    };
  }

  // 3. Layer 3: OpenRouter AI Classification
  const openRouter = new OpenRouterModerationService();

  if (openRouter.isConfigured()) {
    try {
      const aiResult = await openRouter.classifyText(trimmed);

      if (aiResult.decision === 'BLOCK') {
        return {
          status: 200,
          body: {
            allowed: false,
            decision: 'BLOCK',
            category: aiResult.category,
            message: 'Your message contains inappropriate language. Please remove offensive words and try again.',
            matched_language: aiResult.matched_language,
            reason: aiResult.reason,
          },
        };
      }

      if (aiResult.decision === 'ALLOW') {
        return {
          status: 200,
          body: {
            allowed: true,
            decision: 'ALLOW',
            category: 'none',
            message: 'Your message is acceptable.',
          },
        };
      }

      // Review case: fail-safe policy
      return {
        status: 200,
        body: {
          allowed: true,
          decision: 'REVIEW',
          category: aiResult.category,
          message: 'Your message is acceptable.',
          reason: aiResult.reason,
        },
      };
    } catch (aiError: any) {
      console.warn('[Moderation API] OpenRouter call failed, falling back to local result:', aiError.message);
      // Fallback: If AI fails but local check passed, allow with local guarantee
    }
  }

  // 4. Default Allow when all checks pass
  return {
    status: 200,
    body: {
      allowed: true,
      decision: 'ALLOW',
      category: 'none',
      message: 'Your message is acceptable.',
    },
  };
}

// Vercel Serverless Handler
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    const text = req.body?.text;
    const result = await processModerationRequest(text);
    return res.status(result.status).json(result.body);
  } catch (error: any) {
    console.error('[Moderation API] Server error:', error?.message);
    return res.status(500).json({ error: 'Internal server error processing moderation request.' });
  }
}
