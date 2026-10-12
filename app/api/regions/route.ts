import {z} from 'zod';
import {listRegions, RegionsError} from '@/lib/regions';

const querySchema = z.object({
  provinceId: z.string().regex(/^[1-9]\d?$/).transform(Number).refine(value => value <= 81).optional(),
}).strict();

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const parsed = querySchema.safeParse(Object.fromEntries(params));
  if (!parsed.success || params.getAll('provinceId').length > 1) {
    return Response.json({error: 'Geçerli bir il seç.'}, {status: 400});
  }
  try {
    const result = await listRegions(parsed.data.provinceId);
    return Response.json(result, {headers: {'Cache-Control': 'public, max-age=300'}});
  } catch (error) {
    const known = error instanceof RegionsError;
    return Response.json({error: known ? error.message : 'İl ve ilçe listesine şu an ulaşılamıyor. Lütfen tekrar dene.'}, {
      status: known && error.reason === 'request' ? 400 : 502,
      headers: {'Cache-Control': 'no-store'},
    });
  }
}
