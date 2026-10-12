import {z} from 'zod';

export type RegionDTO = {
  id: number;
  name: string;
  lat?: number;
  lng?: number;
  provinceId?: number;
};
export type ProvinceDTO = RegionDTO & {lat: number; lng: number};
export type DistrictDTO = RegionDTO & {provinceId: number};
export type RegionsResult = {
  regions: RegionDTO[];
  kind: 'provinces' | 'districts';
  source: 'TürkiyeAPI';
  datasetVersion: string;
  lastUpdated: string;
  provinceId?: number;
};

const provinceIdSchema = z.number().int().min(1).max(81);
const provinceSchema = z.object({
  id: provinceIdSchema,
  name: z.string().trim().min(1),
  coordinates: z.object({
    latitude: z.number().finite().min(35).max(43),
    longitude: z.number().finite().min(25).max(45),
  }),
});
const districtSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().trim().min(1),
  provinceId: provinceIdSchema,
});
const metadataSchema = z.object({
  count: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
  limit: z.number().int().positive(),
  offset: z.number().int().nonnegative(),
  datasetVersion: z.string().min(1),
  lastUpdated: z.string().min(1),
});
const provinceResponseSchema = z.object({data: z.array(provinceSchema), meta: metadataSchema});
const districtResponseSchema = z.object({data: z.array(districtSchema), meta: metadataSchema});

export class RegionsError extends Error {
  constructor(public readonly reason: 'request' | 'unavailable' | 'response') {
    super(reason === 'request'
      ? 'Geçerli bir il seç.'
      : reason === 'response'
        ? 'İl ve ilçe kaynağı geçerli ve eksiksiz veri döndürmedi. Lütfen tekrar dene.'
        : 'İl ve ilçe listesine şu an ulaşılamıyor. Lütfen tekrar dene.');
    this.name = 'RegionsError';
  }
}

function requireCompleteList(value: {
  data: {id: number}[];
  meta: z.infer<typeof metadataSchema>;
}) {
  const {data, meta} = value;
  if (!data.length || meta.offset !== 0 || meta.count !== data.length || meta.total !== data.length
    || new Set(data.map(region => region.id)).size !== data.length) {
    throw new RegionsError('response');
  }
}

function copyResult(value: RegionsResult): RegionsResult {
  return {...value, regions: value.regions.map(region => ({...region}))};
}

// Only completed responses are shared between requests. A pending fetch remains
// in its originating request, which is required by the Workers execution model.
export function createRegionsClient(fetcher: typeof fetch = fetch, now: () => number = Date.now) {
  const cache = new Map<string, {value: RegionsResult; expires: number}>();
  const ttl = 5 * 60_000;
  const maximumEntries = 82; // One province list and at most 81 district lists.

  return {
    async list(provinceId?: number): Promise<RegionsResult> {
      if (provinceId !== undefined && !provinceIdSchema.safeParse(provinceId).success) {
        throw new RegionsError('request');
      }
      const key = provinceId === undefined ? 'provinces' : `districts:${provinceId}`;
      const timestamp = now();
      const cached = cache.get(key);
      if (cached && cached.expires > timestamp) return copyResult(cached.value);
      for (const [cacheKey, entry] of cache) {
        if (entry.expires <= timestamp) cache.delete(cacheKey);
      }

      const url = new URL(provinceId === undefined
        ? 'https://api.turkiyeapi.dev/v2/provinces'
        : `https://api.turkiyeapi.dev/v2/provinces/${provinceId}/districts`);
      url.searchParams.set('fields', provinceId === undefined ? 'id,name,coordinates' : 'id,name,provinceId');
      url.searchParams.set('limit', provinceId === undefined ? '81' : '1000');
      let response: Response;
      try {
        response = await fetcher(url, {
          headers: {Accept: 'application/json'},
          cache: 'no-store',
          signal: AbortSignal.timeout(10_000),
        });
      } catch {
        throw new RegionsError('unavailable');
      }
      if (!response.ok) throw new RegionsError('unavailable');
      let body: unknown;
      try {
        body = await response.json();
      } catch {
        throw new RegionsError('response');
      }

      let result: RegionsResult;
      if (provinceId === undefined) {
        const parsed = provinceResponseSchema.safeParse(body);
        if (!parsed.success) throw new RegionsError('response');
        requireCompleteList(parsed.data);
        if (parsed.data.data.length !== 81) throw new RegionsError('response');
        const regions: ProvinceDTO[] = parsed.data.data.map(region => ({
          id: region.id,
          name: region.name,
          lat: region.coordinates.latitude,
          lng: region.coordinates.longitude,
        }));
        result = {regions, kind: 'provinces', source: 'TürkiyeAPI',
          datasetVersion: parsed.data.meta.datasetVersion, lastUpdated: parsed.data.meta.lastUpdated};
      } else {
        const parsed = districtResponseSchema.safeParse(body);
        if (!parsed.success) throw new RegionsError('response');
        requireCompleteList(parsed.data);
        if (parsed.data.data.some(region => region.provinceId !== provinceId)) throw new RegionsError('response');
        const regions: DistrictDTO[] = parsed.data.data.map(region => ({
          id: region.id, name: region.name, provinceId: region.provinceId,
        }));
        result = {regions, kind: 'districts', provinceId, source: 'TürkiyeAPI',
          datasetVersion: parsed.data.meta.datasetVersion, lastUpdated: parsed.data.meta.lastUpdated};
      }
      if (cache.size >= maximumEntries) cache.delete(cache.keys().next().value!);
      cache.set(key, {value: result, expires: now() + ttl});
      return copyResult(result);
    },
  };
}

const client = createRegionsClient();
export const listRegions = (provinceId?: number) => client.list(provinceId);
