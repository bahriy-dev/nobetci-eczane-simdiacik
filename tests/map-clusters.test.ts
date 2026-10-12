import test from 'node:test';
import assert from 'node:assert/strict';
import {clusterMapPoints} from '../lib/map-clusters';
test('nearby markers cluster even when they lie on opposite grid cell boundaries',()=>{
 const points=[{id:'left',x:43,y:20},{id:'right',x:45,y:20},{id:'far',x:150,y:20}];
 const groups=clusterMapPoints(points);
 assert.deepEqual(groups.map(g=>g.map(p=>p.id)),[['left','right'],['far']]);
 assert.equal(groups.flat().length,points.length);
});
test('coincident pharmacies survive a cluster without losing or inventing a point',()=>{
 const points=[{id:'one',x:0,y:0},{id:'two',x:0,y:0},{id:'three',x:40,y:0},{id:'separate',x:90,y:0}];
 const groups=clusterMapPoints(points);
 assert.deepEqual(groups.map(g=>g.map(p=>p.id)),[['one','two','three'],['separate']]);
 assert.equal(groups[0][0],points[0]);
 assert.deepEqual(clusterMapPoints([]),[]);
});
