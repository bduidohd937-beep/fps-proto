import test from 'node:test';
import assert from 'node:assert/strict';
import {movePlayer3D,canFit,PLAYER_HEIGHT,CROUCH_HEIGHT,PRONE_HEIGHT,PRONE_EYE,WORLD_BOXES} from '../shared/rules.js';
import {WEAPONS} from '../shared/weapons.js';
import {getShotSpread,traceShot} from '../shared/combat.js';
import {getStance,STANCE_AIM,recoilPattern,getVisualKick,RECOIL_RESET_MS} from '../shared/recoil.js';
import {newPlayer} from '../server/domain/players.js';
import {applyFire} from '../server/domain/combat.js';
import {findGroundPath,navigationPointAllowed} from '../server/bots/navigation.js';

const initial=(x=0,z=6)=>({x,y:0,z,vy:0,grounded:true,crouch:false,prone:false,jumpHeld:false});
const run=(p,input,steps=1)=>{for(let i=0;i<steps;i++)p=movePlayer3D(p,input,1/30);return p;};

test('posture speed order: sprint > walk > crouch > prone',()=>{
 const travel=opts=>Math.abs(run(initial(),{yaw:0,forward:1,...opts},10).z-6);
 assert.ok(travel({sprint:true})>travel({}));
 assert.ok(travel({})>travel({crouch:true}));
 assert.ok(travel({crouch:true})>travel({prone:true}));
});
test('lying down changes real collision height and lets player cross 0.82m duct',()=>{
 assert.equal(canFit(8,0,-5,PLAYER_HEIGHT),false);
 assert.equal(canFit(8,0,-5,CROUCH_HEIGHT),false);
 assert.equal(canFit(8,0,-5,PRONE_HEIGHT),true);
 const from=initial(8,-6.7);
 const standing=run(from,{yaw:0,forward:-1},110);
 const crouching=run(from,{yaw:0,forward:-1,crouch:true},110);
 const prone=run(from,{yaw:0,forward:-1,prone:true},110);
 assert.ok(standing.z<-5.8);
 assert.ok(crouching.z<-5.8);
 assert.ok(prone.z>-4.3, 'prone should pass through low pipe');
 assert.equal(prone.prone,true);
});
test('head cannot clip the ceiling when prone or crouch is released',()=>{
 let trapped=run({...initial(8,-5),prone:true},{yaw:0},1);
 assert.equal(trapped.prone,true);
 trapped=run(trapped,{yaw:0,crouch:true},1);
 assert.equal(trapped.prone,true);
 const free=run({...trapped,x:8,z:-2},{yaw:0},1);
 assert.equal(free.prone,false);
 assert.equal(free.crouch,false);
});
test('prone cannot launch a jump until standing/crouching',()=>{
 const p=run(initial(),{prone:true,jump:true});
 assert.equal(p.y,0);assert.equal(p.grounded,true);
 assert.ok(PRONE_EYE<.6);
});
test('different postures systematically affect true server spread',()=>{
 const weapon=WEAPONS.AR4,player=newPlayer({id:'p'},0);
 const spread=(props,input={})=>getShotSpread(weapon,{...player,...props,input:{...player.input,...input}});
 const still=spread({});
 const walking=spread({}, {forward:1});
 const sprint=spread({}, {forward:1,sprint:true});
 const crouch=spread({crouch:true});
 const prone=spread({prone:true});
 const air=spread({grounded:false});
 assert.ok(prone<crouch&&crouch<still&&still<walking&&walking<sprint&&sprint<air);
 assert.ok(Object.isFrozen(STANCE_AIM.prone));
 assert.equal(getStance({...player,prone:true}),'prone');
});
test('recoil patterns repeat deterministically per weapon, with first bullet neutral',()=>{
 for(const weapon of Object.values(WEAPONS)){
  const first=recoilPattern(weapon.id,0);
  assert.deepEqual(first,{yaw:0,pitch:0});
  const second=recoilPattern(weapon.id,1);
  assert.ok(second.pitch>0);
  assert.deepEqual(recoilPattern(weapon.id,1),second);
  const visualProne=getVisualKick(weapon,1,'prone');
  const visualStand=getVisualKick(weapon,1,'standing');
  assert.ok(visualProne.pitch<visualStand.pitch);
 }
 assert.equal(RECOIL_RESET_MS,650);
});
test('authoritative server recoil indexes advance per burst and reset after a pause',()=>{
 const a=newPlayer({id:'a'},0),b=newPlayer({id:'b'},1);
 a.x=-17;a.z=-17;a.yaw=-Math.PI/2;a.pitch=0;
 b.x=-12;b.z=-17;
 const room={status:'playing',winnerId:null,players:[a,b]};
 const first=applyFire(room,a,10000,()=>.5);
 const second=applyFire(room,a,10200,()=>.5);
 const fresh=applyFire(room,a,11000,()=>.5);
 assert.equal(first?.recoilIndex,0);
 assert.equal(second?.recoilIndex,1);
 assert.equal(fresh?.recoilIndex,0);
 assert.equal(a.recoilShots,1);
 assert.ok(first?.damage>0);
});
test('prone target reduces hitbox and remains cover-aware',()=>{
 const a={...newPlayer({id:'a'},0),x:-17,z:-17,yaw:-Math.PI/2,pitch:0};
 const b={...newPlayer({id:'b'},1),x:-12,z:-17,prone:true};
 assert.equal(traceShot(a,b,WEAPONS.AR4),null,'standing eye-level ray should pass over prone body');
 const down={...a,pitch:Math.atan2(.4-1.55,5)};
 assert.ok(traceShot(down,b,WEAPONS.AR4),'aiming down should hit prone target');
});
test('navigation uses game collision geometry for low overhead and walls',()=>{
 assert.equal(navigationPointAllowed(8,-5),false);
 assert.equal(navigationPointAllowed(-17,-17),true);
 const route=findGroundPath({x:-17,z:-17},{x:17,z:17});
 assert.ok(route.length>7);
 assert.ok(route.every(node=>navigationPointAllowed(node.x,node.z)));
});
