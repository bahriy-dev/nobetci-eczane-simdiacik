import assert from 'node:assert/strict';
import test from 'node:test';
import { getPositionWithTimeoutRetry } from '../lib/geolocation';

const timeoutError = { code: 3, TIMEOUT: 3 } as GeolocationPositionError;
const deniedError = { code: 1, TIMEOUT: 3 } as GeolocationPositionError;
const position = { coords: { latitude: 41, longitude: 29, accuracy: 100 } } as GeolocationPosition;

test('retries once after a timeout and resolves when the retry succeeds', async () => {
  const options: PositionOptions[] = [];
  let calls = 0;
  let retries = 0;
  const geolocation = {
    getCurrentPosition(success: PositionCallback, failure?: PositionErrorCallback | null, option?: PositionOptions) {
      options.push(option ?? {});
      calls++;
      if (calls === 1) failure?.(timeoutError);
      else success(position);
    },
  } as unknown as Geolocation;

  assert.equal(await getPositionWithTimeoutRetry(geolocation, () => retries++), position);
  assert.equal(calls, 2);
  assert.equal(retries, 1);
  assert.equal(options[0].timeout, 15_000);
  assert.equal(options[1].maximumAge, 10 * 60 * 1000);
});

test('does not retry when the user denies location permission', async () => {
  let calls = 0;
  const geolocation = {
    getCurrentPosition(_success: PositionCallback, failure?: PositionErrorCallback | null) {
      calls++;
      failure?.(deniedError);
    },
  } as unknown as Geolocation;

  await assert.rejects(getPositionWithTimeoutRetry(geolocation), error => error === deniedError);
  assert.equal(calls, 1);
});
