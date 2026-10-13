import assert from 'node:assert/strict';
import test from 'node:test';
import {noResultsRecovery} from '../lib/no-results-guidance';

test('unsupported provinces point to the official list first',()=>{
  assert.equal(noResultsRecovery({unsupported:true,expired:false,hasFilters:true,radiusKm:2}),'official');
});

test('expired duty data offers a fresh lookup before filter changes',()=>{
  assert.equal(noResultsRecovery({unsupported:false,expired:true,hasFilters:true,radiusKm:5}),'refresh');
});

test('no-match search keeps clear-filters available while offering a wider radius',()=>{
  assert.equal(noResultsRecovery({unsupported:false,expired:false,hasFilters:true,radiusKm:5}),'clear-and-expand');
  assert.equal(noResultsRecovery({unsupported:false,expired:false,hasFilters:true,radiusKm:20}),'clear-filters');
});

test('unfiltered searches widen to 20 km, then offer filter reset',()=>{
  assert.equal(noResultsRecovery({unsupported:false,expired:false,hasFilters:false,radiusKm:5}),'expand-radius');
  assert.equal(noResultsRecovery({unsupported:false,expired:false,hasFilters:false,radiusKm:20}),'clear-filters');
});
