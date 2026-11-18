import {test} from 'node:test';
import assert from 'node:assert/strict';
import {claimNominatimSlot, claimNominatimSlotWithin, waitNominatimSlot} from '../lib/nominatim';
import {classifySourceFailure, httpFailure} from '../lib/source-request';
import {searchAnkaraPharmacies} from '../lib/providers/ankara';

test('a visitor lookup is served while background geocoding keeps the queue busy', async () => {
  claimNominatimSlot();
  // A long background run: every slot would otherwise go to these lookups.
  const background = Array.from({length: 3}, () => waitNominatimSlot(0));
  const started = Date.now();
  assert.equal(await claimNominatimSlotWithin(5000), true);
  assert.ok(Date.now() - started < 2500, 'the visitor waits at most about one slot');
  await Promise.all(background);
});

test('a visitor lookup gives up after its deadline and leaves the queue', async () => {
  claimNominatimSlot();
  const background = waitNominatimSlot(0);
  assert.equal(await claimNominatimSlotWithin(10), false);
  await background;
});

test('upstream HTTP failures keep their status and Retry-After', async () => {
  const limited = httpFailure(new Response('', {status: 429, headers: {'Retry-After': '120'}}));
  assert.equal(limited.kind, 'rate-limited');
  assert.equal(limited.status, 429);
  assert.equal(limited.retryAfter, 60);
  const original = globalThis.fetch;
  globalThis.fetch = (async () => new Response('', {status: 503})) as typeof fetch;
  try {
    const failure = await searchAnkaraPharmacies({lat: 39.92, lng: 32.85, radius: 5, category: 'Eczane', city: 'Ankara', query: '', demo: false}).then(
      () => assert.fail('a 503 must not produce a list'),
      classifySourceFailure,
    );
    assert.equal(failure.kind, 'upstream');
    assert.equal(failure.status, 503);
  } finally {
    globalThis.fetch = original;
  }
});
