export type AnalyticsChoice = 'essential' | 'analytics';

export const analyticsConsentKey = 'simdiacik-analytics-consent-v1';

export function readAnalyticsChoice(storage: Pick<Storage, 'getItem'>): AnalyticsChoice | null {
  const value = storage.getItem(analyticsConsentKey);
  return value === 'essential' || value === 'analytics' ? value : null;
}

export function saveAnalyticsChoice(storage: Pick<Storage, 'setItem'>, choice: AnalyticsChoice): void {
  storage.setItem(analyticsConsentKey, choice);
}
