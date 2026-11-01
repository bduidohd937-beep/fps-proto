import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_SENSITIVITY,sanitizeSensitivity,sensitivityForAim,applyMouseRotation} from '../src/features/settings/sensitivity.js';

test('sensitivity clamps invalid and non-finite saved values to safe defaults',()=>{
 assert.deepEqual(sanitizeSensitivity({general:NaN,ads:Infinity}),DEFAULT_SENSITIVITY);
 assert.deepEqual(sanitizeSensitivity({general:-2,ads:99}),DEFAULT_SENSITIVITY);
 assert.deepEqual(sanitizeSensitivity({general:'2.4',ads:.5}),{general:2.4,ads:.5});
});
test('ADS sensitivity is a client-only multiplier over general sensitivity',()=>{
 assert.equal(sensitivityForAim({general:1,ads:.8},false),1);
 assert.equal(sensitivityForAim({general:2,ads:.8},true),1.6);
});

test('mouse rotation applies general sensitivity to yaw and pitch without recoil',()=>{
 const result=applyMouseRotation({yaw:1,pitch:.2,movementX:100,movementY:-50,settings:{general:2,ads:.5},ads:false});
 assert.equal(result.sensitivity,2);
 assert.equal(result.yawDelta,-.44);
 assert.equal(result.pitchDelta,.22);
 assert.equal(result.yaw,.56);
 assert.equal(result.pitch,.42);
});
test('mouse rotation applies ADS multiplier independently of final yaw',()=>{
 const result=applyMouseRotation({yaw:-.4,pitch:0,movementX:100,movementY:0,settings:{general:2,ads:.5},ads:true});
 assert.equal(result.sensitivity,1);
 assert.equal(result.yawDelta,-.22);
 assert.equal(result.yaw,-.62);
});
test('mouse rotation clamps pitch while preserving the calculated mouse delta',()=>{
 const result=applyMouseRotation({yaw:0,pitch:1.4,movementX:0,movementY:-100,settings:{general:2,ads:.5},ads:false});
 assert.equal(result.pitchDelta,.44);
 assert.equal(result.pitch,1.42);
});
