import test from 'node:test';
import assert from 'node:assert/strict';
import {newPlayer} from '../server/domain/players.js';
import {applyFire,startReload,updateReload} from '../server/domain/combat.js';
import {WEAPONS} from '../shared/weapons.js';
import {STANCE_AIM,recoilPattern,getVisualKick,getStance} from '../shared/recoil.js';
import {movePlayer3D,canFit,PLAYER_HEIGHT,CROUCH_HEIGHT,PRONE_HEIGHT} from '../shared/rules.js';
import {findGroundPath,navigationPointAllowed} from '../server/bots/navigation.js';
import {updateBot} from '../server/bots/controller.js';

const postures={standing:{},walking:{input:{forward:1}},sprinting:{input:{forward:1,sprint:true}},crouched:{crouch:true},prone:{prone:true},airborne:{grounded:false}};
for(const weapon of Object.values(WEAPONS))for(const [stance,props] of Object.entries(postures)){
 test(`${weapon.name} ${stance}: 20 authoritative shots, reload and reset`,()=>{
  const p={...newPlayer({id:'a'},0),...props,weaponId:weapon.id,ammo:weapon.magazine};
  p.magazines[weapon.id]=p.ammo;
  const room={status:'playing',players:[p]};
  let now=10000,expected=0,last=0;
  const samples=[];
  for(let i=0;i<20;i++){
   if(!p.ammo){assert.equal(startReload(p,now),true);now+=weapon.reloadMs;assert.equal(updateReload(p,now),true);}
   if(now-last>650)expected=0;
   const shot=applyFire(room,p,now,()=>.5);
   assert.ok(shot);assert.equal(shot.stance,stance);assert.equal(shot.recoilIndex,expected);
   const pattern=recoilPattern(weapon.id,expected);
   assert.equal(shot.yawOffset,pattern.yaw*STANCE_AIM[stance].recoil);
   assert.equal(shot.pitchOffset,pattern.pitch*STANCE_AIM[stance].recoil);
   const camera=getVisualKick(weapon,expected,stance);
   assert.equal(Math.sign(camera.yaw),Math.sign(shot.yawOffset));
   assert.ok(Number.isFinite(shot.spread)&&shot.spread>0);
   samples.push({index:shot.recoilIndex,yaw:shot.yawOffset,pitch:shot.pitchOffset,spread:shot.spread});
   expected++;last=now;now+=weapon.fireIntervalMs;
  }
  if(!p.ammo){startReload(p,now);now+=weapon.reloadMs;updateReload(p,now);}
  assert.equal(applyFire(room,p,now+651,()=>.5).recoilIndex,0);
  // Deterministic directional envelope recorded in test output for comparison.
  console.log(JSON.stringify({weapon:weapon.id,stance,shots:samples.length,maxYaw:Math.max(...samples.map(s=>Math.abs(s.yaw))),maxPitch:Math.max(...samples.map(s=>s.pitch)),spread:[samples[0].spread,samples.at(-1).spread]}));
 });
}
test('holding sprint while stationary retains standing accuracy',()=>{
 assert.equal(getStance({input:{sprint:true}}),'standing');
});
test('collision clearance, corners and stairs stay valid during simulated input',()=>{
 for(const [start,input,steps] of [
  [{x:8,z:-6.7},{forward:-1,prone:true},110],
  [{x:0,z:-9.8},{forward:-1,crouch:true},60],
  [{x:-17,z:0},{strafe:1},90],
  [{x:-14,z:-12},{forward:-1,strafe:1,sprint:true},120],
 ]){
  let p={...start,y:0,vy:0,grounded:true};
  for(let i=0;i<steps;i++){
   p=movePlayer3D(p,{yaw:0,...input},1/30);
   assert.ok(canFit(p.x,p.y,p.z,p.prone?PRONE_HEIGHT:p.crouch?CROUCH_HEIGHT:PLAYER_HEIGHT));
  }
 }
 for(const [x,z,prone] of [[8,-5,true],[0,-8,false]]){
  const p=movePlayer3D({x,z,y:0,grounded:true},{},1/30);
  assert.equal(p.prone,prone);assert.equal(p.crouch,!prone);
 }
});
for(const difficulty of ['rookie','regular'])test(`${difficulty}: 60s collision-safe AI simulation`,()=>{
 const bot=newPlayer({id:'bot'},1,{bot:true}),human=newPlayer({id:'human'},0);
 const room={status:'playing',difficulty,players:[human,bot]};
 let shots=0;
 for(let i=0;i<1800;i++){
  human.hp=100;
  updateBot(room,bot,human,10000+i*1000/30,1/30,()=>shots++,()=>.5);
  assert.ok(canFit(bot.x,bot.y,bot.z,PLAYER_HEIGHT));
 }
 assert.ok(shots>0);
 for(const [from,to] of [[{x:-17,z:-9},{x:17,z:-9}],[{x:6,z:-5},{x:10,z:-5}],[{x:-17,z:0},{x:17,z:0}]]){
  const path=findGroundPath(from,to);assert.ok(path.length);
  for(const node of path)assert.ok(navigationPointAllowed(node.x,node.z));
 }
});
