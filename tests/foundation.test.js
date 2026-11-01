import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {GAME_PROTOCOL,GAME_SERVICE,GAME_VERSION} from '../shared/version.js';
import {resolveQuality,QUALITY_PRESETS,CAMERA_CONFIG} from '../src/config/renderQuality.js';
import {resolveAssetUrl,ASSET_CATALOG,ASSET_GROUPS} from '../src/assets/catalog.js';
import {newPlayer,publicState} from '../server/domain/players.js';
import {inspectArchitecture} from '../scripts/check-architecture.mjs';

test('client and server share the same version and protocol declarations',()=>{
 const pkg=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'));
 assert.equal(pkg.version,GAME_VERSION);
 assert.equal(GAME_PROTOCOL,6);
 assert.equal(GAME_SERVICE,'project-duel');
});
test('stable quality profiles share low-shadow policy and immutable DPR ranges',()=>{
 const low=resolveQuality('low');
 assert.equal(low.shadows,false);
 assert.deepEqual(low.dpr,[.75,1]);
 assert.deepEqual(resolveQuality('balanced').dpr,[1,1.25]);
 assert.deepEqual(resolveQuality('high').shadowMapSize,[2048,2048]);
 assert.strictEqual(resolveQuality('not-found'),QUALITY_PRESETS.balanced);
 assert.equal(Object.isFrozen(low.dpr),true);
 assert.equal(CAMERA_CONFIG.fov,78);
});
test('asset registry falls back safely until real licensed files are added',()=>{
 assert.ok(ASSET_GROUPS.includes('audio'));
 assert.equal(resolveAssetUrl('operator.default'),null);
 assert.equal(resolveAssetUrl('not-registered'),null);
 assert.equal(ASSET_CATALOG['map.iron-depot'].fallback,'procedural-iron-depot');
});
test('player factory and public state keep the V0.2.3 combat protocol unchanged',()=>{
 const player=newPlayer({id:'host'},0);
 assert.equal(player.weaponId,'AR4');
 assert.equal(player.ammo,24);
 assert.equal(player.hp,100);
 const state=publicState({code:'ABC123',status:'playing',winnerId:null,players:[player]});
 assert.equal(state.players[0].weaponId,'AR4');
 assert.equal(state.players[0].ammo,24);
 assert.equal(state.players[0].id,'host');
 assert.equal(state.targetKills,5);
 assert.ok(!('magazines' in state.players[0]),'private inventory not sent as raw mutable map');
});
test('module architecture boundary and asset placement checks pass',()=>{
 assert.deepEqual(inspectArchitecture(),[]);
});
