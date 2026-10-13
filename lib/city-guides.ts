import {getPharmacySource} from './pharmacy-sources';

/** Province pages are limited to cities with a verified provider in the live search flow. */
export const cityGuides = [
  {id: 6, slug: 'ankara', name: 'Ankara'},
  {id: 27, slug: 'gaziantep', name: 'Gaziantep'},
  {id: 38, slug: 'kayseri', name: 'Kayseri'},
  {id: 42, slug: 'konya', name: 'Konya'},
  {id: 55, slug: 'samsun', name: 'Samsun'},
  {id: 57, slug: 'sinop', name: 'Sinop'},
  {id: 34, slug: 'istanbul', name: 'İstanbul'},
  {id: 35, slug: 'izmir', name: 'İzmir'},
  {id: 77, slug: 'yalova', name: 'Yalova'},
].map(city => Object.freeze({...city, source: getPharmacySource(city.name)}));

export type CityGuide = (typeof cityGuides)[number];

export function getCityGuide(slug: string) {
  return cityGuides.find(city => city.slug === slug);
}
