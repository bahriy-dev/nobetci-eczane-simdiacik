import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fetchJsonWithRetry} from '../lib/retry-fetch';
test('recovers from a transient provider error without stale data',async()=>{let calls=0;const fetcher=(async()=>{calls++;return calls===1?Response.json({error:'temporary'},{status:502}):Response.json({places:[{id:'fresh'}]});}) as typeof fetch;const result=await fetchJsonWithRetry<{places:{id:string}[]}>('/api/places',new AbortController().signal,{fetcher,delayMs:0});assert.equal(calls,2);assert.equal(result.places[0].id,'fresh');});
test('does not retry denied access',async()=>{let calls=0;const fetcher=(async()=>{calls++;return Response.json({error:'denied'},{status:403});}) as typeof fetch;await assert.rejects(fetchJsonWithRetry('/api/places',new AbortController().signal,{fetcher,delayMs:0}),/denied/);assert.equal(calls,1);});
test('stops after bounded retries and respects cancellation',async()=>{let calls=0;const fetcher=(async()=>{calls++;return Response.json({error:'unavailable'},{status:503});}) as typeof fetch;await assert.rejects(fetchJsonWithRetry('/api/places',new AbortController().signal,{fetcher,delayMs:0}),/unavailable/);assert.equal(calls,2);const controller=new AbortController();controller.abort();await assert.rejects(fetchJsonWithRetry('/api/places',controller.signal,{fetcher,delayMs:0}));assert.equal(calls,2);});


test('retries transient proxy HTML and empty error bodies', async () => {
  for (const body of ['<html>Bad gateway</html>', '']) {
    let calls = 0;
    const fetcher = (async () => ++calls === 1
      ? new Response(body, {status: 502})
      : Response.json({places: [{id: 'fresh'}]})) as typeof fetch;
    const result = await fetchJsonWithRetry<{places: {id: string}[]}>(
      '/api/places', new AbortController().signal, {fetcher, delayMs: 0});
    assert.equal(calls, 2);
    assert.equal(result.places[0].id, 'fresh');
  }
});
test('null JSON error preserves HTTP retry semantics', async () => {
  let calls = 0;
  const fetcher = (async () => { calls++; return Response.json(null, {status: 403}); }) as typeof fetch;
  await assert.rejects(fetchJsonWithRetry('/api/places', new AbortController().signal,
    {fetcher, delayMs: 0}), /Güncel listeye ulaşılamadı/);
  assert.equal(calls, 1);
});
test('invalid successful JSON is rejected rather than returned as fresh data', async () => {
  let calls = 0;
  const fetcher = (async () => { calls++; return new Response('<html>invalid</html>'); }) as typeof fetch;
  await assert.rejects(fetchJsonWithRetry('/api/places', new AbortController().signal,
    {fetcher, delayMs: 0}), SyntaxError);
  assert.equal(calls, 1);
});

test('HTTP-date Retry-After waits before retrying and remains cancellable', async () => {
  let calls = 0;
  const controller = new AbortController();
  const fetcher = (async () => {
    calls++;
    return Response.json({error:'busy'}, {status:429, headers:{
      'Retry-After': new Date(Date.now() + 10_000).toUTCString(),
    }});
  }) as typeof fetch;
  const timer = setTimeout(() => controller.abort(), 30);
  try {
    await assert.rejects(fetchJsonWithRetry('/api/places', controller.signal,
      {fetcher, delayMs:0}), {name:'AbortError'});
    assert.equal(calls,1);
  } finally {clearTimeout(timer);}
});
