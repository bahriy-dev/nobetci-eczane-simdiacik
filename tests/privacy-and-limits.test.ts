import test from 'node:test';
import assert from 'node:assert/strict';
import {analyticsConsentKey,readAnalyticsChoice,saveAnalyticsChoice} from '../lib/analytics-consent';
import {createRequestRateLimiter,rateLimitResponse,requestRateLimitKey} from '../lib/request-rate-limit';
import {GET as placesGET} from '../app/api/places/route';

test('analytics choice is explicit, allowlisted and persistent only in local storage',()=>{
  const values=new Map<string,string>();
  const storage={getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>{values.set(key,value);}};
  assert.equal(readAnalyticsChoice(storage),null);
  saveAnalyticsChoice(storage,'essential');
  assert.equal(readAnalyticsChoice(storage),'essential');
  saveAnalyticsChoice(storage,'analytics');
  assert.equal(readAnalyticsChoice(storage),'analytics');
  values.set(analyticsConsentKey,'anything-else');
  assert.equal(readAnalyticsChoice(storage),null);
});

test('process-local request limiter returns bounded retry and resets its window',()=>{
  let now=10_000;
  const limit=createRequestRateLimiter({limit:2,windowMs:5_000,maxKeys:2,now:()=>now});
  assert.equal(limit('client-a').allowed,true);
  assert.equal(limit('client-a').allowed,true);
  assert.deepEqual(limit('client-a'),{allowed:false,retryAfterSeconds:5});
  now+=5_001;
  assert.equal(limit('client-a').allowed,true);
  assert.equal(rateLimitResponse(3).headers.get('Retry-After'),'3');
});

test('client key uses the trusted proxy address at the end of the forwarding chain',()=>{
  assert.equal(requestRateLimitKey(new Request('https://example.test',{headers:{'x-forwarded-for':'attacker-value, 192.0.2.10'}})),'192.0.2.10');
  assert.equal(requestRateLimitKey(new Request('https://example.test',{headers:{'cf-connecting-ip':'192.0.2.11','x-forwarded-for':'192.0.2.10'}})),'192.0.2.10');
  assert.equal(requestRateLimitKey(new Request('https://example.test',{headers:{'x-real-ip':'192.0.2.12'}})),'192.0.2.12');
  assert.equal(requestRateLimitKey(new Request('https://example.test')),'unknown');
});

test('public pharmacy API applies the per-client burst limit before querying its provider',async()=>{
  const query='lat=41&lng=29&radius=1&city=Rate%20limit%20test';
  let last:Response|undefined;
  for(let i=0;i<61;i++)last=await placesGET(new Request('https://example.test/api/places?'+query,{headers:{'x-forwarded-for':'192.0.2.101'}}));
  assert.equal(last?.status,429);
  assert.equal(last?.headers.get('Retry-After')!==null,true);
});
