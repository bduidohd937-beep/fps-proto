import test from 'node:test';
import assert from 'node:assert/strict';
import {
 ARENA_HALF,WORLD_BOXES,PLAYER_HEIGHT,GRAVITY,JUMP_HEIGHT,JUMP_SPEED,
 movePlayer3D,raySphere,rayBox,shotHitsPlayer,aimDirection
} from '../shared/rules.js';

const initial=(x=-17,z=-17)=>({x,y:0,z,vy:0,grounded:true,crouch:false,jumpHeld:false});
const run=(p,input,frames=1)=>{for(let i=0;i<frames;i++)p=movePlayer3D(p,input,1/30);return p;};

test('3D movement is bounded by arena limits at full sprint',()=>{
 const p=run(initial(19,16),{yaw:0,strafe:1,sprint:true},100);
 assert.ok(p.x<ARENA_HALF);
 assert.ok(p.x<=21.24);
});
test('diagonal horizontal movement remains normalized',()=>{
 const a=run(initial(),{forward:1,yaw:0},1);
 const b=run(initial(),{forward:1,strafe:1,yaw:0},1);
 assert.ok(Math.abs(Math.hypot(a.x+17,a.z+17)-Math.hypot(b.x+17,b.z+17))<1e-9);
});
test('space causes genuine vertical flight and gravity lands the player',()=>{
 let p=initial();
 p=run(p,{jump:true});
 assert.ok(p.y>0 && !p.grounded);
 let top=p.y;
 for(let i=0;i<65;i++){
  p=run(p,{jump:false});
  top=Math.max(top,p.y);
 }
 assert.ok(top>1.05 && top<1.5,`jump apex ${top}`);
 assert.equal(p.y,0);
 assert.equal(p.grounded,true);
 assert.equal(p.vy,0);
 assert.ok(Math.abs(JUMP_SPEED-Math.sqrt(2*GRAVITY*JUMP_HEIGHT))<1e-9);
});
test('holding jump never triggers repeated mid-air jumps',()=>{
 let p=initial();let top=0;
 for(let i=0;i<90;i++){
  p=run(p,{jump:true});
  top=Math.max(top,p.y);
 }
 assert.ok(top>1 && top<1.5);
 assert.equal(p.y,0);
 assert.equal(p.grounded,true);
});
test('industrial stair steps lead to elevated 2.6m bridge',()=>{
 let p=initial(-16,0);
 p=run(p,{yaw:0,strafe:1},85);
 assert.ok(p.x>-7,`expected to cross steps, at x=${p.x}`);
 assert.ok(p.y>=2.4,`expected elevated deck, at y=${p.y}`);
});
test('walking off high deck eventually falls to ground',()=>{
 let p={...initial(0,0),y:2.6};
 p=run(p,{yaw:0,forward:1},120);
 assert.ok(p.z<-3.2);
 assert.equal(p.y,0);
 assert.equal(p.grounded,true);
});
test('standing cannot walk through low duct but crouching can',()=>{
 const stand=run(initial(0,-10),{yaw:0,forward:-1},38);
 assert.ok(stand.z<-8.9,`standing unexpectedly crossed duct: ${stand.z}`);
 const crouched=run(initial(0,-10),{yaw:0,forward:-1,crouch:true},60);
 assert.ok(crouched.z>-7.6,`crouching was blocked: ${crouched.z}`);
 assert.equal(crouched.crouch,true);
 const under=movePlayer3D({...initial(0,-8),crouch:true},{crouch:false},1/30);
 assert.equal(under.crouch,true,'cannot stand inside overhead beam');
});
test('overhead bridge prevents jumping straight through its deck',()=>{
 let p=initial(0,0);let maxY=0;
 for(let i=0;i<25;i++){
  p=run(p,{jump:i===0});
  maxY=Math.max(maxY,p.y);
 }
 assert.ok(maxY<.7,`jump passed through ceiling: ${maxY}`);
});
test('player footprint does not penetrate shipping container',()=>{
 const container=WORLD_BOXES.find(b=>b.kind==='container'&&b.x===-11&&b.z===-9);
 let p=initial(-17,-9);
 p=run(p,{yaw:0,strafe:1},80);
 assert.ok(p.x<container.x-container.w/2-.34);
 assert.equal(p.y,0);
});
test('ray sphere intersection occurs forward, never behind',()=>{
 assert.equal(raySphere({x:0,y:0,z:0},{x:0,y:0,z:-1},{x:0,y:0,z:-5},1),4);
 assert.equal(raySphere({x:0,y:0,z:0},{x:0,y:0,z:-1},{x:0,y:0,z:5},1),Infinity);
});
test('ray-box collision respects vertical offset of catwalk',()=>{
 const catwalk=WORLD_BOXES.find(b=>b.kind==='catwalk');
 assert.equal(rayBox({x:0,y:1,z:-5},{x:0,y:0,z:1},catwalk),Infinity);
 assert.ok(rayBox({x:0,y:2.4,z:-5},{x:0,y:0,z:1},catwalk)<10);
});
test('shipping containers block server-validated shots',()=>{
 const shooter={x:-17,y:0,z:-9,yaw:-Math.PI/2,pitch:0};
 const target={x:17,y:0,z:-9};
 assert.equal(shotHitsPlayer(shooter,target),false);
});
test('unobstructed lane allows a valid shot',()=>{
 const shooter={x:-17,y:0,z:-17,yaw:-Math.PI/2,pitch:0};
 const target={x:-12,y:0,z:-17};
 assert.equal(shotHitsPlayer(shooter,target),true);
});
test('elevated bridge supports valid elevated hit detection',()=>{
 const shooter={x:-4,y:2.6,z:0,yaw:-Math.PI/2,pitch:0};
 const target={x:0,y:2.6,z:0};
 assert.equal(shotHitsPlayer(shooter,target),true);
});
test('aim vector stays normalized',()=>{
 const dir=aimDirection(-1,.2);
 assert.ok(Math.abs(Math.hypot(dir.x,dir.y,dir.z)-1)<1e-9);
});
test('collider matches player baseline height',()=>{
 assert.equal(PLAYER_HEIGHT,1.8);
});
