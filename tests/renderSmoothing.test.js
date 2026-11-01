import test from 'node:test';
import assert from 'node:assert/strict';
import {smoothingFactor,shortestAngleDelta} from '../src/features/combat/utils/renderSmoothing.js';
test('frame damping stays in [0, 1]',()=>{
 for(const dt of [-1,0,.016,.033,.1,1,100]){
  const v=smoothingFactor(dt);assert.ok(v>=0&&v<=1);
 }
});
test('frame damping is time aware',()=>{
 assert.ok(smoothingFactor(.033)>smoothingFactor(.016));
 assert.equal(smoothingFactor(0),0);
});
test('yaw interpolates across wrap using shortest rotation',()=>{
 assert.ok(Math.abs(shortestAngleDelta(Math.PI-.05,-Math.PI+.05)-.1)<1e-9);
});
test('yaw delta is zero for equal rotations',()=>{
 assert.equal(shortestAngleDelta(.9,.9),0);
});
