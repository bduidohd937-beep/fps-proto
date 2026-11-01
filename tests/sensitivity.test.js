import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_SENSITIVITY,sanitizeSensitivity,sensitivityForAim} from '../src/features/settings/sensitivity.js';

test('sensitivity clamps invalid and non-finite saved values to safe defaults',()=>{
 assert.deepEqual(sanitizeSensitivity({general:NaN,ads:Infinity}),DEFAULT_SENSITIVITY);
 assert.deepEqual(sanitizeSensitivity({general:-2,ads:99}),DEFAULT_SENSITIVITY);
 assert.deepEqual(sanitizeSensitivity({general:'2.4',ads:.5}),{general:2.4,ads:.5});
});
test('ADS sensitivity is a client-only multiplier over general sensitivity',()=>{
 assert.equal(sensitivityForAim({general:1,ads:.8},false),1);
 assert.equal(sensitivityForAim({general:2,ads:.8},true),1.6);
});
