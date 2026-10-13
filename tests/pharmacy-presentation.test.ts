import test from 'node:test';
import assert from 'node:assert/strict';
import {pharmacyDutyDate,pharmacyTimestamp,pharmacyMapLink,pharmacyDirections,pharmacyAppleDirections,pharmacyPhoneLink} from '../lib/pharmacy-presentation';
test('duty dates stay source calendar dates without being replaced by query timestamps',()=>{
 assert.equal(pharmacyDutyDate('2026-10-06'),'06.10.2026');
 assert.equal(pharmacyDutyDate(undefined),undefined);
 assert.equal(pharmacyDutyDate('2026-02-30'),undefined);
 assert.equal(pharmacyDutyDate('2026-10-06T21:00:00Z'),undefined);
 assert.match(pharmacyTimestamp('2026-10-06T21:15:00Z'),/07\.10\.2026.*00:15/);
});
test('sharing points to the selected pharmacy rather than a province duty list',()=>{
 const p={lat:40.9875,lng:29.0278};
 const share=new URL(pharmacyMapLink(p));
 assert.equal(share.searchParams.get('query'),'40.9875,29.0278');
 assert.equal(share.pathname,'/maps/search/');
 assert.equal(new URL(pharmacyDirections(p)).searchParams.get('destination'),'40.9875,29.0278');
 assert.equal(new URL(pharmacyAppleDirections(p)).searchParams.get('daddr'),'40.9875,29.0278');
 assert.equal(pharmacyPhoneLink('0216 565 64 41'),'tel:02165656441');
});
