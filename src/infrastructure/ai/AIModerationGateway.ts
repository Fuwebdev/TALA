export interface AIModerationResult {
  toxicityScore: number; // 0.0 to 1.0
  spamScore: number;
  piiDetected: boolean;
  environmentalCategory?: 'Flood' | 'Waste' | 'Water' | 'Heat' | 'Air Quality' | 'Community Cleanup';
  suggestedFlag: boolean;
  confidence: number;
}

export class AIModerationGateway {
  async analyzeThoughtText(text: string): Promise<AIModerationResult> {
    // Simulated AI analysis engine with heuristic fallback
    const lower = text.toLowerCase();
    
    let envCat: AIModerationResult['environmentalCategory'];
    if (lower.includes('flood') || lower.includes('baha') || lower.includes('tide')) {
      envCat = 'Flood';
    } else if (lower.includes('plastic') || lower.includes('trash') || lower.includes('debris') || lower.includes('basura')) {
      envCat = 'Waste';
    } else if (lower.includes('water') || lower.includes('tubig')) {
      envCat = 'Water';
    } else if (lower.includes('heat') || lower.includes('mainit')) {
      envCat = 'Heat';
    }

    const piiDetected = /09\d{9}/.test(text);

    return {
      toxicityScore: 0.02,
      spamScore: piiDetected ? 0.85 : 0.05,
      piiDetected,
      environmentalCategory: envCat,
      suggestedFlag: piiDetected,
      confidence: 0.94,
    };
  }
}
