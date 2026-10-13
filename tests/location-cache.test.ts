import test from 'node:test';
import assert from 'node:assert/strict';
import {clearLocationCache,LOCATION_CACHE_MAX_AGE,readLocationCache,writeLocationCache} from '../lib/location-cache';

function createStorage(){
  const values=new Map<string,string>();
  return {getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>{values.set(key,value);},removeItem:(key:string)=>{values.delete(key);}};
}

const sample={label:'Kadıköy, İstanbul',city:'İstanbul',lat:40.99,lng:29.02};
const preciseSample={...sample,accuracy:140};

test('returns a saved location while browser permission remains valid',()=>{
  const storage=createStorage(),now=1_800_000_000_000;
  writeLocationCache(sample,storage,now);
  assert.deepEqual(readLocationCache(storage,now+1000),sample);
});

test('preserves optional GPS accuracy for the approximate-location hint',()=>{
  const storage=createStorage(),now=1_800_000_000_000;
  writeLocationCache(preciseSample,storage,now);
  assert.deepEqual(readLocationCache(storage,now+1000),preciseSample);
});

test('expires and removes stale or malformed location data',()=>{
  const storage=createStorage(),now=1_800_000_000_000;
  writeLocationCache(sample,storage,now);
  assert.equal(readLocationCache(storage,now+LOCATION_CACHE_MAX_AGE+1),null);
  storage.setItem('simdiacik-location-v1','not-json');
  assert.equal(readLocationCache(storage,now),null);
});

test('clears cached coordinates when the browser permission is denied',()=>{
  const storage=createStorage();
  writeLocationCache(sample,storage);
  clearLocationCache(storage);
  assert.equal(readLocationCache(storage),null);
});
