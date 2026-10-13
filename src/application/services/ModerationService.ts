import { ReportReason } from '../../domain/entities/Report';

export interface AutomatedSafetyCheckResult {
  isFlagged: boolean;
  suggestedAction: 'none' | 'flag' | 'block';
  flaggedKeywords: string[];
}

export class ModerationService {
  // Proactive safety filter keywords for PII & Threat detection
  private static SPAM_PATTERNS = [
    /09\d{9}/, // PH Mobile phone numbers
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/, // Email addresses
    /student\s*id/i,
    /gcash/i,
  ];

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
