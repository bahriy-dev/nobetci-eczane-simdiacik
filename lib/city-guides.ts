import {PHARMACY_CHAMBERS, getPharmacySource} from './pharmacy-sources';
import {normalized} from './places';

/**
 * One guide page per province. `live` is false where the official source is closed to data access
 * (the page then points to the official list); keep it in step with the providers.
 */
const officialOnly = new Set([5, 34, 77]); // Amasya, İstanbul, Yalova

export const cityGuides = [...PHARMACY_CHAMBERS]
  .sort((a, b) => a.province.localeCompare(b.province, 'tr'))
  .map(chamber => Object.freeze({
    id: chamber.provinceId,
    slug: normalized(chamber.province).replace(/[^a-z]/g, ''),
    name: chamber.province,
    live: !officialOnly.has(chamber.provinceId),
    source: getPharmacySource(chamber.province),
  }));

export type CityGuide = (typeof cityGuides)[number];

export function getCityGuide(slug: string) {
  return cityGuides.find(city => city.slug === slug);
}
