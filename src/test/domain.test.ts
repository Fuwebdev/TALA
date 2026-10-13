import { createAnonymousAlias } from '../domain/entities/Alias';
import { formatLocationName } from '../domain/entities/Location';
import { ModerationService } from '../application/services/ModerationService';

// Lightweight automated domain test runner for CI/CD checks
export function runDomainVerificationTests(): { passed: boolean; log: string[] } {
  const log: string[] = [];
  let passed = true;

  try {
    // 1. Test Alias Generation
    const alias = createAnonymousAlias();
    if (!alias.displayName || !alias.id) {
      throw new Error('Alias generation failed: missing fields');
    }
    log.push(`[PASS] Alias generated: ${alias.displayName}`);

    // 2. Test Location Formatting
    const formatted = formatLocationName({
      id: 'l-1',
      region: 'NCR',
      province: 'Metro Manila',
      cityMunicipality: 'Quezon City',
      coordinates: { lat: 14.67, lng: 121.04 },
    });
    if (formatted !== 'Quezon City, Metro Manila') {
      throw new Error(`Location format failed: expected "Quezon City, Metro Manila", got "${formatted}"`);
    }
    log.push(`[PASS] Location formatting: ${formatted}`);

    // 3. Test Moderation PII Filter
    const piiResult = ModerationService.evaluateThoughtContent('Call me at 09171234567 for info');
    if (!piiResult.isFlagged) {
      throw new Error('PII detection failed: mobile number was not flagged');
    }
    log.push(`[PASS] PII safety detection verified`);

  } catch (err: any) {
    passed = false;
    log.push(`[FAIL] ${err.message}`);
  }

  return { passed, log };
}
