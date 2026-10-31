import test from 'node:test';
import assert from 'node:assert/strict';
import {ARENA_HALF,COVER,movePlayer,overlapsCover,raySphere,rayBox,shotHitsPlayer,aimDirection} from '../shared/rules.js';
test('movement is bounded by arena limits',()=>{
 const p=movePlayer({x:17,z:17},{forward:-1,strafe:1,yaw:0,sprint:true},10);
 assert.ok(Math.abs(p.x)<ARENA_HALF&&Math.abs(p.z)<ARENA_HALF);
});
test('players cannot enter cover',()=>{
 const p=movePlayer({x:0,z:-3.2},{forward:-1,strafe:0,yaw:0},0.25);
 assert.equal(overlapsCover(p.x,p.z),false);
});
test('diagonal movement is normalized',()=>{
 const a=movePlayer({x:-14,z:-11},{forward:1,strafe:0,yaw:0},0.1);
 const b=movePlayer({x:-14,z:-11},{forward:1,strafe:1,yaw:0},0.1);
 assert.ok(Math.abs(Math.hypot(a.x+14,a.z+11)-Math.hypot(b.x+14,b.z+11))<1e-9);
});
test('ray sphere hits forward not backward',()=>{
 assert.equal(raySphere({x:0,y:0,z:0},{x:0,y:0,z:-1},{x:0,y:0,z:-5},1),4);
 assert.equal(raySphere({x:0,y:0,z:0},{x:0,y:0,z:-1},{x:0,y:0,z:5},1),Infinity);
});
test('ray box misses',()=>assert.equal(rayBox({x:9,y:1,z:9},{x:1,y:0,z:0},COVER[0]),Infinity));
test('cover blocks shot',()=>assert.equal(shotHitsPlayer({x:-8,z:0,yaw:-Math.PI/2,pitch:0},{x:8,z:0}),false));
test('unobstructed shot hits',()=>assert.equal(shotHitsPlayer({x:-14,z:-11,yaw:-Math.PI/2,pitch:-.046},{x:-8,z:-11}),true));
test('aim vector is normalized',()=>{
 const d=aimDirection(-1,.2);assert.ok(Math.abs(Math.hypot(d.x,d.y,d.z)-1)<1e-9);
});
