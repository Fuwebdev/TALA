/**
 * api/appeal.ts
 * AI-driven suspension & device ban appeal reviewer using OpenRouter AI (openai/gpt-4o-mini).
 * Evaluates user ban appeals in real-time, judging sincerity, misunderstanding, or false positives,
 * and makes a structured ruling on whether to lift the suspension.
 */

interface BanAppealRequest {
  deviceFingerprint: string;
  strikeCount: number;
  banLevel: number;
  lockedUntilISO: string | null;
  appealReason: string;
  aliasName?: string;
  violationContext?: string;
}

export interface AIAppealResolution {
  decision: 'APPROVED' | 'DENIED';
  aiExplanation: string;
  confidenceScore: number;
  unlocked: boolean;
  newStrikeCount: number;
  reviewedAtISO: string;
}

const AI_APPEAL_SYSTEM_PROMPT = `You are Tala's Community Safety Appeals Officer.
Tala is an anonymous location-based community application in the Philippines.
A user whose device was temporarily suspended or permanently restricted for repeated profanity or abusive conduct has submitted an appeal to regain access.

Evaluate the submitted appeal carefully:
1. Examine if the appeal demonstrates sincere reflection, an honest explanation of context (e.g. false flag, unintended meaning in Filipino/Taglish/slang, sincere apology, or constructive intent).
2. If the user expresses genuine regret or a reasonable explanation, grant the appeal (APPROVED) to promote rehabilitation and community belonging.
3. If the user is unrepentant, hostile, trolling, abusive within the appeal itself, or shows zero willingness to respect guidelines, deny the appeal (DENIED).
4. Be compassionate, encouraging, and clear in your explanation.

Return ONLY valid JSON matching this schema:
{
  "decision": "APPROVED | DENIED",
  "aiExplanation": "A 2-3 sentence respectful response explaining why the appeal was approved or denied and guidelines to follow.",
  "confidenceScore": 0.95
}`;

export async function processAppealRequest(req: BanAppealRequest): Promise<{ status: number; body: any }> {
  const { deviceFingerprint, strikeCount, banLevel, appealReason, aliasName, violationContext } = req;

  if (!deviceFingerprint || !appealReason || !appealReason.trim()) {
    return {
      status: 400,
      body: { error: 'Device fingerprint and appeal reason are required' },
    };
  }

  const cleanAppeal = appealReason.trim();
  if (cleanAppeal.length < 10) {
    return {
      status: 400,
      body: { error: 'Please provide a more detailed appeal explanation (at least 10 characters).' },
    };
  }

  const apiKey = process.env.OPENROUTER_API_KEY || '';
  const model = process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini';

  // Fallback heuristic if OpenRouter key is not set
  if (!apiKey) {
    const isHostile = /fuck|puta|tangina|gago|bobo|trash|shit/i.test(cleanAppeal);
    const approved = !isHostile && cleanAppeal.length >= 25;

    const fallbackResolution: AIAppealResolution = {
      decision: approved ? 'APPROVED' : 'DENIED',
      aiExplanation: approved
        ? 'Your appeal has been reviewed and granted. We appreciate your clarification and commitment to maintaining a respectful environment on Tala. Your device access is restored.'
        : 'Your appeal could not be approved at this time. Please ensure your response adheres to our community safety standards and try again later.',
      confidenceScore: 0.85,
      unlocked: approved,
      newStrikeCount: approved ? Math.max(0, (strikeCount || 1) - 2) : strikeCount,
      reviewedAtISO: new Date().toISOString(),
    };

    return {
      status: 200,
      body: { success: true, resolution: fallbackResolution },
    };
  }

  const userPrompt = `
User Display Name: ${aliasName || 'Anonymous'}
Device Ban Level: ${banLevel}
Current Strikes: ${strikeCount}
Reason for Suspension: ${violationContext || 'Repeated profanity and community guidelines violations'}
User's Submitted Appeal:
"""${cleanAppeal.slice(0, 800)}"""
`;

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://tala-ph.app',
        'X-Title': 'Tala Community Appeal Review',
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [
          { role: 'system', content: AI_APPEAL_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenRouter returned status ${response.status}`);
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content || '{}';
    const parsed = JSON.parse(rawContent);

    const isApproved = parsed.decision === 'APPROVED';
    const resolution: AIAppealResolution = {
      decision: isApproved ? 'APPROVED' : 'DENIED',
      aiExplanation: parsed.aiExplanation || (isApproved ? 'Your appeal has been approved.' : 'Your appeal was denied.'),
      confidenceScore: typeof parsed.confidenceScore === 'number' ? parsed.confidenceScore : 0.9,
      unlocked: isApproved,
      newStrikeCount: isApproved ? 0 : strikeCount,
      reviewedAtISO: new Date().toISOString(),
    };

    return {
      status: 200,
      body: { success: true, resolution },
    };
  } catch (error: any) {
    console.error('[processAppealRequest] OpenRouter error:', error);

    // Graceful fallback on network/AI error
    const fallbackApproved = cleanAppeal.length >= 30;
    const fallback: AIAppealResolution = {
      decision: fallbackApproved ? 'APPROVED' : 'DENIED',
      aiExplanation: fallbackApproved
        ? 'Your appeal was processed by the automated safety desk. Your suspension has been provisionally lifted.'
        : 'Unable to verify appeal at this moment. Please try again with more details.',
      confidenceScore: 0.75,
      unlocked: fallbackApproved,
      newStrikeCount: fallbackApproved ? 0 : strikeCount,
      reviewedAtISO: new Date().toISOString(),
    };

    return {
      status: 200,
      body: { success: true, resolution: fallback },
    };
  }
}

// Vercel Serverless Function Handler
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const result = await processAppealRequest(req.body);
    return res.status(result.status).json(result.body);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Internal Appeal Processing Error' });
  }
}
