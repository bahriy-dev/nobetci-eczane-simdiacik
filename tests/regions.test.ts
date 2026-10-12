import test from 'node:test';
import assert from 'node:assert/strict';
import {createRegionsClient, RegionsError} from '../lib/regions';

const metadata = (count: number, limit = count) => ({
  count, total: count, limit, offset: 0, datasetVersion: 'fixture', lastUpdated: '2026-05-21',
});
const provincesFixture = () => ({
  data: Array.from({length: 81}, (_, index) => ({
    id: index + 1,
    name: index === 33 ? 'İstanbul' : `Province test fixture ${index + 1}`,
    coordinates: {latitude: 41.006381, longitude: 28.9758715},
    population: 1,
  })),
  meta: metadata(81),
});
const districtsFixture = (provinceId = 34) => ({
  data: [{id: 1421, name: 'Kadıköy', provinceId}, {id: 1708, name: 'Üsküdar', provinceId}],
  meta: metadata(2, 1000),
});
const isResponseError = (error: unknown) => error instanceof RegionsError && error.reason === 'response';

test('province lookup uses the public v2 API without credentials and maps center coordinates', async () => {
  const client = createRegionsClient(async (input, init) => {
    const url = new URL(String(input));
    assert.equal(url.origin, 'https://api.turkiyeapi.dev');
    assert.equal(url.pathname, '/v2/provinces');
    assert.equal(url.searchParams.get('fields'), 'id,name,coordinates');
    assert.equal(url.searchParams.get('limit'), '81');
    assert.equal(new Headers(init?.headers).get('authorization'), null);
    assert.equal(new Headers(init?.headers).get('x-api-key'), null);
    assert.ok(init?.signal);
    return Response.json(provincesFixture());
  });
  const result = await client.list();
  assert.equal(result.kind, 'provinces');
  assert.equal(result.regions.length, 81);
  assert.deepEqual(result.regions[33], {id: 34, name: 'İstanbul', lat: 41.006381, lng: 28.9758715});
  assert.equal('population' in result.regions[0], false);
  assert.equal(result.datasetVersion, 'fixture');
});

test('district lookup scopes the documented endpoint to the selected province and has no invented coordinates', async () => {
  const client = createRegionsClient(async input => {
    const url = new URL(String(input));
    assert.equal(url.pathname, '/v2/provinces/34/districts');
    assert.equal(url.searchParams.get('fields'), 'id,name,provinceId');
    assert.equal(url.searchParams.get('limit'), '1000');
    return Response.json(districtsFixture());
  });
  const result = await client.list(34);
  assert.equal(result.kind, 'districts');
  assert.equal(result.provinceId, 34);
  assert.deepEqual(result.regions[0], {id: 1421, name: 'Kadıköy', provinceId: 34});
  assert.equal('lat' in result.regions[0], false);
});

test('invalid province IDs are rejected before sending an upstream request', async () => {
  const client = createRegionsClient(async () => {throw new Error('Fetch should not run');});
  for (const id of [0, 82, -1, 3.4, NaN, Infinity]) {
    await assert.rejects(client.list(id), error => error instanceof RegionsError && error.reason === 'request');
  }
});

test('schema errors, missing coordinates and out-of-country coordinates fail clearly', async () => {
  const malformed = provincesFixture();
  const missingCoordinates = {data: [{id: 34, name: 'İstanbul'}], meta: metadata(1)};
  malformed.data[33].coordinates.latitude = 95;
  for (const body of [{status: 'OK', data: []}, missingCoordinates, malformed]) {
    const client = createRegionsClient(async () => Response.json(body));
    await assert.rejects(client.list(), isResponseError);
  }
  const invalidJson = createRegionsClient(async () => new Response('invalid JSON', {status: 200}));
  await assert.rejects(invalidJson.list(), isResponseError);
});

test('partial lists, duplicate IDs and district hierarchy mismatches cannot become selectable data', async () => {
  const partial = provincesFixture();
  partial.data.pop();
  partial.meta.count = 80;
  const duplicate = provincesFixture();
  duplicate.data[0].id = 34;
  for (const body of [partial, duplicate]) {
    const client = createRegionsClient(async () => Response.json(body));
    await assert.rejects(client.list(), isResponseError);
  }
  const wrongProvince = createRegionsClient(async () => Response.json(districtsFixture(6)));
  await assert.rejects(wrongProvince.list(34), isResponseError);
  const emptyDistricts = createRegionsClient(async () => Response.json({data: [], meta: metadata(0, 1000)}));
  await assert.rejects(emptyDistricts.list(34), isResponseError);
});

test('non-2xx and network failures do not return an empty list or enter the completed cache', async () => {
  let calls = 0;
  const client = createRegionsClient(async () => {
    calls++;
    return calls === 1 ? new Response('rate limited', {status: 429}) : Response.json(districtsFixture());
  });
  await assert.rejects(client.list(34), error => error instanceof RegionsError && error.reason === 'unavailable');
  assert.equal((await client.list(34)).regions.length, 2);
  assert.equal(calls, 2);
  const unavailable = createRegionsClient(async () => {throw new TypeError('network failed');});
  await assert.rejects(unavailable.list(), error => error instanceof RegionsError && error.reason === 'unavailable');
});

test('completed cache expires after five minutes and callers cannot mutate future results', async () => {
  let clock = 1;
  let calls = 0;
  const client = createRegionsClient(async () => {calls++; return Response.json(districtsFixture());}, () => clock);
  const first = await client.list(34);
  first.regions[0].name = 'Changed by caller';
  assert.equal((await client.list(34)).regions[0].name, 'Kadıköy');
  assert.equal(calls, 1);
  clock += 300_000;
  await client.list(34);
  assert.equal(calls, 2);
});

test('pending fetches remain request-local rather than being shared across concurrent requests', async () => {
  const pending: Array<(response: Response) => void> = [];
  const client = createRegionsClient(() => new Promise<Response>(resolve => pending.push(resolve)));
  const first = client.list(34);
  const second = client.list(34);
  assert.equal(pending.length, 2);
  for (const resolve of pending) resolve(Response.json(districtsFixture()));
  assert.equal((await first).regions.length, 2);
  assert.equal((await second).regions.length, 2);
});
