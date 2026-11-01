import test from 'node:test';
import assert from 'node:assert/strict';
import {reconcilePrediction} from '../shared/reconciliation.js';

test('small authoritative drift is smoothly corrected after delayed snapshots',()=>{
 let predicted={x:0,y:0,z:0,grounded:true,crouch:false,prone:false};
 for(const authoritative of [{x:.3,y:0,z:0},{x:.6,y:0,z:0},{x:.9,y:0,z:0}])
  predicted=reconcilePrediction(predicted,authoritative,1/15);
 assert.ok(predicted.x>0&&predicted.x<.9);
});
test('large forced position mismatch snaps to server state and restores posture',()=>{
 const corrected=reconcilePrediction({x:0,y:0,z:0,grounded:false,crouch:false,prone:false},
  {x:17,y:0,z:17,vy:0,grounded:true,crouch:false,prone:false},1/30);
 assert.deepEqual(corrected,{x:17,y:0,z:17,vy:0,grounded:true,crouch:false,prone:false});
});
