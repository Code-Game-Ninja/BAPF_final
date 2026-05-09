/**
 * lib/renewals/riskScore.ts
 * Renewal Risk Score calculation algorithm.
 *
 * Score components:
 *   - Days until expiry: ≤7 → +40, ≤30 → +25, ≤60 → +10
 *   - Overdue premiums: × 15 per overdue (max 30)
 *   - No contact in 30 days: +20
 *   - Previous renewal lost: +10
 *
 * Result is clamped to [0, 100].
 */

export interface RiskScoreParams {
  daysUntilExpiry: number;
  overduePremiuCount: number;
  lastContactDaysAgo: number | null; // null = never contacted
  previousRenewalLost: boolean;
}

/**
 * Calculate the renewal risk score for a policy.
 * Returns a number between 0 and 100 (inclusive).
 */
export function calculateRiskScore(params: RiskScoreParams): number {
  const { daysUntilExpiry, overduePremiuCount, lastContactDaysAgo, previousRenewalLost } = params;

  let score = 0;

  // Days until expiry scoring
  if (daysUntilExpiry <= 7) {
    score += 40;
  } else if (daysUntilExpiry <= 30) {
    score += 25;
  } else if (daysUntilExpiry <= 60) {
    score += 10;
  }

  // Overdue premium scoring (15 per overdue, max 30)
  const overdueScore = Math.min(overduePremiuCount * 15, 30);
  score += overdueScore;

  // Last contact scoring (no contact in 30+ days or never contacted)
  if (lastContactDaysAgo === null || lastContactDaysAgo >= 30) {
    score += 20;
  }

  // Previous renewal lost scoring
  if (previousRenewalLost) {
    score += 10;
  }

  // Clamp to [0, 100]
  return Math.max(0, Math.min(100, score));
}
