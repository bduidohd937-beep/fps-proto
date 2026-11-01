import {movePlayer3D,PLAYER_EYE,CROUCH_EYE,PRONE_EYE,WORLD_BOXES,rayBox} from '../../shared/rules.js';
import {getWeapon} from '../../shared/weapons.js';
import {findGroundPath,navigationPointAllowed} from './navigation.js';
import {applyFire,startReload} from '../domain/combat.js';

// Lightweight finite-state-machine bot. All decisions and damage run only on the server.
export const BOT_DIFFICULTY=Object.freeze({
 rookie:Object.freeze({label:'신병',reactionMs:900,aimError:.055,fireChance:.68,decisionMs:350}),
 regular:Object.freeze({label:'정규병',reactionMs:480,aimError:.018,fireChance:.91,decisionMs:220})
});
const PATROL_POINTS=[{x:16,z:16},{x:4,z:16},{x:-3,z:9},{x:0,z:4},{x:9,z:-3},{x:16,z:-11},{x:4,z:-17},{x:-13,z:5},{x:-17,z:-3}].filter(p=>navigationPointAllowed(p.x,p.z));
export function createBotBrain(now=Date.now()){
 return {mode:'patrol',nextDecisionAt:0,nextPathAt:0,path:[],pathIndex:0,goal:null,
  lastSeen:null,noticedAt:0,lastTargetVisibleAt:0,patrolIndex:0,nextShotAt:now+1200,
  decisionCount:0};
}
export function botLineOfSight(bot,target){
 const fromY=(bot.y??0)+(bot.prone?PRONE_EYE:bot.crouch?CROUCH_EYE:PLAYER_EYE);
 const toY=(target.y??0)+(target.prone?.30:target.crouch?.65:1.02);
 const dx=target.x-bot.x,dy=toY-fromY,dz=target.z-bot.z;
 const distance=Math.hypot(dx,dy,dz);
 if(distance<.01||distance>65)return false;
 const dir={x:dx/distance,y:dy/distance,z:dz/distance};
 return WORLD_BOXES.every(b=>rayBox({x:bot.x,y:fromY,z:bot.z},dir,b)>=distance-.08);
}
function facing(bot,target){
 const dx=target.x-bot.x,dz=target.z-bot.z;
 return -Math.atan2(dx,-dz);
}
function pitchTo(bot,target){
 const fromY=(bot.y??0)+(bot.prone?PRONE_EYE:bot.crouch?CROUCH_EYE:PLAYER_EYE);
 const aimY=(target.y??0)+(target.prone?.3:target.crouch?.62:1.05);
 return Math.atan2(aimY-fromY,Math.hypot(target.x-bot.x,target.z-bot.z));
}
function angleDelta(a,b){return Math.atan2(Math.sin(a-b),Math.cos(a-b));}
export function decideBot(bot,target,brain,now=Date.now(),random=Math.random,difficulty='rookie'){
 const tune=BOT_DIFFICULTY[difficulty]||BOT_DIFFICULTY.rookie;
 const d=Math.hypot(target.x-bot.x,target.z-bot.z);
 const visibility=target.hp>0 && d<37 && botLineOfSight(bot,target);
 // A patrol bot scans freely, but only locks onto a target it can see/hear.
 const sensed=visibility && (d<13||Math.abs(angleDelta(facing(bot,target),bot.yaw))<Math.PI*.72);
 const heard=target.hp>0 && d<11 && Boolean(target.input?.sprint);
 if(sensed){
  brain.lastSeen={x:target.x,z:target.z};
  brain.lastTargetVisibleAt=now;
  if(!brain.noticedAt)brain.noticedAt=now;
  brain.mode=now-brain.noticedAt>=tune.reactionMs?'engage':'alert';
 }else if(heard){
  brain.lastSeen={x:target.x,z:target.z};
  brain.noticedAt=0;brain.mode='investigate';
 }else if(brain.lastSeen){
  brain.noticedAt=0;brain.mode='search';
  if(Math.hypot(bot.x-brain.lastSeen.x,bot.z-brain.lastSeen.z)<2.8){
   brain.lastSeen=null;brain.mode='patrol';
  }
 }else{
  brain.noticedAt=0;brain.mode='patrol';
 }
 let goal;
 if(brain.mode==='engage'||brain.mode==='alert'){
  // Close the gap, but circle the target once within rifle range.
  if(d>11)goal={x:target.x,z:target.z};
  else goal={x:target.x+Math.cos(now/2600)*8,z:target.z+Math.sin(now/2600)*8};
 }else if(brain.lastSeen)goal=brain.lastSeen;
 else{
  if(!PATROL_POINTS.length)goal={x:0,z:0};
  else{
   goal=PATROL_POINTS[brain.patrolIndex%PATROL_POINTS.length];
   if(Math.hypot(goal.x-bot.x,goal.z-bot.z)<2.5){
    brain.patrolIndex=(brain.patrolIndex+1)%PATROL_POINTS.length;
    goal=PATROL_POINTS[brain.patrolIndex];
   }
  }
 }
 if(now>=brain.nextPathAt||!brain.path.length){
  brain.path=findGroundPath(bot,goal);
  brain.pathIndex=0;
  brain.nextPathAt=now+800;
 }
 while(brain.pathIndex<brain.path.length&&
  Math.hypot(brain.path[brain.pathIndex].x-bot.x,brain.path[brain.pathIndex].z-bot.z)<1.15)brain.pathIndex++;
 const waypoint=brain.path[brain.pathIndex]||goal;
 const dx=waypoint.x-bot.x,dz=waypoint.z-bot.z;
 const moving=Math.hypot(dx,dz)>1.0;
 const desiredYaw=moving?facing(bot,waypoint):bot.yaw;
 const locked=brain.mode==='engage'&&visibility;
 // Orientation follows waypoint during patrol; faces the enemy in combat.
 const yaw=locked?facing(bot,target):desiredYaw;
 const strafeAngle=moving?desiredYaw-yaw:0;
 const input={
  forward:moving?Math.cos(strafeAngle):0,
  strafe:moving?-Math.sin(strafeAngle):0,
  sprint:brain.mode!=='engage'&&d>15,
  jump:false,crouch:false,prone:false
 };
 const angle=locked?pitchTo(bot,target):0;
 const aimJitter=(random()-.5)*tune.aimError;
 const fire=locked&&d<getWeapon(bot.weaponId).range-3&&now>=brain.nextShotAt&&target.hp>0&&random()<tune.fireChance;
 brain.decisionCount++;
 if(fire)brain.nextShotAt=now+getWeapon(bot.weaponId).fireIntervalMs+Math.round(random()*240);
 return {mode:brain.mode,yaw,pitch:angle+aimJitter,input,fire,visible:visibility,goal,waypoint};
}
export function updateBot(room,bot,target,now,dt,emitShot,random=Math.random){
 if(!bot||bot.hp<=0||room.status!=='playing')return;
 const brain=room.botBrain??(room.botBrain=createBotBrain(now));
 const tune=BOT_DIFFICULTY[room.difficulty]||BOT_DIFFICULTY.rookie;
 if(now>=brain.nextDecisionAt){
  const decision=decideBot(bot,target,brain,now,random,room.difficulty);
  bot.input=decision.input;
  bot.yaw=decision.yaw;
  bot.pitch=decision.pitch;
  bot.ads=decision.mode==='engage';
  brain.nextDecisionAt=now+tune.decisionMs;
  if(bot.ammo===0){startReload(bot,now);}
  if(decision.fire && bot.ammo>0){
   const result=applyFire(room,bot,now,random);
   if(result)emitShot(result);
  }
 }
 Object.assign(bot,movePlayer3D(bot,{...bot.input,yaw:bot.yaw},dt));
}
