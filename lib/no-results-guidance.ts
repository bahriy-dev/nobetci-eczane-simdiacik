export type NoResultsRecovery = 'official' | 'refresh' | 'clear-and-expand' | 'expand-radius' | 'clear-filters';

export function noResultsRecovery(options: {unsupported: boolean; expired: boolean; hasFilters: boolean; radiusKm: number}): NoResultsRecovery {
  if (options.unsupported) return 'official';
  if (options.expired) return 'refresh';
  if (options.hasFilters) return options.radiusKm < 20 ? 'clear-and-expand' : 'clear-filters';
  return options.radiusKm < 20 ? 'expand-radius' : 'clear-filters';
}
