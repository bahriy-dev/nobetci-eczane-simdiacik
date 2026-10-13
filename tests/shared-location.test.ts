import test from 'node:test';
import assert from 'node:assert/strict';
import {parseSharedCoordinates} from '../lib/shared-location';

test('parses valid Turkish pharmacy-search links',()=>{
  assert.deepEqual(parseSharedCoordinates('?lat=40.99&lng=29.02'),{lat:40.99,lng:29.02});
});

test('rejects missing, malformed and out-of-country coordinates',()=>{
  for(const search of ['', '?lat=NaN&lng=29', '?lat=40', '?lat=10&lng=20'])assert.equal(parseSharedCoordinates(search),null);
});
